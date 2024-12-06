import { useEffect, useState } from 'react';
import { Row, Col, Card, Collapse } from 'antd';
import { MailOutlined, QrcodeOutlined, FileTextOutlined } from '@ant-design/icons';
import AddUserTable from '../util/AddUserTable';

// const mockData = [
//     {
//         pubKey: '123456789abcdef',
//         ip: '192.168.1.1/32',
//         allowedIp: '0.0.0.0/0',
//         description: 'user1',
//         last_seen: '',
//         received: '',
//         sent: '',
//     },
//     {
//         pubKey: 'abcdef123456789',
//         ip: '192.168.1.2/32',
//         allowedIp: '0.0.0.0/0',
//         description: 'user2',
//         last_seen: '',
//         received: '',
//         sent: '',
//     },
//     {
//         pubKey: '789abcdef123456',
//         ip: '192.168.1.3/32',
//         allowedIp: '0.0.0.0/0',
//         description: 'user3',
//         last_seen: '',
//         received: '',
//         sent: '',
//     },
//     {
//         pubKey: 'fedcba987654321',
//         ip: '192.168.1.4/32',
//         allowedIp: '0.0.0.0/0',
//         description: 'user4',
//         last_seen: '',
//         received: '',
//         sent: '',
//     },
//     {
//         pubKey: '456789abcdef123',
//         ip: '192.168.1.5/32',
//         allowedIp: '0.0.0.0/0',
//         description: 'user5',
//         last_seen: '',
//         received: '',
//         sent: '',
//     },
// ];

const { Panel } = Collapse;

export default function Instance({ intl }) {
    const [users, setUsers] = useState([]);
    useEffect(() => {
        // setUsers((currentUsers) => [...currentUsers, ...mockData]);
        getWgConfig().then((response) => {
            let data = [];
            if (response.data.length > 0) {
                data = response.data;
            }
            setUsers((previous) => data);
        });
        // getWgRealTime().then((response) => {
        //     console.log(response);
        // });
        // getInstanceUptime().then((response) => {
        //     console.log(response);
        // });
    }, []);

    async function getWgConfig() {
        const result = {};
        try {
            const response = await fetch('/api/config');
            const content = await response.json();
            Object.assign(result, content);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
        return result;
    }

    async function getWgRealTime() {
        const result = {};
        try {
            const response = await fetch('/api/wg');
            const content = await response.json();
            Object.assign(result, content);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
        return result;
    }

    async function getInstanceUptime() {
        const result = {};
        try {
            const response = await fetch('/api/instance/1/uptime');
            const content = await response.json();
            Object.assign(result, content);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
        return result;
    }

    async function addUser() {}

    const displayUsers = () => {
        const result = [];
        for (const [index, user] of users.entries()) {
            result.push(
                <Col key={index}>
                    <Card
                        bordered={true}
                        style={{
                            border: '1px dashed grey',
                            // height: '20rem', // height based on root font size (e.g., 1rem = 16px)
                            width: '25rem', // width based on root font size
                        }}
                    >
                        <div>
                            {intl['user']}: {user.description}
                            <Collapse>
                                <Panel header={intl['pub_key']} key={user.publicKey}>
                                    <p style={{ wordWrap: 'break-word', margin: 0 }}>{user.publicKey}</p>
                                </Panel>
                            </Collapse>
                        </div>
                        <p>
                            {intl['ip']}: {user.ip}
                        </p>
                        <p>
                            {intl['allowed_source']}: {user.allowedIPs}
                        </p>
                        <p>{intl['last_seen']}: </p>
                        <p>{intl['received_data']}: </p>
                        <p>{intl['sent_data']}: </p>
                        <div
                            className="card-footer"
                            style={{ display: 'flex', justifyContent: 'space-around', marginTop: '16px' }}
                        >
                            <FileTextOutlined style={{ cursor: 'pointer' }} />
                            <QrcodeOutlined style={{ cursor: 'pointer' }} />
                            <MailOutlined style={{ cursor: 'pointer' }} />
                        </div>
                    </Card>
                </Col>
            );
        }
        return result;
    };

    return (
        <>
            <p>{`${intl['interface']}: wg0`}</p>
            <p>{`${intl['last_couter_reset']}: `}</p>
            <AddUserTable />
            <Row gutter={[10, 10]} style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap' }}>
                {displayUsers()}
            </Row>
        </>
    );
}
