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
  const [mlPrediction, setMlPrediction] = useState(null);
  const [recommendation, setRecommendation] = useState(null);

  const exercise = EXERCISES[exerciseIndex];

  const [features1, setFeatures] = useState(null);
  const [lastWorkout, setLastWorkout] = useState(null);

  /* =====================
     ML PREDICTION LOGIC
     ===================== */


  const savePredictedActual = async (payload) => {
    await fetch("/api/savePredictedPlan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  };


  // Categorize ML prediction into actionable recommendation
  const categorizePrediction = (predictedChange) => {
  let category, advice, adjustmentRange;

  if (predictedChange < -150) {
    category = "FULL_DELOAD";
    advice = "Severe fatigue detected. Cut volume by 40–60% and prioritize recovery.";
    adjustmentRange = [-0.6, -0.4];

  } else if (predictedChange < -100) {
    category = "DELOAD";
    advice = "Significant fatigue. Reduce volume by 30–50%.";
    adjustmentRange = [-0.5, -0.3];

  } else if (predictedChange < -40) {
    category = "REDUCE";
    advice = "Moderate fatigue. Reduce volume by 15–25%.";
    adjustmentRange = [-0.25, -0.15];

  } else if (predictedChange < 20) {
    category = "MAINTAIN";
    advice = "Maintain current volume. Focus on quality and consistency.";
    adjustmentRange = [0, 0];

  } else if (predictedChange < 60) {
    category = "INCREASE_LIGHT";
    advice = "Mild positive adaptation. Increase volume by 5–10%.";
    adjustmentRange = [0.05, 0.1];

  } else if (predictedChange < 100) {
    category = "INCREASE";
    advice = "Good adaptation. Increase volume by 10–20%.";
    adjustmentRange = [0.1, 0.2];

  } else if (predictedChange < 160) {
    category = "PUSH";
    advice = "Strong adaptation signal. Increase volume by 20–30%.";
    adjustmentRange = [0.2, 0.3];

  } else if (predictedChange < 220) {
    category = "PUSH_HARD";
    advice = "Very strong response. Increase volume by 25–35%, monitor fatigue closely.";
    adjustmentRange = [0.25, 0.35];

  } else {
    category = "OVERREACH";
    advice = "Exceptional capacity detected. Short-term overload (30–40%), plan recovery soon.";
    adjustmentRange = [0.3, 0.4];
  }

  return {
    category,
    advice,
    adjustmentRange,
    predictedChange,
  };
};


  // Apply ML recommendation to generate predicted sets based on last workout
  const applyRecommendationToSets = (lastWorkoutData, adjustmentRange) => {
    const adjustedSets = {};
    const [minAdj, maxAdj] = adjustmentRange;
    const avgAdjustment = (minAdj + maxAdj) / 2;

    console.log("🔧 Applying recommendation:", { lastWorkoutData, adjustmentRange, avgAdjustment });

    EXERCISES.forEach((ex) => {
      console.log("test")
      if (ex.type === "feedback") return;
      
      // Find the exercise data from last workout
      const lastExerciseData = lastWorkoutData?.find(w => w.exercise === ex.key);
      
      let baseReps;
      if (lastExerciseData && lastExerciseData.reps_per_set) {
        // Parse if it's a string (PostgreSQL JSON column might return string)
        const repsData = typeof lastExerciseData.reps_per_set === 'string' 
          ? JSON.parse(lastExerciseData.reps_per_set)
          : lastExerciseData.reps_per_set;
        
        // Ensure it's an array
        baseReps = Array.isArray(repsData) ? repsData : [10, 10, 10, 10];
        
        console.log(`📊 ${ex.key} - Last workout reps:`, baseReps);
      } else {
        // Fallback to defaults if no last workout data
        baseReps = ex.key === 'pushups' ? [10, 10, 10, 10] :
                   ex.key === 'situps' ? [15, 15, 15, 15] :
                   ex.key === 'plank' ? [30, 30, 30, 30] :
                   [12, 12, 12, 12]; // squats
        
        console.log(`⚠️ ${ex.key} - Using default reps:`, baseReps);
      }
      
      // Calculate last workout total volume
      const lastVolume = baseReps.reduce((a, b) => Number(a) + Number(b), 0);
      
      // Apply adjustment to get new total volume
      const newVolume = Math.round(lastVolume * (1 + avgAdjustment));
      
      // Distribute new volume evenly across 4 sets
      const repsPerSet = Math.round(newVolume / 4);
      
      adjustedSets[ex.key] = {
        0: repsPerSet,
        1: repsPerSet,
        2: repsPerSet,
        3: repsPerSet
      };
      
      console.log(`✅ ${ex.key} - Last volume: ${lastVolume}, New volume: ${newVolume}, Reps per set: ${repsPerSet}`);
    });

    return adjustedSets;
  };

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
          
          // 🔥 Fetch last workout data
          try {
            const lastWorkoutResponse = await fetch(`/api/getLastWorkout?user_id=${USER.user_id}`);

            const lastWorkoutResult = await lastWorkoutResponse.json();
            const lastWorkoutData = lastWorkoutResult.workouts; // Extract the workouts array
            setLastWorkout(lastWorkoutData);
            
            console.log("📊 Last workout data:", lastWorkoutData);

          } catch (lastWorkoutError) {
            console.error("Failed to fetch last workout:", lastWorkoutError);
          }
          
          // 🔥 Get ML prediction for non-calibration workouts
          try {
            console.log("Requesting ML prediction with features:", data.features);
            const predictionResponse = await fetch("http://localhost:8000/predict/ridge", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data.features),
            });

            if (predictionResponse.ok) {
              const predictionData = await predictionResponse.json();
              setMlPrediction(predictionData);
              
              // Categorize the prediction
              const rec = categorizePrediction(predictionData.predicted_weighted_volume_change);
              setRecommendation(rec);
              console.log("ML Prediction received:", rec);
              // Generate predicted sets based on last workout + recommendation
              // Fetch last workout if not already loaded
              
              let workoutData = lastWorkout;
              
              if (!workoutData) {
                
                try {
                  const lwResponse = await fetch(`/api/getLastWorkout?user_id=${USER.user_id}`);
                  const lwResult = await lwResponse.json();
                  workoutData = lwResult.workouts;
                } catch (e) {
                  console.error("Failed to fetch workout for prediction:", e);
                  workoutData = [];
                }
              }
              
              const adjustedSets = applyRecommendationToSets(workoutData, rec.adjustmentRange);
              
              // Set predicted values for display
              const predictedValues = {};
              Object.keys(adjustedSets).forEach(key => {
                const reps = Object.values(adjustedSets[key]);
                const totalReps = reps.reduce((a, b) => Number(a) + Number(b), 0);
                predictedValues[key] = totalReps;
              });
              
              console.log("🎯 Setting predicted state:", predictedValues);
              setPredicted(predictedValues);
              
              console.log("🤖 ML Prediction Summary:", {
                predictedChange: predictionData.predicted_volume_change,
                category: rec.category,
                advice: rec.advice,
                lastWorkoutCount: workoutData?.length || 0,
                adjustedSets: adjustedSets,
                predictedTotals: predictedValues
              });
            }
          } catch (predError) {
            console.error("Failed to get ML prediction:", predError);
          }
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
  // 1️⃣ CALIBRATION MODE
  if (isCalibration) {
    const simulatedSessions = generateTwoWeeksOfSessions(sets);

    for (const session of simulatedSessions) {
      await saveWorkout(session);
    }

    await updateUserCalibration();
  }

  // 2️⃣ SAVE ACTUAL WORKOUT (always)
  for (const ex of EXERCISES) {
    if (ex.type === "feedback") continue;

    const setsObj = sets[ex.key] || {};
    const reps = [0, 1, 2, 3].map((i) => Number(setsObj[i] ?? 0));
    const actualVolume = calculateVolume(reps);

    const exerciseWeights = [
      { exercise: "pushups", weight: 1.0 },
      { exercise: "squats", weight: 0.7 },
      { exercise: "situps", weight: 1.5 },
      { exercise: "plank", weight: 0.3 },
    ];

    const exerciseWeight =
      exerciseWeights.find((w) => w.exercise === ex.key)?.weight ?? 1;

    await saveWorkout({
      week: 1,
      exercise: ex.key,
      sets: 4,
      reps_per_set: reps,
      volume: actualVolume,
      weighted_volume: Math.round(actualVolume * exerciseWeight),
      avg_rpe: rpe,
    });

    // 3️⃣ 🔥 SAVE PREDICTED VS ACTUAL (NON-CALIBRATION ONLY)
    if (!isCalibration) {
      const predictedVolume = predicted?.[ex.key] ?? 0;

      await savePredictedActual({
        week: 1,
        exercise: ex.key,
        predicted: predictedVolume,
        actual: actualVolume,
        rpe,
        feeling,
      });

      console.log("📈 Saved predicted vs actual", {
        exercise: ex.key,
        predicted: predictedVolume,
        actual: actualVolume,
      });
    }
  }

  console.log("🏋️ WORKOUT COMPLETE", {
    calibration: isCalibration,
    actual_sets: sets,
    predicted,
    rpe,
    feeling,
  });
};


  /* =====================
     UI
     ===================== */

  if (!started) {
    return (
      <div className=" bg-neutral-950 text-white p-4 flex flex-col gap-6">
        <h1 className="text-xl font-semibold">Today's Workout</h1>
        
        {isCalibration && (
          <div className="rounded-xl bg-yellow-900/40 border border-yellow-700 p-3 text-yellow-300 text-sm">
            Calibration workout · Simulated weeks will be generated
          </div>
        )}
        
        {!isCalibration && recommendation && (
          <div className={`rounded-xl border p-4 ${
            recommendation.category === 'DELOAD' ? 'bg-red-900/40 border-red-700' :
            recommendation.category === 'REDUCE' ? 'bg-orange-900/40 border-orange-700' :
            recommendation.category === 'MAINTAIN' ? 'bg-blue-900/40 border-blue-700' :
            recommendation.category === 'INCREASE' ? 'bg-green-900/40 border-green-700' :
            'bg-purple-900/40 border-purple-700'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5" />
              <span className="font-semibold">{recommendation.category}</span>
            </div>
            <p className="text-sm opacity-90">{recommendation.advice}</p>
            <p className="text-xs opacity-70 mt-2">
              Predicted change: {recommendation.predictedChange > 0 ? '+' : ''}{recommendation.predictedChange}
            </p>
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
                  {predicted[exercise.key] ?? 0} {exercise.type === "seconds" ? "sec" : "reps"}
                </span>
              </div>
              
              {/* Debug info - remove this later */}
              <div className="mb-2 text-xs text-neutral-500">
                Debug: predicted state = {JSON.stringify(predicted)}
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