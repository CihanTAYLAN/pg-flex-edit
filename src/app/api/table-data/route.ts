import { NextResponse } from "next/server";
import { Pool } from "pg";

interface FilterModel {
	filterType: string;
	type: string;
	filter?: string;
	operator?: string;
	condition1?: {
		filterType: string;
		type: string;
		filter?: string;
	};
	condition2?: {
		filterType: string;
		type: string;
		filter?: string;
	};
}

interface SortModel {
	colId: string;
	sort: "asc" | "desc";
}

interface RequestBody {
	connection: {
		username: string;
		host: string;
		database: string;
		password: string;
		port: number;
	};
	table: string;
	startRow: number;
	endRow: number;
	filterModel: { [key: string]: FilterModel };
	sortModel: SortModel[];
}

export async function POST(request: Request) {
	try {
		const body: RequestBody = await request.json();
		const { connection, table, startRow, endRow, filterModel, sortModel } = body;

		const pool = new Pool({
			user: connection.username,
			host: connection.host,
			database: connection.database,
			password: connection.password,
			port: connection.port,
			ssl: false,
		});

		// Ana sorguyu hazırla
		let query = `SELECT * FROM "${table}"`;
		const params: (string | number)[] = [];
		let paramIndex = 1;

		// Filtreleri ekle
		const conditions: string[] = [];
		if (filterModel) {
			Object.entries(filterModel).forEach(([key, filter]) => {
				if (filter.filterType === "text") {
					if (filter.type === "contains") {
						params.push(`%${filter.filter}%`);
						conditions.push(`"${key}"::text ILIKE $${paramIndex++}`);
					} else if (filter.type === "equals") {
						params.push(filter.filter || "");
						conditions.push(`"${key}"::text = $${paramIndex++}`);
					} else if (filter.type === "startsWith") {
						params.push(`${filter.filter}%`);
						conditions.push(`"${key}"::text ILIKE $${paramIndex++}`);
					} else if (filter.type === "endsWith") {
						params.push(`%${filter.filter}`);
						conditions.push(`"${key}"::text ILIKE $${paramIndex++}`);
					}
				}
			});
		}

		if (conditions.length > 0) {
			query += ` WHERE ${conditions.join(" AND ")}`;
		}

		// Sıralama ekle
		if (sortModel && sortModel.length > 0) {
			const orderBy = sortModel.map((sort) => `"${sort.colId}" ${sort.sort.toUpperCase()}`).join(", ");
			query += ` ORDER BY ${orderBy}`;
		}

		// Toplam kayıt sayısını al
		const countQuery = `SELECT COUNT(*) as total FROM "${table}"${conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : ""}`;
		const countResult = await pool.query(countQuery, params);
		const totalRows = parseInt(countResult.rows[0].total);

		// Sayfalama ekle
		const limit = isNaN(endRow) || isNaN(startRow) ? 20 : Math.max(0, endRow - startRow);
		const offset = isNaN(startRow) ? 0 : Math.max(0, startRow);

		query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
		params.push(limit);
		params.push(offset);

		const result = await pool.query(query, params);
		await pool.end();

		return NextResponse.json({
			rows: result.rows,
			lastRow: totalRows,
		});
	} catch (error) {
		console.error("Tablo verisi yükleme hatası:", error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Bilinmeyen hata",
			},
			{ status: 500 }
		);
	}
}
