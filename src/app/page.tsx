'use client';

import CreateInstance from './util/CreateInstance';
import InstanceCard from './util/InstanceCard';
import { useApp } from './AppContext';

export default function Home() {
    const { intl, instances } = useApp();

    return (
        <div>
            <div className="wg-page-header">
                <h1 className="wg-page-title">WireGuard</h1>
            </div>
            <p style={{ color: 'var(--wg-muted)', marginTop: 0 }}>{intl['wireguard_gui']}</p>
            <CreateInstance intl={intl} />
            {instances.length > 0 && (
                <>
                    <h2 className="wg-page-title" style={{ margin: '24px 0 16px' }}>
                        {intl['vpn_instances']}
                    </h2>
                    <div className="wg-card-grid">
                        {instances.map((instance) => (
                            <InstanceCard key={instance.id} instance={instance} intl={intl} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
