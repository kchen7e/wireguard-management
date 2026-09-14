import React, { useState } from 'react';
import { Button, Modal, Form, Input, Checkbox, message } from 'antd';

export default function AddUserTable({ instanceId, onClientAdded, intl }) {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [generatePsk, setGeneratePsk] = useState(true);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    const showModal = () => {
        setIsModalVisible(true);
    };

    const handleAddClient = async (values) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/instances/${instanceId}/clients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: values.description,
                    clientIp: values.clientIp,
                    allowedIPs: values.allowedIPs,
                    publicKey: values.publicKey,
                    privateKey: values.privateKey,
                    generatePsk: generatePsk,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add client');
            }

            const reloadResponse = await fetch(`/api/instances/${instanceId}/reload`, { method: 'POST' });
            if (!reloadResponse.ok) {
                const reloadError = await reloadResponse.json();
                throw new Error(reloadError.error || 'Failed to reload WireGuard config');
            }

            message.success('Client added and WireGuard config reloaded');
            setIsModalVisible(false);
            form.resetFields();
            onClientAdded();
        } catch (error) {
            console.error('Error adding client:', error);
            message.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <Button type="primary" onClick={showModal}>
                {intl['add_user'] || 'Add Client'}
            </Button>
            <Modal
                title={intl['add_user'] || 'Add Client'}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
            >
                <Form form={form} onFinish={handleAddClient} layout="vertical">
                    <Form.Item
                        label={intl['description'] || 'Description'}
                        name="description"
                        rules={[{ required: true, message: 'Please input the name!' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label={intl['allocated_ip'] || 'Allocated IP'}
                        name="clientIp"
                        rules={[{ required: true, message: 'Please input the allocated IP!' }]}
                    >
                        <Input placeholder="10.13.13.2/32" />
                    </Form.Item>
                    <Form.Item
                        label={intl['allowed_ips'] || 'Allowed IPs'}
                        name="allowedIPs"
                        initialValue="0.0.0.0/0"
                        rules={[{ required: true, message: 'Please input the allowed IP sources!' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label={intl['private_key'] || 'Private Key'}
                        name="privateKey"
                        rules={[{ required: true, message: 'Please input the private key!' }]}
                    >
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item
                        label={intl['public_key'] || 'Public Key'}
                        name="publicKey"
                        rules={[{ required: true, message: 'Please input the public key!' }]}
                    >
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item>
                        <Checkbox checked={generatePsk} onChange={(e) => setGeneratePsk(e.target.checked)}>
                            {intl['generate_psk'] || 'Generate PSK'}
                        </Checkbox>
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading}>
                            {intl['add_user'] || 'Add Client'}
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
