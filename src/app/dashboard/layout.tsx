"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Layout, Spin, App } from "antd";

const { Content } = Layout;

// Dinamik olarak bileşenleri yüklüyoruz
const Sidebar = dynamic(() => import("@/components/sidebar").then(mod => mod.Sidebar), { ssr: false });
const Header = dynamic(() => import("@/components/header").then(mod => mod.Header), { ssr: false });

export default function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const [isClient, setIsClient] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsClient(true);
        setIsLoading(false);
    }, []);

    // Show loading state
    if (!isClient || isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Spin size="large" />
            </div>
        );
    }

    return (
        <App>
            <Layout style={{ height: '100vh', overflow: 'hidden' }}>
                <Sidebar />
                <Layout>
                    <div style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 5,
                        width: '100%',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                    }}>
                        <Header />
                    </div>
                    <Content style={{
                        padding: '24px',
                        overflow: 'auto',
                        height: 'calc(100vh - 64px)' // Header yüksekliğini çıkar
                    }}>
                        {children}
                    </Content>
                </Layout>
            </Layout>
        </App>
    );
} 