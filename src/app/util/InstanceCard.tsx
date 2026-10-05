import Link from 'next/link';
import { EyeOutlined } from '@ant-design/icons';
import type { Messages } from '../intl';
import type { Instance } from '../types';

export default function InstanceCard({ instance, intl }: { instance: Instance; intl: Messages }) {
    return (
        <div className="wg-card">
            <div className="wg-card-head">
                <div className="wg-avatar">{(instance.container_name || '?')[0].toUpperCase()}</div>
                <div className="wg-card-id">
                    <div className="wg-card-title">{instance.container_name}</div>
                    <div className="wg-card-sub">
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
                    <EyeOutlined /> <span className="wg-pill-label">{intl['view_instance']}</span>
                </Link>
            </div>
        </div>
    );
}
