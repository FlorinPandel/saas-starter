export const runtime = "nodejs";

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

    const { progression_rate, fatigue_sensitivity } = body;

    // Validate fields
    if (
      typeof progression_rate !== "number" ||
      typeof fatigue_sensitivity !== "number"
    ) {
      return NextResponse.json(
        { error: "Missing or invalid fields." },
        { status: 400 }
      );
    }

    const query = `
      UPDATE users
      SET
        progression_rate = $1,
        fatigue_sensitivity = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING
        id,
        progression_rate,
        fatigue_sensitivity,
        updated_at;
    `;

    const values = [
      progression_rate,
      fatigue_sensitivity,
      user_id,
    ];

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
