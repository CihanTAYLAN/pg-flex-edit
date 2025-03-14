"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getActiveConnection, getSavedConnections, setActiveConnection } from "@/lib/session";
import { getTables } from "@/lib/db";
import { ConnectionDetails } from "@/components/connection-form";
import { Card, Row, Col, Statistic, Typography, Spin, Alert, Table } from "antd";
import { DatabaseOutlined, TableOutlined, KeyOutlined } from "@ant-design/icons";

const { Title } = Typography;

interface DatabaseInfo {
    name: string;
    tableCount: number;
    size: string;
    owner: string;
    created: string;
}

interface TableInfo {
    name: string;
    rowCount: number;
    size: string;
}

export default function DatabaseOverviewPage() {
    const params = useParams();
    const databaseName = params.database as string;

    const [connection, setConnection] = useState<ConnectionDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [prevDatabaseName, setPrevDatabaseName] = useState<string | null>(null);

    useEffect(() => {
        // Eğer veritabanı adı değişmediyse, gereksiz yeniden yüklemeyi önle
        if (databaseName === prevDatabaseName) {
            return;
        }

        setPrevDatabaseName(databaseName);
        const activeConnection = getActiveConnection();

        if (activeConnection) {
            // Veritabanı adını connection'a ekle
            const connectionWithDb = {
                ...activeConnection,
                database: databaseName
            };

            // Aktif bağlantıyı güncelle
            if (activeConnection.id) {
                // Önce connection'ı güncelle
                const updatedConnections = getSavedConnections().map(conn =>
                    conn.id === activeConnection.id
                        ? { ...conn, database: databaseName }
                        : conn
                );

                // localStorage'a kaydet
                localStorage.setItem("connections", JSON.stringify(updatedConnections));

                // Aktif bağlantıyı ayarla
                setActiveConnection(activeConnection.id);

                console.log(`[DatabasePage] Updated active connection with database: ${databaseName}`);
            }

            setConnection(connectionWithDb);
            loadDatabaseInfo();
            loadTables(connectionWithDb);
        } else {
            setError("No active connection");
            setLoading(false);
        }
    }, [databaseName, prevDatabaseName]);

    const loadDatabaseInfo = () => {
        // Burada veritabanı bilgilerini yükleyecek API çağrısı yapılabilir
        // Şimdilik örnek veri kullanıyoruz
        setTimeout(() => {
            setDbInfo({
                name: databaseName,
                tableCount: 12,
                size: "250 MB",
                owner: "postgres",
                created: "2023-01-15"
            });
        }, 800);
    };

    const loadTables = async (connectionDetails: ConnectionDetails) => {
        setLoading(true);
        setError(null);

        try {
            const tablesList = await getTables(connectionDetails);

            // Tablolar için örnek veriler oluştur
            const tablesWithInfo = tablesList.map(table => ({
                name: table,
                rowCount: Math.floor(Math.random() * 10000),
                size: `${Math.floor(Math.random() * 100)} MB`
            }));

            setTables(tablesWithInfo);
            setLoading(false);
        } catch (err) {
            console.error("Error loading tables:", err);
            setError("Failed to load tables");
            setLoading(false);
        }
    };

    const columns = [
        {
            title: 'Table Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => (
                <Link href={`/dashboard/${databaseName}/${text}`} style={{ display: 'flex', alignItems: 'center' }}>
                    <TableOutlined className="mr-2" />
                    {text}
                </Link>
            )
        },
        {
            title: 'Row Count',
            dataIndex: 'rowCount',
            key: 'rowCount',
            sorter: (a: TableInfo, b: TableInfo) => a.rowCount - b.rowCount
        },
        {
            title: 'Size',
            dataIndex: 'size',
            key: 'size'
        }
    ];

    if (loading && !dbInfo) {
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
                <Title level={2}>Database: {databaseName}</Title>
                <p className="text-gray-500">
                    {connection?.host}:{connection?.port} - {connection?.username}
                </p>
            </div>

            <div className="flex flex-col gap-4">
                {dbInfo && (
                    <Card className="shadow-sm">
                        <Title level={4}>Database Information</Title>
                        <Row gutter={[16, 16]}>
                            <Col span={6}>
                                <Statistic
                                    title="Database Name"
                                    value={dbInfo.name}
                                    prefix={<DatabaseOutlined />}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="Table Count"
                                    value={dbInfo.tableCount}
                                    prefix={<TableOutlined />}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="Size"
                                    value={dbInfo.size}
                                    prefix={<DatabaseOutlined />}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="Owner"
                                    value={dbInfo.owner}
                                    prefix={<KeyOutlined />}
                                />
                            </Col>
                        </Row>
                    </Card>
                )}

                <Card className="shadow-sm">
                    <Title level={4}>Tables</Title>
                    <Table
                        dataSource={tables}
                        columns={columns}
                        rowKey="name"
                        loading={loading}
                        pagination={{ pageSize: 10 }}
                    />
                </Card>
            </div>
        </div>
    );
} 