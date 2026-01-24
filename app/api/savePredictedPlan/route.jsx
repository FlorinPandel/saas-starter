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
      predicted,
      actual,
      rpe,
      feeling,
    } = body;

    // ✅ Validation
    if (
      typeof week !== "number" ||
      typeof exercise !== "string" ||
      typeof rpe !== "number" ||
      typeof feeling !== "number" ||
      typeof predicted !== "number" ||
      typeof actual !== "number"
    ) {
      return NextResponse.json(
        { error: "Missing or invalid fields." },
        { status: 400 }
      );
    }

    const query = `
      INSERT INTO predicted_actual_plan (
        user_id,
        week,
        exercise,
        predicted,
        actual,
        rpe,
        feeling,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, NOW(), NOW())
      RETURNING *;
    `;

    const values = [
      user_id,
      week,
      exercise,
      JSON.stringify(predicted),
      JSON.stringify(actual),
      rpe,
      feeling,
    ];

    const result = await pool.query(query, values);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error saving predicted plan:", error);

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
