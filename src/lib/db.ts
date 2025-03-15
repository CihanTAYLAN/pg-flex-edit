"use client";

import { ConnectionDetails } from "@/components/connection-form";

// API'ye istek gönderen yardımcı fonksiyon
async function callDbApi(action: string, params: Record<string, unknown>) {
	console.log(`[DB] Calling API action: ${action}`, params);
	try {
		const response = await fetch("/api/db", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				action,
				...params,
			}),
		});

		if (!response.ok) {
			const errorData = await response.json();
			console.error(`[DB] API error for action ${action}:`, errorData);
			throw new Error(errorData.error || `API request failed with status ${response.status}`);
		}

		const data = await response.json();
		console.log(`[DB] API response for action ${action}:`, data);
		return data;
	} catch (error) {
		console.error(`[DB] Error in callDbApi for action ${action}:`, error);
		throw error;
	}
}

// Get all databases
export async function getDatabases(connectionDetails: ConnectionDetails): Promise<string[]> {
	try {
		return await callDbApi("getDatabases", { connectionDetails });
	} catch (error) {
		console.error("Error fetching databases:", error);
		throw error;
	}
}

// Test connection to PostgreSQL
export async function testConnection(connectionDetails: ConnectionDetails): Promise<{ success: boolean; databases: string[] }> {
	try {
		// First get all databases
		const databases = await getDatabases(connectionDetails);
		console.log("[DB] Available databases:", databases);

		if (databases.length === 0) {
			throw new Error("No databases available for this user");
		}

		return { success: true, databases };
	} catch (error) {
		console.error("Connection error:", error);
		throw error;
	}
}

// Get tables from database
export async function getTables(connectionDetails: ConnectionDetails): Promise<string[]> {
	try {
		return await callDbApi("getTables", { connectionDetails });
	} catch (error) {
		console.error("Error fetching tables:", error);
		throw error;
	}
}

// Get table structure
export async function getTableStructure(connectionDetails: ConnectionDetails, tableName: string) {
	try {
		return await callDbApi("getTableStructure", { connectionDetails, tableName });
	} catch (error) {
		console.error(`Error fetching structure for table ${tableName}:`, error);
		throw error;
	}
}

// Get table data
export async function getTableData(connectionDetails: ConnectionDetails, tableName: string) {
	try {
		return await callDbApi("getTableData", { connectionDetails, tableName });
	} catch (error) {
		console.error(`Error fetching data for table ${tableName}:`, error);
		throw error;
	}
}

// Get server information
export async function getServerInfo(connectionDetails: ConnectionDetails) {
	try {
		return await callDbApi("getServerInfo", { connectionDetails });
	} catch (error) {
		console.error("Error fetching server information:", error);
		throw error;
	}
}

// Get database information
export async function getDatabaseInfo(connectionDetails: ConnectionDetails) {
	try {
		return await callDbApi("getDatabaseInfo", { connectionDetails });
	} catch (error) {
		console.error("Error fetching database information:", error);
		throw error;
	}
}

// Insert a new row
export async function insertRow(connectionDetails: ConnectionDetails, tableName: string, rowData: Record<string, unknown>) {
	try {
		return await callDbApi("insertRow", { connectionDetails, tableName, rowData });
	} catch (error) {
		console.error(`Error inserting row into ${tableName}:`, error);
		throw error;
	}
}

// Update a row
export async function updateRow(connectionDetails: ConnectionDetails, tableName: string, rowData: Record<string, unknown>, primaryKey: string) {
	try {
		return await callDbApi("updateRow", { connectionDetails, tableName, rowData, primaryKey });
	} catch (error) {
		console.error(`Error updating row in ${tableName}:`, error);
		throw error;
	}
}

// Delete a row
export async function deleteRow(connectionDetails: ConnectionDetails, tableName: string, primaryKey: string, primaryKeyValue: unknown) {
	try {
		return await callDbApi("deleteRow", { connectionDetails, tableName, primaryKey, primaryKeyValue });
	} catch (error) {
		console.error(`Error deleting row from ${tableName}:`, error);
		throw error;
	}
}
