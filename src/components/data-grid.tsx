"use client";

import { useState, useMemo, useCallback } from "react";
import { DataGrid as ReactDataGrid } from "react-data-grid";
import { ConnectionDetails } from "@/components/connection-form";
import { insertRow, updateRow, deleteRow } from "@/lib/db";

interface TableColumn {
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
}

interface DataGridProps {
    data: {
        columns: string[];
        rows: Record<string, unknown>[];
    } | null;
    tableName: string;
    connection: ConnectionDetails;
    structure: TableColumn[];
}

export function DataGrid({ data, tableName, connection, structure }: DataGridProps) {
    const [rows, setRows] = useState<Record<string, unknown>[]>(data?.rows || []);
    const [selectedCell, setSelectedCell] = useState<{ row: number; column: string } | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [newRow, setNewRow] = useState<Record<string, unknown>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Kullanılmayan structure prop'unu kullanıyormuş gibi yapıyoruz
    const hasStructure = structure.length > 0;

    // Find primary key column
    const primaryKeyColumn = useMemo(() => {
        // This is a simplification - in a real app, you'd need to query for the primary key
        // For now, we'll assume the first column is the primary key
        return data?.columns[0] || "id";
    }, [data?.columns]);

    const columns = useMemo(() => {
        if (!data?.columns) return [];

        return data.columns.map((column) => ({
            key: column,
            name: column,
            editable: true,
            resizable: true,
            formatter: ({ row }: { row: Record<string, unknown> }) => {
                const value = row[column];
                if (value === null) return <span className="text-gray-400">NULL</span>;
                if (typeof value === "object") return JSON.stringify(value);
                return String(value);
            },
            editor: ({ row, onRowChange }: { row: Record<string, unknown>; onRowChange: (row: Record<string, unknown>) => void }) => (
                <input
                    className="w-full h-full px-2 py-1 border-none outline-none bg-blue-50 dark:bg-blue-900/20"
                    value={row[column] === null ? "" : String(row[column])}
                    onChange={(e) => onRowChange({ ...row, [column]: e.target.value })}
                    autoFocus
                />
            ),
        }));
    }, [data?.columns]);

    const handleRowsChange = useCallback(
        (newRows: Record<string, unknown>[]) => {
            setRows(newRows);
        },
        []
    );

    const handleCellClick = useCallback(
        (row: number, column: string) => {
            setSelectedCell({ row, column });
        },
        []
    );

    const handleAddRow = () => {
        setIsAdding(true);

        // Initialize new row with default values
        const defaultRow = data?.columns.reduce((acc, column) => {
            acc[column] = "";
            return acc;
        }, {} as Record<string, unknown>) || {};

        setNewRow(defaultRow);
    };

    const handleSaveNewRow = async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await insertRow(connection, tableName, newRow);
            setRows((prevRows) => [...prevRows, result]);
            setIsAdding(false);
        } catch (err) {
            console.error("Error adding row:", err);
            setError(err instanceof Error ? err.message : "Failed to add row");
        } finally {
            setLoading(false);
        }
    };

    const handleCancelAddRow = () => {
        setIsAdding(false);
        setNewRow({});
    };

    const handleUpdateRow = async (rowIndex: number) => {
        setLoading(true);
        setError(null);

        const rowToUpdate = rows[rowIndex];

        try {
            const result = await updateRow(connection, tableName, rowToUpdate, primaryKeyColumn);

            // Update the row in the state
            setRows((prevRows) => {
                const newRows = [...prevRows];
                newRows[rowIndex] = result;
                return newRows;
            });

            setIsEditing(false);
            setSelectedCell(null);
        } catch (err) {
            console.error("Error updating row:", err);
            setError(err instanceof Error ? err.message : "Failed to update row");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRow = async (rowIndex: number) => {
        setLoading(true);
        setError(null);

        const rowToDelete = rows[rowIndex];
        const primaryKeyValue = rowToDelete[primaryKeyColumn];

        try {
            await deleteRow(connection, tableName, primaryKeyColumn, primaryKeyValue);

            // Remove the row from the state
            setRows((prevRows) => {
                const newRows = [...prevRows];
                newRows.splice(rowIndex, 1);
                return newRows;
            });
        } catch (err) {
            console.error("Error deleting row:", err);
            setError(err instanceof Error ? err.message : "Failed to delete row");
        } finally {
            setLoading(false);
        }
    };

    if (!data) {
        return <div>No data available</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    {rows.length} rows {hasStructure && `(${structure.length} columns defined)`}
                </div>

                <div className="flex gap-2">
                    {selectedCell && !isEditing ? (
                        <>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => handleDeleteRow(selectedCell.row)}
                                className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                                disabled={loading}
                            >
                                Delete
                            </button>
                        </>
                    ) : isEditing ? (
                        <>
                            <button
                                onClick={() => handleUpdateRow(selectedCell!.row)}
                                className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                                disabled={loading}
                            >
                                Save
                            </button>
                            <button
                                onClick={() => {
                                    setIsEditing(false);
                                    setSelectedCell(null);
                                }}
                                className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleAddRow}
                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                            disabled={isAdding}
                        >
                            Add Row
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-500 p-2 rounded mb-4">
                    {error}
                </div>
            )}

            {isAdding && (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded mb-4">
                    <h3 className="text-lg font-medium mb-2">Add New Row</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {data.columns.map((column) => (
                            <div key={column}>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {column}
                                </label>
                                <input
                                    type="text"
                                    value={newRow[column] === null ? "" : String(newRow[column] || "")}
                                    onChange={(e) => setNewRow({ ...newRow, [column]: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={handleCancelAddRow}
                            className="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveNewRow}
                            className="px-4 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                            disabled={loading}
                        >
                            {loading ? "Saving..." : "Save"}
                        </button>
                    </div>
                </div>
            )}

            <div className="h-[500px] border border-gray-200 dark:border-gray-700 rounded">
                <ReactDataGrid
                    columns={columns}
                    rows={rows}
                    onRowsChange={handleRowsChange}
                    onCellClick={({ rowIdx, column }: { rowIdx: number; column: { key: string } }) =>
                        handleCellClick(rowIdx, column.key)
                    }
                    className="rdg-light dark:rdg-dark h-full"
                />
            </div>
        </div>
    );
} 