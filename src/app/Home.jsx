import { useState } from 'react';
import { DesktopOutlined, FileOutlined, PieChartOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { Layout, Menu, theme, Switch } from 'antd';

import Instance from './modules/instance_1.jsx';
import { CN_ZH, EN_GB } from './intl';

const { Header, Content, Footer, Sider } = Layout;

export default function App() {
    const [collapsed, setCollapsed] = useState(false);
    const [selectedKey, setSelectedKey] = useState('1');
    const [intl, setIntl] = useState(EN_GB);
    function getItem(label, key, icon, children) {
        return {
            key,
            icon,
            children,
            label,
        };
    }

    const items = [
        getItem(intl['home'], '1', <PieChartOutlined />),
        getItem(intl['vpn_instances'], 'sub1', <UserOutlined />, [getItem(`${intl['instance']} 1`, '3')]),
    ];

    const keyToComponentMap = {
        1: () => <div>Home Content</div>,
        3: () => <Instance intl={intl} />,
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
                {/* <Header style={{ padding: 0, background: colorBgContainer }} /> */}
                <Content style={{ margin: '0 5rem' }}>
                    <div
                        style={{
                            padding: 24,
                            background: colorBgContainer,
                            borderRadius: borderRadiusLG,
                            minHeight: 360,
                        }}
                    >
                        {keyToComponentMap[selectedKey] ? keyToComponentMap[selectedKey]() : <div>Not Found</div>}
                    </div>
                </Content>
                <Footer style={{ textAlign: 'center' }}>
                    Ant Design ©{new Date().getFullYear()} Created by Ant UED
                </Footer>
            </Layout>
        </Layout>
    );
}
