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

				case "getServerInfo":
					// PostgreSQL sunucu bilgilerini al
					const versionResult = await client.query("SELECT version()");
					const uptimeResult = await client.query("SELECT date_trunc('second', current_timestamp - pg_postmaster_start_time()) as uptime");
					const dbCountResult = await client.query("SELECT count(*) FROM pg_database WHERE datistemplate = false");
					const tableCountResult = await client.query(`
						SELECT count(*) FROM information_schema.tables 
						WHERE table_schema = 'public'
					`);
					const activeConnectionsResult = await client.query("SELECT count(*) FROM pg_stat_activity WHERE state = 'active'");
					const dbSizeResult = await client.query("SELECT pg_size_pretty(sum(pg_database_size(datname))) FROM pg_database");
					const maxConnectionsResult = await client.query("SHOW max_connections");
					const startTimeResult = await client.query("SELECT pg_postmaster_start_time()");
					const serverProcessIdResult = await client.query("SELECT pg_backend_pid()");
					const dataDirectoryResult = await client.query("SHOW data_directory");
					const configFileResult = await client.query("SHOW config_file");
					const hbaFileResult = await client.query("SHOW hba_file");
					const identFileResult = await client.query("SHOW ident_file");

					// Performans metrikleri
					const cacheHitResult = await client.query(`
						SELECT 
							round(100 * sum(blks_hit) / (sum(blks_hit) + sum(blks_read)), 2) as cache_hit_ratio 
						FROM pg_stat_database
					`);
					const transactionsResult = await client.query(`
						SELECT sum(xact_commit + xact_rollback) / 
							(extract(epoch from current_timestamp) - extract(epoch from pg_postmaster_start_time())) as tps 
						FROM pg_stat_database
					`);
					const idleConnectionsResult = await client.query("SELECT count(*) FROM pg_stat_activity WHERE state = 'idle'");
					const activeTransactionsResult = await client.query("SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND xact_start IS NOT NULL");
					const waitingQueriesResult = await client.query("SELECT count(*) FROM pg_stat_activity WHERE wait_event_type IS NOT NULL");
					const deadlocksResult = await client.query("SELECT deadlocks FROM pg_stat_database WHERE datname = $1", [database]);
					const tempFileUsageResult = await client.query("SELECT pg_size_pretty(sum(temp_bytes)) FROM pg_stat_database");

					result = {
						version: versionResult.rows[0].version,
						uptime: formatUptime(uptimeResult.rows[0].uptime),
						databases: parseInt(dbCountResult.rows[0].count),
						totalTables: parseInt(tableCountResult.rows[0].count),
						activeConnections: parseInt(activeConnectionsResult.rows[0].count),
						size: dbSizeResult.rows[0].pg_size_pretty,
						maxConnections: parseInt(maxConnectionsResult.rows[0].max_connections),
						startTime: startTimeResult.rows[0].pg_postmaster_start_time,
						serverProcessId: serverProcessIdResult.rows[0].pg_backend_pid,
						dataDirectory: dataDirectoryResult.rows[0].data_directory,
						configFile: configFileResult.rows[0].config_file,
						hbaFile: hbaFileResult.rows[0].hba_file,
						identFile: identFileResult.rows[0].ident_file,
						cacheHitRatio: cacheHitResult.rows[0].cache_hit_ratio + "%",
						transactionsPerSec: Math.round(parseFloat(transactionsResult.rows[0].tps)),
						idleConnections: parseInt(idleConnectionsResult.rows[0].count),
						activeTransactions: parseInt(activeTransactionsResult.rows[0].count),
						waitingQueries: parseInt(waitingQueriesResult.rows[0].count),
						deadlocks: parseInt(deadlocksResult.rows[0].deadlocks),
						tempFileUsage: tempFileUsageResult.rows[0].pg_size_pretty,
					};
					break;

				case "getDatabaseInfo":
					// Veritabanı genel bilgileri
					const dbNameResult = await client.query("SELECT current_database()");
					const dbTableCountResult = await client.query(`
						SELECT count(*) FROM information_schema.tables 
						WHERE table_schema = 'public'
					`);
					const dbSizeInfoResult = await client.query("SELECT pg_size_pretty(pg_database_size(current_database()))");
					const dbOwnerResult = await client.query(`
						SELECT pg_catalog.pg_get_userbyid(d.datdba) as owner
						FROM pg_catalog.pg_database d
						WHERE d.datname = current_database()
					`);
					const dbCreatedResult = await client.query(`
						SELECT pg_stat_file('base/'||oid||'/PG_VERSION') as stats
						FROM pg_database
						WHERE datname = current_database()
					`);

					// Veritabanı özellikleri
					const encodingResult = await client.query("SHOW server_encoding");
					const collationResult = await client.query(`
						SELECT datcollate as setting
						FROM pg_database 
						WHERE datname = current_database()
					`);
					const ctypeResult = await client.query(`
						SELECT datctype as setting
						FROM pg_database 
						WHERE datname = current_database()
					`);
					const tablespaceResult = await client.query(`
						SELECT spcname
						FROM pg_tablespace t
						JOIN pg_database d ON d.dattablespace = t.oid
						WHERE d.datname = current_database()
					`);

					// Bakım bilgileri
					const lastVacuumResult = await client.query(`
						SELECT max(last_vacuum) as last_vacuum
						FROM pg_stat_all_tables
						WHERE schemaname = 'public'
					`);
					const lastAnalyzeResult = await client.query(`
						SELECT max(last_analyze) as last_analyze
						FROM pg_stat_all_tables
						WHERE schemaname = 'public'
					`);

					// Performans metrikleri
					const dbCacheHitResult = await client.query(`
						SELECT 
							round(100 * sum(blks_hit) / nullif(sum(blks_hit) + sum(blks_read), 0), 2) as cache_hit_ratio 
						FROM pg_stat_database
						WHERE datname = current_database()
					`);
					const indexUsageResult = await client.query(`
						SELECT 
							round(100 * sum(idx_scan) / nullif(sum(idx_scan) + sum(seq_scan), 0), 2) as index_usage
						FROM pg_stat_all_tables
						WHERE schemaname = 'public'
					`);
					const dbDeadlocksResult = await client.query(`
						SELECT deadlocks
						FROM pg_stat_database
						WHERE datname = current_database()
					`);
					const conflictRateResult = await client.query(`
						SELECT 
							round(100 * sum(conflicts) / nullif(sum(conflicts) + sum(xact_commit) + sum(xact_rollback), 0), 4) as conflict_rate
						FROM pg_stat_database
						WHERE datname = current_database()
					`);
					const bloatResult = await client.query(`
						SELECT CAST(AVG(bloat_ratio) AS NUMERIC(10,2)) as avg_bloat
						FROM (
							SELECT 
								(data_length - (reltuples * (datahdr + nullhdr + 4 + ma - 
									CASE WHEN datahdr % ma = 0 THEN ma ELSE datahdr % ma END))) / data_length * 100 as bloat_ratio
							FROM (
								SELECT
									reltuples,
									24 as datahdr,
									23 + (case when max(coalesce(null_frac, 0)) > 0 THEN (7 + count(*)) / 8 ELSE 0 END) as nullhdr,
									8 as ma,
									sum(pg_column_size(t.*)) as data_length
								FROM pg_stats s
								JOIN pg_class c ON c.relname = s.tablename
								JOIN pg_namespace n ON n.oid = c.relnamespace
								JOIN information_schema.columns i ON i.table_schema = n.nspname AND i.table_name = c.relname
								JOIN (
									SELECT * FROM pg_tables t LIMIT 1
								) t ON t.tablename = c.relname
								WHERE s.schemaname = 'public'
								GROUP BY 1
							) t
						) t
						WHERE bloat_ratio > 0
					`);

					// Eklentiler
					const extensionsResult = await client.query(`
						SELECT extname
						FROM pg_extension
					`);

					// Veritabanı yaşı
					const frozenXidAgeResult = await client.query(`
						SELECT age(datfrozenxid) as age
						FROM pg_database
						WHERE datname = current_database()
					`);

					result = {
						name: dbNameResult.rows[0].current_database,
						tableCount: parseInt(dbTableCountResult.rows[0].count),
						size: dbSizeInfoResult.rows[0].pg_size_pretty,
						owner: dbOwnerResult.rows[0].owner,
						created: dbCreatedResult.rows[0].stats.modification ? new Date(dbCreatedResult.rows[0].stats.modification * 1000).toISOString().split("T")[0] : "Unknown",
						encoding: encodingResult.rows[0].server_encoding,
						collation: collationResult.rows[0].setting,
						ctype: ctypeResult.rows[0].setting,
						tablespaceLocation: tablespaceResult.rows[0].spcname,
						lastVacuum: lastVacuumResult.rows[0].last_vacuum ? lastVacuumResult.rows[0].last_vacuum.toISOString().split("T")[0] : "Never",
						lastAnalyze: lastAnalyzeResult.rows[0].last_analyze ? lastAnalyzeResult.rows[0].last_analyze.toISOString().split("T")[0] : "Never",
						cacheHitRatio: dbCacheHitResult.rows[0].cache_hit_ratio ? dbCacheHitResult.rows[0].cache_hit_ratio + "%" : "N/A",
						indexUsage: indexUsageResult.rows[0].index_usage ? indexUsageResult.rows[0].index_usage + "%" : "N/A",
						deadlocks: parseInt(dbDeadlocksResult.rows[0].deadlocks),
						conflictRate: conflictRateResult.rows[0].conflict_rate ? conflictRateResult.rows[0].conflict_rate + "%" : "0%",
						bloatPercentage: bloatResult.rows[0] ? parseFloat(bloatResult.rows[0].avg_bloat) : 0,
						frozenXidAge: parseInt(frozenXidAgeResult.rows[0].age),
						extensions: extensionsResult.rows.map((row) => row.extname),
					};
					break;

				case "runVacuumFull":
					// Tüm tablolar için mi yoksa belirli bir tablo için mi VACUUM FULL çalıştırılacak
					const targetTable = tableName === "ALL" ? null : tableName;

					if (targetTable) {
						// Belirli bir tablo için VACUUM FULL çalıştır
						await client.query(`VACUUM FULL "${targetTable}"`);
						console.log(`[API] VACUUM FULL completed for table: ${targetTable}`);
					} else {
						// Tüm tablolar için VACUUM FULL çalıştır
						// Önce tüm tabloları al
						const allTablesResult = await client.query(`
							SELECT table_name 
							FROM information_schema.tables 
							WHERE table_schema = 'public'
						`);

						// Her tablo için VACUUM FULL çalıştır
						for (const row of allTablesResult.rows) {
							const table = row.table_name;
							console.log(`[API] Running VACUUM FULL for table: ${table}`);
							await client.query(`VACUUM FULL "${table}"`);
						}

						console.log(`[API] VACUUM FULL completed for all tables`);
					}

					// Bakım bilgilerini güncelle
					await client.query(`ANALYZE`);

					result = { success: true };
					break;

				case "runMagicMaintenance":
					console.log(`[API] Running Magic Maintenance for database: ${database}`);

					// 1. Tüm tabloları al
					const maintenanceTablesResult = await client.query(`
						SELECT table_name 
						FROM information_schema.tables 
						WHERE table_schema = 'public'
					`);

					// 2. Bloat oranı yüksek tabloları bul
					const bloatedTablesResult = await client.query(`
						SELECT 
							c.relname as table_name,
							CAST((t.data_length - (t.reltuples * (t.datahdr + t.nullhdr + 4 + t.ma - 
								CASE WHEN t.datahdr % t.ma = 0 THEN t.ma ELSE t.datahdr % t.ma END))) / t.data_length * 100 AS NUMERIC(10,2)) as bloat_ratio
						FROM (
							SELECT
								relname,
								reltuples,
								24 as datahdr,
								23 + (case when max(coalesce(null_frac, 0)) > 0 THEN (7 + count(*)) / 8 ELSE 0 END) as nullhdr,
								8 as ma,
								sum(pg_column_size(t.*)) as data_length
							FROM pg_stats s
							JOIN pg_class c ON c.relname = s.tablename
							JOIN pg_namespace n ON n.oid = c.relnamespace
							JOIN information_schema.columns i ON i.table_schema = n.nspname AND i.table_name = c.relname
							JOIN (
								SELECT * FROM pg_tables t LIMIT 1
							) t ON t.tablename = c.relname
							WHERE s.schemaname = 'public'
							GROUP BY 1, 2
						) t
						JOIN pg_class c ON c.relname = t.relname
						WHERE t.data_length > 0
						AND (t.data_length - (t.reltuples * (t.datahdr + t.nullhdr + 4 + t.ma - 
							CASE WHEN t.datahdr % t.ma = 0 THEN t.ma ELSE t.datahdr % t.ma END))) / t.data_length * 100 > 20
					`);

					// 3. İndeks durumunu kontrol et
					const indexHealthResult = await client.query(`
						SELECT
							schemaname,
							relname as table_name,
							indexrelname as index_name,
							idx_scan,
							idx_tup_read,
							idx_tup_fetch
						FROM
							pg_stat_user_indexes
						WHERE
							idx_scan = 0
						AND
							schemaname = 'public'
					`);

					// 4. Bakım işlemlerini gerçekleştir

					// 4.1. Tüm tablolar için VACUUM ANALYZE çalıştır
					for (const row of maintenanceTablesResult.rows) {
						const table = row.table_name;
						console.log(`[API] Running VACUUM ANALYZE for table: ${table}`);
						await client.query(`VACUUM ANALYZE "${table}"`);
					}

					// 4.2. Bloat oranı yüksek tablolar için VACUUM FULL çalıştır
					for (const row of bloatedTablesResult.rows) {
						const table = row.table_name;
						const bloatRatio = row.bloat_ratio;
						console.log(`[API] Running VACUUM FULL for bloated table: ${table} (bloat: ${bloatRatio}%)`);
						await client.query(`VACUUM FULL "${table}"`);
					}

					// 4.3. Kullanılmayan indeksleri yeniden oluştur
					for (const row of indexHealthResult.rows) {
						const table = row.table_name;
						const index = row.index_name;
						console.log(`[API] Running REINDEX for unused index: ${index} on table ${table}`);
						await client.query(`REINDEX INDEX "${index}"`);
					}

					// 4.4. Genel istatistikleri güncelle
					console.log(`[API] Running ANALYZE for the entire database`);
					await client.query(`ANALYZE`);

					console.log(`[API] Magic Maintenance completed successfully`);

					result = {
						success: true,
						details: {
							tablesProcessed: maintenanceTablesResult.rows.length,
							bloatedTablesFixed: bloatedTablesResult.rows.length,
							indexesRebuilt: indexHealthResult.rows.length,
						},
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

// Uptime değerini formatlayan yardımcı fonksiyon
function formatUptime(uptime: unknown): string {
	if (!uptime) return "Unknown";

	try {
		// PostgreSQL interval tipini parçalara ayırıp formatlama
		const uptimeObj = uptime as { days?: number; hours?: number; minutes?: number; seconds?: number };
		const days = uptimeObj.days || 0;
		const hours = uptimeObj.hours || 0;
		const minutes = uptimeObj.minutes || 0;
		const seconds = uptimeObj.seconds || 0;

		if (days > 0) {
			return `${days} days, ${hours} hours`;
		} else if (hours > 0) {
			return `${hours} hours, ${minutes} minutes`;
		} else {
			return `${minutes} minutes, ${seconds} seconds`;
		}
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
	} catch (_) {
		// Eğer interval tipini parse edemiyorsak, ISO string formatını kullanmayı dene
		try {
			if (typeof uptime === "string") {
				return uptime;
			}

			// Interval tipini string olarak parse et
			const uptimeStr = uptime.toString();
			if (uptimeStr.includes(":")) {
				const parts = uptimeStr.split(":");
				if (parts.length === 3) {
					const hours = parseInt(parts[0]);
					const minutes = parseInt(parts[1]);
					const seconds = parseInt(parts[2]);

					if (hours > 24) {
						const days = Math.floor(hours / 24);
						const remainingHours = hours % 24;
						return `${days} days, ${remainingHours} hours`;
					} else if (hours > 0) {
						return `${hours} hours, ${minutes} minutes`;
					} else {
						return `${minutes} minutes, ${seconds} seconds`;
					}
				}
			}

			return "Unknown format";
		} catch (e) {
			console.error("Error formatting uptime:", e);
			return "Unknown";
		}
	}
}
