'use client';

import useSWR from "swr";
import { User } from "@/lib/db/schema";
import {
  Activity,
  TrendingUp,
  Dumbbell,
  HeartPulse,
  Scale,
  User as UserIcon,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function StatsSection() {
  const { data: user, isLoading } = useSWR<User>("/api/user", fetcher);

  if (isLoading) {
    return (
      <section className="p-4 lg:p-8 text-white">
        <p className="opacity-60">Loading stats…</p>
      </section>
    );
  }

  if (!user) {
    return null;
  }

  const experienceLevels = ["Beginner", "Intermediate", "Advanced"];
  const stats = [
    {
      label: "Age",
      value: `${user.age} yrs`,
      icon: UserIcon,
    },
    {
      label: "Weight",
      value: `${user.bodyweight} kg`,
      icon: Scale,
    },
    {
      label: "Experience",
      value: experienceLevels[user.experience] || "Unknown",
      icon: Dumbbell,
    },
    {
      label: "True Strength",
      value: user.trueStrength != null ? user.trueStrength : "N/A",
      icon: Activity,
    },
    {
      label: "Progression Rate",
      value: user.progressionRate != null ? `${(user.progressionRate * 100).toFixed(1)}%` : "N/A",
      icon: TrendingUp,
    },
    {
      label: "Fatigue Sensitivity",
      value: user.fatigueSensitivity != null ? user.fatigueSensitivity.toFixed(2) : "N/A",
      icon: HeartPulse,
    },
  ];

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-2xl lg:text-2xl font-medium mb-6 text-white">
        Your Stats
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 flex items-center gap-4 hover:border-zinc-700 transition"
          >
            <div className="h-12 w-12 rounded-xl bg-zinc-800 flex items-center justify-center">
              <Icon className="h-6 w-6 text-emerald-400" />
            </div>

            <div>
              <p className="text-sm text-zinc-400">{label}</p>
              <p className="text-xl font-semibold text-white">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
