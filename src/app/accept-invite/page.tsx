"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/fetcher";

interface InviteInfo {
  email: string;
  used: boolean;
  expired: boolean;
  registry: {
    title: string;
    occasionDate: string | null;
    ownerName: string | null;
  } | null;
}

interface AcceptResult {
  success: boolean;
  registry: { id: string; title: string };
  collaborator: { id: string; sublistId: string };
}

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading, signIn } = useAuth();

  const token = searchParams.get("token");

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [status, setStatus] = useState<
    "loading" | "need-auth" | "accepting" | "success" | "error"
  >("loading");
  const [error, setError] = useState<string | null>(null);
  const [acceptedRegistry, setAcceptedRegistry] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // Fetch invite info
  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("No invite token provided");
      return;
    }

    async function fetchInviteInfo() {
      const { data, error } = await api.post<InviteInfo>("/api/invite/accept", {
        token,
      });

      if (error || !data) {
        setInviteInfo(null);
      } else {
        setInviteInfo(data);

        if (data.used) {
          setStatus("error");
          setError("This invite has already been used");
          return;
        }

        if (data.expired) {
          setStatus("error");
          setError("This invite has expired");
          return;
        }
      }

      setStatus("need-auth");
    }

    fetchInviteInfo();
  }, [token]);

  // Accept invite when authenticated
  useEffect(() => {
    if (authLoading || status !== "need-auth") return;

    if (!user) return;

    async function acceptInvite() {
      setStatus("accepting");

      const { data, error } = await api.get<AcceptResult>(
        `/api/invite/accept?token=${token}`,
      );

      if (error || !data) {
        setStatus("error");
        setError(error || "Failed to accept invite");
        return;
      }

      setAcceptedRegistry(data.registry);
      setStatus("success");
    }

    acceptInvite();
  }, [user, authLoading, status, token]);

  const handleSignIn = async () => {
    if (!inviteInfo?.email) return;

    const redirectUrl = `${window.location.origin}/accept-invite?token=${token}`;
    const { error } = await signIn(inviteInfo.email, redirectUrl);

    if (error) {
      setError(error.message);
    }
  };

  if (status === "loading" || authLoading) {
    return <div className="text-lg text-gray-700">Loading...</div>;
  }

  if (status === "error") {
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
          <p className="text-gray-600 mb-6">{error}</p>
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

  if (status === "success" && acceptedRegistry) {
    return (
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Invite Accepted!
          </h1>
          <p className="text-gray-600 mb-6">
            You have joined{" "}
            <strong className="text-gray-900">{acceptedRegistry.title}</strong>
          </p>
          <button
            onClick={() => router.push(`/registries/${acceptedRegistry.id}`)}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            View Registry
          </button>
        </div>
      </div>
    );
  }

  if (status === "accepting") {
    return <div className="text-lg text-gray-700">Accepting invite...</div>;
  }

  return (
    <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-indigo-600"
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
        <h1 className="text-xl font-bold text-gray-900">
          You&apos;re Invited!
        </h1>
      </div>

      {inviteInfo?.registry && (
        <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
          <p className="text-indigo-600 text-sm font-medium">Registry</p>
          <p className="font-semibold text-lg text-gray-900">
            {inviteInfo.registry.title}
          </p>
          {inviteInfo.registry.ownerName && (
            <p className="text-gray-600 text-sm">
              by {inviteInfo.registry.ownerName}
            </p>
          )}
        </div>
      )}

      {user ? (
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Signed in as <strong className="text-gray-900">{user.email}</strong>
          </p>
          <p className="text-sm text-gray-500">Processing your invite...</p>
        </div>
      ) : (
        <div>
          <p className="text-gray-600 mb-6 text-center">
            Sign in to accept this invite
            {inviteInfo?.email ? ` for ${inviteInfo.email}` : ""}.
          </p>

          {inviteInfo?.email ? (
            <button
              onClick={handleSignIn}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Sign in with Magic Link
            </button>
          ) : (
            <p className="text-sm text-gray-500 text-center">
              Click the link in your invite email to sign in.
            </p>
          )}
        </div>
      )}
    </div>
  );
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
        <AcceptInviteContent />
      </Suspense>
    </main>
  );
}
