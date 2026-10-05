'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import Instance from '../../modules/Instance';
import { useApp } from '../../AppContext';
import { ApiError } from '../../util/api';
import type { Instance as InstanceType } from '../../types';

export default function InstancePage() {
    const params = useParams<{ id: string }>();
    const { intl, instancesById, loadInstance } = useApp();
    const [instance, setInstance] = useState<InstanceType | null>(() => instancesById[params.id] ?? null);
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
            .catch((err: ApiError) => {
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
