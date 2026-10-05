import { useEffect, useState } from 'react';
import { Spin, Collapse } from 'antd';
import AddUserTable from '../util/AddUserTable';
import ClientCard from '../util/ClientCard';
import { apiRequest } from '../util/api';
import { CLIENT_STATUS_POLL_INTERVAL_MS } from '../util/constants';
import { useApp } from '../AppContext';
import type { Messages } from '../intl';
import type { ClientStatus, ClientWithStatus, Instance } from '../types';

export default function Instance({ intl, instance }: { intl: Messages; instance: Instance }) {
    const { clientsByInstance, loadClients } = useApp();
    const clients = clientsByInstance[instance.id];
    const [error, setError] = useState<string | null>(null);
    const [statusByClientId, setStatusByClientId] = useState<Record<string, ClientStatus>>({});
    const loading = !clients && !error;

    useEffect(() => {
        if (clientsByInstance[instance.id]) {
            setError(null);
            return;
        }
        let cancelled = false;
        loadClients(instance.id).catch((err: Error) => {
            if (!cancelled) setError(err.message);
        });
        return () => {
            cancelled = true;
        };
    }, [clientsByInstance, loadClients, instance.id]);

    useEffect(() => {
        let cancelled = false;

        const pollStatus = async () => {
            try {
                const payload = await apiRequest<{ data: ClientStatus[] }>(`/api/instances/${instance.id}/wg`);
                const list = payload.data || [];
                const next: Record<string, ClientStatus> = {};
                for (const item of list) {
                    next[item.id] = item;
                }
                if (!cancelled) setStatusByClientId(next);
            } catch (err) {
                console.error('Error fetching client status:', err);
            }
        };

        pollStatus();
        const timer = setInterval(pollStatus, CLIENT_STATUS_POLL_INTERVAL_MS);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [instance.id]);

    const clientsWithStatus = (clients ?? []).map((client) => {
        const status = statusByClientId[client.id];
        return { ...client, ...(status ?? {}) } as ClientWithStatus;
    });

    return (
        <>
            <div className="wg-page-header">
                <h1 className="wg-page-title">{instance.container_name}</h1>
                <span className="wg-tag">
                    {intl['server_vpn_subnet']}: {instance.server_vpn_ip}
                </span>
            </div>
            {instance.server_public_key && (
                <Collapse
                    ghost
                    expandIconPlacement="start"
                    style={{ maxWidth: '30rem', marginTop: -12, marginBottom: '1.5rem' }}
                    styles={{
                        header: { paddingLeft: 0, paddingTop: 0, paddingBottom: 0 },
                        body: { paddingTop: 0, paddingLeft: 0, paddingRight: 0 },
                    }}
                    items={[
                        {
                            key: instance.server_public_key,
                            label: intl['pub_key'],
                            children: <p style={{ wordWrap: 'break-word', margin: 0 }}>{instance.server_public_key}</p>,
                        },
                    ]}
                />
            )}
            {error && <p style={{ color: 'var(--wg-ink)' }}>{error}</p>}
            <AddUserTable instanceId={instance.id} subnet={instance.server_vpn_ip} intl={intl} />
            {loading && <Spin style={{ marginTop: '1rem', display: 'block' }} />}
            <div className="wg-card-grid" style={{ marginTop: '1.5rem' }}>
                {clientsWithStatus.map((client) => (
                    <ClientCard key={client.id} client={client} intl={intl} />
                ))}
            </div>
        </>
    );
}
