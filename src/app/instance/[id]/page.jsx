'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import Instance from '../../modules/Instance.jsx';
import { useApp } from '../../AppContext.jsx';

export default function InstancePage() {
    const params = useParams();
    const { intl } = useApp();
    const [instance, setInstance] = useState(null);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch(`/api/instances/${params.id}`)
            .then((res) => res.json())
            .then((payload) => {
                if (cancelled) return;
                if (payload.data) {
                    setInstance(payload.data);
                } else {
                    setNotFound(true);
                }
            })
            .catch(() => {
                if (!cancelled) setNotFound(true);
            });
        return () => {
            cancelled = true;
        };
    }, [params.id]);

    if (notFound) return <div>Not Found</div>;
    if (!instance) return null;

    return <Instance intl={intl} instance={instance} />;
}
