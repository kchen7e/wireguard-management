import { useRef, useState } from 'react';
import { Button, Card, Collapse, Form, Image, Input, Modal, Popconfirm, message } from 'antd';
import { DeleteOutlined, EditOutlined, FileTextOutlined, MailOutlined, QrcodeOutlined } from '@ant-design/icons';
import { isValidDescription } from './name.js';

const ACTION_WIDTH = 80;

export default function ClientCard({ client, intl, onChanged }) {
    const [offset, setOffset] = useState(0);
    const [showQr, setShowQr] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();
    const startX = useRef(null);
    const startOffset = useRef(0);
    const dragging = useRef(false);

    const downloadConfig = () => {
        window.open(`/api/clients/${client.id}/config`, '_blank');
    };

    const onPointerDown = (e) => {
        startX.current = e.clientX;
        startOffset.current = offset;
        dragging.current = false;
    };

    const onPointerMove = (e) => {
        if (startX.current === null) return;
        const dx = e.clientX - startX.current;
        if (!dragging.current && Math.abs(dx) > 5) {
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
        }
        if (dragging.current) {
            setOffset(Math.min(0, Math.max(-ACTION_WIDTH, startOffset.current + dx)));
        }
    };

    const onPointerUp = () => {
        startX.current = null;
        if (dragging.current) {
            setOffset((prev) => (prev < -ACTION_WIDTH / 2 ? -ACTION_WIDTH : 0));
        }
        dragging.current = false;
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const response = await fetch(`/api/clients/${client.id}`, { method: 'DELETE' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                onChanged();
                throw new Error(payload.error || 'Failed to delete client');
            }
            message.success('Client deleted');
            onChanged();
        } catch (error) {
            console.error('Error deleting client:', error);
            message.error(error.message);
        } finally {
            setDeleting(false);
        }
    };

    const openEdit = () => {
        form.setFieldsValue({ description: client.description });
        setEditOpen(true);
    };

    const handleUpdate = async (values) => {
        setSaving(true);
        try {
            const response = await fetch(`/api/clients/${client.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: values.description }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload.error || 'Failed to update client');
            }
            message.success('Client updated');
            setEditOpen(false);
            onChanged();
        } catch (error) {
            console.error('Error updating client:', error);
            message.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ position: 'relative', overflow: 'hidden', width: '25rem', borderRadius: 8 }}>
            <div
                style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: ACTION_WIDTH,
                    background: '#ff4d4f',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Popconfirm
                    title={intl['confirm_delete'] || 'Delete this client?'}
                    onConfirm={handleDelete}
                    okText={intl['delete'] || 'Delete'}
                    cancelText={intl['cancel'] || 'Cancel'}
                >
                    <Button danger type="primary" icon={<DeleteOutlined />} loading={deleting} />
                </Popconfirm>
            </div>
            <div
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                style={{
                    position: 'relative',
                    background: '#fff',
                    transform: `translateX(${offset}px)`,
                    transition: startX.current === null ? 'transform 0.2s ease' : 'none',
                    touchAction: 'pan-y',
                    cursor: 'grab',
                }}
            >
                <Card variant="outlined" style={{ border: '1px dashed grey', width: '100%' }}>
                    <div>
                        {intl['user']}: {client.description}
                        <Collapse
                            items={[
                                {
                                    key: client.public_key,
                                    label: intl['pub_key'],
                                    children: <p style={{ wordWrap: 'break-word', margin: 0 }}>{client.public_key}</p>,
                                },
                            ]}
                        />
                    </div>
                    <p>
                        {intl['ip']}: {client.client_ip}
                    </p>
                    <p>
                        {intl['allowed_source']}: {client.allowed_ips}
                    </p>
                    <p>
                        {intl['last_seen']}: {client.last_seen || '-'}
                    </p>
                    <p>
                        {intl['received_data']}: {client.traffic_counter ? client.traffic_counter.split(',')[0] : '-'}
                    </p>
                    <p>
                        {intl['sent_data']}: {client.traffic_counter ? client.traffic_counter.split(',')[1] : '-'}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '16px' }}>
                        <FileTextOutlined style={{ cursor: 'pointer' }} onClick={downloadConfig} />
                        <QrcodeOutlined style={{ cursor: 'pointer' }} onClick={() => setShowQr((v) => !v)} />
                        <EditOutlined style={{ cursor: 'pointer' }} onClick={openEdit} />
                        <MailOutlined style={{ cursor: 'pointer' }} />
                    </div>
                    {showQr && (
                        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                            <Image src={`/api/clients/${client.id}/qr`} alt="QR code" width={200} preview={false} />
                        </div>
                    )}
                </Card>
            </div>
            <Modal title={intl['edit'] || 'Edit'} open={editOpen} onCancel={() => setEditOpen(false)} footer={null}>
                <Form form={form} onFinish={handleUpdate} layout="vertical">
                    <Form.Item
                        label={intl['description'] || 'Description'}
                        name="description"
                        rules={[
                            { required: true, message: 'Please input the description!' },
                            {
                                validator: (_, value) => {
                                    if (!value) return Promise.resolve();
                                    if (!isValidDescription(value)) {
                                        return Promise.reject(
                                            new Error('Letters, digits, spaces and ._- only (e.g. Alice)')
                                        );
                                    }
                                    return Promise.resolve();
                                },
                            },
                        ]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={saving}>
                            {intl['save'] || 'Save'}
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
