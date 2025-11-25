"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/fetcher";
import ProfileEditModal from "@/components/ProfileEditModal";
import CreateRegistryModal from "@/components/CreateRegistryModal";

interface Registry {
  id: string;
  title: string;
  occasionDate: string | null;
  deadline: string | null;
  isOwner: boolean;
  owner: { id: string; name: string | null; email: string };
  collaboratorCount: number;
  createdAt: string;
}

interface RegistriesResponse {
  registries: Registry[];
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();

  const [registries, setRegistries] = useState<Registry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/auth/signin");
      return;
    }

    async function initializeDashboard() {
      // First, accept any pending invites for this user's email
      // This handles the case where Supabase redirected without preserving the invite token
      try {
        await api.post("/api/invite/accept-pending", {});
      } catch {
        // Silently ignore errors - this is a best-effort operation
        console.error("Failed to check for pending invites");
      }

      // Fetch user profile to get their name
      try {
        const { data: profileData } = await api.get<{
          id: string;
          email: string;
          name: string | null;
          createdAt: string;
        }>("/api/user/profile");
        if (profileData) {
          setUserName(profileData.name);
        }
      } catch {
        console.error("Failed to fetch user profile");
      }

      // Then fetch registries (which will now include any newly accepted invites)
      const { data, error } =
        await api.get<RegistriesResponse>("/api/registries");

      if (error) {
        setError(error);
      } else if (data) {
        setRegistries(data.registries);
      }

      setLoading(false);
    }

    initializeDashboard();
  }, [authLoading, user?.id]); // router and user are intentionally excluded to prevent re-fetching

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-indigo-600">
            WeDo
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex gap-1 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 -960 960 960"
                width="24px"
              >
                <path d="M234-276q51-39 114-61.5T480-360q69 0 132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 59 19.5 111t54.5 93Zm246-164q-59 0-99.5-40.5T340-580q0-59 40.5-99.5T480-720q59 0 99.5 40.5T620-580q0 59-40.5 99.5T480-440Zm0 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q53 0 100-15.5t86-44.5q-39-29-86-44.5T480-280q-53 0-100 15.5T294-220q39 29 86 44.5T480-160Zm0-360q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm0-60Zm0 360Z" />
              </svg>
              <div className="self-center">{userName || user.email}</div>
            </button>
            <button
              onClick={handleSignOut}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">My Registries</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Create Registry
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {!loading && !authLoading && registries.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
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
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No registries yet
            </h2>
            <p className="text-gray-600 mb-6">
              Create your first gift registry to get started.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Create Registry
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            <RegistryList
              loading={authLoading || loading}
              registries={registries}
            />
          </div>
        )}

        {showCreateModal && (
          <CreateRegistryModal
            onClose={() => setShowCreateModal(false)}
            onCreated={(registry) => {
              setRegistries([
                ...registries,
                {
                  ...registry,
                  isOwner: true,
                  owner: { id: user.id, name: null, email: user.email! },
                  collaboratorCount: 1,
                },
              ]);
              setShowCreateModal(false);
              router.push(`/registries/${registry.id}`);
            }}
          />
        )}

        {showProfileModal && (
          <ProfileEditModal
            userEmail={user.email!}
            userName={userName}
            onClose={() => setShowProfileModal(false)}
            onUpdate={(name) => setUserName(name)}
          />
        )}
      </div>
    </main>
  );
}

function RegistryList({
  loading,
  registries,
}: {
  loading: boolean;
  registries: Registry[];
}) {
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex justify-between items-start gap-4 animate-pulse w-full">
          <div className="flex-1 min-w-0">
            <h2 className="h-8 mb-2.5 w-2/6 text-xl font-semibold text-gray-900 break-words bg-neutral-300" />
            <p className="h-4 mb-2.5 w-1/4 text-gray-600 text-sm mt-1 break-words bg-neutral-300" />
          </div>
          <div className="w-full text-right text-sm max-w-1/4">
            <div className="h-4 mb-2.5 w-full text-gray-900 font-medium whitespace-nowrap bg-neutral-300" />
            <div className="h-4 mb-2.5 w-full text-gray-500 bg-neutral-300">
              {" "}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {registries.map((registry) => (
        <Link
          key={registry.id}
          href={`/registries/${registry.id}`}
          className="block bg-white border border-gray-200 rounded-xl p-6 hover:border-indigo-300 hover:shadow-md transition-all"
        >
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-gray-900 break-words">
                {registry.title}
              </h2>
              <p className="text-gray-600 text-sm mt-1 break-words">
                {registry.isOwner
                  ? "You own this registry"
                  : `Created by ${registry.owner.name || registry.owner.email}`}
              </p>
            </div>
            <div className="text-right text-sm flex-shrink-0">
              <div className="text-gray-900 font-medium whitespace-nowrap">
                {registry.collaboratorCount} collaborator
                {registry.collaboratorCount !== 1 ? "s" : ""}
              </div>
              {registry.occasionDate && (
                <div className="text-gray-500">
                  {new Date(registry.occasionDate).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </Link>
      ))}
    </>
  );
}
