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

    const result = await pool.query(
      `
      SELECT MAX(week) AS last_week
      FROM max_performance_by_week
      WHERE user_id = $1
      `,
      [user_id]
    );

    const lastWeek = result.rows[0]?.last_week;

    if (lastWeek === null || lastWeek === undefined) {
      return NextResponse.json(
        { error: "No week data found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      week: Number(lastWeek),
    });
  } catch (error: any) {
    console.error("Error fetching last week:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
