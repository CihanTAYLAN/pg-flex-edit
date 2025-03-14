"use client";

import { useEffect, useState } from "react";
import { getActiveConnection } from "@/lib/session";
import { ConnectionDetails } from "@/components/connection-form";
import { Card, Row, Col, Statistic, Typography, Spin, Alert } from "antd";
import { DatabaseOutlined, TableOutlined, UserOutlined, FieldTimeOutlined } from "@ant-design/icons";

const { Title } = Typography;

interface ServerInfo {
    version: string;
    uptime: string;
    databases: number;
    totalTables: number;
    activeConnections: number;
    size: string;
}

export default function ServerOverviewPage() {
    const [connection, setConnection] = useState<ConnectionDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);

    useEffect(() => {
        const activeConnection = getActiveConnection();
        setConnection(activeConnection);

        if (activeConnection) {
            loadServerInfo();
        } else {
            setError("No active connection");
            setLoading(false);
        }
    }, []);

    const loadServerInfo = async () => {
        setLoading(true);
        setError(null);

        try {
            // Burada sunucu bilgilerini yükleyecek API çağrısı yapılabilir
            // Şimdilik örnek veri kullanıyoruz
            setTimeout(() => {
                setServerInfo({
                    version: "PostgreSQL 14.5",
                    uptime: "10 days, 5 hours",
                    databases: 5,
                    totalTables: 42,
                    activeConnections: 3,
                    size: "1.2 GB"
                });
                setLoading(false);
            }, 1000);
        } catch (err) {
            console.error("Error loading server info:", err);
            setError("Failed to load server information");
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spin size="large" />
            </div>
        );
    }

    if (error) {
        return <Alert message={error} type="error" showIcon />;
    }

    return (
        <div className="space-y-6">
            <div>
                <Title level={2}>Server Overview</Title>
                <p className="text-gray-500">
                    {connection?.host}:{connection?.port} - {connection?.username}
                </p>
            </div>

            {serverInfo && (
                <div className="flex flex-col gap-4">
                    <Card className="shadow-sm">
                        <Title level={4}>Server Information</Title>
                        <Row gutter={[16, 16]}>
                            <Col span={8}>
                                <Statistic
                                    title="PostgreSQL Version"
                                    value={serverInfo.version}
                                    prefix={<DatabaseOutlined />}
                                />
                            </Col>
                            <Col span={8}>
                                <Statistic
                                    title="Uptime"
                                    value={serverInfo.uptime}
                                    prefix={<FieldTimeOutlined />}
                                />
                            </Col>
                            <Col span={8}>
                                <Statistic
                                    title="Active Connections"
                                    value={serverInfo.activeConnections}
                                    prefix={<UserOutlined />}
                                />
                            </Col>
                        </Row>
                    </Card>

                    <Card className="shadow-sm">
                        <Title level={4}>Database Statistics</Title>
                        <Row gutter={[16, 16]}>
                            <Col span={8}>
                                <Statistic
                                    title="Databases"
                                    value={serverInfo.databases}
                                    prefix={<DatabaseOutlined />}
                                />
                            </Col>
                            <Col span={8}>
                                <Statistic
                                    title="Total Tables"
                                    value={serverInfo.totalTables}
                                    prefix={<TableOutlined />}
                                />
                            </Col>
                            <Col span={8}>
                                <Statistic
                                    title="Total Size"
                                    value={serverInfo.size}
                                    prefix={<DatabaseOutlined />}
                                />
                            </Col>
                        </Row>
                    </Card>
                </div>
            )}
        </div>
    );
} 