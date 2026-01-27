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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user_id = session.user.id;
    const body = await request.json();

    const { exercise, predicted, actual } = body;

    // ✅ Validation
    if (
      typeof exercise !== "string" ||
      typeof predicted !== "number" ||
      typeof actual !== "number"
    ) {
      return NextResponse.json(
        { error: "Missing or invalid fields" },
        { status: 400 }
      );
    }

    const query = `
      INSERT INTO predicted_actual_max (
        user_id,
        exercise,
        predicted,
        actual,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *;
    `;

    const values = [user_id, exercise, predicted, actual];

    const result = await pool.query(query, values);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("Error saving predicted max:", error);

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
