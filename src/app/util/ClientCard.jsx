import { useState } from 'react';
import { Button, Collapse, Form, Image, Input, Modal, Popconfirm, message } from 'antd';
import { DeleteOutlined, EditOutlined, FileTextOutlined, MailOutlined, QrcodeOutlined } from '@ant-design/icons';
import { isValidDescription } from './name.js';
import { useApp } from '../AppContext.jsx';

function formatBytes(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return '-';
    if (n < 1024) return `${n} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let i = -1;
    let val = n;
    do {
        val /= 1024;
        i += 1;
    } while (val >= 1024 && i < units.length - 1);
    return `${val.toFixed(val >= 100 ? 0 : 1)} ${units[i]}`;
}

function formatLastSeen(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    const diff = Date.now() - d.getTime();
    if (diff < 0) return String(value);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

function statusOf(client) {
    if (!client.last_seen) return 'unknown';
    const diff = Date.now() - new Date(client.last_seen).getTime();
    if (Number.isNaN(diff) || diff < 0) return 'unknown';
    if (diff < 5 * 60000) return 'online';
    if (diff < 24 * 3600000) return 'recent';
    return 'unknown';
}

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

    const initials =
        (client.description || '?')
            .trim()
            .split(/\s+/)
            .map((part) => part[0])
            .slice(0, 2)
            .join('')
            .toUpperCase() || '?';

    const status = statusOf(client);
    const lastSeen = formatLastSeen(client.last_seen);
    const [recvRaw, sentRaw] = (client.traffic_counter || ',').split(',');
    const received = formatBytes(recvRaw);
    const sent = formatBytes(sentRaw);

    return (
        <div className="wg-card" style={{ position: 'relative' }}>
            <div className="wg-card-head">
                <div className="wg-avatar">{initials}</div>
                <div className="wg-card-id">
                    <div className="wg-card-title-row">
                        <span className="wg-card-title">{client.description}</span>
                        <span className={`wg-status-dot ${status}`} title={intl['last_seen']} />
                    </div>
                    <div className="wg-card-sub">{client.client_ip}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flex: '0 0 auto' }}>
                    <button type="button" className="wg-icon-btn" onClick={openEdit} title={intl['edit'] || 'Edit'}>
                        <EditOutlined />
                    </button>
                    <Popconfirm
                        title={intl['confirm_delete'] || 'Delete this client?'}
                        onConfirm={handleDelete}
                        okText={intl['delete'] || 'Delete'}
                        cancelText={intl['cancel'] || 'Cancel'}
                        okButtonProps={{ danger: true, type: 'default' }}
                        cancelButtonProps={{ type: 'primary' }}
                    >
                        <button type="button" className="wg-icon-btn danger" title={intl['delete'] || 'Delete'}>
                            <DeleteOutlined />
                        </button>
                    </Popconfirm>
                </div>
            </div>

            <div className="wg-kv">
                <div className="wg-kv-row">
                    <span className="wg-kv-label">{intl['ip'] || 'IP'}</span>
                    <span className="wg-kv-value">{client.client_ip}</span>
                </div>
                <div className="wg-kv-row">
                    <span className="wg-kv-label">{intl['allowed_source']}</span>
                    <span className="wg-kv-value">{client.allowed_ips}</span>
                </div>
                <div className="wg-kv-row">
                    <span className="wg-kv-label">{intl['last_seen']}</span>
                    <span className="wg-kv-value">{lastSeen}</span>
                </div>
                <div className="wg-kv-row">
                    <span className="wg-kv-label">{intl['received_data']}</span>
                    <span className="wg-kv-value">{received}</span>
                </div>
                <div className="wg-kv-row">
                    <span className="wg-kv-label">{intl['sent_data']}</span>
                    <span className="wg-kv-value">{sent}</span>
                </div>
            </div>

            <Collapse
                ghost
                expandIconPlacement="start"
                style={{ marginTop: -12, marginBottom: '1.5rem' }}
                styles={{
                    header: { paddingLeft: 0, paddingTop: 0, paddingBottom: 0 },
                    body: { paddingTop: 0, paddingLeft: 0, paddingRight: 0 },
                }}
                items={[
                    {
                        key: client.public_key,
                        label: intl['pub_key'],
                        children: <p style={{ wordWrap: 'break-word', margin: 0 }}>{client.public_key}</p>,
                    },
                ]}
            />

            <div className="wg-actions">
                <button type="button" className="wg-pill" onClick={downloadConfig}>
                    <FileTextOutlined /> <span className="wg-pill-label">{intl['download_config'] || 'Config'}</span>
                </button>
                <button type="button" className="wg-pill" onClick={() => setShowQr((v) => !v)}>
                    <QrcodeOutlined /> <span className="wg-pill-label">{intl['show_qr'] || 'QR'}</span>
                </button>
                <button type="button" className="wg-pill">
                    <MailOutlined /> <span className="wg-pill-label">Email</span>
                </button>
            </div>

            {showQr && (
                <div className="wg-card-qr">
                    <Image src={`/api/clients/${client.id}/qr`} alt="QR code" width={200} preview={false} />
                </div>
            )}

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
