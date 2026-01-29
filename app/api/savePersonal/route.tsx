import { NextResponse } from "next/server";
import { Pool } from "pg";
import { getSession } from "@/lib/auth/session";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const user_id = session.user.id;
    const { sex, age, experience, bodyweight } = await request.json();

    if (
      ![0, 1].includes(sex) ||
      typeof age !== "number" ||
      ![0, 1, 2].includes(experience) ||
      typeof bodyweight !== "number"
    ) {
      return NextResponse.json(
        { error: "Invalid input data" },
        { status: 400 }
      );
    }

    const query = `
      UPDATE users
      SET
        sex = $1,
        age = $2,
        experience = $3,
        bodyweight = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING *;
    `;

    const values = [sex, age, experience, bodyweight, user_id];

    const result = await pool.query(query, values);

    return NextResponse.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error: any) {
    console.error("savePersonal error:", error);

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
