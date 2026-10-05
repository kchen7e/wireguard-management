'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { DashboardOutlined, UserOutlined } from '@ant-design/icons';
import { App, ConfigProvider, Layout, Menu, Switch } from 'antd';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { AppContext } from './AppContext';
import type { AddClientInput, CreateInstanceInput } from './AppContext';
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, Language } from './intl';
import type { Client, Instance } from './types';
import { themeConfig } from './theme';
import { apiRequest } from './util/api';
import packageJson from '../../package.json';

const { Content, Footer, Sider } = Layout;

const NARROW_BREAKPOINT = '(max-width: 900px)';

export default function AppShell({ children }: { children: ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const [narrow, setNarrow] = useState(false);
    const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
    const [instances, setInstances] = useState<Instance[]>([]);
    const [instancesById, setInstancesById] = useState<Record<string, Instance>>({});
    const [clientsByInstance, setClientsByInstance] = useState<Record<string, Client[]>>({});
    const pathname = usePathname();

    const isCollapsed = collapsed || narrow;

    const intl = language.messages;
    const locale = language.key === Language.ZH.key ? 'zh-CN' : 'en-GB';

    const refreshInstances = useCallback(async () => {
        try {
            const payload = await apiRequest<{ data: Instance[] }>('/api/instances');
            const list = payload.data || [];
            setInstances(list);
            setInstancesById((prev) => {
                const next = { ...prev };
                for (const instance of list) {
                    next[instance.id] = instance;
                }
                return next;
            });
        } catch (error) {
            console.error('Error fetching instances:', error);
            setInstances([]);
        }
    }, []);

    const loadInstance = useCallback(async (id: string): Promise<Instance> => {
        const payload = await apiRequest<{ data: Instance }>(`/api/instances/${id}`);
        const instance = payload.data;
        if (!instance) {
            throw new Error('Instance not found');
        }
        setInstancesById((prev) => ({ ...prev, [id]: instance }));
        return instance;
    }, []);

    const loadClients = useCallback(async (instanceId: string | number): Promise<Client[]> => {
        const clientsPayload = await apiRequest<{ data: Client[] }>(`/api/instances/${instanceId}/clients`);
        const list = clientsPayload.data || [];
        setClientsByInstance((prev) => ({ ...prev, [instanceId]: list }));
        return list;
    }, []);

    const addClient = useCallback(async (instanceId: string | number, values: AddClientInput): Promise<Client> => {
        const payload = await apiRequest<{ data: Client }>(`/api/instances/${instanceId}/clients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                description: values.description,
                clientIp: values.clientIp,
            }),
        });
        const created = payload.data!;
        setClientsByInstance((prev) => ({
            ...prev,
            [instanceId]: [...(prev[instanceId] || []), created],
        }));
        return created;
    }, []);

    const updateClient = useCallback(
        async (clientId: string | number, values: { description: string }): Promise<Client> => {
            const payload = await apiRequest<{ data: Client }>(`/api/clients/${clientId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: values.description }),
            });
            const updated = payload.data!;
            setClientsByInstance((prev) => {
                const next: Record<string, Client[]> = { ...prev };
                for (const [instanceId, clients] of Object.entries(prev)) {
                    next[instanceId] = clients.map((client) =>
                        client.id === clientId ? { ...client, ...updated } : client
                    );
                }
                return next;
            });
            return updated;
        },
        []
    );

    const deleteClient = useCallback(async (clientId: string | number): Promise<void> => {
        await apiRequest(`/api/clients/${clientId}`, { method: 'DELETE' });
        setClientsByInstance((prev) => {
            const next: Record<string, Client[]> = {};
            for (const [instanceId, clients] of Object.entries(prev)) {
                next[instanceId] = clients.filter((client) => client.id !== clientId);
            }
            return next;
        });
    }, []);

    const createInstance = useCallback(async (values: CreateInstanceInput): Promise<Instance> => {
        const payload = await apiRequest<{ data: Instance }>('/api/instances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                container_name: values.containerName,
                server_vpn_ip: values.serverVpnIp,
                server_endpoint: values.serverEndpoint,
                dns: values.dns || null,
            }),
        });
        const created = payload.data!;
        setInstances((prev) => [...prev, created]);
        setInstancesById((prev) => ({ ...prev, [created.id]: created }));
        return created;
    }, []);

    useEffect(() => {
        refreshInstances();
    }, [refreshInstances]);

    useEffect(() => {
        const mq = window.matchMedia(NARROW_BREAKPOINT);
        const update = () => setNarrow(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
            if (saved === Language.ZH.key) {
                setLanguage(Language.ZH);
            } else if (saved === Language.EN.key) {
                setLanguage(Language.EN);
            }
        } catch (error) {
            // localStorage unavailable; keep the default language.
        }
    }, []);

    useEffect(() => {
        document.title = language.messages.wireguard_gui;
        document.documentElement.lang = locale;
    }, [language, locale]);

    const items = [
        {
            key: '/',
            icon: <DashboardOutlined />,
            label: <Link href="/">{intl['dashboard']}</Link>,
        },
        {
            key: 'instances',
            icon: <UserOutlined />,
            label: <span style={{ fontWeight: 700 }}>{intl['vpn_instances']}</span>,
            children: instances.map((instance) => ({
                key: `/instance/${instance.id}`,
                label: (
                    <Link href={`/instance/${instance.id}`} style={{ fontWeight: 600 }}>
                        {instance.container_name}
                    </Link>
                ),
            })),
        },
    ];

    const onLanguageChange = (checked: boolean) => {
        const next = checked ? Language.ZH : Language.EN;
        setLanguage(next);
        try {
            localStorage.setItem(LANGUAGE_STORAGE_KEY, next.key);
        } catch (error) {
            // localStorage unavailable; ignore.
        }
    };

    return (
        <AppContext.Provider
            value={{
                intl,
                locale,
                instances,
                instancesById,
                clientsByInstance,
                refreshInstances,
                loadInstance,
                loadClients,
                addClient,
                updateClient,
                deleteClient,
                createInstance,
            }}
        >
            <ConfigProvider theme={themeConfig}>
                <App component={false}>
                    <Layout style={{ minHeight: '100vh' }}>
                        <Sider
                            className="wg-sider"
                            width={220}
                            collapsedWidth={80}
                            collapsible={false}
                            collapsed={isCollapsed}
                            onCollapse={(value) => setCollapsed(value)}
                            style={{
                                background: 'var(--wg-yellow)',
                                borderRight: '2px solid var(--wg-ink)',
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100vh',
                                position: 'sticky',
                                top: 0,
                            }}
                        >
                            <div className="wg-brand">
                                <div className="wg-brand-logo">W</div>
                                {!isCollapsed && (
                                    <div className="wg-brand-text">
                                        <span className="wg-brand-name">WireGuard</span>
                                        <span className="wg-brand-version">v{packageJson.version}</span>
                                    </div>
                                )}
                            </div>
                            <Menu
                                mode="inline"
                                selectedKeys={[pathname]}
                                defaultOpenKeys={['instances']}
                                items={items}
                                style={{ background: 'transparent', border: 'none', flex: 1, overflow: 'auto' }}
                            />
                            <div className="wg-sider-footer">
                                <Switch
                                    size={isCollapsed ? 'small' : 'medium'}
                                    checkedChildren="中文"
                                    unCheckedChildren="En"
                                    checked={language === Language.ZH}
                                    onChange={onLanguageChange}
                                />
                                {!isCollapsed && (
                                    <img
                                        src="/dragon.webp"
                                        alt="WireGuard dragon"
                                        className="wg-dragon"
                                        width={240}
                                        height={135}
                                    />
                                )}
                            </div>
                        </Sider>
                        <Layout>
                            <Content style={{ margin: '24px' }}>
                                <div className="wg-panel">{children}</div>
                            </Content>
                            <Footer
                                style={{
                                    textAlign: 'center',
                                    color: 'var(--wg-muted)',
                                    padding: '12px 24px',
                                    background: 'transparent',
                                }}
                            >
                                WireGuard Management v{packageJson.version}
                            </Footer>
                        </Layout>
                    </Layout>
                </App>
            </ConfigProvider>
        </AppContext.Provider>
    );
}
