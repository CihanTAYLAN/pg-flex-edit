"use client";

import { useEffect, useState, ReactElement } from "react";
import { useParams } from "next/navigation";
import { getActiveConnection, getSavedConnections, setActiveConnection } from "@/lib/session";
import { getTableData, getTableStructure } from "@/lib/db";
import { ConnectionDetails } from "@/components/connection-form";
import { Tabs, Spin, Alert, Typography } from "antd";

// Tip tanımlamaları
type TabType = "data" | "structure";

interface TableData {
    columns: string[];
    rows: Record<string, unknown>[];
}

interface TableColumn {
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
}

interface DataGridComponent {
    (props: {
        data: TableData | null;
        tableName: string;
        connection: ConnectionDetails;
        structure: TableColumn[];
    }): ReactElement;
}

interface StructureViewComponent {
    (props: {
        structure: TableColumn[];
    }): ReactElement;
}

const { Title } = Typography;

export default function TableDetailPage() {
    const params = useParams();
    const databaseName = params.database as string;
    const tableName = params.table as string;

    const [activeTab, setActiveTab] = useState<TabType>("data");
    const [connection, setConnection] = useState<ConnectionDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tableData, setTableData] = useState<TableData | null>(null);
    const [tableStructure, setTableStructure] = useState<TableColumn[]>([]);
    const [DataGrid, setDataGrid] = useState<DataGridComponent | null>(null);
    const [StructureView, setStructureView] = useState<StructureViewComponent | null>(null);
    const [prevDatabaseName, setPrevDatabaseName] = useState<string | null>(null);
    const [prevTableName, setPrevTableName] = useState<string | null>(null);

    useEffect(() => {
        // Dinamik olarak bileşenleri yüklüyoruz
        import("@/components/data-grid").then((module) => {
            setDataGrid(() => module.DataGrid);
        });

        import("@/components/structure-view").then((module) => {
            setStructureView(() => module.StructureView);
        });
    }, []);

    useEffect(() => {
        // Eğer veritabanı veya tablo adı değişmediyse, gereksiz yeniden yüklemeyi önle
        if (databaseName === prevDatabaseName && tableName === prevTableName) {
            return;
        }

        setPrevDatabaseName(databaseName);
        setPrevTableName(tableName);

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

                console.log(`[TablePage] Updated active connection with database: ${databaseName}`);
            }

            setConnection(connectionWithDb);

            if (connectionWithDb && tableName) {
                loadTableData(connectionWithDb, tableName);
                loadTableStructure(connectionWithDb, tableName);
            }
        } else {
            setError("No active connection");
            setLoading(false);
        }
    }, [databaseName, tableName, prevDatabaseName, prevTableName]);

    const loadTableData = async (connectionDetails: ConnectionDetails, table: string) => {
        setLoading(true);
        setError(null);

        try {
            const data = await getTableData(connectionDetails, table);
            setTableData(data);
        } catch (err) {
            console.error(`Error loading data for table ${table}:`, err);
            setError(`Failed to load data for table ${table}`);
        } finally {
            setLoading(false);
        }
    };

    const loadTableStructure = async (connectionDetails: ConnectionDetails, table: string) => {
        try {
            const structure = await getTableStructure(connectionDetails, table);
            setTableStructure(structure);
        } catch (err) {
            console.error(`Error loading structure for table ${table}:`, err);
        }
    };

    const handleTabChange = (key: string) => {
        setActiveTab(key as TabType);
    };

    if (loading && !tableData) {
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
        <div className="space-y-4">
            <div>
                <Title level={2}>
                    Table: {tableName}
                </Title>
                <p className="text-gray-500">
                    Database: {databaseName}
                </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <Tabs
                    activeKey={activeTab}
                    onChange={handleTabChange}
                    items={[
                        {
                            key: 'data',
                            label: 'Data',
                            children: DataGrid ? (
                                <DataGrid
                                    data={tableData}
                                    tableName={tableName}
                                    connection={connection as ConnectionDetails}
                                    structure={tableStructure}
                                />
                            ) : (
                                <div className="py-8 text-center text-gray-500">
                                    Loading data component...
                                </div>
                            )
                        },
                        {
                            key: 'structure',
                            label: 'Structure',
                            children: StructureView ? (
                                <StructureView structure={tableStructure} />
                            ) : (
                                <div className="py-8 text-center text-gray-500">
                                    Loading structure component...
                                </div>
                            )
                        }
                    ]}
                />
            </div>
        </div>
    );
} 