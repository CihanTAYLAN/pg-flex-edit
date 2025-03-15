import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, GetRowIdFunc, GetRowIdParams, GridReadyEvent } from "ag-grid-community";
import { ModuleRegistry } from "@ag-grid-community/core";
import { ServerSideRowModelModule } from "@ag-grid-enterprise/server-side-row-model";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

ModuleRegistry.registerModules([ServerSideRowModelModule]);

interface Connection {
    name: string;
    host: string;
    database: string;
    password: string;
    port: number;
    username: string;
    id: string;
}

interface Props {
    connection: Connection;
    table: string;
}

export default function DataTable({ connection, table }: Props) {
    const gridRef = useRef<AgGridReact>(null);
    const [columnDefs, setColumnDefs] = useState<ColDef[]>([]);

    useEffect(() => {
        const fetchColumns = async () => {
            try {
                const response = await fetch("/api/table-data", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        connection,
                        table,
                        startRow: 0,
                        endRow: 1,
                    }),
                });

                const data = await response.json();
                if (data.error) return;

                if (data.rows && data.rows.length > 0) {
                    const cols = Object.keys(data.rows[0]).map(field => ({
                        field,
                        headerName: field.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
                    }));
                    setColumnDefs(cols);
                }
            } catch (error) {
                console.error("Kolon bilgisi alınamadı:", error);
            }
        };

        fetchColumns();
    }, [connection, table]);

    const onGridReady = useCallback((params: GridReadyEvent) => {
        const dataSource: IDatasource = {
            rowCount: undefined,
            getRows: async (params: IGetRowsParams) => {
                try {
                    const response = await fetch("/api/table-data", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            connection,
                            table,
                            startRow: params.startRow,
                            endRow: params.endRow,
                            filterModel: params.filterModel,
                            sortModel: params.sortModel
                        }),
                    });

                    const data = await response.json();
                    if (data.error) {
                        params.failCallback();
                        return;
                    }

                    params.successCallback(data.rows, data.lastRow);
                } catch {
                    params.failCallback();
                }
            }
        };

        params.api.setDatasource(dataSource);
    }, [connection, table]);

    const defaultColDef = useMemo(() => ({
        flex: 1,
        minWidth: 100,
        filter: true,
        sortable: true,
        resizable: true,
    }), []);

    const getRowId = useMemo<GetRowIdFunc>(() => {
        return (params: GetRowIdParams) => params.data.id;
    }, []);

    return (
        <div className="ag-theme-alpine-dark w-full h-[600px]">
            <AgGridReact
                modules={modules}
                ref={gridRef}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                rowModelType="infinite"
                pagination={true}
                paginationPageSize={20}
                cacheBlockSize={20}
                getRowId={getRowId}
                onGridReady={onGridReady}
                domLayout='normal'
                theme="legacy"
            />
        </div>
    );
} 