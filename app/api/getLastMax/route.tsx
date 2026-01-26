import { NextResponse } from "next/server";
import { Pool } from "pg";
import { getSession } from "@/lib/auth/session";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

// DB → API naming normalization
const EXERCISE_MAP = {
  plank_seconds: "plank_seconds",
  situps: "situps",
  push_ups: "pushups",
  squats: "squats",
} as const;

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user_id = session.user.id;

    // 🔹 Get latest week row
    const res = await pool.query(
      `
      SELECT week, plank_seconds, situps, push_ups, squats
      FROM max_performance_by_week
      WHERE user_id = $1
      ORDER BY week DESC
      LIMIT 1
      `,
      [user_id]
    );

    if (!res.rows.length) {
      return NextResponse.json(
        { error: "No performance data found" },
        { status: 404 }
      );
    }

    const row = res.rows[0];

    // 🔹 Normalize output
    const result: Record<string, number> = {
      week: row.week,
    };

    Object.entries(EXERCISE_MAP).forEach(([dbName, apiName]) => {
      result[apiName] = Number(row[dbName]);
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error fetching last max:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
