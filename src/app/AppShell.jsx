'use client';

import { useCallback, useEffect, useState } from 'react';
import { PieChartOutlined, UserOutlined } from '@ant-design/icons';
import { ConfigProvider, Layout, Menu, Switch } from 'antd';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { AppContext } from './AppContext.jsx';
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, Language } from './intl';
import { themeConfig } from './theme';
import { apiRequest } from './util/api.js';

const { Content, Footer, Sider } = Layout;

export default function AppShell({ children }) {
    const [collapsed, setCollapsed] = useState(false);
    const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
    const [instances, setInstances] = useState([]);
    const [instancesById, setInstancesById] = useState({});
    const [clientsByInstance, setClientsByInstance] = useState({});
    const pathname = usePathname();

    const intl = language.messages;

    const refreshInstances = useCallback(async () => {
        try {
            const payload = await apiRequest('/api/instances');
            setInstances(payload.data || []);
        } catch (error) {
            console.error('Error fetching instances:', error);
            setInstances([]);
        }
    }, []);

    const loadInstance = useCallback(async (id) => {
        const payload = await apiRequest(`/api/instances/${id}`);
        const instance = payload.data;
        if (!instance) {
            throw new Error('Instance not found');
        }
        setInstancesById((prev) => ({ ...prev, [id]: instance }));
        return instance;
    }, []);

    const loadClients = useCallback(async (instanceId) => {
        const clientsPayload = await apiRequest(`/api/instances/${instanceId}/clients`);
        const clientCollect = clientsPayload.data || [];
        setClientsByInstance((prev) => ({ ...prev, [instanceId]: clientCollect }));
        return clientCollect;
    }, []);

    const addClient = useCallback(async (instanceId, values) => {
        const payload = await apiRequest(`/api/instances/${instanceId}/clients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                description: values.description,
                clientIp: values.clientIp,
            }),
        });
        const created = payload.data;
        setClientsByInstance((prev) => ({
            ...prev,
            [instanceId]: [...(prev[instanceId] || []), created],
        }));
        return created;
    }, []);

    const updateClient = useCallback(async (clientId, values) => {
        const payload = await apiRequest(`/api/clients/${clientId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: values.description }),
        });
        const updated = payload.data;
        setClientsByInstance((prev) => {
            const next = { ...prev };
            for (const [instanceId, clients] of Object.entries(prev)) {
                next[instanceId] = clients.map((client) =>
                    client.id === clientId ? { ...client, ...updated } : client
                );
            }
            return next;
        });
        return updated;
    }, []);

    const deleteClient = useCallback(async (clientId) => {
        await apiRequest(`/api/clients/${clientId}`, { method: 'DELETE' });
        setClientsByInstance((prev) => {
            const next = {};
            for (const [instanceId, clients] of Object.entries(prev)) {
                next[instanceId] = clients.filter((client) => client.id !== clientId);
            }
            return next;
        });
    }, []);

    const createInstance = useCallback(async (values) => {
        const payload = await apiRequest('/api/instances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                container_name: values.containerName,
                server_vpn_ip: values.serverVpnIp,
                server_endpoint: values.serverEndpoint,
                server_listen_port: values.serverListenPort,
                load_balancer_ip: values.loadBalancerIp || null,
                dns: values.dns || null,
            }),
        });
        const created = payload.data;
        setInstances((prev) => [...prev, created]);
        setInstancesById((prev) => ({ ...prev, [created.id]: created }));
        return created;
    }, []);

    useEffect(() => {
        refreshInstances();
    }, [refreshInstances]);

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

    const items = [
        {
            key: '/',
            icon: <PieChartOutlined />,
            label: <Link href="/">{intl['home']}</Link>,
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

    const onLanguageChange = (checked) => {
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
                <Layout style={{ minHeight: '100vh' }}>
                    <Sider
                        className="wg-sider"
                        width={280}
                        collapsible={false}
                        collapsed={collapsed}
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
                            {!collapsed && <span className="wg-brand-name">WireGuard</span>}
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
                                checkedChildren="中文"
                                unCheckedChildren="En"
                                checked={language === Language.ZH}
                                onChange={onLanguageChange}
                            />
                            <img src="/dragon.webp" alt="WireGuard dragon" className="wg-dragon" width={240} height={135} />
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
                            WireGuard GUI
                        </Footer>
                    </Layout>
                </Layout>
            </ConfigProvider>
        </AppContext.Provider>
    );
}
