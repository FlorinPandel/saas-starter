"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, PlayCircle, CheckCircle2, Sparkles } from "lucide-react";
import useSWR from "swr";
import { User } from "@/lib/db/schema";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// If null → calibration mode
let predictedActualPlanRow = null;

const EXERCISES = [
  { key: "pushups", label: "Push-ups", type: "reps" },
  { key: "situps", label: "Sit-ups", type: "reps" },
  { key: "plank", label: "Plank", type: "seconds" },
  { key: "squats", label: "Squats", type: "reps" },
  { key: "feedback", label: "Workout Feedback", type: "feedback" },
];

const RPE_LABELS = {
  0: "Rest",
  2: "Very Easy",
  4: "Easy",
  6: "Moderate",
  8: "Hard",
  10: "Max Effort",
};

const FEELING_LABELS = {
  0: "Very Bad",
  1: "Bad",
  2: "Okay",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

export default function Workout() {
  const { data: user } = useSWR<User>("/api/user", fetcher);

  const USER = {
    user_id: user?.id,
    age: user?.age || 30,
    weight: user?.bodyweight || 75,
    experience: user?.experience ?? 0,
  };

  const [started, setStarted] = useState(false);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [sets, setSets] = useState({});
  const [predicted, setPredicted] = useState({});
  const [isCalibration, setIsCalibration] = useState(false);
  const [rpe, setRpe] = useState(5);
  const [feeling, setFeeling] = useState(3);

  const exercise = EXERCISES[exerciseIndex];

  const [features1, setFeatures] = useState(null);

  useEffect(() => {
  const fetchFeatures = async () => {
    try {
      const response = await fetch(
        `/api/getPlanFeatures?user_id=${USER.user_id}`
      );
      const data = await response.json();

      setFeatures(data.features);

      // ✅ calibration logic
      if (data.features?.total_volume === 0) {
        console.log("Calibration mode activated");
        setIsCalibration(true);
      } else {
        setIsCalibration(false);
        console.log("Regular workout mode");
      }

    } catch (error) {
      console.error("Failed to fetch features:", error);
    }
  };

  fetchFeatures();
}, [USER.user_id]);


  useEffect(() => {
    // async function inside useEffect
    const fetchFeatures = async () => {
      try {
        const response = await fetch(`/api/getPlanFeatures?user_id=${USER.user_id}`);
        const data = await response.json();
        setFeatures(data.features); // save in state
        console.log("Features:", data.features);
      } catch (error) {
        console.error("Failed to fetch features:", error);
      }
    };

    fetchFeatures();
  }, []);
  console.log("Features state:", features1);

  /* =====================
     PROGRESSION & FATIGUE
     ===================== */

  const calculateProgressionRate = () =>
    USER.experience === 0 ? 0.081 : USER.experience === 1 ? 0.042 : 0.024;

  const calculateFatigueSensitivity = () => {
    let value = 1.2;
    if (USER.age >= 31 && USER.age <= 35) value += 0.08;
    else if (USER.age >= 26) value -= 0.07;

    if (USER.weight < 65) value += 0.03;
    else if (USER.weight >= 85) value -= 0.19;
    else if (USER.weight >= 75) value -= 0.08;

    if (USER.experience === 1) value += 0.05;
    if (USER.experience === 2) value -= 0.05;

    return Number(value.toFixed(2));
  };
  const features = JSON.stringify({
    total_weighted_load_2w: 1400,
    avg_rpe_2w: 5,
    volume_trend: 30,
    fatigue_index: 0,
    monotony: 1.2,
    age: 25,
    weight: 65,
    experience: 2,
    progression_rate: 0.08,
    fatigue_sensitivity: 0.6,
    best_session_volume_pushups: 45,
    total_volume: 900
  })

  const predictNextWeek = async (features1) => {
  const res = await fetch("http://localhost:8000/predict/ridge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: features1,
  });

  if (!res.ok) {
    throw new Error("Prediction failed");
  }

  return res.json();
};
console.log(predictNextWeek(JSON.stringify(features1)))

  // STRICT ±1 variation, numeric-safe
  const generateTwoWeeksOfSessions = (baseSets) => {
    const sessions = [];

    for (let week = 1; week <= 2; week++) {
      Object.entries(baseSets).forEach(([exercise, setsObj]) => {
        const baseReps = [0, 1, 2, 3].map(
          (i) => Number.parseInt(setsObj[i], 10) || 0
        );

        const variedReps = baseReps.map((base) => {
          const delta = Math.random() < 0.5 ? -1 : 1;
          return Math.max(0, base + delta);
        });

        const volume = variedReps.reduce((a, b) => a + b, 0);
        // Find the weight for the current exercise, default to 1 if not found
        const exerciseWeights = [
          { exercise: "pushups", weight: 1.0 },
          { exercise: "squats", weight: 0.7 },
          { exercise: "situps", weight: 1.5 },
          { exercise: "plank", weight: 0.3 }
        ];
        const exerciseWeight =
          exerciseWeights.find((w) => w.exercise === exercise)?.weight ?? 1;

        sessions.push({
          user_id: USER.user_id,
          week: week,
          exercise,
          sets: 4,
          reps_per_set: variedReps,
          avg_rpe: rpe,
          volume,
          weighted_volume: volume * exerciseWeight,
        });
      });
    }

    return sessions;
  };

  /* =====================
     UI HANDLERS
     ===================== */

  const handleSetChange = (setIndex, value) => {
    const num = Number(value) || 0;
    setSets((prev) => ({
      ...prev,
      [exercise.key]: {
        ...(prev[exercise.key] || {}),
        [setIndex]: num,
      },
    }));
  };

  const nextExercise = () => setExerciseIndex((i) => i + 1);

  const calculateVolume = (reps) => reps.reduce((a, b) => a + b, 0);

  const saveWorkout = async (payload) => {
    await fetch("/api/saveWorkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  };

  const updateUserCalibration = async () => {
    await fetch("/api/updateUser", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        progression_rate: calculateProgressionRate(),
        fatigue_sensitivity: calculateFatigueSensitivity(),
      }),
    });
  };

  /* =====================
     FINISH WORKOUT FLOW
     ===================== */

  const finishWorkout = async () => {
    // 1️⃣ CALIBRATION → save simulated future weeks FIRST
    if (isCalibration) {
      const simulatedSessions = generateTwoWeeksOfSessions(sets);

      for (const session of simulatedSessions) {
        await saveWorkout(session);
      }

      // 🔁 persist calibration metrics on user
      await updateUserCalibration();
    }

    // 2️⃣ SAVE ACTUAL WORKOUT (week 1)
    for (const ex of EXERCISES) {
      if (ex.type === "feedback") continue;

      const setsObj = sets[ex.key] || {};
      const reps = [0, 1, 2, 3].map((i) => Number(setsObj[i] ?? 0));
      const volume = calculateVolume(reps);

      const exerciseWeights = [
        { exercise: "pushups", weight: 1.0 },
        { exercise: "squats", weight: 0.7 },
        { exercise: "situps", weight: 1.5 },
        { exercise: "plank", weight: 0.3 }
      ];
      const exerciseWeight =
        exerciseWeights.find((w) => w.exercise === ex.key)?.weight ?? 1;

      await saveWorkout({
        week: 1,
        exercise: ex.key,
        sets: 4,
        reps_per_set: reps,
        volume,
        weighted_volume: Math.round(volume * exerciseWeight),
        avg_rpe: rpe,
      });
    }

    if (isCalibration) {
      predictedActualPlanRow = { predicted: sets };
    }

    console.log("🏋️ WORKOUT COMPLETE", {
      calibration: isCalibration,
      progression_rate: calculateProgressionRate(),
      fatigue_sensitivity: calculateFatigueSensitivity(),
      simulated_weeks: isCalibration ? 2 : 0,
      actual_sets: sets,
      rpe,
      feeling,
    });
  };

  /* =====================
     UI
     ===================== */

  if (!started) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white p-4 flex flex-col gap-6">
        <h1 className="text-xl font-semibold">Today's Workout</h1>
        {isCalibration && (
          <div className="rounded-xl bg-yellow-900/40 border border-yellow-700 p-3 text-yellow-300 text-sm">
            Calibration workout · Simulated weeks will be generated
          </div>
        )}
        <button
          onClick={() => setStarted(true)}
          className="mt-auto bg-indigo-600 rounded-2xl py-4 text-lg"
        >
          <PlayCircle className="inline mr-2" /> Start Workout
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 flex flex-col">
      <AnimatePresence mode="wait">
        <motion.div
          key={exercise.key}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex flex-col"
        >
          <h2 className="text-2xl font-bold mb-4">{exercise.label}</h2>

          {exercise.type !== "feedback" && (
            <>
              <div className="mb-4 flex justify-between bg-indigo-950/40 p-3 rounded-xl">
                <span className="text-indigo-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Predicted
                </span>
                <span className="font-semibold">
                  {predicted[exercise.key] ?? 0}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <input
                    key={i}
                    type="number"
                    value={sets?.[exercise.key]?.[i] ?? ""}
                    onChange={(e) => handleSetChange(i, e.target.value)}
                    placeholder={`Set ${i + 1}`}
                    className="bg-neutral-900 rounded-xl p-4 text-center"
                  />
                ))}
              </div>
            </>
          )}

          {exercise.type === "feedback" && (
            <div className="flex flex-col gap-6">
              <div className="bg-neutral-900 rounded-xl p-4">
                <p className="text-sm text-neutral-400 mb-2">RPE (0–10)</p>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={rpe}
                  onChange={(e) => setRpe(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-center mt-2 font-medium">
                  {RPE_LABELS[rpe] || `RPE ${rpe}`}
                </p>
              </div>

              <div className="bg-neutral-900 rounded-xl p-4">
                <p className="text-sm text-neutral-400 mb-2">Workout Feeling (0–5)</p>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={feeling}
                  onChange={(e) => setFeeling(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-center mt-2 font-medium">
                  {FEELING_LABELS[feeling]}
                </p>
              </div>
            </div>
          )}

          <div className="mt-auto pt-6">
            {exerciseIndex === EXERCISES.length - 1 ? (
              <button
                onClick={finishWorkout}
                className="w-full bg-green-600 py-4 rounded-2xl"
              >
                <CheckCircle2 className="inline mr-2" /> Finish Workout
              </button>
            ) : (
              <button
                onClick={nextExercise}
                className="w-full bg-indigo-600 py-4 rounded-2xl"
              >
                Next <ChevronRight className="inline" />
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
