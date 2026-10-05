import { useEffect, useState } from 'react';
import { App, Button, Col, Modal, Form, Input, Row } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { isValidServerCidr } from './ip';
import { isValidInstanceName } from './name';
import { errorMessage } from './errors';
import { useApp } from '../AppContext';
import type { CreateInstanceInput } from '../AppContext';
import { apiRequest } from './api';
import type { Messages } from '../intl';
import type { LbMode } from '../types';

interface AllocationPreview {
    mode: LbMode;
    load_balancer_ip: string | null;
    next_listen_port: number | null;
}

export default function CreateInstance({ intl }: { intl: Messages }) {
    const { createInstance } = useApp();
    const { message } = App.useApp();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [lbMode, setLbMode] = useState<LbMode | null>(null);
    const [loadBalancerIp, setLoadBalancerIp] = useState<string | null>(null);
    const [nextListenPort, setNextListenPort] = useState<number | null>(null);
    const [form] = Form.useForm();

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        apiRequest<{ data: AllocationPreview }>('/api/instances/lb-pool')
            .then((payload) => {
                if (cancelled) return;
                setLbMode(payload.data.mode);
                setLoadBalancerIp(payload.data.load_balancer_ip);
                setNextListenPort(payload.data.next_listen_port);
            })
            .catch((error) => {
                if (!cancelled) console.error('Error resolving next allocation:', error);
            });
        return () => {
            cancelled = true;
        };
    }, [open]);

    const handleCreate = async (values: CreateInstanceInput) => {
        setLoading(true);
        try {
            await createInstance(values);
            message.success('Instance created');
            setOpen(false);
            form.resetFields();
        } catch (error) {
            console.error('Error creating instance:', error);
            message.error(errorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
                {intl['create_new_instance']}
            </Button>
            <Modal
                title={intl['create_new_instance']}
                open={open}
                onCancel={() => setOpen(false)}
                footer={null}
                style={{ top: 'clamp(1rem, 8vh, 4.5rem)' }}
            >
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
                    <Form.Item label={intl['dns']} name="dns">
                        <Input placeholder="1.1.1.1" />
                    </Form.Item>
                    {(loadBalancerIp || nextListenPort) && (
                        <Row gutter={16}>
                            {loadBalancerIp && (
                                <Col xs={24} sm={nextListenPort ? 12 : 24}>
                                    <Form.Item
                                        label={intl['load_balancer_ip']}
                                        extra={
                                            lbMode === 'shared'
                                                ? intl['load_balancer_ip_shared']
                                                : intl['auto_assigned']
                                        }
                                    >
                                        <Input value={loadBalancerIp} disabled />
                                    </Form.Item>
                                </Col>
                            )}
                            {nextListenPort && (
                                <Col xs={24} sm={loadBalancerIp ? 12 : 24}>
                                    <Form.Item label={intl['server_listen_port']} extra={intl['auto_assigned']}>
                                        <Input value={nextListenPort} disabled />
                                    </Form.Item>
                                </Col>
                            )}
                        </Row>
                    )}

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
