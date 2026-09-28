import { useEffect, useState } from 'react';
import { Button, Modal, Form, Input, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { isValidServerCidr } from './ip.js';
import { isValidInstanceName } from './name.js';
import { useApp } from '../AppContext.jsx';
import { apiRequest } from './api.js';

export default function CreateInstance({ intl }) {
    const { createInstance } = useApp();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [lbMode, setLbMode] = useState(null);
    const [nextLbIp, setNextLbIp] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        apiRequest('/api/instances/lb-pool')
            .then((payload) => {
                if (cancelled) return;
                setLbMode(payload.data.mode);
                setNextLbIp(payload.data.next_load_balancer_ip);
            })
            .catch((error) => {
                if (!cancelled) console.error('Error resolving load balancer pool:', error);
            });
        return () => {
            cancelled = true;
        };
    }, [open]);

    const handleCreate = async (values) => {
        setLoading(true);
        try {
            await createInstance(values);
            message.success('Instance created');
            setOpen(false);
            form.resetFields();
        } catch (error) {
            console.error('Error creating instance:', error);
            message.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
                {intl['create_new_instance']}
            </Button>
            <Modal title={intl['create_new_instance']} open={open} onCancel={() => setOpen(false)} footer={null}>
                <Form form={form} onFinish={handleCreate} layout="vertical">
                    <Form.Item
                        label={intl['instance_name']}
                        name="containerName"
                        rules={[
                            { required: true, message: 'Please input the instance name!' },
                            {
                                validator: (_, value) => {
                                    if (!value) return Promise.resolve();
                                    if (!isValidInstanceName(value)) {
                                        return Promise.reject(
                                            new Error('Lowercase letters, digits and hyphens only (e.g. wireguard-1)')
                                        );
                                    }
                                    return Promise.resolve();
                                },
                            },
                        ]}
                    >
                        <Input placeholder="wireguard-1" />
                    </Form.Item>
                    <Form.Item
                        label={intl['server_vpn_subnet']}
                        name="serverVpnIp"
                        initialValue="172.28.15.0/24"
                        rules={[
                            { required: true, message: 'Please input the server VPN IP!' },
                            {
                                validator: (_, value) => {
                                    if (!value) return Promise.resolve();
                                    if (!isValidServerCidr(value)) {
                                        return Promise.reject(
                                            new Error(
                                                'Must be a private network CIDR between /24 and /30 (e.g. 172.28.15.0/24)'
                                            )
                                        );
                                    }
                                    return Promise.resolve();
                                },
                            },
                        ]}
                    >
                        <Input placeholder="172.28.15.0/24" />
                    </Form.Item>
                    <Form.Item
                        label={intl['server_endpoint']}
                        name="serverEndpoint"
                        initialValue="wg.storm7e.de"
                        rules={[{ required: true, message: 'Please input the server endpoint!' }]}
                    >
                        <Input placeholder="wg.storm7e.de" />
                    </Form.Item>
                    {lbMode === 'dedicated' && nextLbIp && (
                        <Form.Item label={intl['load_balancer_ip']} extra={intl['load_balancer_ip_auto']}>
                            <Input value={nextLbIp} disabled />
                        </Form.Item>
                    )}
                    <Form.Item label={intl['dns']} name="dns">
                        <Input placeholder="1.1.1.1" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading}>
                            {intl['create_new_instance']}
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}
