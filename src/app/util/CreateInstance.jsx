import { useState } from 'react';
import { Button, Modal, Form, Input, InputNumber, message } from 'antd';

export default function CreateInstance({ intl, onCreated }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    const handleCreate = async (values) => {
        setLoading(true);
        try {
            const response = await fetch('/api/instances', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    container_name: values.containerName,
                    server_address: values.serverAddress,
                    server_endpoint: values.serverEndpoint,
                    server_listen_port: values.serverListenPort,
                    dns: values.dns || null,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create instance');
            }

            message.success('Instance created');
            setOpen(false);
            form.resetFields();
            onCreated();
        } catch (error) {
            console.error('Error creating instance:', error);
            message.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Button type="primary" onClick={() => setOpen(true)}>
                {intl['create_new_instance']}
            </Button>
            <Modal title={intl['create_new_instance']} open={open} onCancel={() => setOpen(false)} footer={null}>
                <Form form={form} onFinish={handleCreate} layout="vertical">
                    <Form.Item
                        label={intl['instance_name']}
                        name="containerName"
                        rules={[{ required: true, message: 'Please input the instance name!' }]}
                    >
                        <Input placeholder="wireguard-1" />
                    </Form.Item>
                    <Form.Item
                        label={intl['server_ip']}
                        name="serverAddress"
                        rules={[{ required: true, message: 'Please input the server IP!' }]}
                    >
                        <Input placeholder="10.13.13.1/24" />
                    </Form.Item>
                    <Form.Item
                        label={intl['server_endpoint']}
                        name="serverEndpoint"
                        rules={[{ required: true, message: 'Please input the server endpoint!' }]}
                    >
                        <Input placeholder="vpn.example.com" />
                    </Form.Item>
                    <Form.Item
                        label={intl['server_listen_port']}
                        name="serverListenPort"
                        initialValue={51820}
                        rules={[{ required: true, message: 'Please input the host port!' }]}
                    >
                        <InputNumber min={1} max={65535} style={{ width: '100%' }} />
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
