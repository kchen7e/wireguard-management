import Link from 'next/link';

export default function InstanceCard({ instance, intl }) {
    return (
        <div className="wg-card" style={{ width: '26rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="wg-avatar">{(instance.container_name || '?')[0].toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                        style={{
                            fontWeight: 800,
                            fontSize: '16px',
                            color: 'var(--wg-teal)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {instance.container_name}
                    </div>
                    <div style={{ marginTop: 6 }}>
                        <span className="wg-tag">
                            {intl['server_vpn_subnet']}: {instance.server_vpn_ip}
                        </span>
                    </div>
                </div>
            </div>

            <div className="wg-kv">
                <div className="wg-kv-row">
                    <span className="wg-kv-label">{intl['server_endpoint']}</span>
                    <span className="wg-kv-value">{instance.server_endpoint}</span>
                </div>
                <div className="wg-kv-row">
                    <span className="wg-kv-label">{intl['server_listen_port']}</span>
                    <span className="wg-kv-value">{instance.server_listen_port}</span>
                </div>
                {instance.dns && (
                    <div className="wg-kv-row">
                        <span className="wg-kv-label">{intl['dns']}</span>
                        <span className="wg-kv-value">{instance.dns}</span>
                    </div>
                )}
                {instance.load_balancer_ip && (
                    <div className="wg-kv-row">
                        <span className="wg-kv-label">{intl['load_balancer_ip']}</span>
                        <span className="wg-kv-value">{instance.load_balancer_ip}</span>
                    </div>
                )}
            </div>

            <div className="wg-actions">
                <Link href={`/instance/${instance.id}`} className="wg-pill primary" style={{ textDecoration: 'none' }}>
                    {intl['view_instance']}
                </Link>
            </div>
        </div>
    );
}
