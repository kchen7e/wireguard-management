import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input } from 'antd';

const AddUserTable = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

    const showModal = () => {
        setIsModalVisible(true);
    };

    const handleAddUser = (values) => {
        const newUser = {
            key: users.length + 1,
            description: values.description,
            ip: values.ip,
            allowedIPs: values.allowedIPs,
            pubKey: values.pubKey,
            privateKey: values.privateKey,
        };
        setIsModalVisible(false);
        form.resetFields();
    };

    return (
        <div>
            <Button type="primary" onClick={showModal}>
                Add User
            </Button>
            <Modal title="Add User" visible={isModalVisible} onCancel={() => setIsModalVisible(false)} footer={null}>
                <Form form={form} onFinish={handleAddUser}>
                    <Form.Item
                        label="Description"
                        name="description"
                        rules={[{ required: true, message: 'Please input the name!' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label="Allocated IP"
                        name="ip"
                        rules={[{ required: true, message: 'Please input the allocated IP!' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label="Allowed IPs"
                        name="allowedIPs"
                        rules={[{ required: true, message: 'Please input the allowed IP sources!' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label="Private Key"
                        name="privateKey"
                        rules={[{ required: true, message: 'Please input the private key!' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label="Public Key"
                        name="pubKey"
                        rules={[{ required: true, message: 'Please input the public key!' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            Add User
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default AddUserTable;
