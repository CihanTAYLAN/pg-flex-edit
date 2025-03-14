import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

export async function POST(request: NextRequest) {
	try {
		const { action, connectionDetails, tableName, rowData, primaryKey, primaryKeyValue } = await request.json();

		const { host, port, username, password } = connectionDetails;

		// For getDatabases action, we connect to postgres database
		// For other actions, we use the specified database
		const database = action === "getDatabases" ? "postgres" : connectionDetails.database;

		console.log(`[API] Action: ${action}, Database: ${database}`);

		const pool = new Pool({
			host,
			port,
			database,
			user: username,
			password,
			ssl: false,
			connectionTimeoutMillis: 5000,
		});

		let client = null;
		let result = null;

		try {
			client = await pool.connect();

			switch (action) {
				case "getDatabases":
					const dbResult = await client.query(`
						SELECT datname FROM pg_database 
						WHERE datistemplate = false 
						AND datname != 'postgres' 
						ORDER BY datname
					`);
					result = dbResult.rows.map((row) => row.datname);
					break;

				case "testConnection":
					await client.query("SELECT 1");
					result = { success: true };
					break;

				case "getTables":
					const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
          `);
					result = tablesResult.rows.map((row) => row.table_name);
					break;

				case "getTableStructure":
					const structureResult = await client.query(
						`
            SELECT 
              column_name, 
              data_type, 
              is_nullable, 
              column_default
            FROM 
              information_schema.columns
            WHERE 
              table_schema = 'public' AND 
              table_name = $1
            ORDER BY 
              ordinal_position
          `,
						[tableName]
					);
					result = structureResult.rows;
					break;

				case "getTableData":
					// First get the columns
					const columnsResult = await client.query(
						`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position
          `,
						[tableName]
					);

					const columns = columnsResult.rows.map((row) => row.column_name);

					// Then get the data
					const dataResult = await client.query(`
            SELECT * FROM "${tableName}" LIMIT 1000
          `);

					result = {
						columns,
						rows: dataResult.rows,
					};
					break;

				case "insertRow":
					const insertColumns = Object.keys(rowData);
					const insertValues = Object.values(rowData);
					const insertPlaceholders = insertValues.map((_, i) => `$${i + 1}`).join(", ");

					const insertQuery = `
            INSERT INTO "${tableName}" (${insertColumns.map((c) => `"${c}"`).join(", ")})
            VALUES (${insertPlaceholders})
            RETURNING *
          `;

					const insertResult = await client.query(insertQuery, insertValues);
					result = insertResult.rows[0];
					break;

				case "updateRow":
					const primaryKeyVal = rowData[primaryKey];
					const entries = Object.entries(rowData).filter(([key]) => key !== primaryKey);

					if (entries.length === 0) {
						throw new Error("No data to update");
					}

					const setClause = entries.map(([key], index) => `"${key}" = $${index + 1}`).join(", ");

					const updateValues = entries.map(([, value]) => value);
					updateValues.push(primaryKeyVal);

					const updateQuery = `
            UPDATE "${tableName}"
            SET ${setClause}
            WHERE "${primaryKey}" = $${updateValues.length}
            RETURNING *
          `;

					const updateResult = await client.query(updateQuery, updateValues);
					result = updateResult.rows[0];
					break;

				case "deleteRow":
					const deleteQuery = `
            DELETE FROM "${tableName}"
            WHERE "${primaryKey}" = $1
          `;

					await client.query(deleteQuery, [primaryKeyValue]);
					result = { success: true };
					break;

				default:
					return NextResponse.json({ error: "Invalid action" }, { status: 400 });
			}

			return NextResponse.json(result);
		} finally {
			if (client) client.release();
			await pool.end();
		}
	} catch (error: unknown) {
		console.error("API error:", error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "An error occurred",
			},
			{ status: 500 }
		);
	}
}
