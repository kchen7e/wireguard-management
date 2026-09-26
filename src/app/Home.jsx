import { useCallback, useEffect, useState } from 'react';
import { PieChartOutlined, UserOutlined } from '@ant-design/icons';
import { Layout, Menu, theme, Switch } from 'antd';

import Instance from './modules/Instance.jsx';
import CreateInstance from './util/CreateInstance.jsx';
import { CN_ZH, EN_GB } from './intl';

const { Content, Footer, Sider } = Layout;

export default function App() {
    const [collapsed, setCollapsed] = useState(false);
    const [selectedKey, setSelectedKey] = useState('1');
    const [intl, setIntl] = useState(EN_GB);
    const [instances, setInstances] = useState([]);

    const fetchInstances = useCallback(() => {
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
        fetchInstances();
    }, [fetchInstances]);

    function getItem(label, key, icon, children) {
        return {
            key,
            icon,
            children,
            label,
        };
    }

    const instanceMenuItems = instances.map((instance) => getItem(instance.container_name, `instance-${instance.id}`));

    const items = [
        getItem(intl['home'], '1', <PieChartOutlined />),
        getItem(intl['vpn_instances'], 'sub1', <UserOutlined />, instanceMenuItems),
    ];

    const selectedInstance = instances.find((instance) => `instance-${instance.id}` === selectedKey);

    const renderContent = () => {
        if (selectedKey === '1') {
            return (
                <div>
                    <p>Home Content</p>
                    <CreateInstance intl={intl} onCreated={fetchInstances} />
                </div>
            );
        }
        if (selectedInstance) {
            return <Instance intl={intl} instance={selectedInstance} />;
        }
        return <div>Not Found</div>;
    };

    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    const handleMenuClick = (e) => {
        setSelectedKey(e.key);
    };

    const onLanguageChange = (checked) => {
        setIntl(checked ? CN_ZH : EN_GB);
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider collapsible={false} collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
                <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline" items={items} onClick={handleMenuClick} />
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
                        {renderContent()}
                    </div>
                </Content>
                <Footer style={{ textAlign: 'center' }}>
                    Ant Design ©{new Date().getFullYear()} Created by Ant UED
                </Footer>
            </Layout>
        </Layout>
    );
}
