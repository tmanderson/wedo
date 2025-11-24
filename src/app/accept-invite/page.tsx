"use client";

import { Suspense } from "react";
import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

/**
 * Legacy accept-invite page that redirects to the new path-based URL format.
 * This handles backwards compatibility for any existing invite links using ?token=
 */
function AcceptInviteRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  useEffect(() => {
    if (token) {
      // Redirect to new path-based URL format
      router.replace(`/accept-invite/${token}`);
    }
  }, [token, router]);

  if (!token) {
    return (
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-6">No invite token provided</p>
          <button
            onClick={() => router.push("/")}
            className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return <div className="text-lg text-gray-700">Redirecting...</div>;
}

export default function AcceptInvitePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
      <Link href="/" className="text-2xl font-bold text-indigo-600 mb-8">
        WeDo
      </Link>
      <Suspense
        fallback={<div className="text-lg text-gray-700">Loading...</div>}
      >
        <AcceptInviteRedirect />
      </Suspense>
    </main>
  );
}
