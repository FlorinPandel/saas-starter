import { NextResponse } from "next/server";
import { Pool } from "pg";
import { getSession } from "@/lib/auth/session";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

const exercises = ["plank_seconds", "situps", "pushups", "squats"];
const lags = [1, 2, 3];
const EXERCISE_MAP = {
  plank_seconds: "plank_seconds",
  situps: "situps",
  pushups: "pushups",
  squats: "squats",
} as const;


export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user_id = session.user.id;

    // 1️⃣ User profile
    const userRes = await pool.query(
      `SELECT age, bodyweight, experience, true_strength, progression_rate, fatigue_sensitivity, fatigue
       FROM users WHERE id = $1`,
      [user_id]
    );
    if (!userRes.rows.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userRes.rows[0];

    // 2️⃣ Performance history
    const perfRes = await pool.query(
      `SELECT week, plank_seconds, situps, pushups, squats
       FROM max_performance_by_week
       WHERE user_id = $1
       ORDER BY week ASC`,
      [user_id]
    );

    const performances = perfRes.rows;
    if (!performances.length) {
      return NextResponse.json({ error: "No performance data" }, { status: 404 });
    }

    const latestWeek = performances[performances.length - 1].week;

    //  Build ONE flat feature object
    const features: Record<string, number | null> = {};

    //  User features
    Object.entries(user).forEach(([key, value]) => {
      features[key] = Number(value);
    });

    //  Exercise-based features
    Object.entries(EXERCISE_MAP).forEach(([dbName, mlName]) => {
  // Lag features
  lags.forEach((lag) => {
    const row = performances.find((p) => p.week === latestWeek - lag);
    features[`${mlName}_lag${lag}`] = row ? Number(row[dbName]) : null;
  });

  // Rolling avg
  const rolling = performances
    .filter((p) => p.week < latestWeek)
    .slice(-3)
    .map((p) => Number(p[dbName]));

  features[`${mlName}_rolling_avg_3w`] =
    rolling.length ? rolling.reduce((a, b) => a + b, 0) / rolling.length : null;

  // Trend
  const last = performances[performances.length - 1][dbName];
  const lag1 = performances.find((p) => p.week === latestWeek - 1)?.[dbName];

  features[`${mlName}_trend`] =
    last != null && lag1 != null ? Number(last) - Number(lag1) : null;
});


    features['week'] = 0;
    features["weight"] = Number(user.bodyweight);


    return NextResponse.json({
      success: true,
      features,
    });
  } catch (error: any) {
    console.error("Error generating max features:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
