'use client';

import { useCallback, useEffect, useState } from 'react';
import { PieChartOutlined, UserOutlined } from '@ant-design/icons';
import { Layout, Menu, theme, Switch } from 'antd';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { AppContext } from './AppContext.jsx';
import { CN_ZH, EN_GB } from './intl';
import { apiRequest } from './util/api.js';

const { Content, Footer, Sider } = Layout;

export default function AppShell({ children }) {
    const [collapsed, setCollapsed] = useState(false);
    const [intl, setIntl] = useState(EN_GB);
    const [instances, setInstances] = useState([]);
    const [instancesById, setInstancesById] = useState({});
    const [clientsByInstance, setClientsByInstance] = useState({});
    const pathname = usePathname();

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
                server_address: values.serverAddress,
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

    const items = [
        {
            key: '/',
            icon: <PieChartOutlined />,
            label: <Link href="/">{intl['home']}</Link>,
        },
        {
            key: 'instances',
            icon: <UserOutlined />,
            label: intl['vpn_instances'],
            children: instances.map((instance) => ({
                key: `/instance/${instance.id}`,
                label: <Link href={`/instance/${instance.id}`}>{instance.container_name}</Link>,
            })),
        },
    ];

    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    const onLanguageChange = (checked) => {
        setIntl(checked ? CN_ZH : EN_GB);
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
            <Layout style={{ minHeight: '100vh' }}>
                <Sider collapsible={false} collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
                    <Menu
                        theme="dark"
                        mode="inline"
                        selectedKeys={[pathname]}
                        defaultOpenKeys={['instances']}
                        items={items}
                    />
                    <Switch
                        style={{ marginLeft: '1rem', marginTop: '2rem' }}
                        checkedChildren={'中文'}
                        unCheckedChildren={'En'}
                        onClick={onLanguageChange}
                    />
                </Sider>
                <Layout>
                    <Content style={{ margin: '0 5rem' }}>
                        <div
                            style={{
                                padding: 24,
                                background: colorBgContainer,
                                borderRadius: borderRadiusLG,
                                minHeight: 360,
                            }}
                        >
                            {children}
                        </div>
                    </Content>
                    <Footer style={{ textAlign: 'center' }}>
                        Ant Design ©{new Date().getFullYear()} Created by Ant UED
                    </Footer>
                </Layout>
            </Layout>
        </AppContext.Provider>
    );
}
