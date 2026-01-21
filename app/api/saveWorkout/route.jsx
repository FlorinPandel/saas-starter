import { NextResponse } from "next/server";
import { Pool } from "pg";
import { getSession } from "@/lib/auth/session";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

export async function POST(request) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const user_id = session.user.id;
    const body = await request.json();

    const {
      week,
      exercise,
      sets,
      reps_per_set,
      volume,
      weighted_volume,
      avg_rpe,
    } = body;

    // Validate required fields
    if (
      typeof week !== "number" ||
      typeof exercise !== "string" ||
      typeof sets !== "number" ||
      !Array.isArray(reps_per_set) ||
      typeof volume !== "number" ||
      typeof weighted_volume !== "number" ||
      typeof avg_rpe !== "number"
    ) {
      return NextResponse.json(
        { error: "Missing or invalid fields." },
        { status: 400 }
      );
    }

    const query = `
      INSERT INTO workout_sessions (
        user_id,
        week,
        exercise,
        sets,
        reps_per_set,
        volume,
        weighted_volume,
        avg_rpe
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    const values = [
      user_id,
      week,
      exercise,
      sets,
      JSON.stringify(reps_per_set),
      volume,
      weighted_volume,
      avg_rpe,
    ];

    const result = await pool.query(query, values);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error saving workout:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
