"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-lg text-gray-700">Loading...</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 md:p-24">
      <div className="text-center max-w-3xl">
        <h1 className="text-5xl md:text-6xl font-bold mb-4 text-gray-900">
          <span className="text-indigo-600">WeDo</span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-700 mb-8">
          Collaborative gift registries for families and groups
        </p>
        <p className="text-lg text-gray-600 mb-10 max-w-xl mx-auto">
          Create lists, invite collaborators, claim gifts, and coordinate
          purchases while keeping surprises safe.
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/signin"
            className="bg-indigo-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            Get Started
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 bg-indigo-50 rounded-xl border border-indigo-100">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-2 text-gray-900">
              Collaborative Lists
            </h3>
            <p className="text-gray-600">
              Each collaborator gets their own sub-list. Add items others can
              claim and purchase.
            </p>
          </div>
          <div className="p-6 bg-indigo-50 rounded-xl border border-indigo-100">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-2 text-gray-900">
              Privacy Protected
            </h3>
            <p className="text-gray-600">
              List owners can&apos;t see who claimed or bought their items. Keep
              the surprise!
            </p>
          </div>
          <div className="p-6 bg-indigo-50 rounded-xl border border-indigo-100">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-2 text-gray-900">
              Easy Invites
            </h3>
            <p className="text-gray-600">
              Invite collaborators via email with magic link authentication. No
              passwords needed.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
