"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, PlayCircle, CheckCircle2, Sparkles } from "lucide-react";

// Mocked user data (normally comes from auth / backend)
const USER = {
  user_id: "user_123",
  age: 28,
  weight: 78,
  experience: 0, // 0 beginner, 1 intermediate, 2 advanced
};

// Mocked DB row (null = calibration phase)
let predictedActualPlanRow = null;

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
  const [predicted, setPredicted] = useState({});
  const [isCalibration, setIsCalibration] = useState(false);
  const [rpe, setRpe] = useState(5);
  const [feeling, setFeeling] = useState(3);

  const exercise = EXERCISES[exerciseIndex];

  useEffect(() => {
    // Check if user exists in predicted_actual_plan
    if (!predictedActualPlanRow) {
      setIsCalibration(true);
      setPredicted({
        pushups: 0,
        situps: 0,
        plank: 0,
        squats: 0,
      });
    } else {
      setIsCalibration(false);
      setPredicted(predictedActualPlanRow.predicted);
    }
  }, []);

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

  const calculateProgressionRate = () => {
    return USER.experience === 0 ? 0.081 : USER.experience === 1 ? 0.042 : 0.024;
  };

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

  const finishWorkout = () => {
    const progression_rate = calculateProgressionRate();
    const fatigue_sensitivity = calculateFatigueSensitivity();

    const workoutSummary = {
      user_id: USER.user_id,
      calibration: isCalibration,
      exercises: sets,
      predicted,
      rpe,
      rpeLabel: RPE_LABELS[rpe],
      feeling,
      feelingLabel: FEELING_LABELS[feeling],
      progression_rate,
      fatigue_sensitivity,
      completedAt: new Date().toISOString(),
    };

    if (isCalibration) {
      predictedActualPlanRow = {
        user_id: USER.user_id,
        progression_rate,
        fatigue_sensitivity,
        predicted: sets,
      };
    }

    console.log("🏋️ Workout Summary", workoutSummary);
    console.log("📊 Updated predicted_actual_plan row", predictedActualPlanRow);
  };

  if (!started) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white p-4 flex flex-col gap-6">
        <h1 className="text-xl font-semibold">Today's Workout</h1>

        {isCalibration && (
          <div className="rounded-2xl bg-yellow-900/40 border border-yellow-700 p-4 text-sm text-yellow-300">
            Calibration workout · Predictions disabled
          </div>
        )}

        <button
          onClick={() => setStarted(true)}
          className="mt-auto flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 text-lg font-medium shadow-lg"
        >
          <PlayCircle className="w-6 h-6" /> Start Workout
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
                  <input
                    key={i}
                    type="number"
                    placeholder={`Set ${i + 1}`}
                    onChange={(e) => handleSetChange(i, e.target.value)}
                    className="bg-neutral-900 rounded-xl p-4 text-center"
                  />
                ))}
              </div>
            </>
          )}

          {exercise.type === "feedback" && (
            <div className="flex flex-col gap-6 mt-6">
              <input type="range" min="0" max="10" value={rpe} onChange={(e) => setRpe(+e.target.value)} />
              <input type="range" min="0" max="5" value={feeling} onChange={(e) => setFeeling(+e.target.value)} />
            </div>
          )}

          <div className="mt-auto pt-6">
            {exerciseIndex === EXERCISES.length - 1 ? (
              <button onClick={finishWorkout} className="w-full bg-green-600 py-4 rounded-2xl">
                <CheckCircle2 className="inline mr-2" /> Finish Workout
              </button>
            ) : (
              <button onClick={nextExercise} className="w-full bg-indigo-600 py-4 rounded-2xl">
                Next <ChevronRight className="inline" />
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
