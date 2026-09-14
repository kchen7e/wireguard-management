import { useRef, useState } from 'react';
import { Button, Card, Collapse, Image, Popconfirm, message } from 'antd';
import { DeleteOutlined, FileTextOutlined, MailOutlined, QrcodeOutlined } from '@ant-design/icons';

const ACTION_WIDTH = 80;

export default function ClientCard({ client, intl, onDeleted }) {
    const [offset, setOffset] = useState(0);
    const [showQr, setShowQr] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const startX = useRef(null);
    const startOffset = useRef(0);

    const downloadConfig = () => {
        window.open(`/api/clients/${client.id}/config`, '_blank');
    };

    const onPointerDown = (e) => {
        startX.current = e.clientX;
        startOffset.current = offset;
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e) => {
        if (startX.current === null) return;
        const dx = e.clientX - startX.current;
        setOffset(Math.min(0, Math.max(-ACTION_WIDTH, startOffset.current + dx)));
    };

    const onPointerUp = () => {
        startX.current = null;
        setOffset((prev) => (prev < -ACTION_WIDTH / 2 ? -ACTION_WIDTH : 0));
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const response = await fetch(`/api/clients/${client.id}`, { method: 'DELETE' });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete client');
            }
            message.success('Client deleted');
            onDeleted();
        } catch (error) {
            console.error('Error deleting client:', error);
            message.error(error.message);
        } finally {
            setDeleting(false);
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
                        <MailOutlined style={{ cursor: 'pointer' }} />
                    </div>
                    {showQr && (
                        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                            <Image src={`/api/clients/${client.id}/qr`} alt="QR code" width={200} preview={false} />
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
