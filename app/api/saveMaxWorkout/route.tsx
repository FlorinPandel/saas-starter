import { NextResponse } from "next/server";
import { Pool } from "pg";
import { getSession } from "@/lib/auth/session";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const user_id = session.user.id;
    const body = await request.json();

    const {
      week,
      plank_seconds,
      push_ups,
      situps,
      squats,
    } = body;

    // ✅ Validation
    if (
      typeof week !== "number" ||
      typeof plank_seconds !== "number" ||
      typeof push_ups !== "number" ||
      typeof situps !== "number" ||
      typeof squats !== "number"
    ) {
      return NextResponse.json(
        { error: "Missing or invalid fields." },
        { status: 400 }
      );
    }

    const query = `
      INSERT INTO max_performance_by_week (
        user_id,
        week,
        plank_seconds,
        push_ups,
        situps,
        squats,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (user_id, week)
      DO UPDATE SET
        plank_seconds = EXCLUDED.plank_seconds,
        push_ups = EXCLUDED.push_ups,
        situps = EXCLUDED.situps,
        squats = EXCLUDED.squats,
        updated_at = NOW()
      RETURNING *;
    `;

    const values = [
      user_id,
      week,
      plank_seconds,
      push_ups,
      situps,
      squats,
    ];

    const result = await pool.query(query, values);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("Error saving max performance:", error);

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
