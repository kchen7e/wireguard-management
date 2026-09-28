import { useEffect, useState } from 'react';
import { Row, Col, Spin } from 'antd';
import AddUserTable from '../util/AddUserTable.jsx';
import ClientCard from '../util/ClientCard.jsx';
import { useApp } from '../AppContext.jsx';

export default function Instance({ intl, instance }) {
    const { clientsByInstance, loadClients } = useApp();
    const clients = clientsByInstance[instance.id];
    const [error, setError] = useState(null);
    const loading = !clients && !error;

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
            <div className="wg-page-header">
                <h1 className="wg-page-title">{instance.container_name}</h1>
                <span className="wg-tag">
                    {intl['server_ip']}: {instance.server_address}
                </span>
            </div>
            {error && <p style={{ color: 'var(--wg-ink)' }}>{error}</p>}
            <AddUserTable instanceId={instance.id} subnet={instance.server_address} intl={intl} />
            {loading && <Spin style={{ marginTop: '1rem', display: 'block' }} />}
            <Row gutter={[16, 16]} style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap' }}>
                {(clients || []).map((client) => (
                    <Col key={client.id}>
                        <ClientCard client={client} intl={intl} />
                    </Col>
                ))}
            </Row>
        </>
    );
}
