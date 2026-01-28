"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, PlayCircle, CheckCircle2, Sparkles } from "lucide-react";
import useSWR from "swr";
import { User } from "@/lib/db/schema";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const EXERCISES = [
  { key: "push_ups", label: "Push-ups", type: "reps", apiEndpoint: "pushups" },
  { key: "situps", label: "Sit-ups", type: "reps", apiEndpoint: "situps" },
  { key: "plank_seconds", label: "Plank", type: "seconds", apiEndpoint: "plank" },
  { key: "squats", label: "Squats", type: "reps", apiEndpoint: "squats" },
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
  const [maxReps, setMaxReps] = useState<Record<string, number>>({});
  const [predicted, setPredicted] = useState<Record<string, number>>({});
  const [isCalibration, setIsCalibration] = useState(false);
  const [rpe, setRpe] = useState(5);
  const [feeling, setFeeling] = useState(3);
  const [mlPredictions, setMlPredictions] = useState({});
  const [recommendations, setRecommendations] = useState({});

  const exercise = EXERCISES[exerciseIndex];

  const [features, setFeatures] = useState(null);
  const [lastWorkout, setLastWorkout] = useState(null);

  /* =====================
     ML PREDICTION LOGIC
     ===================== */

  const savePredictedActual = async (payload: any) => {
    await fetch("/api/savePredictedMax", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  };

  // Categorize ML prediction into actionable recommendation
  const categorizePrediction = (predictedChange:any) => {
    console.log("Categorizing prediction:", predictedChange);
    let category, advice, adjustmentRange;

    if (predictedChange < -10) {
      category = "FULL_DELOAD";
      advice = "Severe fatigue detected. Reduce intensity significantly.";
      adjustmentRange = [-0.6, -0.4];
    } else if (predictedChange < -5) {
      category = "DELOAD";
      advice = "Significant fatigue. Reduce intensity moderately.";
      adjustmentRange = [-0.5, -0.3];
    } else if (predictedChange < -2) {
      category = "REDUCE";
      advice = "Moderate fatigue. Reduce intensity slightly.";
      adjustmentRange = [-0.25, -0.15];
    } else if (predictedChange < 2) {
      category = "MAINTAIN";
      advice = "Maintain current intensity. Focus on quality.";
      adjustmentRange = [0, 0];
    } else if (predictedChange < 5) {
      category = "INCREASE_LIGHT";
      advice = "Mild positive adaptation. Increase slightly.";
      adjustmentRange = [0.05, 0.1];
    } else if (predictedChange < 8) {
      category = "INCREASE";
      advice = "Good adaptation. Increase moderately.";
      adjustmentRange = [0.1, 0.2];
    } else if (predictedChange < 12) {
      category = "PUSH";
      advice = "Strong adaptation signal. Push harder.";
      adjustmentRange = [0.2, 0.3];
    } else if (predictedChange < 16) {
      category = "PUSH_HARD";
      advice = "Very strong response. Push significantly.";
      adjustmentRange = [0.25, 0.35];
    } else {
      category = "OVERREACH";
      advice = "Exceptional capacity. Consider overreaching.";
      adjustmentRange = [0.3, 0.4];
    }

    return {
      category,
      advice,
      adjustmentRange,
      predictedChange,
    };
  };

  // Apply ML recommendation to generate predicted max reps
  const applyRecommendationToMax = (lastMax:any, adjustmentRange:any) => {
    const [minAdj, maxAdj] = adjustmentRange;
    const avgAdjustment = (minAdj + maxAdj) / 2;
    
    const predictedMax = Math.round(lastMax * (1 + avgAdjustment));
    if (isNaN(predictedMax)) {
      console.warn("Predicted max is NaN, defaulting to 0");
      return 3;
    }
    console.log(
      "Applying recommendation:",
      typeof predictedMax,
      Number.isInteger(predictedMax) ? "int" : "float"
    );
    return Math.max(0, predictedMax);
  };

  useEffect(() => {
    const fetchFeaturesAndPredictions = async () => {
      try {
        const response = await fetch(
          `/api/getMaxFeatures?user_id=${USER.user_id}`
        );
        
        // If API returns error, treat as calibration mode
        if (!response.ok) {
          console.log("API error - Calibration mode activated");
          setIsCalibration(true);
          return;
        }
        
        const data = await response.json();
        console.log("Fetched features:", data);
        setFeatures(data.features);

        // ✅ calibration logic
        if (!data.features || data.features?.total_max === 0 || data.error) {
          console.log("Calibration mode activated");
          setIsCalibration(true);
        } else {
          setIsCalibration(false);
          console.log("Regular workout mode");
          
          // 🔥 Fetch last workout data
          try {
            const lastWorkoutResponse = await fetch(
              `/api/getLastMaxWorkout?user_id=${USER.user_id}`
            );
            const lastWorkoutResult = await lastWorkoutResponse.json();
            const lastWorkoutData = lastWorkoutResult.workout;
            setLastWorkout(lastWorkoutData);
            
            console.log("📊 Last workout data:", lastWorkoutData);

            // 🔥 Get ML predictions for each exercise
            const predictions: Record<string, any> = {};
            const recs: Record<string, any> = {};
            const predictedValues: Record<string, any> = {};

            for (const ex of EXERCISES) {
              if (ex.type === "feedback") continue;

              try {
                console.log(`Requesting ML prediction for ${ex.key}`);
                const predictionResponse = await fetch(
                  `http://localhost:8000/predict/${ex.apiEndpoint}`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data.features),
                  }
                );

                if (predictionResponse.ok) {
                  const predictionData = await predictionResponse.json();
                  console.log(`🤖 ${ex.key} ML prediction data:`, predictionData);
                  predictions[ex.key] = predictionData;
                  
                  // Categorize the prediction
                  const rec = categorizePrediction(
                    predictionData.prediction || 0
                  );
                  console.log(`🤖 ${ex.key} recommendation:`, rec);
                  recs[ex.key] = rec;
                    
                  // Calculate predicted max based on last workout
                  // Fetch the latest max for this exercise from the API
                  let lastMax = 0;
                  try {
                  const lastMaxRes = await fetch(
                    `/api/getLastMax?user_id=${USER.user_id}&exercise=${ex.key}`
                  );
                  
                  if (lastMaxRes.ok) {
                    const lastMaxData = await lastMaxRes.json();
                    console.log(`🤖 ${ex.key} last max response:`, lastMaxData);
                    lastMax = lastMaxData?.data ?? 0;
                  } else {
                    lastMax = lastWorkoutData?.[ex.key] || 0;
                  }
                  } catch (err) {
                  lastMax = lastWorkoutData?.[ex.key] || 0;
                  }
                  const predictedMax = applyRecommendationToMax(
                    lastMax[ex.key],
                    rec.adjustmentRange
                  );
                  predictedValues[ex.key] = predictedMax;
                  
                  console.log(`🤖 ${ex.key} prediction:`, {
                    lastMax,
                    predictedMax,
                    category: rec.category,
                  });
                }
              } catch (predError) {
                console.error(`Failed to get ML prediction for ${ex.key}:`, predError);
              }
            }

            setMlPredictions(predictions);
            setRecommendations(recs);
            setPredicted(predictedValues);
            
            console.log("🎯 All predictions loaded:", predictedValues);
          } catch (lastWorkoutError) {
            console.error("Failed to fetch last workout:", lastWorkoutError);
          }
        }
      } catch (error) {
        console.error("Failed to fetch features:", error);
      }
    };

    if (USER.user_id) {
      fetchFeaturesAndPredictions();
    }
  }, [USER.user_id]);


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

  // Generate simulated 2 weeks of max performance data
   const generateWeeksOfMaxData = (baseMaxReps: any) => {
    const weeks = [];
    const numWeeks = Math.floor(Math.random() * 2) + 4; // Random 4 or 5 weeks
    
    for (let week = 1; week <= numWeeks; week++) {
      const weekData = {
        user_id: USER.user_id,
        week: week,
        push_ups: 0,
        situps: 0,
        plank_seconds: 0,
        squats: 0,
      };

      // Add slight variation (±1-2 reps) to simulate realistic data
      (Object.keys(baseMaxReps) as Array<"push_ups" | "situps" | "plank_seconds" | "squats">).forEach((key) => {
        const baseValue = Number(baseMaxReps[key]) || 0;
        const variation = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
        weekData[key] = Math.max(0, baseValue + variation);
      });

      weeks.push(weekData);
    }

    return weeks;
  };

  /* =====================
     UI HANDLERS
     ===================== */

  const handleMaxChange = (value: any) => {
    const num = Number(value) || 0;
    setMaxReps((prev) => ({
      ...prev,
      [exercise.key]: num,
    }));
  };

  const nextExercise = () => setExerciseIndex((i) => i + 1);

  const saveMaxWorkout = async (payload: any) => {
    await fetch("/api/saveMaxWorkout", {
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
      const simulatedWeeks = generateWeeksOfMaxData(maxReps);

      for (const weekData of simulatedWeeks) {
        await saveMaxWorkout(weekData);
      }

      await updateUserCalibration();
      
      console.log("🏋️ CALIBRATION COMPLETE - Saved 2 weeks of simulated data");
    } else {
      // 2️⃣ REGULAR WORKOUT - Save actual performance

       let nextWeek = 1;
      try {
        const weekResponse = await fetch(`/api/getLastWeek?user_id=${USER.user_id}`);
        if (weekResponse.ok) {
          const weekData = await weekResponse.json();
          nextWeek = weekData.week + 1 || 1;
        }
      } catch (err) {
        console.error("Failed to get next week, defaulting to 1:", err);
      }
      const workoutData = {
        user_id: USER.user_id,
        week: nextWeek,
        push_ups: Number(maxReps.push_ups) || 0,
        situps: Number(maxReps.situps) || 0,
        plank_seconds: Number(maxReps.plank_seconds) || 0,
        squats: Number(maxReps.squats) || 0,
      };

      await saveMaxWorkout(workoutData);

      // 3️⃣ Save predicted vs actual for each exercise
      for (const ex of EXERCISES) {
        if (ex.type === "feedback") continue;

        const actualValue = Number(maxReps[ex.key]) || 0;
        const predictedValue = predicted[ex.key] || 0;

        await savePredictedActual({
          user_id: USER.user_id,
          week: 1,
          exercise: ex.key,
          predicted: predictedValue,
          actual: actualValue,
          rpe,
          feeling,
        });

        console.log(`📈 Saved predicted vs actual for ${ex.key}`, {
          predicted: predictedValue,
          actual: actualValue,
        });
      }
    }

    console.log("🏋️ WORKOUT COMPLETE", {
      calibration: isCalibration,
      maxReps,
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
      <div className="bg-neutral-950 text-white p-4 flex flex-col gap-6">
        <h1 className="text-xl font-semibold">Today's Max Reps Workout</h1>
        
        {isCalibration && (
          <div className="rounded-xl bg-yellow-900/40 border border-yellow-700 p-3 text-yellow-300 text-sm">
            Calibration workout · 2 weeks of simulated data will be generated
          </div>
        )}
        
        {!isCalibration && Object.keys(recommendations).length > 0 && (
          <div className="flex flex-col gap-3">
            {EXERCISES.filter(ex => ex.type !== "feedback").map((ex) => {
              const rec = recommendations[ex.key];
              if (!rec) return null;
              
              return (
                <div
                  key={ex.key}
                  className={`rounded-xl border p-4 ${
                    rec.category.includes('DELOAD') ? 'bg-red-900/40 border-red-700' :
                    rec.category.includes('REDUCE') ? 'bg-orange-900/40 border-orange-700' :
                    rec.category === 'MAINTAIN' ? 'bg-blue-900/40 border-blue-700' :
                    rec.category.includes('INCREASE') ? 'bg-green-900/40 border-green-700' :
                    'bg-purple-900/40 border-purple-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4" />
                    <span className="font-semibold text-sm">{ex.label}: {rec.category}</span>
                  </div>
                  <p className="text-xs opacity-90">{rec.advice}</p>
                  <p className="text-xs opacity-70 mt-1">
                    Predicted: {predicted[ex.key] || 0} {ex.type === "seconds" ? "sec" : "reps"}
                  </p>
                </div>
              );
            })}
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
    <div className="bg-neutral-950 text-white p-4 flex flex-col">
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
              {!isCalibration && (
                <div className="mb-4 flex justify-between bg-indigo-950/40 p-3 rounded-xl">
                  <span className="text-indigo-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Predicted Max
                  </span>
                  <span className="font-semibold">
                    {predicted[exercise.key] ?? 0} {exercise.type === "seconds" ? "sec" : "reps"}
                  </span>
                </div>
              )}

              <div className="bg-neutral-900 rounded-xl p-6">
                <p className="text-sm text-neutral-400 mb-3">
                  Max {exercise.type === "seconds" ? "Seconds" : "Reps"}
                </p>
                <input
                  type="number"
                  value={maxReps[exercise.key] ?? ""}
                  onChange={(e) => handleMaxChange(e.target.value)}
                  placeholder="Enter your max"
                  className="bg-neutral-800 rounded-xl p-4 text-center text-2xl w-full"
                />
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
                  {RPE_LABELS[rpe as keyof typeof RPE_LABELS] || `RPE ${rpe}`}
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
                  {FEELING_LABELS[feeling as keyof typeof FEELING_LABELS]}
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
