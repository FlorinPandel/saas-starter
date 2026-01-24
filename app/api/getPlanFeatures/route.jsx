import { NextRequest, NextResponse } from "next/server";
import pkg from "pg";

const { Pool } = pkg;

export const runtime = "nodejs";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

/* ======================
   UTIL: slope (trend)
   ====================== */
function slope(values) {
  if (values.length < 2) return 0;

  const n = values.length;
  const x = values.map((_, i) => i);
  const y = values;

  const xMean = x.reduce((a, b) => a + b, 0) / n;
  const yMean = y.reduce((a, b) => a + b, 0) / n;

  const num = x.reduce(
    (sum, xi, i) => sum + (xi - xMean) * (y[i] - yMean),
    0
  );

  const den = x.reduce((sum, xi) => sum + (xi - xMean) ** 2, 0);

  return den === 0 ? 0 : num / den;
}

/* ======================
   API
   ====================== */
export async function GET(req) {
  const user_id = Number(req.nextUrl.searchParams.get("user_id"));
  if (!user_id) {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }

  try {
    /* ----------------------
       1️⃣ Fetch user
       ---------------------- */
    const userRes = await pool.query(
      `SELECT id, age, bodyweight, experience, progression_rate, fatigue_sensitivity
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [user_id]
    );

    const user = userRes.rows[0];
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    /* ----------------------
       2️⃣ Fetch LAST 8 sessions
       ---------------------- */
    const sessionsRes = await pool.query(
      `
      SELECT exercise, volume, weighted_volume, avg_rpe
      FROM workout_sessions
      WHERE user_id = $1
      ORDER BY id DESC
      LIMIT 8
      `,
      [user_id]
    );

    const sessions = sessionsRes.rows.reverse(); // chronological order

    /* ----------------------
       3️⃣ Defaults (no data)
       ---------------------- */
    if (sessions.length === 0) {
      return NextResponse.json({
        features: {
          total_weighted_load_2w: 0,
          avg_rpe_2w: 0,
          volume_trend: 0,
          fatigue_index: 0,
          monotony: 0,
          best_session_volume_pushups: 0,
          total_volume: 0,
          age: user.age,
          weight: user.bodyweight,
          experience: user.experience,
          progression_rate: user.progression_rate,
          fatigue_sensitivity: user.fatigue_sensitivity,
        },
      });
    }

    /* ----------------------
       4️⃣ Aggregations
       ---------------------- */
    const total_weighted_load_2w = sessions.reduce(
      (sum, s) => sum + Number(s.weighted_volume),
      0
    );

    const total_volume = sessions.reduce(
      (sum, s) => sum + Number(s.volume),
      0
    );

    const avg_rpe_2w =
      sessions.reduce((sum, s) => sum + Number(s.avg_rpe), 0) /
      sessions.length;

    const weightedSeries = sessions.map((s) =>
      Number(s.weighted_volume)
    );

    const volume_trend = slope(weightedSeries);

    /* ----------------------
       5️⃣ Monotony
       ---------------------- */
    const mean =
      weightedSeries.reduce((a, b) => a + b, 0) / weightedSeries.length;

    const std =
      Math.sqrt(
        weightedSeries
          .map((v) => (v - mean) ** 2)
          .reduce((a, b) => a + b, 0) / weightedSeries.length
      ) || 1;

    const monotony = mean / std;

    /* ----------------------
       6️⃣ Fatigue (last session)
       ---------------------- */
    const lastSession = sessions[sessions.length - 1];
    const fatigue_index =
      Number(lastSession.weighted_volume) *
      Number(lastSession.avg_rpe);

    /* ----------------------
       7️⃣ Best pushups session
       ---------------------- */
    const best_session_volume_pushups = Math.max(
      ...sessions
        .filter((s) => s.exercise === "pushups")
        .map((s) => Number(s.volume)),
      0
    );

    /* ----------------------
       8️⃣ Response
       ---------------------- */
    return NextResponse.json({
      features: {
        total_weighted_load_2w,
        avg_rpe_2w,
        volume_trend,
        fatigue_index,
        monotony,
        best_session_volume_pushups,
        total_volume,
        age: user.age,
        weight: user.bodyweight,
        experience: user.experience,
        progression_rate: user.progression_rate,
        fatigue_sensitivity: user.fatigue_sensitivity,
      },
    });
  } catch (err) {
    console.error("getPlanFeatures error:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}
