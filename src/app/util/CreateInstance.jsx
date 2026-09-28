import { useState } from 'react';
import { Button, Modal, Form, Input, InputNumber, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { isValidIpv4, isValidServerCidr } from './ip.js';
import { isValidInstanceName } from './name.js';
import { useApp } from '../AppContext.jsx';

export default function CreateInstance({ intl }) {
    const { createInstance } = useApp();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

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
                        label={intl['server_vpn_ip']}
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
                    <Form.Item
                        label={intl['server_listen_port']}
                        name="serverListenPort"
                        extra="Leave blank to auto-assign a unique port"
                    >
                        <InputNumber min={1} max={65535} style={{ width: '100%' }} placeholder="auto" />
                    </Form.Item>
                    <Form.Item
                        label={intl['load_balancer_ip']}
                        name="loadBalancerIp"
                        extra="Leave blank to auto-assign from the MetalLB pool"
                        rules={[
                            {
                                validator: (_, value) => {
                                    if (!value) return Promise.resolve();
                                    if (!isValidIpv4(value)) {
                                        return Promise.reject(new Error('Must be a valid IPv4 address'));
                                    }
                                    return Promise.resolve();
                                },
                            },
                        ]}
                    >
                        <Input placeholder="192.168.249.201" />
                    </Form.Item>
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
