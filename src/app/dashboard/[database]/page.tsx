"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getActiveConnection, getSavedConnections, setActiveConnection } from "@/lib/session";
import { getTables, getDatabaseInfo } from "@/lib/db";
import { ConnectionDetails } from "@/components/connection-form";
import {
    Card,
    Row,
    Col,
    Statistic,
    Typography,
    Spin,
    Alert,
    Progress,
    Tooltip,
    Badge,
    Button,
    Modal,
    App,
    Tabs,
    Input,
} from "antd";
import {
    DatabaseOutlined,
    TableOutlined,
    KeyOutlined,
    CalendarOutlined,
    UserOutlined,
    FieldTimeOutlined,
    ClockCircleOutlined,
    HddOutlined, LockOutlined,
    SettingOutlined,
    FileOutlined,
    WarningOutlined,
    InfoCircleOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    SearchOutlined,
} from "@ant-design/icons";
import { DataGrid } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';

const { Title, Text } = Typography;

// Utility functions
const parseCacheHitRatio = (ratio: string): number => {
    if (!ratio) return 0;
    const match = ratio.match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
};

const parseIndexUsage = (usage: string): number => {
    if (!usage) return 0;
    const match = usage.match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
};

const parseConflictRate = (rate: string): number => {
    if (!rate) return 0;
    const match = rate.match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
};

const getMaintenanceStatus = (lastVacuum: string, lastAnalyze: string): {
    status: string;
    color: string;
    description: string;
    lastRun: string;
} => {
    if (!lastVacuum || !lastAnalyze || lastVacuum === "Never" || lastAnalyze === "Never") {
        return {
            status: "Never Run",
            color: "red",
            description: "Database has never been maintained. Run VACUUM and ANALYZE commands.",
            lastRun: "Never"
        };
    }

    try {
        const vacuumDate = new Date(lastVacuum);
        const analyzeDate = new Date(lastAnalyze);

        if (isNaN(vacuumDate.getTime()) || isNaN(analyzeDate.getTime())) {
            return {
                status: "Unknown",
                color: "orange",
                description: "Maintenance date information is invalid or unavailable.",
                lastRun: "Unknown"
            };
        }

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const lastMaintenanceDate = vacuumDate > analyzeDate ? vacuumDate : analyzeDate;
        const lastMaintenanceStr = lastMaintenanceDate.toLocaleDateString();
        const daysSinceLastMaintenance = Math.floor((new Date().getTime() - lastMaintenanceDate.getTime()) / (1000 * 60 * 60 * 24));

        if (vacuumDate > oneWeekAgo && analyzeDate > oneWeekAgo) {
            return {
                status: "Good",
                color: "green",
                description: `Last maintenance was ${daysSinceLastMaintenance} days ago. Database is well maintained.`,
                lastRun: lastMaintenanceStr
            };
        } else if (vacuumDate > oneWeekAgo || analyzeDate > oneWeekAgo) {
            return {
                status: "Warning",
                color: "orange",
                description: `Last complete maintenance was ${daysSinceLastMaintenance} days ago. Consider running both VACUUM and ANALYZE.`,
                lastRun: lastMaintenanceStr
            };
        } else {
            return {
                status: "Needs Maintenance",
                color: "red",
                description: `Last maintenance was ${daysSinceLastMaintenance} days ago. Database needs maintenance urgently.`,
                lastRun: lastMaintenanceStr
            };
        }
    } catch (error) {
        console.error("Error checking maintenance status:", error);
        return {
            status: "Error",
            color: "red",
            description: "Error occurred while checking maintenance status.",
            lastRun: "Unknown"
        };
    }
};

interface DatabaseInfo {
    name: string;
    tableCount: number;
    size: string;
    owner: string;
    created: string;
    lastVacuum: string;
    lastAnalyze: string;
    encoding: string;
    collation: string;
    ctype: string;
    accessPrivileges: string;
    tablespaceLocation: string;
    connectionLimit: number;
    activeConnections: number;
    transactionsPerSec: number;
    cacheHitRatio: string;
    indexUsage: string;
    diskReadTime: string;
    diskWriteTime: string;
    bufferUsage: string;
    deadlocks: number;
    conflictRate: string;
    tempFileUsage: string;
    bloatPercentage: number;
    frozenXidAge: number;
    oldestTransaction: string;
    replicationLag: string;
    extensions: string[];
}

