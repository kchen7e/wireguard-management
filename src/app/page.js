'use client';

import CreateInstance from './util/CreateInstance.jsx';
import { useApp } from './AppContext.jsx';

export default function Home() {
    const { intl } = useApp();

    return (
        <div>
            <p>Home Content</p>
            <CreateInstance intl={intl} />
        </div>
    );
}
