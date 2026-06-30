"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthPanel } from "@/components/AuthPanel";
import type { PublicUser } from "@/types/auth";

export default function LandingPage() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/api/auth/me");
        const data = (await response.json()) as { user: PublicUser | null };

        if (data.user) {
          // Already authenticated, redirect to dashboard
          router.push("/dashboard");
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  function handleAuthChange(nextUser: PublicUser | null) {
    setUser(nextUser);
    if (nextUser) {
      // Redirect to dashboard after successful login
      router.push("/dashboard");
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50 to-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600"></div>
          <p className="text-sm text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-emerald-50 to-slate-50">
      {/* Hero Section */}
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left Side - Hero Content */}
            <div className="flex flex-col justify-center space-y-8">
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
                  <svg className="h-9 w-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-slate-900">Deadline Rescue AI</h1>
                  <p className="text-lg text-emerald-600">Your AI Productivity Companion</p>
                </div>
              </div>

              <p className="text-xl text-slate-700 leading-relaxed">
                Transform looming deadlines into achievable plans with AI-powered task breakdown and intelligent focus block scheduling.
              </p>

              <div className="space-y-4">
                <FeatureItem
                  icon="🤖"
                  title="AI-Powered Task Breakdown"
                  description="Gemini AI analyzes your tasks and creates detailed subtask breakdowns with time estimates"
                />
                <FeatureItem
                  icon="📅"
                  title="Smart Calendar Integration"
                  description="Finds available time in your Google Calendar and schedules optimal focus blocks"
                />
                <FeatureItem
                  icon="⚡"
                  title="Intelligent Scheduling"
                  description="Adaptive focus blocks (30min - 4h) based on task complexity and your availability"
                />
                <FeatureItem
                  icon="🎯"
                  title="Risk Assessment"
                  description="Real-time deadline feasibility analysis with personalized rescue advice"
                />
                <FeatureItem
                  icon="🔗"
                  title="Workflow Integration"
                  description="Export rescue plans to JIRA tasks and Confluence pages"
                />
              </div>

              <div className="flex flex-wrap gap-4 pt-4">
                <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-sm">
                  <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-medium text-slate-700">Free to use</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-sm">
                  <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-sm font-medium text-slate-700">Secure & Private</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-sm">
                  <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-sm font-medium text-slate-700">Powered by Gemini AI</span>
                </div>
              </div>
            </div>

            {/* Right Side - Auth Panel */}
            <div className="flex items-center justify-center">
              <div className="w-full max-w-md">
                <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
                  <h2 className="mb-6 text-2xl font-bold text-slate-900">Get Started</h2>
                  <AuthPanel onAuthChange={handleAuthChange} user={user} />

                  <div className="mt-6 space-y-3 border-t border-slate-200 pt-6">
                    <p className="text-xs text-slate-500 text-center">
                      By signing in, you agree to our Terms of Service and Privacy Policy
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/50 py-6">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-slate-600">
              © 2026 Deadline Rescue AI. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">
                Powered by Google Gemini AI & Cloud Run
              </span>
              <span className="text-slate-300">•</span>
              <a
                href="https://github.com/Vineet0197/deadline-rescue-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate-600 hover:text-emerald-600 transition"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureItem({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
    </div>
  );
}
