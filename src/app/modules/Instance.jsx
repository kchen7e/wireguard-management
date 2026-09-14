import { useEffect, useState, useCallback } from 'react';
import { Row, Col, Card, Collapse, Image } from 'antd';
import { MailOutlined, QrcodeOutlined, FileTextOutlined } from '@ant-design/icons';
import AddUserTable from '../util/AddUserTable.jsx';

const { Panel } = Collapse;

export default function Instance({ intl, instance }) {
    const [clients, setClients] = useState([]);
    const [qrClientId, setQrClientId] = useState(null);

    const fetchClients = useCallback(async () => {
        try {
            const response = await fetch(`/api/instances/${instance.id}/clients`);
            const content = await response.json();
            let clientCollect = content.data || [];

            const statsResponse = await fetch(`/api/instances/${instance.id}/wg`);
            const statsContent = await statsResponse.json();
            const stats = statsContent.data || {};

            for (const [key, value] of Object.entries(stats)) {
                for (const collect of clientCollect) {
                    if (key === collect.public_key && value) {
                        if ('last_seen' in value) {
                            collect['last_seen'] = value['last_seen'];
                        }
                        if ('traffic_counter' in value) {
                            collect['traffic_counter'] = value['traffic_counter'];
                        }
                    }
                }
            }

            setClients(clientCollect);
        } catch (error) {
            console.error('Error fetching instance data:', error);
        }
    }, [instance.id]);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    const downloadConfig = (clientId) => {
        window.open(`/api/clients/${clientId}/config`, '_blank');
    };

    const showQr = (clientId) => {
        setQrClientId(clientId);
    };

    const displayClients = () => {
        return clients.map((client, index) => (
            <Col key={client.id || index}>
                <Card
                    bordered={true}
                    style={{
                        border: '1px dashed grey',
                        width: '25rem',
                    }}
                >
                    <div>
                        {intl['user']}: {client.description}
                        <Collapse>
                            <Panel header={intl['pub_key']} key={client.public_key}>
                                <p style={{ wordWrap: 'break-word', margin: 0 }}>{client.public_key}</p>
                            </Panel>
                        </Collapse>
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
                    <div
                        className="card-footer"
                        style={{ display: 'flex', justifyContent: 'space-around', marginTop: '16px' }}
                    >
                        <FileTextOutlined style={{ cursor: 'pointer' }} onClick={() => downloadConfig(client.id)} />
                        <QrcodeOutlined style={{ cursor: 'pointer' }} onClick={() => showQr(client.id)} />
                        <MailOutlined style={{ cursor: 'pointer' }} />
                    </div>
                    {qrClientId === client.id && (
                        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                            <Image src={`/api/clients/${client.id}/qr`} alt="QR code" width={200} preview={false} />
                        </div>
                    )}
                </Card>
            </Col>
        ));
    };

    return (
        <>
            <p>{`${intl['interface']}: ${instance.interface_name}`}</p>
            <p>{`${intl['last_counter_reset']}: `}</p>
            <AddUserTable instanceId={instance.id} onClientAdded={fetchClients} intl={intl} />
            <Row gutter={[10, 10]} style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap' }}>
                {displayClients()}
            </Row>
        </>
    );
}
