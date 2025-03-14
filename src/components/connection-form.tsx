"use client";

import { useState } from "react";
import { testConnection } from "@/lib/db";
import { Form, Input, Button, Alert } from "antd";
import { DatabaseOutlined } from "@ant-design/icons";

interface ConnectionFormProps {
    onConnect: (connectionDetails: ConnectionDetails) => void;
}

export interface ConnectionDetails {
    id?: string;
    name: string;
    host: string;
    port: number;
    username: string;
    password: string;
    database?: string;
}

export function ConnectionForm({ onConnect }: ConnectionFormProps) {
    const [form] = Form.useForm();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (values: ConnectionDetails) => {
        setIsLoading(true);
        setError(null);

        try {
            console.log("[ConnectionForm] Testing connection:", values);
            const result = await testConnection(values);
            console.log("[ConnectionForm] Connection result:", result);

            if (result.success && result.databases.length > 0) {
                // Use first database as default
                const connectionWithDb = {
                    ...values,
                    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
                    database: result.databases[0]
                };
                console.log("[ConnectionForm] Connecting with:", connectionWithDb);
                form.resetFields();
                onConnect(connectionWithDb);
            } else {
                setError("No databases found for this user. Please check your permissions.");
            }
        } catch (err) {
            console.error("[ConnectionForm] Connection error:", err);
            setError(err instanceof Error ? err.message : "Failed to connect to database server");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
                name: "",
                host: "localhost",
                port: 5432,
                username: "postgres",
                password: "",
            }}
            size="large"
            className="w-full"
        >
            <Form.Item
                label="Connection Name"
                name="name"
                rules={[{ required: true, message: "Please enter a connection name" }]}
            >
                <Input placeholder="My PostgreSQL Connection" prefix={<DatabaseOutlined />} />
            </Form.Item>

            <Form.Item
                label="Host"
                name="host"
                rules={[{ required: true, message: "Please enter the host" }]}
            >
                <Input placeholder="localhost" />
            </Form.Item>

            <div className="flex flex-row gap-4">
                <Form.Item
                    label="Port"
                    name="port"
                    rules={[{ required: true, message: "Please enter the port" }]}
                    className="w-full"
                >
                    <Input type="number" placeholder="5432" />
                </Form.Item>

                <Form.Item
                    label="Username"
                    name="username"
                    rules={[{ required: true, message: "Please enter the username" }]}
                    className="w-full"
                >
                    <Input placeholder="postgres" />
                </Form.Item>
            </div>

            <Form.Item
                label="Password"
                name="password"
            >
                <Input.Password placeholder="Enter password (optional)" />
            </Form.Item>

            {error && (
                <Form.Item>
                    <Alert message={error} type="error" showIcon />
                </Form.Item>
            )}

            <Form.Item>
                <Button
                    type="primary"
                    htmlType="submit"
                    loading={isLoading}
                    icon={<DatabaseOutlined />}
                    block
                    size="large"
                >
                    {isLoading ? "Connecting..." : "Connect"}
                </Button>
            </Form.Item>
        </Form>
    );
} 