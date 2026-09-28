import { useEffect, useState } from 'react';
import { Row, Col } from 'antd';
import AddUserTable from '../util/AddUserTable.jsx';
import ClientCard from '../util/ClientCard.jsx';
import { useApp } from '../AppContext.jsx';

export default function Instance({ intl, instance }) {
    const { clientsByInstance, loadClients } = useApp();
    const clients = clientsByInstance[instance.id] || [];
    const [error, setError] = useState(null);

    useEffect(() => {
        if (clientsByInstance[instance.id]) {
            setError(null);
            return;
        }
        let cancelled = false;
        loadClients(instance.id).catch((err) => {
            if (!cancelled) setError(err.message);
        });
        return () => {
            cancelled = true;
        };
    }, [clientsByInstance, loadClients, instance.id]);

    return (
        <>
            <p>{`${intl['server_ip']}: ${instance.server_address}`}</p>
            <p>{`${intl['last_counter_reset']}: `}</p>
            {error && <p style={{ color: '#ff4d4f' }}>{error}</p>}
            <AddUserTable instanceId={instance.id} subnet={instance.server_address} intl={intl} />
            <Row gutter={[10, 10]} style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap' }}>
                {clients.map((client) => (
                    <Col key={client.id}>
                        <ClientCard client={client} intl={intl} />
                    </Col>
                ))}
            </Row>
        </>
    );
}
