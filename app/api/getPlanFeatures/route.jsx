// app/api/getPlanFeatures/route.ts
import { NextRequest, NextResponse } from "next/server";
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL, // your DB URL
});

function slope(arr) {
  if (arr.length < 2) return 0;
  const x = arr.map((_, i) => i);
  const y = arr;
  const n = x.length;
  const xMean = x.reduce((a, b) => a + b, 0) / n;
  const yMean = y.reduce((a, b) => a + b, 0) / n;
  const numerator = x.map((xi, i) => (xi - xMean) * (y[i] - yMean)).reduce((a, b) => a + b, 0);
  const denominator = x.map((xi) => (xi - xMean) ** 2).reduce((a, b) => a + b, 0);
  return denominator === 0 ? 0 : numerator / denominator;
}

export const runtime = "nodejs";

export async function GET(req) {
  const user_id = Number(req.nextUrl.searchParams.get("user_id"));
  if (!user_id) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });

  try {
    // 1️⃣ Get user
    const userRes = await pool.query("SELECT * FROM users WHERE id = $1 LIMIT 1", [user_id]);
    const user = userRes.rows[0];
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // 2️⃣ Get sessions
    const sessionsRes = await pool.query(
      "SELECT * FROM workout_sessions WHERE user_id = $1 ORDER BY week",
      [user_id]
    );
    const sessions = sessionsRes.rows;

    if (!sessions.length) {
      // Return defaults if no sessions
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

    // 3️⃣ Aggregate weekly stats
    const weeklyMap = {};
    sessions.forEach((s) => {
      if (!weeklyMap[s.week]) weeklyMap[s.week] = { total_weighted_load: 0, total_volume: 0, avg_rpe_arr: [], best_session_volume_pushups: 0 };
      weeklyMap[s.week].total_weighted_load += s.weighted_volume;
      weeklyMap[s.week].total_volume += s.volume;
      weeklyMap[s.week].avg_rpe_arr.push(s.avg_rpe);
      if (s.exercise === "pushups" && s.volume > weeklyMap[s.week].best_session_volume_pushups) {
        weeklyMap[s.week].best_session_volume_pushups = s.volume;
      }
    });

    const weeks = Object.keys(weeklyMap).map(Number).sort((a, b) => a - b);
    const weeklyStats = weeks.map((w) => {
      const data = weeklyMap[w];
      const avg_rpe = data.avg_rpe_arr.length
        ? data.avg_rpe_arr.reduce((a, b) => a + b, 0) / data.avg_rpe_arr.length
        : 0;
      return {
        week: w,
        total_weighted_load: data.total_weighted_load,
        total_volume: data.total_volume,
        avg_rpe,
        best_session_volume_pushups: data.best_session_volume_pushups,
      };
    });

    const lastWeek = weeklyStats[weeklyStats.length - 1];
    const total_weighted_load_2w = weeklyStats.slice(-2).reduce((a, w) => a + w.total_weighted_load, 0);
    const avg_rpe_2w = weeklyStats.slice(-2).reduce((a, w) => a + w.avg_rpe, 0) / Math.min(2, weeklyStats.length);
    const volume_trend = slope(weeklyStats.slice(-3).map((w) => w.total_weighted_load));

    const avgVol = weeklyStats.slice(-3).map((w) => w.total_weighted_load);
    const meanVol = avgVol.reduce((a, b) => a + b, 0) / avgVol.length;
    const stdVol = Math.sqrt(avgVol.map((v) => (v - meanVol) ** 2).reduce((a, b) => a + b, 0) / avgVol.length) || 1;
    const monotony = meanVol / stdVol;
    const fatigue_index = lastWeek.total_weighted_load * lastWeek.avg_rpe;

    return NextResponse.json({
      features: {
        total_weighted_load_2w,
        avg_rpe_2w,
        volume_trend,
        fatigue_index,
        monotony,
        best_session_volume_pushups: lastWeek.best_session_volume_pushups,
        total_volume: lastWeek.total_volume,
        age: user.age,
        weight: user.bodyweight,
        experience: user.experience,
        progression_rate: user.progression_rate,
        fatigue_sensitivity: user.fatigue_sensitivity,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error", details: (err).message }, { status: 500 });
  }
}
