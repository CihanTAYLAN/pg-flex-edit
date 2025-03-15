"use client";

import { useEffect, useState } from "react";
import { getActiveConnection } from "@/lib/session";
import { getServerInfo } from "@/lib/db";
import { ConnectionDetails } from "@/components/connection-form";
import { Card, Row, Col, Statistic, Typography, Spin, Alert, Progress, Tooltip } from "antd";
import {
    DatabaseOutlined,
    TableOutlined,
    UserOutlined,
    FieldTimeOutlined,
    ClockCircleOutlined,
    HddOutlined,
    ApiOutlined,
    LockOutlined,
    SettingOutlined,
    InfoCircleOutlined
} from "@ant-design/icons";

const { Title, Text } = Typography;

interface ServerInfo {
    version: string;
    uptime: string;
    databases: number;
    totalTables: number;
    activeConnections: number;
    size: string;
    maxConnections: number;
    startTime: string;
    serverProcessId: number;
    dataDirectory: string;
    configFile: string;
    hbaFile: string;
    identFile: string;
    lastRestart: string;
    cacheHitRatio: string;
    transactionsPerSec: number;
    idleConnections: number;
    activeTransactions: number;
    waitingQueries: number;
    deadlocks: number;
    tempFileUsage: string;
    backupStatus: string;
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
            loadServerInfo(activeConnection);
        } else {
            setError("No active connection");
            setLoading(false);
        }
    }, []);

    const loadServerInfo = async (connectionDetails: ConnectionDetails) => {
        setLoading(true);
        setError(null);

        try {
            // API'den sunucu bilgilerini al
            const serverData = await getServerInfo(connectionDetails);

            // Bazı ek alanlar API'den gelmiyor, onları manuel olarak ekleyelim
            const enhancedServerInfo = {
                ...serverData,
                lastRestart: serverData.startTime,
                backupStatus: "Unknown" // Bu bilgi şu an API'de yok
            };

            setServerInfo(enhancedServerInfo);
            setLoading(false);
        } catch (err) {
            console.error("Error loading server info:", err);
            setError("Failed to load server information");
            setLoading(false);
        }
    };

    // Cache hit ratio'yu yüzde olarak parse et
    const parseCacheHitRatio = (ratio: string): number => {
        if (!ratio) return 0;
        const match = ratio.match(/(\d+(\.\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
    };

    // Bağlantı kullanım oranını hesapla
    const calculateConnectionUsage = (active: number, max: number): number => {
        if (!max) return 0;
        return Math.min(100, (active / max) * 100);
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
                                    prefix={<HddOutlined />}
                                />
                            </Col>
                        </Row>
                    </Card>

                    <Card className="shadow-sm">
                        <Title level={4} className="flex items-center">
                            Connection Usage
                            <Tooltip title="Shows the percentage of maximum allowed connections currently in use">
                                <InfoCircleOutlined className="ml-2 text-gray-400" />
                            </Tooltip>
                        </Title>
                        <div className="mb-6">
                            <div className="flex justify-between mb-2">
                                <Text>Active: {serverInfo.activeConnections}</Text>
                                <Text>Max: {serverInfo.maxConnections}</Text>
                            </div>
                            <Progress
                                percent={calculateConnectionUsage(serverInfo.activeConnections, serverInfo.maxConnections)}
                                status={calculateConnectionUsage(serverInfo.activeConnections, serverInfo.maxConnections) > 80 ? "exception" : "active"}
                                strokeColor={
                                    calculateConnectionUsage(serverInfo.activeConnections, serverInfo.maxConnections) > 60
                                        ? (calculateConnectionUsage(serverInfo.activeConnections, serverInfo.maxConnections) > 80 ? "#f5222d" : "#faad14")
                                        : "#52c41a"
                                }
                            />
                        </div>
                        <Row gutter={[16, 16]}>
                            <Col span={6}>
                                <Statistic
                                    title="Max Connections"
                                    value={serverInfo.maxConnections}
                                    prefix={<ApiOutlined />}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="Active Connections"
                                    value={serverInfo.activeConnections}
                                    prefix={<UserOutlined />}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="Idle Connections"
                                    value={serverInfo.idleConnections}
                                    prefix={<ClockCircleOutlined />}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="Active Transactions"
                                    value={serverInfo.activeTransactions}
                                    prefix={<SettingOutlined />}
                                />
                            </Col>
                        </Row>
                    </Card>

                    <Card className="shadow-sm">
                        <Title level={4}>Performance Metrics</Title>
                        <Row gutter={[16, 16]}>
                            <Col span={12}>
                                <div className="mb-2">
                                    <Text>Cache Hit Ratio</Text>
                                    <Tooltip title="Higher is better. Shows percentage of data served from memory cache vs. disk">
                                        <InfoCircleOutlined className="ml-2 text-gray-400" />
                                    </Tooltip>
                                </div>
                                <Progress
                                    percent={parseCacheHitRatio(serverInfo.cacheHitRatio)}
                                    status={parseCacheHitRatio(serverInfo.cacheHitRatio) < 90 ? "exception" : "success"}
                                    strokeColor={
                                        parseCacheHitRatio(serverInfo.cacheHitRatio) < 90
                                            ? (parseCacheHitRatio(serverInfo.cacheHitRatio) < 80 ? "#f5222d" : "#faad14")
                                            : "#52c41a"
                                    }
                                />
                                <div className="mt-1 text-right">
                                    <Text type="secondary">{serverInfo.cacheHitRatio}</Text>
                                </div>
                            </Col>
                            <Col span={12}>
                                <div className="mb-2">
                                    <Text>Transaction Load</Text>
                                    <Tooltip title="Transactions per second relative to system capacity">
                                        <InfoCircleOutlined className="ml-2 text-gray-400" />
                                    </Tooltip>
                                </div>
                                <Progress
                                    percent={Math.min(100, (serverInfo.transactionsPerSec / 200) * 100)}
                                    strokeColor={
                                        (serverInfo.transactionsPerSec / 200) * 100 > 80
                                            ? "#f5222d"
                                            : (serverInfo.transactionsPerSec / 200) * 100 > 60
                                                ? "#faad14"
                                                : "#52c41a"
                                    }
                                />
                                <div className="mt-1 text-right">
                                    <Text type="secondary">{serverInfo.transactionsPerSec} tps</Text>
                                </div>
                            </Col>
                        </Row>
                        <Row gutter={[16, 16]} className="mt-4">
                            <Col span={6}>
                                <Statistic
                                    title="Transactions/sec"
                                    value={serverInfo.transactionsPerSec}
                                    prefix={<FieldTimeOutlined />}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="Waiting Queries"
                                    value={serverInfo.waitingQueries}
                                    prefix={<ClockCircleOutlined />}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="Deadlocks"
                                    value={serverInfo.deadlocks}
                                    prefix={<LockOutlined />}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="Temp File Usage"
                                    value={serverInfo.tempFileUsage}
                                    prefix={<HddOutlined />}
                                />
                            </Col>
                        </Row>
                    </Card>

                    <Card className="shadow-sm">
                        <Title level={4}>System Information</Title>
                        <Row gutter={[16, 16]}>
                            <Col span={12}>
                                <Statistic
                                    title="Server Process ID"
                                    value={serverInfo.serverProcessId}
                                    prefix={<SettingOutlined />}
                                />
                            </Col>
                            <Col span={12}>
                                <Statistic
                                    title="Start Time"
                                    value={serverInfo.startTime}
                                    prefix={<ClockCircleOutlined />}
                                />
                            </Col>
                        </Row>
                        <Row gutter={[16, 16]} className="mt-4">
                            <Col span={12}>
                                <Statistic
                                    title="Data Directory"
                                    value={serverInfo.dataDirectory}
                                    prefix={<HddOutlined />}
                                    valueStyle={{ fontSize: '14px' }}
                                />
                            </Col>
                            <Col span={12}>
                                <Statistic
                                    title="Config File"
                                    value={serverInfo.configFile}
                                    prefix={<SettingOutlined />}
                                    valueStyle={{ fontSize: '14px' }}
                                />
                            </Col>
                        </Row>
                    </Card>
                </div>
            )}
        </div>
    );
} 