import { useRef, useState } from 'react';
import { App, Button, Form, Image, Input, Modal, Popconfirm, Tooltip } from 'antd';
import {
    CopyOutlined,
    DeleteOutlined,
    EditOutlined,
    FileTextOutlined,
    MailOutlined,
    QrcodeOutlined,
} from '@ant-design/icons';
import { isValidDescription } from './name';
import { formatLastSeen } from './time';
import { WG_HANDSHAKE_INTERVAL_SECONDS } from './constants';
import { errorMessage } from './errors';
import { useApp } from '../AppContext';
import type { Messages } from '../intl';
import type { ClientWithStatus } from '../types';

function formatBytes(value: number | null | undefined): string {
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

function statusOf(client: ClientWithStatus): 'online' | 'offline' {
    if (!client.last_handshake) return 'offline';
    const seconds = Number(client.last_handshake);
    if (!Number.isFinite(seconds) || seconds <= 0) return 'offline';
    const diff = Date.now() - seconds * 1000;
    if (Number.isNaN(diff)) return 'offline';
    return diff <= WG_HANDSHAKE_INTERVAL_SECONDS * 1000 ? 'online' : 'offline';
}

/**
 * Copy an already-rendered <img> by selecting it and calling execCommand. This is the only
 * way to put an image on the clipboard without a secure context (navigator.clipboard is
 * undefined over plain http on a LAN). It must run synchronously inside the click handler.
 */
function copyImageSelection(img: HTMLImageElement): void {
    const range = document.createRange();
    range.selectNode(img);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    try {
        if (!document.execCommand('copy')) throw new Error('Copy to clipboard failed');
    } finally {
        selection?.removeAllRanges();
    }
}

export default function ClientCard({
    client,
    intl,
    serverAddress,
}: {
    client: ClientWithStatus;
    intl: Messages;
    serverAddress?: string;
}) {
    const { deleteClient, updateClient, locale } = useApp();
    const { message } = App.useApp();
    const [showQr, setShowQr] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [form] = Form.useForm();
    const qrBoxRef = useRef<HTMLDivElement>(null);

    // Trigger the download in place. window.open() pointed a new tab at the file, which flashed a
    // blank page before the browser worked out it was an attachment and downloaded it instead.
    const downloadConfig = () => {
        const link = document.createElement('a');
        link.href = `/api/clients/${client.id}/config`;
        link.download = ''; // empty value = let the server's Content-Disposition name the file
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    // Copies the QR image itself (not the config text) so it can be pasted into a chat.
    const copyQr = async () => {
        const qrSrc = `/api/clients/${client.id}/qr`;
        const renderedImage = () => {
            const img = qrBoxRef.current?.querySelector('img');
            if (!img) throw new Error('QR code is not ready yet');
            return img;
        };

        // Preferred path: the async clipboard API, available on https or http://localhost.
        if (window.isSecureContext && navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
            try {
                const png = fetch(qrSrc).then((response) => {
                    if (!response.ok) throw new Error('Failed to load QR code');
                    return response.blob();
                });
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
                message.success('QR code copied');
                return;
            } catch (error) {
                console.error('Clipboard API failed, falling back to selection copy:', error);
            }
        }

        try {
            copyImageSelection(renderedImage());
            message.success('QR code copied');
        } catch (error) {
            console.error('Error copying QR code:', error);
            message.error('Could not copy the QR code - use Download config instead');
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await deleteClient(client.id);
            message.success('Client deleted');
        } catch (error) {
            console.error('Error deleting client:', error);
            message.error(errorMessage(error));
        } finally {
            setDeleting(false);
        }
    };

    const openEdit = () => {
        form.setFieldsValue({ description: client.description });
        setEditOpen(true);
    };

    const handleUpdate = async (values: { description: string }) => {
        setSaving(true);
        try {
            await updateClient(client.id, values);
            message.success('Client updated');
            setEditOpen(false);
        } catch (error) {
            console.error('Error updating client:', error);
            message.error(errorMessage(error));
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
    const lastSeen = formatLastSeen(client.last_handshake, locale);
    const received = formatBytes(client.transfer_rx);
    const sent = formatBytes(client.transfer_tx);

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
                    <span className="wg-kv-label">{intl['endpoint_ip']}</span>
                    <span className="wg-kv-value">{client.endpoint || '-'}</span>
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

            <div className="wg-actions">
                <Tooltip title={intl['download_config'] || 'Download Config'}>
                    <button
                        type="button"
                        className="wg-icon-btn"
                        onClick={downloadConfig}
                        aria-label={intl['download_config'] || 'Download Config'}
                    >
                        <FileTextOutlined />
                    </button>
                </Tooltip>
                <Tooltip title={intl['show_qr'] || 'Show QR Code'}>
                    <button
                        type="button"
                        className="wg-icon-btn"
                        onClick={() => setShowQr(true)}
                        aria-label={intl['show_qr'] || 'Show QR Code'}
                    >
                        <QrcodeOutlined />
                    </button>
                </Tooltip>
                <Tooltip title="Email">
                    <button type="button" className="wg-icon-btn" aria-label="Email">
                        <MailOutlined />
                    </button>
                </Tooltip>
            </div>

            <Modal
                title={client.description}
                open={showQr}
                onCancel={() => setShowQr(false)}
                footer={null}
                width={360}
                centered
            >
                <div className="wg-scan">
                    <div className="wg-scan-qr" ref={qrBoxRef}>
                        <Image
                            src={`/api/clients/${client.id}/qr`}
                            alt="WireGuard config QR code"
                            width={260}
                            preview={false}
                        />
                    </div>
                    <div className="wg-scan-meta">
                        <div className="wg-scan-ip">{client.client_ip}</div>
                        {serverAddress && <div className="wg-scan-endpoint">{serverAddress}</div>}
                    </div>
                    <p className="wg-scan-hint">{intl['scan_hint']}</p>
                    <div className="wg-scan-actions">
                        <button type="button" className="wg-pill" onClick={downloadConfig}>
                            <FileTextOutlined /> <span>{intl['download_config'] || 'Config'}</span>
                        </button>
                        <button type="button" className="wg-pill" onClick={copyQr}>
                            <CopyOutlined /> <span>{intl['copy_qr']}</span>
                        </button>
                    </div>
                </div>
            </Modal>

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
