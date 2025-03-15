import { NextResponse } from "next/server";
import { Pool } from "pg";

interface DatabaseError extends Error {
	message: string;
}

export async function POST(request: Request) {
	try {
		const { connection, table } = await request.json();

		// Veritabanı bağlantısı
		const pool = new Pool({
			user: connection.username,
			host: connection.host,
			database: connection.database,
			password: connection.password,
			port: connection.port,
			ssl: false,
		});

		// Parametreli sorgular
		const queries = {
			rowCount: {
				text: `SELECT COUNT(*) as count FROM "${table}"`,
				values: [],
			},
			size: {
				text: `SELECT pg_size_pretty(pg_total_relation_size('"${table}"')) as size`,
				values: [],
			},
			lastAnalyzed: {
				text: `SELECT last_analyze::timestamp::date as last_analyzed FROM pg_stat_user_tables WHERE relname = '${table}'`,
				values: [],
			},
			indexCount: {
				text: `SELECT COUNT(*) as count FROM pg_indexes WHERE tablename = '${table}'`,
				values: [],
			},
			columnInfo: {
				text: `
					SELECT 
						COUNT(*) as column_count,
						COUNT(*) FILTER (WHERE is_nullable = 'YES') as nullable_count,
						COUNT(*) FILTER (WHERE column_default IS NOT NULL) as default_count
					FROM information_schema.columns 
					WHERE table_name = '${table}'
				`,
				values: [],
			},
			keyInfo: {
				text: `
					SELECT 
						COUNT(*) FILTER (WHERE constraint_type = 'PRIMARY KEY') as pk_count,
						COUNT(*) FILTER (WHERE constraint_type = 'FOREIGN KEY') as fk_count
					FROM information_schema.table_constraints 
					WHERE table_name = '${table}'
				`,
				values: [],
			},
		};

		const stats = {
			rowCount: 0,
			size: "",
			lastAnalyzed: null,
			indexCount: 0,
			avgRowLength: 0,
			tableType: "BASE TABLE",
			hasIndexes: false,
			hasPrimaryKey: false,
			hasForeignKeys: false,
			hasNullableColumns: false,
			columnCount: 0,
		};

		// Tüm sorguları paralel çalıştır
		const results = await Promise.all(Object.values(queries).map((query) => pool.query(query)));

		// Sonuçları işle
		stats.rowCount = parseInt(results[0].rows[0].count);
		stats.size = results[1].rows[0].size;
		stats.lastAnalyzed = results[2].rows[0]?.last_analyzed || "Never";
		stats.indexCount = parseInt(results[3].rows[0].count);
		stats.hasIndexes = stats.indexCount > 0;

		const columnInfo = results[4].rows[0];
		stats.columnCount = parseInt(columnInfo.column_count);
		stats.hasNullableColumns = parseInt(columnInfo.nullable_count) > 0;

		const keyInfo = results[5].rows[0];
		stats.hasPrimaryKey = parseInt(keyInfo.pk_count) > 0;
		stats.hasForeignKeys = parseInt(keyInfo.fk_count) > 0;

		await pool.end();

		return NextResponse.json(stats);
	} catch (error: unknown) {
		console.error("Tablo istatistikleri yükleme hatası:", error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Bilinmeyen hata",
			},
			{ status: 500 }
		);
	}
}