interface TableInfo {
    name: string;
    rowCount: number;
    size: string;
}

export default function DatabaseOverviewPage() {
    const params = useParams();
    const databaseName = params.database as string;
    const { message } = App.useApp();

    const [connection, setConnection] = useState<ConnectionDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [prevDatabaseName, setPrevDatabaseName] = useState<string | null>(null);
    const [magicMaintenanceLoading, setMagicMaintenanceLoading] = useState(false);
    const [magicMaintenanceResult, setMagicMaintenanceResult] = useState<{
        tablesProcessed: number;
        bloatedTablesFixed: number;
        indexesRebuilt: number;
    } | null>(null);
    const [resultModalVisible, setResultModalVisible] = useState(false);
    const [quickSearch, setQuickSearch] = useState("");
    const [isDarkMode, setIsDarkMode] = useState(false);

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
            loadDatabaseInfo(connectionWithDb);
            loadTables(connectionWithDb);
        } else {
            setError("No active connection");
            setLoading(false);
        }
    }, [databaseName, prevDatabaseName]);

    useEffect(() => {
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDarkMode(darkModeQuery.matches);

        const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
        darkModeQuery.addEventListener('change', handler);

        return () => darkModeQuery.removeEventListener('change', handler);
    }, []);

    const loadDatabaseInfo = async (connectionDetails: ConnectionDetails) => {
        try {
            // API'den veritabanı bilgilerini al
            const dbData = await getDatabaseInfo(connectionDetails);

            // Bazı ek alanlar API'den gelmiyor, onları manuel olarak ekleyelim
            const enhancedDbInfo = {
                ...dbData,
                connectionLimit: 100, // Bu bilgi şu an API'de yok
                activeConnections: 3, // Bu bilgi şu an API'de yok
                transactionsPerSec: 45, // Bu bilgi şu an API'de yok
                diskReadTime: "150ms", // Bu bilgi şu an API'de yok
                diskWriteTime: "200ms", // Bu bilgi şu an API'de yok
                bufferUsage: "45MB", // Bu bilgi şu an API'de yok
                tempFileUsage: "5MB", // Bu bilgi şu an API'de yok
                oldestTransaction: "2023-05-01 10:15:00", // Bu bilgi şu an API'de yok
                replicationLag: "0ms", // Bu bilgi şu an API'de yok
                // Eksik veya hatalı alanlar için varsayılan değerler
                bloatPercentage: dbData.bloatPercentage || 0,
                frozenXidAge: dbData.frozenXidAge || 0,
                extensions: dbData.extensions || []
            };

            setDbInfo(enhancedDbInfo);
        } catch (err) {
            console.error("Error loading database info:", err);
            setError("Failed to load database information");
        }
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

    // Sihirli bakım işlemini çalıştır
    const runMagicMaintenance = async () => {
        if (!connection) return;

        setMagicMaintenanceLoading(true);
        try {
            // API endpoint'i oluştur
            const response = await fetch('/api/db', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'runMagicMaintenance',
                    connectionDetails: connection
                }),
            });

            const data = await response.json();

            if (data.success) {
                message.success('Magic maintenance completed successfully!');
                // Sonuçları kaydet ve modal'ı göster
                setMagicMaintenanceResult(data.details);
                // Veritabanı bilgilerini yenile
                loadDatabaseInfo(connection);
            } else {
                message.error(`Failed to run maintenance: ${data.error}`);
                setResultModalVisible(false);
            }
        } catch (error) {
            console.error('Error running magic maintenance:', error);
            message.error('Failed to run maintenance. Check console for details.');
            setResultModalVisible(false);
        } finally {
            setMagicMaintenanceLoading(false);
        }
    };

    const columns = [
        {
            key: 'name',
            name: 'Table Name',
            width: 200,
            formatter: ({ row }: { row: TableInfo }) => (
                <Link href={`/dashboard/${databaseName}/${row.name}`}>
                    <span className="flex items-center">
                        <TableOutlined className="mr-2" />
                        {row.name}
                    </span>
                </Link>
            ),
            sortable: true
        },
        {
            key: 'rowCount',
            name: 'Row Count',
            width: 150,
            sortable: true
        },
        {
            key: 'size',
            name: 'Size',
            width: 150,
            sortable: true
        }
    ];

    if (loading && !dbInfo) {
        return (
            <div className="flex flex-col justify-center items-center h-screen space-y-4">
                <Spin size="large" />
                <Text>Loading database information...</Text>
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

            {dbInfo && (
                <Tabs defaultActiveKey="1" items={[
                    {
                        key: '1',
                        label: 'Tables',
                        children: (
                            <div>
                                <div className="mb-4">
                                    <Input
                                        placeholder="Quick search in tables..."
                                        prefix={<SearchOutlined />}
                                        onChange={(e) => setQuickSearch(e.target.value)}
                                        allowClear
                                    />
                                </div>
                                <div style={{ height: 500 }}>
                                    <DataGrid
                                        rows={tables.filter(table =>
                                            table.name.toLowerCase().includes(quickSearch.toLowerCase())
                                        )}
                                        columns={columns}
                                        className={isDarkMode ? 'rdg-dark' : 'rdg-light'}
                                        rowHeight={35}
                                        headerRowHeight={45}
                                        defaultColumnOptions={{
                                            resizable: true,
                                            sortable: true
                                        }}
                                    />
                                </div>
                            </div>
                        )
                    },
                    {
                        key: '2',
                        label: 'Statistics & Maintenance',
                        children: (
                            <div className="flex flex-col gap-4">
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
                                                prefix={<HddOutlined />}
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

                                <Card className="shadow-sm">
                                    <Title level={4}>Database Properties</Title>
                                    <Row gutter={[16, 16]}>
                                        <Col span={6}>
                                            <Statistic
                                                title="Created"
                                                value={dbInfo.created}
                                                prefix={<CalendarOutlined />}
                                            />
                                        </Col>
                                        <Col span={6}>
                                            <Statistic
                                                title="Encoding"
                                                value={dbInfo.encoding}
                                                prefix={<FileOutlined />}
                                            />
                                        </Col>
                                        <Col span={6}>
                                            <Statistic
                                                title="Collation"
                                                value={dbInfo.collation}
                                                prefix={<SettingOutlined />}
                                            />
                                        </Col>
                                        <Col span={6}>
                                            <Statistic
                                                title="Tablespace"
                                                value={dbInfo.tablespaceLocation}
                                                prefix={<DatabaseOutlined />}
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
                                                percent={parseCacheHitRatio(dbInfo.cacheHitRatio)}
                                                status={parseCacheHitRatio(dbInfo.cacheHitRatio) < 90 ? "exception" : "success"}
                                                strokeColor={
                                                    parseCacheHitRatio(dbInfo.cacheHitRatio) < 90
                                                        ? (parseCacheHitRatio(dbInfo.cacheHitRatio) < 80 ? "#f5222d" : "#faad14")
                                                        : "#52c41a"
                                                }
                                            />
                                            <div className="mt-1 text-right">
                                                <Text type="secondary">{dbInfo.cacheHitRatio}</Text>
                                            </div>
                                        </Col>
                                        <Col span={12}>
                                            <div className="mb-2">
                                                <Text>Index Usage</Text>
                                                <Tooltip title="Higher is better. Shows percentage of index scans vs. sequential scans">
                                                    <InfoCircleOutlined className="ml-2 text-gray-400" />
                                                </Tooltip>
                                            </div>
                                            <Progress
                                                percent={parseIndexUsage(dbInfo.indexUsage)}
                                                status={parseIndexUsage(dbInfo.indexUsage) < 70 ? "exception" : "success"}
                                                strokeColor={
                                                    parseIndexUsage(dbInfo.indexUsage) < 70
                                                        ? (parseIndexUsage(dbInfo.indexUsage) < 50 ? "#f5222d" : "#faad14")
                                                        : "#52c41a"
                                                }
                                            />
                                            <div className="mt-1 text-right">
                                                <Text type="secondary">{dbInfo.indexUsage}</Text>
                                            </div>
                                        </Col>
                                    </Row>
                                    <Row gutter={[16, 16]} className="mt-4">
                                        <Col span={12}>
                                            <div className="mb-2">Bloat Percentage</div>
                                            <Progress
                                                percent={dbInfo.bloatPercentage || 0}
                                                status={(dbInfo.bloatPercentage || 0) > 30 ? "exception" : "active"}
                                                strokeColor={(dbInfo.bloatPercentage || 0) > 20 ? ((dbInfo.bloatPercentage || 0) > 30 ? "#f5222d" : "#faad14") : "#52c41a"}
                                            />
                                        </Col>
                                        <Col span={12}>
                                            <div className="mb-2">Frozen XID Age</div>
                                            <Progress
                                                percent={Math.min(100, ((dbInfo.frozenXidAge || 0) / 1000000) * 100)}
                                                status={(dbInfo.frozenXidAge || 0) > 800000 ? "exception" : "active"}
                                                strokeColor={(dbInfo.frozenXidAge || 0) > 500000 ? ((dbInfo.frozenXidAge || 0) > 800000 ? "#f5222d" : "#faad14") : "#52c41a"}
                                            />
                                        </Col>
                                    </Row>
                                    <Row gutter={[16, 16]} className="mt-4">
                                        <Col span={6}>
                                            <Statistic
                                                title="Transactions/sec"
                                                value={dbInfo.transactionsPerSec}
                                                prefix={<FieldTimeOutlined />}
                                            />
                                        </Col>
                                        <Col span={6}>
                                            <Statistic
                                                title="Active Connections"
                                                value={dbInfo.activeConnections}
                                                prefix={<UserOutlined />}
                                            />
                                        </Col>
                                        <Col span={6}>
                                            <Statistic
                                                title="Deadlocks"
                                                value={dbInfo.deadlocks}
                                                prefix={<LockOutlined />}
                                                valueStyle={{ color: dbInfo.deadlocks > 0 ? '#cf1322' : undefined }}
                                            />
                                        </Col>
                                        <Col span={6}>
                                            <Statistic
                                                title="Conflict Rate"
                                                value={dbInfo.conflictRate}
                                                prefix={<WarningOutlined />}
                                                valueStyle={{ color: parseConflictRate(dbInfo.conflictRate) > 0.1 ? '#cf1322' : undefined }}
                                            />
                                        </Col>
                                    </Row>
                                </Card>

                                <Card className="shadow-sm">
                                    <Title level={4} className="flex items-center">
                                        Maintenance Information
                                        <Tooltip title="Regular maintenance is important for optimal database performance">
                                            <InfoCircleOutlined className="ml-2 text-gray-400" />
                                        </Tooltip>
                                    </Title>
                                    <div className="mb-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <Text>Maintenance Status</Text>
                                            <Badge
                                                status={
                                                    getMaintenanceStatus(dbInfo.lastVacuum, dbInfo.lastAnalyze).color === "green"
                                                        ? "success"
                                                        : getMaintenanceStatus(dbInfo.lastVacuum, dbInfo.lastAnalyze).color === "orange"
                                                            ? "warning"
                                                            : "error"
                                                }
                                                text={getMaintenanceStatus(dbInfo.lastVacuum, dbInfo.lastAnalyze).status}
                                            />
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                                            {getMaintenanceStatus(dbInfo.lastVacuum, dbInfo.lastAnalyze).color === "green" ? (
                                                <div className="flex items-center text-green-600 dark:text-green-400">
                                                    <CheckCircleOutlined className="mr-2" />
                                                    <Text>{getMaintenanceStatus(dbInfo.lastVacuum, dbInfo.lastAnalyze).description}</Text>
                                                </div>
                                            ) : getMaintenanceStatus(dbInfo.lastVacuum, dbInfo.lastAnalyze).color === "orange" ? (
                                                <div className="flex items-center text-orange-500 dark:text-orange-400">
                                                    <ExclamationCircleOutlined className="mr-2" />
                                                    <Text>{getMaintenanceStatus(dbInfo.lastVacuum, dbInfo.lastAnalyze).description}</Text>
                                                </div>
                                            ) : (
                                                <div className="flex items-center text-red-600 dark:text-red-400">
                                                    <WarningOutlined className="mr-2" />
                                                    <Text>{getMaintenanceStatus(dbInfo.lastVacuum, dbInfo.lastAnalyze).description}</Text>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <Row gutter={[16, 16]}>
                                        <Col span={6}>
                                            <Statistic
                                                title="Last Run"
                                                value={getMaintenanceStatus(dbInfo.lastVacuum, dbInfo.lastAnalyze).lastRun}
                                                prefix={<ClockCircleOutlined />}
                                            />
                                        </Col>
                                        <Col span={6}>
                                            <Statistic
                                                title="Last Vacuum"
                                                value={dbInfo.lastVacuum}
                                                prefix={<ClockCircleOutlined />}
                                            />
                                        </Col>
                                        <Col span={6}>
                                            <Statistic
                                                title="Last Analyze"
                                                value={dbInfo.lastAnalyze}
                                                prefix={<ClockCircleOutlined />}
                                            />
                                        </Col>
                                        <Col span={6}>
                                            <Statistic
                                                title="Maintenance Status"
                                                value={getMaintenanceStatus(dbInfo.lastVacuum, dbInfo.lastAnalyze).status}
                                                valueStyle={{
                                                    color: getMaintenanceStatus(dbInfo.lastVacuum, dbInfo.lastAnalyze).color === "green"
                                                        ? "#52c41a"
                                                        : getMaintenanceStatus(dbInfo.lastVacuum, dbInfo.lastAnalyze).color === "orange"
                                                            ? "#faad14"
                                                            : "#f5222d"
                                                }}
                                                prefix={
                                                    getMaintenanceStatus(dbInfo.lastVacuum, dbInfo.lastAnalyze).color === "green"
                                                        ? <CheckCircleOutlined />
                                                        : getMaintenanceStatus(dbInfo.lastVacuum, dbInfo.lastAnalyze).color === "orange"
                                                            ? <ExclamationCircleOutlined />
                                                            : <WarningOutlined />
                                                }
                                            />
                                        </Col>
                                    </Row>
                                    <div className="mt-4">
                                        <Title level={5}>Recommended Maintenance Actions</Title>
                                        <ul className="list-disc pl-5 mt-2">
                                            <li className="mb-1">
                                                <Text>Run <code>VACUUM</code> to reclaim storage and update statistics</Text>
                                            </li>
                                            <li className="mb-1">
                                                <Text>Run <code>ANALYZE</code> to update query planner statistics</Text>
                                            </li>
                                            <li className="mb-1">
                                                <Text>Consider <code>VACUUM FULL</code> for tables with high bloat percentage</Text>
                                            </li>
                                        </ul>

                                        <div className="mt-4 flex justify-end">
                                            <Button
                                                type="primary"
                                                onClick={() => setResultModalVisible(true)}
                                                icon={<SettingOutlined spin={magicMaintenanceLoading} />}
                                                loading={magicMaintenanceLoading}
                                                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 border-none"
                                            >
                                                Magic Maintenance
                                            </Button>
                                            <Tooltip title="Automatically runs all necessary maintenance operations based on database status. Includes VACUUM, ANALYZE, and REINDEX if needed.">
                                                <InfoCircleOutlined className="ml-2 text-gray-400 text-lg" />
                                            </Tooltip>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        )
                    }
                ]} />
            )}

            {/* Magic Maintenance Modal */}
            <Modal
                title={
                    <div className="flex items-center">
                        <SettingOutlined className="mr-2 text-purple-500" />
                        <span className="text-lg font-bold">Magic Maintenance</span>
                    </div>
                }
                open={resultModalVisible}
                onCancel={() => {
                    if (!magicMaintenanceLoading) {
                        setResultModalVisible(false);
                    }
                }}
                footer={[
                    <Button
                        key="cancel"
                        onClick={() => setResultModalVisible(false)}
                        disabled={magicMaintenanceLoading}
                    >
                        Cancel
                    </Button>,
                    <Button
                        key="run"
                        type="primary"
                        loading={magicMaintenanceLoading}
                        onClick={runMagicMaintenance}
                        className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 border-none"
                    >
                        Run Magic Maintenance
                    </Button>
                ]}
            >
                {magicMaintenanceResult ? (
                    <div className="flex flex-col gap-2">
                        <Alert
                            message="Maintenance Completed Successfully"
                            description="All necessary maintenance operations have been performed on your database."
                            type="success"
                            showIcon
                            className="mb-4"
                        />

                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                            <h3 className="text-lg font-medium mb-2 dark:text-white">Summary</h3>
                            <ul className="list-disc pl-5 dark:text-gray-200">
                                <li className="mb-1">
                                    <span className="font-medium">Tables Processed:</span> {magicMaintenanceResult.tablesProcessed}
                                </li>
                                <li className="mb-1">
                                    <span className="font-medium">Bloated Tables Fixed:</span> {magicMaintenanceResult.bloatedTablesFixed}
                                </li>
                                <li className="mb-1">
                                    <span className="font-medium">Indexes Rebuilt:</span> {magicMaintenanceResult.indexesRebuilt}
                                </li>
                            </ul>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                            <h3 className="text-lg font-medium mb-2 dark:text-white">Operations Performed</h3>
                            <ul className="list-disc pl-5 dark:text-gray-200">
                                <li className="mb-1">
                                    <code>VACUUM ANALYZE</code> on all tables
                                </li>
                                {magicMaintenanceResult.bloatedTablesFixed > 0 && (
                                    <li className="mb-1">
                                        <code>VACUUM FULL</code> on tables with high bloat
                                    </li>
                                )}
                                {magicMaintenanceResult.indexesRebuilt > 0 && (
                                    <li className="mb-1">
                                        <code>REINDEX</code> on unused indexes
                                    </li>
                                )}
                                <li className="mb-1">
                                    <code>ANALYZE</code> on the entire database
                                </li>
                            </ul>
                        </div>

                        <div className="mt-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Your database is now optimized for better performance. Regular maintenance is recommended to keep your database running smoothly.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        <Alert
                            message="Database Maintenance"
                            description="Magic Maintenance will automatically perform the following operations based on your database's current state:"
                            type="info"
                            showIcon
                            className="mb-4"
                        />

                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                            <h3 className="text-lg font-medium mb-2 dark:text-white">Operations</h3>
                            <ul className="list-disc pl-5 dark:text-gray-200">
                                <li className="mb-1">
                                    <span className="font-medium">VACUUM ANALYZE</span> - Reclaims storage and updates planner statistics
                                </li>
                                <li className="mb-1">
                                    <span className="font-medium">VACUUM FULL</span> - Rebuilds tables with high bloat (if needed)
                                </li>
                                <li className="mb-1">
                                    <span className="font-medium">REINDEX</span> - Rebuilds unused or inefficient indexes (if needed)
                                </li>
                            </ul>
                        </div>

                        <div className="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-md border border-yellow-200 dark:border-yellow-700">
                            <h3 className="text-lg font-medium mb-2 text-yellow-800 dark:text-yellow-200">Important Notes</h3>
                            <ul className="list-disc pl-5 text-yellow-700 dark:text-yellow-300">
                                <li className="mb-1">
                                    Some operations may temporarily lock tables
                                </li>
                                <li className="mb-1">
                                    This process may take several minutes depending on database size
                                </li>
                                <li className="mb-1">
                                    It&apos;s recommended to run this during low-traffic periods
                                </li>
                            </ul>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
} 