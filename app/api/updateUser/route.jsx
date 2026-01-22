export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Pool } from "pg";
import { getSession } from "@/lib/auth/session";

const pool =
  global.pgPool ??
  new Pool({
    connectionString: process.env.POSTGRES_URL,
  });

if (process.env.NODE_ENV !== "production") {
  global.pgPool = pool;
}

export async function POST(request) {
  try {
    const session = await getSession();
    console.log("SESSION:", session);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user_id = Number(session.user.id ?? session.user.sub);
    console.log("USER ID:", user_id);

    if (!user_id || Number.isNaN(user_id)) {
      return NextResponse.json(
        { error: "Invalid user id" },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log("BODY:", body);

    const { progression_rate, fatigue_sensitivity } = body;

    if (
      typeof progression_rate !== "number" ||
      typeof fatigue_sensitivity !== "number"
    ) {
      return NextResponse.json(
        { error: "Invalid fields" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      UPDATE users
      SET
        progression_rate = $1,
        fatigue_sensitivity = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING id, progression_rate, fatigue_sensitivity;
      `,
      [progression_rate, fatigue_sensitivity, user_id]
    );

    console.log("DB RESULT:", result.rowCount);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error("API ERROR:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
