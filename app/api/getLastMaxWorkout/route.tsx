// app/api/getLastMaxWorkout/route.ts
import { NextResponse } from "next/server";
import { Pool } from "pg";
import { getSession } from "@/lib/auth/session";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user_id = session.user.id;

    const query = `
      SELECT *
      FROM max_performance_by_week
      WHERE user_id = $1
      ORDER BY week DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [user_id]);

    if (!result.rows.length) {
      return NextResponse.json({ error: "No max performance data found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, lastMaxWorkout: result.rows[0] });
  } catch (error: any) {
    console.error("Error fetching last max workout:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
