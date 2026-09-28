'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import Instance from '../../modules/Instance.jsx';
import { useApp } from '../../AppContext.jsx';

export default function InstancePage() {
    const params = useParams();
    const { intl, instancesById, loadInstance } = useApp();
    const [instance, setInstance] = useState(() => instancesById[params.id] || null);
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const cached = instancesById[params.id];
        if (cached) {
            setInstance(cached);
            setNotFound(false);
            setError(null);
            return;
        }

        let cancelled = false;
        loadInstance(params.id)
            .then((data) => {
                if (!cancelled) setInstance(data);
            })
            .catch((err) => {
                if (cancelled) return;
                if (err.status === 404) {
                    setNotFound(true);
                } else {
                    setError(err.message);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [params.id, loadInstance, instancesById]);

    if (notFound) return <div>Not Found</div>;
    if (error) return <div>{error}</div>;
    if (!instance) return null;

    return <Instance intl={intl} instance={instance} />;
}
