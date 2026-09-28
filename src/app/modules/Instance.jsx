import { useEffect, useState, useCallback } from 'react';
import { Row, Col } from 'antd';
import AddUserTable from '../util/AddUserTable.jsx';
import ClientCard from '../util/ClientCard.jsx';

export default function Instance({ intl, instance }) {
    const [clients, setClients] = useState([]);

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

    return (
        <>
            <p>{`${intl['server_ip']}: ${instance.server_address}`}</p>
            <p>{`${intl['last_counter_reset']}: `}</p>
            <AddUserTable
                instanceId={instance.id}
                subnet={instance.server_address}
                onClientAdded={fetchClients}
                intl={intl}
            />
            <Row gutter={[10, 10]} style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap' }}>
                {clients.map((client) => (
                    <Col key={client.id}>
                        <ClientCard client={client} intl={intl} onChanged={fetchClients} />
                    </Col>
                ))}
            </Row>
        </>
    );
}
