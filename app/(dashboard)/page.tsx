import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Brain,
  BarChart3,
  Activity,
  TrendingUp,
} from 'lucide-react';

export default function HomePage() {
  return (
    <main className="bg-neutral-950 text-white">
      {/* HERO */}
      <section className="relative overflow-hidden py-28">
        {/* subtle background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent" />

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-4xl sm:text-5xl xl:text-6xl font-bold tracking-tight">
            Data-Driven Training.
            <span className="block text-emerald-400">
              Real Performance Predictions.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-neutral-400 max-w-2xl mx-auto">
            Track your workouts, understand your progression, and let machine
            learning predict what your body can achieve next.
          </p>

          <div className=" flex justify-center gap-4">
           
            
          </div>
        </div>
      </section>

      {/* STATS PREVIEW */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Tracked Workouts', value: '1,200+' },
            { label: 'Predictions Made', value: '4,800+' },
            { label: 'Avg Accuracy', value: '92%' },
            { label: 'Active Athletes', value: '350+' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6 text-center"
            >
              <div className="text-3xl font-bold text-emerald-400">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-neutral-400">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 bg-neutral-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Feature
              icon={<Brain />}
              title="Smart Predictions"
              text="Predict next-week max reps using real performance history and fatigue trends."
            />
            <Feature
              icon={<TrendingUp />}
              title="Progress Modeling"
              text="Understand long-term improvement, plateaus, and realistic growth limits."
            />
            <Feature
              icon={<BarChart3 />}
              title="Detailed Analytics"
              text="Clean visual breakdowns per exercise, week, and training block."
            />
            <Feature
              icon={<Activity />}
              title="Personalized Profiles"
              text="Models adapt to experience level, body weight, and recovery capacity."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Train with insight, not guesses
          </h2>
          <p className="mt-4 text-lg text-neutral-400">
            Stop guessing your limits. Start training with data-backed
            predictions.
          </p>

          <div className="mt-10">
            <Button size="lg" className="rounded-full px-10">
              Start Tracking Now
              <ArrowRight className="ml-3 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl bg-neutral-950 border border-neutral-800 p-8">
      <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
        {icon}
      </div>
      <h3 className="mt-6 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-neutral-400">{text}</p>
    </div>
  );
}
