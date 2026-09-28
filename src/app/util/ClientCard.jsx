import { useState } from 'react';
import { Button, Card, Collapse, Form, Image, Input, Modal, Popconfirm, message } from 'antd';
import { DeleteOutlined, EditOutlined, FileTextOutlined, MailOutlined, QrcodeOutlined } from '@ant-design/icons';
import { isValidDescription } from './name.js';
import { useApp } from '../AppContext.jsx';

export default function ClientCard({ client, intl }) {
    const { deleteClient, updateClient } = useApp();
    const [showQr, setShowQr] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [form] = Form.useForm();

    const downloadConfig = () => {
        window.open(`/api/clients/${client.id}/config`, '_blank');
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await deleteClient(client.id);
            message.success('Client deleted');
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
            await updateClient(client.id, values);
            message.success('Client updated');
            setEditOpen(false);
        } catch (error) {
            console.error('Error updating client:', error);
            message.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ position: 'relative', width: '25rem', borderRadius: 8 }}>
            <Card variant="outlined" style={{ border: '1px dashed grey', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                        {intl['user']}: {client.description}
                        <EditOutlined style={{ cursor: 'pointer', marginLeft: '8px' }} onClick={openEdit} />
                    </span>
                    <Popconfirm
                        title={intl['confirm_delete'] || 'Delete this client?'}
                        onConfirm={handleDelete}
                        okText={intl['delete'] || 'Delete'}
                        cancelText={intl['cancel'] || 'Cancel'}
                    >
                        <DeleteOutlined style={{ cursor: 'pointer', color: '#ff4d4f' }} />
                    </Popconfirm>
                </div>
                <Collapse
                    items={[
                        {
                            key: client.public_key,
                            label: intl['pub_key'],
                            children: <p style={{ wordWrap: 'break-word', margin: 0 }}>{client.public_key}</p>,
                        },
                    ]}
                />
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
                    <MailOutlined style={{ cursor: 'pointer' }} />
                </div>
                {showQr && (
                    <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                        <Image src={`/api/clients/${client.id}/qr`} alt="QR code" width={200} preview={false} />
                    </div>
                )}
            </Card>
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
