'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PersonalInfoCard() {
  const router = useRouter();
  const [form, setForm] = useState({
    sex: "",
    age: "",
    experience: "",
    weight: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function submit() {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/savePersonal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sex: Number(form.sex),
          age: Number(form.age),
          experience: Number(form.experience),
          bodyweight: Number(form.weight),
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to save");

      setSuccess(true);
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl w-full bg-zinc-900  p-6 mx-auto">
      <h2 className="text-xl font-semibold text-white mb-1">
        Personal Profile
      </h2>
      <p className="text-sm text-zinc-400 mb-6">
        Help us personalize your training & predictions
      </p>

      <div className="space-y-4">
        {/* Sex */}
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Sex</label>
          <select
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-white"
            value={form.sex}
            onChange={e => updateField("sex", e.target.value)}
          >
            <option value="">Select</option>
            <option value="0">Female</option>
            <option value="1">Male</option>
          </select>
        </div>

        {/* Age */}
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Age</label>
          <input
            type="number"
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-white"
            value={form.age}
            onChange={e => updateField("age", e.target.value)}
          />
        </div>

        {/* Experience */}
        <div>
          <label className="block text-sm text-zinc-400 mb-1">
            Training Experience
          </label>
          <select
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-white"
            value={form.experience}
            onChange={e => updateField("experience", e.target.value)}
          >
            <option value="">Select</option>
            <option value="0">Beginner</option>
            <option value="1">Intermediate</option>
            <option value="2">Advanced</option>
          </select>
        </div>

        {/* Weight */}
        <div>
          <label className="block text-sm text-zinc-400 mb-1">
            Body Weight (kg)
          </label>
          <input
            type="number"
            step="0.1"
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-white"
            value={form.weight}
            onChange={e => updateField("weight", e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 mt-4">{error}</p>
      )}

      {success && (
        <p className="text-sm text-emerald-400 mt-4">
          Profile updated successfully
        </p>
      )}

      <button
        onClick={submit}
        disabled={loading}
        className="mt-6 w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-medium py-2 transition"
      >
        {loading ? "Saving..." : "Save Profile"}
      </button>
    </div>
  );
}
