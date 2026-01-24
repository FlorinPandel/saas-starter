// app/api/getLastWorkout/route.ts
import { NextResponse } from "next/server";
import pkg from "pg";

const { Pool } = pkg;

export const runtime = "nodejs";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = Number(searchParams.get("user_id"));

    if (!user_id) {
      return NextResponse.json(
        { error: "Missing user_id" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      SELECT
        id,
        week,
        exercise,
        sets,
        reps_per_set,
        volume,
        weighted_volume,
        avg_rpe,
        created_at
      FROM workout_sessions
      WHERE user_id = $1
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 4
      `,
      [user_id]
    );

    return NextResponse.json({
      workouts: result.rows,
    });
  } catch (err) {
    console.error("getLastWorkout error:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}
