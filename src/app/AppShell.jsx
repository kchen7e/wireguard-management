'use client';

import { useCallback, useEffect, useState } from 'react';
import { PieChartOutlined, UserOutlined } from '@ant-design/icons';
import { Layout, Menu, theme, Switch } from 'antd';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { AppContext } from './AppContext.jsx';
import { CN_ZH, EN_GB } from './intl';

const { Content, Footer, Sider } = Layout;

export default function AppShell({ children }) {
    const [collapsed, setCollapsed] = useState(false);
    const [intl, setIntl] = useState(EN_GB);
    const [instances, setInstances] = useState([]);
    const pathname = usePathname();

    const refreshInstances = useCallback(() => {
        fetch('/api/instances')
            .then((res) => res.json())
            .then((payload) => {
                if (payload.data) {
                    setInstances(payload.data);
                }
            })
            .catch((error) => console.error('Error fetching instances:', error));
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
        <AppContext.Provider value={{ intl, instances, refreshInstances }}>
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
