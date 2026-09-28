'use client';

import CreateInstance from './util/CreateInstance.jsx';
import { useApp } from './AppContext.jsx';

export default function Home() {
    const { intl } = useApp();

    return (
        <div>
            <div className="wg-page-header">
                <h1 className="wg-page-title">WireGuard</h1>
            </div>
            <p style={{ color: 'var(--wg-muted)', marginTop: 0 }}>{intl['wireguard_gui']}</p>
            <CreateInstance intl={intl} />
        </div>
    );
}
