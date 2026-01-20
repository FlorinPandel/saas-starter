"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, PlayCircle, CheckCircle2, Sparkles } from "lucide-react";

const EXERCISES = [
  { key: "pushups", label: "Push-ups", type: "reps" },
  { key: "situps", label: "Sit-ups", type: "reps" },
  { key: "plank", label: "Plank", type: "seconds" },
  { key: "squats", label: "Squats", type: "reps" },
  { key: "feedback", label: "Workout Feedback", type: "feedback" },
];

export default function Workout() {
  const [started, setStarted] = useState(false);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [sets, setSets] = useState({});
  const [predicted, setPredicted] = useState({}); // ML predictions
  const [rpe, setRpe] = useState(5);
  const [feeling, setFeeling] = useState(3);

  const exercise = EXERCISES[exerciseIndex];

  const RPE_LABELS = {
    0: "Rest",
    1: "Very Easy",
    2: "Easy",
    3: "Light",
    4: "Moderate",
    5: "Challenging",
    6: "Hard",
    7: "Very Hard",
    8: "Extremely Hard",
    9: "Near Max",
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

  const handleSetChange = (setIndex, value) => {
    setSets((prev) => ({
      ...prev,
      [exercise.key]: {
        ...(prev[exercise.key] || {}),
        [setIndex]: Number(value),
      },
    }));
  };

  const nextExercise = () => {
    if (exerciseIndex < EXERCISES.length - 1) {
      setExerciseIndex((i) => i + 1);
    }
  };

  const finishWorkout = () => {
    const workoutSummary = {
      exercises: sets,
      predicted,
      rpe,
      rpeLabel: RPE_LABELS[rpe],
      feeling,
      feelingLabel: FEELING_LABELS[feeling],
      completedAt: new Date().toISOString(),
    };

    console.log("🏋️ Workout Summary", workoutSummary);
  };

  if (!started) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white p-4 flex flex-col gap-6">
        <h1 className="text-xl font-semibold">Today's Workout</h1>

        <div className="rounded-2xl bg-neutral-900 p-4 shadow">
          <p className="text-sm text-neutral-400">Last workout</p>
          <p className="mt-1">Full Body · 4 exercises</p>
          <p className="text-xs text-neutral-500 mt-2">
            Push-ups, Sit-ups, Plank, Squats
          </p>
        </div>

        <button
          onClick={() => setStarted(true)}
          className="mt-auto flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 text-lg font-medium shadow-lg active:scale-95"
        >
          <PlayCircle className="w-6 h-6" />
          Start Generated Workout
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
          <h2 className="text-2xl font-bold mb-1">{exercise.label}</h2>

          {exercise.type !== "feedback" && (
            <>
              <p className="text-sm text-neutral-400 mb-4">
                4 sets · 15 sec rest between sets
              </p>

              {/* ML Prediction */}
              <div className="mb-4 flex items-center justify-between rounded-xl bg-indigo-950/40 border border-indigo-800 px-4 py-3">
                <div className="flex items-center gap-2 text-indigo-300">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm">Predicted</span>
                </div>
                <span className="text-lg font-semibold">
                  {predicted[exercise.key] ?? 0} {exercise.type === "seconds" ? "sec" : "reps"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-neutral-900 rounded-xl p-4 flex flex-col gap-2"
                  >
                    <span className="text-xs text-neutral-400">
                      Set {i + 1}
                    </span>
                    <input
                      type="number"
                      placeholder={exercise.type === "seconds" ? "sec" : "reps"}
                      value={sets?.[exercise.key]?.[i] ?? ""}
                      onChange={(e) => handleSetChange(i, e.target.value)}
                      className="bg-neutral-800 rounded-lg p-2 text-center text-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {exercise.type === "feedback" && (
            <div className="flex flex-col gap-6 mt-6">
              <div className="bg-neutral-900 rounded-2xl p-4">
                <p className="text-sm text-neutral-400 mb-2">RPE (0–10)</p>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={rpe}
                  onChange={(e) => setRpe(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-center mt-2 text-lg font-medium">
                  {RPE_LABELS[rpe]}
                </p>
              </div>

              <div className="bg-neutral-900 rounded-2xl p-4">
                <p className="text-sm text-neutral-400 mb-2">
                  Workout Quality (0–5)
                </p>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={feeling}
                  onChange={(e) => setFeeling(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-center mt-2 text-lg font-medium">
                  {FEELING_LABELS[feeling]}
                </p>
              </div>
            </div>
          )}

          <div className="mt-auto pt-6">
            {exerciseIndex === EXERCISES.length - 1 ? (
              <button
                onClick={finishWorkout}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-green-600 py-4 text-lg font-medium shadow-lg"
              >
                <CheckCircle2 className="w-6 h-6" /> Finish Workout
              </button>
            ) : (
              <button
                onClick={nextExercise}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 text-lg font-medium shadow-lg"
              >
                Next Exercise <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
