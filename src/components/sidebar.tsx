"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getActiveConnection } from "@/lib/session";
import { getTables, getDatabases } from "@/lib/db";
import { ConnectionDetails } from "@/components/connection-form";
import { Layout, Menu, Typography, Spin, Alert, Divider, Select, Input } from "antd";
import { DatabaseOutlined, TableOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";

const { Sider } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [tables, setTables] = useState<string[]>([]);
    const [databases, setDatabases] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingDatabases, setLoadingDatabases] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [connection, setConnection] = useState<ConnectionDetails | null>(null);
    const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
    const [searchText, setSearchText] = useState<string>("");

    // URL'den veritabanı adını çıkar
    useEffect(() => {
        if (pathname) {
            // /dashboard/{database}/{table} veya /dashboard/{database} formatındaki URL'leri kontrol et
            const pathParts = pathname.split('/').filter(Boolean);

            if (pathParts.length >= 2 && pathParts[0] === 'dashboard' && pathParts[1] !== 'overview') {
                const dbFromUrl = pathParts[1];
                console.log("[Sidebar] Database from URL:", dbFromUrl);

                if (dbFromUrl && dbFromUrl !== selectedDatabase) {
                    setSelectedDatabase(dbFromUrl);

                    // Eğer aktif bağlantı varsa, seçili veritabanı için tabloları yükle
                    const activeConnection = getActiveConnection();
                    if (activeConnection) {
                        const connectionWithDb = {
                            ...activeConnection,
                            database: dbFromUrl
                        };
                        loadTables(connectionWithDb);
                    }
                }
            }
        }
    }, [pathname]);

    useEffect(() => {
        const loadConnectionAndData = async () => {
            const activeConnection = getActiveConnection();
            console.log("[Sidebar] Active connection:", activeConnection);
            setConnection(activeConnection);

            if (activeConnection) {
                // Veritabanlarını yükle
                await loadDatabases(activeConnection);

                // URL'den gelen veritabanı adı varsa, onu kullan
                // Yoksa ve connection'da bir database seçili ise, onu kullan
                if (selectedDatabase) {
                    const connectionWithDb = {
                        ...activeConnection,
                        database: selectedDatabase
                    };
                    await loadTables(connectionWithDb);
                } else if (activeConnection.database) {
                    setSelectedDatabase(activeConnection.database);
                    await loadTables(activeConnection);
                }
            } else {
                console.error("[Sidebar] No active connection found");
                setError("No active connection");
                setLoading(false);
            }
        };

        loadConnectionAndData();
    }, []);

    // Aktif bağlantıyı izle
    useEffect(() => {
        const checkActiveConnection = () => {
            const active = getActiveConnection();
            if (JSON.stringify(active) !== JSON.stringify(connection)) {
                setConnection(active);

                // Eğer aktif bağlantı değiştiyse ve geçerli bir bağlantı varsa, veritabanlarını yükle
                if (active) {
                    loadDatabases(active);
                } else {
                    // Aktif bağlantı yoksa, veritabanı ve tablo listelerini temizle
                    setDatabases([]);
                    setTables([]);
                    setSelectedDatabase(null);
                }
            }
        };

        // İlk yükleme
        checkActiveConnection();

        // localStorage değişikliklerini dinle
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === "activeConnectionId" || e.key === "connections") {
                checkActiveConnection();
            }
        };

        window.addEventListener("storage", handleStorageChange);

        // Düzenli kontrol (polling) - her 2 saniyede bir kontrol et
        const interval = setInterval(checkActiveConnection, 2000);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            clearInterval(interval);
        };
    }, [connection]);

    const loadDatabases = async (connectionDetails: ConnectionDetails) => {
        setLoadingDatabases(true);
        try {
            const databaseList = await getDatabases(connectionDetails);
            console.log("[Sidebar] Databases:", databaseList);
            setDatabases(databaseList);

            // Eğer henüz bir veritabanı seçilmemişse ve liste boş değilse, ilk veritabanını seç
            if (!selectedDatabase && databaseList.length > 0) {
                setSelectedDatabase(databaseList[0]);

                // Tabloları yükle
                const updatedConnection = {
                    ...connectionDetails,
                    database: databaseList[0]
                };
                await loadTables(updatedConnection);
            }
        } catch (err) {
            console.error("[Sidebar] Error loading databases:", err);
            setError("Failed to load databases");
        } finally {
            setLoadingDatabases(false);
        }
    };

    const loadTables = async (connectionDetails: ConnectionDetails) => {
        setLoading(true);
        setError(null);

        try {
            if (!connectionDetails.database) {
                console.error("[Sidebar] No database selected");
                setError("No database selected");
                setTables([]);
                setLoading(false);
                return;
            }

            const tablesList = await getTables(connectionDetails);
            console.log("[Sidebar] Tables for database", connectionDetails.database, ":", tablesList);
            setTables(tablesList);
        } catch (err) {
            console.error("[Sidebar] Error loading tables:", err);
            setError("Failed to load tables");
            setTables([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDatabaseChange = async (dbName: string) => {
        if (!connection) return;

        setSelectedDatabase(dbName);
        console.log("[Sidebar] Selected database:", dbName);

        const updatedConnection = {
            ...connection,
            database: dbName
        };

        loadTables(updatedConnection);

        setConnection(updatedConnection);

        router.push(`/dashboard/${dbName}`, { scroll: false });
    };

    const handleRefresh = () => {
        if (connection) {
            loadTables(connection);
        }
    };

    const filteredTables = tables.filter(table =>
        searchText.toLowerCase().split(' ').map(word => table.toLowerCase().includes(word)).some(Boolean)
    );

    const menuItems = filteredTables.map((table) => ({
        key: `/dashboard/${selectedDatabase}/${table}`,
        icon: <TableOutlined />,
        label: table,
    }));

    const handleMenuItemClick = (key: string) => {
        router.push(key, { scroll: false });
    };

    return (
        <Sider
            width={250}
            style={{
                background: 'var(--background)',
                borderRight: '1px solid var(--border-color)',
                height: '100vh',
                position: 'sticky',
                top: 0,
                left: 0,
                overflow: 'hidden'
            }}
        >
            <div style={{
                padding: '16px',
                borderBottom: '1px solid var(--border-color)'
            }}>
                <Title level={4} style={{ margin: 0, color: 'var(--foreground)' }}>
                    <DatabaseOutlined className="mr-2" />
                    {connection?.name || "Database"}
                </Title>
                <Text style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {connection?.host}:{connection?.port}
                </Text>
            </div>

            <div
                style={{
                    padding: '16px',
                    height: 'calc(100vh - 73px)', // Header yüksekliğini çıkar
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <div>
                    <Menu
                        mode="inline"
                        selectedKeys={[pathname]}
                        items={[
                            {
                                key: '/dashboard/overview',
                                icon: <DatabaseOutlined />,
                                label: 'Server Overview'
                            },
                            ...(selectedDatabase ? [
                                {
                                    key: `/dashboard/${selectedDatabase}`,
                                    icon: <DatabaseOutlined />,
                                    label: selectedDatabase
                                }
                            ] : [])
                        ]}
                        onClick={({ key }) => handleMenuItemClick(key.toString())}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            marginBottom: '16px'
                        }}
                    />

                    {loadingDatabases ? (
                        <div className="text-center py-2">
                            <Spin size="small" />
                        </div>
                    ) : databases.length === 0 ? (
                        <Alert message="No databases found" type="info" showIcon />
                    ) : (
                        <Select
                            style={{ width: '100%' }}
                            value={selectedDatabase}
                            onChange={handleDatabaseChange}
                            loading={loadingDatabases}
                        >
                            {databases.map(db => (
                                <Option key={db} value={db}>{db}</Option>
                            ))}
                        </Select>
                    )}

                    <Divider style={{ margin: '8px 0' }} />

                    <div className="flex justify-between items-center mb-2">
                        <Text strong style={{ color: 'var(--foreground)' }}>
                            Tables
                        </Text>
                        <ReloadOutlined
                            onClick={handleRefresh}
                            spin={loading}
                            style={{ cursor: 'pointer', color: 'var(--foreground)' }}
                        />
                    </div>

                    <Input
                        placeholder="Search tables..."
                        prefix={<SearchOutlined style={{ color: 'var(--foreground-muted)' }} />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{
                            marginBottom: '8px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--background-secondary)',
                        }}
                        size="small"
                        allowClear
                    />
                </div>

                <div
                    style={{
                        overflowY: 'auto',
                        flex: 1
                    }}
                >
                    {loading ? (
                        <div className="text-center py-4">
                            <Spin />
                        </div>
                    ) : error ? (
                        <Alert message={error} type="error" showIcon />
                    ) : tables.length === 0 ? (
                        <Alert message="No tables found" type="info" showIcon />
                    ) : (
                        <Menu
                            mode="inline"
                            selectedKeys={[pathname]}
                            items={menuItems}
                            onClick={({ key }) => handleMenuItemClick(key.toString())}
                            style={{
                                background: 'transparent',
                                border: 'none'
                            }}
                        />
                    )}
                </div>
            </div>
        </Sider>
    );
} 