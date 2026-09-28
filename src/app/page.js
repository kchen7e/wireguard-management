'use client';

import CreateInstance from './util/CreateInstance.jsx';
import { useApp } from './AppContext.jsx';

export default function Home() {
    const { intl, refreshInstances } = useApp();

    return (
        <div>
            <p>Home Content</p>
            <CreateInstance intl={intl} onCreated={refreshInstances} />
        </div>
    );
}
