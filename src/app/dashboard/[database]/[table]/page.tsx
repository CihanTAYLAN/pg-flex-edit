"use client";
import { Suspense } from "react";
import { useParams } from "next/navigation";
import DataTable from "@/components/DataTable";

export default function TablePage() {
    const params = useParams();

    let connection = null;
    try {
        const activeConnectionId = localStorage.getItem("activeConnectionId");
        if (!activeConnectionId) {
            throw new Error("Active connection ID not found");
        }
        const connections = localStorage.getItem("connections");
        if (!connections) {
            throw new Error("Connections not found");
        }
        const activeConnection = JSON.parse(connections).find((connection: any) => connection.id === activeConnectionId);
        connection = activeConnection;
    } catch (error) {
        console.error("Connection parameter parsing failed:", error);
        return (
            <div className="p-4">
                <div className="text-red-500">
                    Connection information loading failed. Please try again.
                    <pre className="mt-2 p-2 bg-gray-800 rounded">
                        {error instanceof Error ? error.message : "Unknown error"}
                    </pre>
                </div>
            </div>
        );
    }

    if (!connection) {
        return (
            <div className="p-4">
                <div className="text-red-500">
                    Connection information not found.
                </div>
            </div>
        );
    }

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">
                Tablo: {params.table}
            </h1>
            <div className="text-sm text-gray-500 mb-4">
                {connection.host}:{connection.port}/{params.database}
            </div>

            <Suspense fallback={<div>Yükleniyor...</div>}>
                <DataTable connection={connection} table={params.table as string} />
            </Suspense>
        </div>
    );
}
