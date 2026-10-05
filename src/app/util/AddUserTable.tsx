import { useState } from 'react';
import { Button, Modal, Form, Input, message } from 'antd';
import { UserAddOutlined } from '@ant-design/icons';
import { isIpInSubnet, parseCidr } from './ip';
import { isValidDescription } from './name';
import { errorMessage } from './errors';
import { useApp } from '../AppContext';
import type { AddClientInput } from '../AppContext';
import type { Messages } from '../intl';

export default function AddUserTable({
    instanceId,
    subnet,
    intl,
}: {
    instanceId: number;
    subnet: string;
    intl: Messages;
}) {
    const { addClient } = useApp();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    const handleAddClient = async (values: AddClientInput) => {
        setLoading(true);
        try {
            await addClient(instanceId, values);
            message.success('Client added');
            setOpen(false);
            form.resetFields();
        } catch (error) {
            console.error('Error adding client:', error);
            message.error(errorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <Button type="primary" icon={<UserAddOutlined />} onClick={() => setOpen(true)}>
                {intl['add_user'] || 'Add Client'}
            </Button>
            <Modal title={intl['add_user'] || 'Add Client'} open={open} onCancel={() => setOpen(false)} footer={null}>
                <Form form={form} onFinish={handleAddClient} layout="vertical">
                    <Form.Item
                        label={intl['description'] || 'Description'}
                        name="description"
                        rules={[
                            { required: true, message: 'Please input the description!' },
                            {
                                validator: (_, value) => {
                                    if (!value) return Promise.resolve();
                                    if (!isValidDescription(value)) {
                                        return Promise.reject(
                                            new Error('Letters, digits, spaces and ._- only (e.g. Alice)')
                                        );
                                    }
                                    return Promise.resolve();
                                },
                            },
                        ]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label={intl['allocated_ip'] || 'Allocated IP'}
                        name="clientIp"
                        rules={[
                            { required: true, message: 'Please input the allocated IP!' },
                            {
                                validator: (_, value) => {
                                    if (!value) return Promise.resolve();
                                    const parsed = parseCidr(value);
                                    if (!parsed) return Promise.reject(new Error('Invalid IP address'));
                                    if (parsed.prefix !== 32) {
                                        return Promise.reject(new Error('Must be a single host (e.g. 10.13.13.4)'));
                                    }
                                    if (!isIpInSubnet(parsed.ip, subnet)) {
                                        return Promise.reject(new Error(`Must be within ${subnet}`));
                                    }
                                    return Promise.resolve();
                                },
                            },
                        ]}
                    >
                        <Input placeholder="10.13.13.4" />
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
