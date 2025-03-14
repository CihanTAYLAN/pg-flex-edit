"use client";

import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
    getSavedConnections,
    getActiveConnection,
    setActiveConnection,
    deleteConnection, deleteAllConnections
} from "@/lib/session";
import { ConnectionDetails } from "@/components/connection-form";
import { Layout, Dropdown, Button, Typography, Modal, App } from "antd";
import { DatabaseOutlined, UserOutlined, PlusOutlined, LogoutOutlined, DeleteOutlined, CheckCircleFilled } from "@ant-design/icons";
import { ConnectionForm } from "@/components/connection-form";

const { Header: AntHeader } = Layout;
const { Title } = Typography;

export function Header() {
    const [connections, setConnections] = useState<ConnectionDetails[]>([]);
    const [activeConnection, setActiveConnectionState] = useState<ConnectionDetails | null>(null);
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const { modal } = App.useApp();

    useEffect(() => {
        const savedConnections = getSavedConnections();
        console.log("[Header] Initial connections:", savedConnections);
        setConnections(savedConnections);

        const active = getActiveConnection();
        setActiveConnectionState(active);

        // Eğer hiç sunucu yoksa, otomatik olarak sunucu ekleme modalını aç
        if (savedConnections.length === 0) {
            setIsAddModalVisible(true);
        }
    }, []);

    const handleAddConnection = () => {
        setIsAddModalVisible(true);
    };

    const handleConnect = async (connection: ConnectionDetails) => {
        try {
            console.log("[Header] Adding new connection:", connection);

            // Doğrudan localStorage'a kaydet
            const connections = getSavedConnections();

            // Yeni bağlantı için ID oluştur
            const newConnection = {
                ...connection,
                id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)
            };

            // Bağlantıyı diziye ekle
            connections.push(newConnection);

            // localStorage'a kaydet
            localStorage.setItem("connections", JSON.stringify(connections));
            console.log("[Header] Connections saved to localStorage:", connections);

            // Aktif bağlantıyı ayarla
            localStorage.setItem("activeConnectionId", newConnection.id);
            console.log("[Header] Active connection set:", newConnection.id);

            // Modalı kapat
            setIsAddModalVisible(false);

            // State'leri güncelle
            setConnections(connections);
            setActiveConnectionState(newConnection);
        } catch (error) {
            console.error("[Header] Error saving connection:", error);
        }
    };

    const handleSwitchConnection = (connectionId: string) => {
        console.log("[Header] Switching to connection:", connectionId);

        try {
            // Aktif bağlantıyı ayarla
            setActiveConnection(connectionId);

            // State'i güncelle
            const connections = getSavedConnections();
            const newActiveConnection = connections.find(conn => conn.id === connectionId) || null;
            setActiveConnectionState(newActiveConnection);
        } catch (error) {
            console.error("[Header] Error switching connection:", error);
        }
    };

    const handleDeleteConnection = (connectionId: string) => {
        modal.confirm({
            title: "Delete Connection",
            content: "Are you sure you want to delete this connection?",
            okText: "Yes",
            okType: "danger",
            cancelText: "No",
            onOk() {
                console.log("[Header] Deleting connection:", connectionId);
                try {
                    // Bağlantıyı sil
                    deleteConnection(connectionId);

                    // State'leri güncelle
                    const updatedConnections = getSavedConnections();
                    setConnections(updatedConnections);

                    // Aktif bağlantıyı güncelle
                    const newActiveConnection = getActiveConnection();
                    setActiveConnectionState(newActiveConnection);

                    // Eğer hiç bağlantı kalmadıysa, ekleme modalını aç
                    if (updatedConnections.length === 0) {
                        setIsAddModalVisible(true);
                    }
                } catch (error) {
                    console.error("[Header] Error deleting connection:", error);
                }
            },
        });
    };

    const handleDeleteAllConnections = () => {
        modal.confirm({
            title: "Delete All Connections",
            content: "Are you sure you want to delete all connections?",
            okText: "Yes",
            okType: "danger",
            cancelText: "No",
            onOk() {
                console.log("[Header] Deleting all connections");
                try {
                    // Tüm bağlantıları sil
                    deleteAllConnections();

                    // State'leri güncelle
                    setConnections([]);
                    setActiveConnectionState(null);

                    // Bağlantı ekleme modalını aç
                    setIsAddModalVisible(true);
                } catch (error) {
                    console.error("[Header] Error deleting all connections:", error);
                }
            },
        });
    };

    return (
        <>
            <AntHeader
                style={{
                    background: 'var(--background)',
                    borderBottom: '1px solid var(--border-color)',
                    height: '46px',
                    padding: '0 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}
            >
                <div className="flex items-center gap-2">
                    <DatabaseOutlined className="text-[var(--color-primary)] text-2xl" />
                    <Title level={4} style={{ margin: 0, color: 'var(--color-primary)' }}>
                        Pg-Flex-Edit
                    </Title>
                </div>

                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <Dropdown
                        menu={{
                            items: [
                                {
                                    key: 'connections-group',
                                    type: 'group',
                                    label: 'Connections',
                                    children: connections.map((connection) => ({
                                        key: connection.id as string,
                                        icon: activeConnection?.id === connection.id ? <CheckCircleFilled color="#00F604" /> : null,
                                        label: (
                                            <div className="flex justify-between items-center w-full">
                                                <span>{connection.name} ({connection.host}:{connection.port})</span>
                                                <Button
                                                    type="text"
                                                    danger
                                                    size="small"
                                                    icon={<DeleteOutlined />}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteConnection(connection.id as string);
                                                    }}
                                                />
                                            </div>
                                        ),
                                        onClick: () => handleSwitchConnection(connection.id as string)
                                    }))
                                },
                                {
                                    key: 'divider',
                                    type: 'divider'
                                },
                                {
                                    key: 'add',
                                    icon: <PlusOutlined />,
                                    label: 'Add Connection',
                                    onClick: handleAddConnection
                                },
                                {
                                    key: 'logout',
                                    icon: <LogoutOutlined />,
                                    label: 'Delete All Connections',
                                    danger: true,
                                    onClick: handleDeleteAllConnections
                                }
                            ]
                        }}
                        trigger={["click"]}
                        placement="bottomRight"
                        overlayStyle={{ zIndex: 1050 }}
                        dropdownRender={(menu) => (
                            <div style={{
                                backgroundColor: 'var(--background)',
                                borderRadius: '8px',
                                boxShadow: '0 6px 16px -8px rgba(0,0,0,0.08), 0 9px 28px 0 rgba(0,0,0,0.05), 0 12px 48px 16px rgba(0,0,0,0.03)'
                            }}>
                                {menu}
                            </div>
                        )}
                    >
                        <Button
                            type="primary"
                            ghost
                            icon={<UserOutlined />}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                zIndex: 1000,
                                position: 'relative',
                                color: 'var(--color-primary)',
                                borderColor: 'var(--color-primary)'
                            }}
                        >
                            <span style={{ marginLeft: '8px' }}>{activeConnection?.name || "Add Server"}</span>
                        </Button>
                    </Dropdown>
                </div>
            </AntHeader>

            {/* Sunucu Ekleme Modal */}
            <Modal
                title="Add PostgreSQL Connection"
                open={isAddModalVisible}
                onCancel={() => {
                    // Eğer hiç sunucu yoksa, modalı kapatmaya izin verme
                    if (connections.length > 0) {
                        setIsAddModalVisible(false);
                    }
                }}
                footer={null}
                maskClosable={connections.length > 0}
                closable={connections.length > 0}
            >
                <ConnectionForm onConnect={handleConnect} />
            </Modal>
        </>
    );
} 