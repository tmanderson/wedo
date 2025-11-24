"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/fetcher";
import ProfileEditModal from "@/components/ProfileEditModal";

interface Item {
  id: string;
  label: string | null;
  url: string | null;
  parsedTitle: string | null;
  createdAt: string;
  deletedAt: string | null;
  deletedByUser: { id: string; name: string | null } | null;
  status: "UNCLAIMED" | "CLAIMED" | "BOUGHT" | null;
  claimedByUser: { id: string; name: string | null; email: string } | null;
  claimedAt: string | null;
  boughtAt: string | null;
}

interface SubList {
  id: string;
  items: Item[];
}

interface Collaborator {
  id: string;
  email: string;
  name: string | null;
  status: "PENDING" | "ACCEPTED" | "REMOVED";
  user: { id: string; name: string | null; email: string } | null;
  isViewer: boolean;
  sublist: SubList | null;
}

interface Registry {
  id: string;
  title: string;
  occasionDate: string | null;
  deadline: string | null;
  ownerId: string;
  owner: { id: string; name: string | null; email: string };
  collaboratorsCanInvite: boolean;
  isOwner: boolean;
  collaborators: Collaborator[];
}

export default function RegistryPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const registryId = params.id as string;

  const [registry, setRegistry] = useState<Registry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  const fetchRegistry = useCallback(async () => {
    const { data, error: apiError } = await api.get<Registry>(
      `/api/registries/${registryId}`,
    );
    if (apiError) {
      setError(apiError);
    } else if (data) {
      setRegistry(data);
    }
    setLoading(false);
  }, [registryId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/signin");
      return;
    }

    // Fetch user profile to get their name
    async function fetchUserProfile() {
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
    }

    fetchUserProfile();
    fetchRegistry();
  }, [authLoading, user?.id, registryId]); // router and user are intentionally excluded to prevent re-fetching

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="text-gray-700">Loading...</div>
      </main>
    );
  }

  if (error || !registry) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            {error || "Registry not found"}
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 text-indigo-600 font-medium hover:text-indigo-700"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  const canInvite = registry.isOwner || registry.collaboratorsCanInvite;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-8 py-4 flex justify-between items-center">
          <Link
            href="/dashboard"
            className="text-2xl font-bold text-indigo-600"
          >
            WeDo
          </Link>
          {user && (
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowProfileModal(true)}
                className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
              >
                {userName || user.email}
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-8">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-indigo-600 font-medium hover:text-indigo-700 mb-6 flex items-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Dashboard
        </button>

        <div className="flex justify-between items-start mb-8 gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 break-words">
              {registry.title}
            </h1>
            <p className="text-gray-600 mt-1 break-words">
              Created by {registry.owner.name || registry.owner.email}
              {registry.occasionDate &&
                ` · ${new Date(registry.occasionDate).toLocaleDateString()}`}
            </p>
          </div>
          {canInvite && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Invite People
            </button>
          )}
        </div>

        <div className="space-y-6">
          {registry.collaborators.map((collaborator) => (
            <CollaboratorSublist
              key={collaborator.id}
              collaborator={collaborator}
              registryId={registry.id}
              isOwner={registry.isOwner}
              onUpdate={fetchRegistry}
            />
          ))}
        </div>

        {showInviteModal && (
          <InviteModal
            registryId={registry.id}
            onClose={() => setShowInviteModal(false)}
            onInvited={fetchRegistry}
          />
        )}

        {showProfileModal && user && (
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

function CollaboratorSublist({
  collaborator,
  registryId,
  isOwner,
  onUpdate,
}: {
  collaborator: Collaborator;
  registryId: string;
  isOwner: boolean;
  onUpdate: () => void;
}) {
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemLabel, setNewItemLabel] = useState("");
  const [newItemUrl, setNewItemUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const displayName =
    collaborator.user?.name || collaborator.name || collaborator.email;
  const isPending = collaborator.status === "PENDING";

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemLabel && !newItemUrl) return;
    if (!collaborator.sublist) return;

    setSubmitting(true);
    await api.post(`/api/sublists/${collaborator.sublist.id}/items`, {
      label: newItemLabel || null,
      url: newItemUrl || null,
    });
    setNewItemLabel("");
    setNewItemUrl("");
    setShowAddItem(false);
    setSubmitting(false);
    onUpdate();
  };

  const handleRemoveCollaborator = async () => {
    if (!confirm(`Remove ${displayName} from this registry?`)) return;
    await api.delete(
      `/api/registries/${registryId}/collaborators/${collaborator.id}`,
    );
    onUpdate();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 break-words">
            {displayName}&apos;s List
            {collaborator.isViewer && (
              <span className="text-sm text-indigo-600 ml-2 font-medium">
                (You)
              </span>
            )}
          </h2>
          {isPending && (
            <span className="text-sm text-amber-600">Invite pending</span>
          )}
        </div>
        <div className="flex gap-3">
          {collaborator.isViewer && (
            <button
              onClick={() => setShowAddItem(!showAddItem)}
              className="text-indigo-600 text-sm font-medium hover:text-indigo-700 flex items-center gap-1"
            >
              <svg
                className="w-4 h-4"
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
              Add Item
            </button>
          )}
          {isOwner && !collaborator.isViewer && (
            <button
              onClick={handleRemoveCollaborator}
              className="text-red-600 text-sm font-medium hover:text-red-700"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {showAddItem && (
        <form
          onSubmit={handleAddItem}
          className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            <input
              type="text"
              placeholder="Item name"
              value={newItemLabel}
              onChange={(e) => setNewItemLabel(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
            />
            <input
              type="url"
              placeholder="URL (optional)"
              value={newItemUrl}
              onChange={(e) => setNewItemUrl(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || (!newItemLabel && !newItemUrl)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:bg-gray-300 hover:bg-indigo-700 transition-colors"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowAddItem(false)}
              className="text-gray-600 px-4 py-2 text-sm font-medium hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {collaborator.sublist?.items.length === 0 ? (
        <p className="text-gray-500 text-sm">No items yet</p>
      ) : (
        <div className="space-y-2">
          {collaborator.sublist?.items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              isOwner={collaborator.isViewer}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingSpinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function ItemRow({
  item,
  isOwner,
  onUpdate,
}: {
  item: Item;
  isOwner: boolean;
  onUpdate: () => void;
}) {
  const [actionLoading, setActionLoading] = useState<
    "claim" | "release" | "bought" | "delete" | null
  >(null);

  const displayName =
    item.parsedTitle || item.label || item.url || "Unnamed item";
  const isDeleted = !!item.deletedAt;
  const isLoading = actionLoading !== null;

  const handleClaim = async () => {
    setActionLoading("claim");
    await api.post(`/api/items/${item.id}/claim`);
    setActionLoading(null);
    onUpdate();
  };

  const handleRelease = async () => {
    setActionLoading("release");
    await api.post(`/api/items/${item.id}/release`);
    setActionLoading(null);
    onUpdate();
  };

  const handleMarkBought = async () => {
    setActionLoading("bought");
    await api.post(`/api/items/${item.id}/mark-bought`);
    setActionLoading(null);
    onUpdate();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this item?")) return;
    setActionLoading("delete");
    await api.delete(`/api/items/${item.id}`);
    setActionLoading(null);
    onUpdate();
  };

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-lg transition-opacity gap-4 ${isLoading ? "opacity-70" : ""} ${isDeleted ? "bg-red-50 border border-red-200" : "bg-gray-50"}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 font-medium hover:text-indigo-700 hover:underline break-words"
            >
              {displayName}
            </a>
          ) : (
            <span className="text-gray-900 break-words">{displayName}</span>
          )}
          {isDeleted && (
            <span className="text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded font-medium whitespace-nowrap">
              Deleted by owner
            </span>
          )}
          {!isOwner && item.status === "CLAIMED" && (
            <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded font-medium break-words">
              Claimed by {item.claimedByUser?.name || item.claimedByUser?.email}
            </span>
          )}
          {!isOwner && item.status === "BOUGHT" && (
            <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded font-medium break-words">
              Bought by {item.claimedByUser?.name || item.claimedByUser?.email}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2 items-center flex-shrink-0">
        {isOwner && !isDeleted && (
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="text-red-600 text-sm font-medium hover:text-red-700 disabled:text-red-300 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {actionLoading === "delete" && (
              <LoadingSpinner className="w-3.5 h-3.5" />
            )}
            Delete
          </button>
        )}

        {!isOwner && !isDeleted && item.status !== null && (
          <>
            {item.status === "UNCLAIMED" && (
              <button
                onClick={handleClaim}
                disabled={isLoading}
                className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                {actionLoading === "claim" && (
                  <LoadingSpinner className="w-3.5 h-3.5" />
                )}
                {actionLoading === "claim" ? "Claiming..." : "Claim"}
              </button>
            )}
            {item.status === "CLAIMED" && item.claimedByUser && (
              <>
                <button
                  onClick={handleRelease}
                  disabled={isLoading}
                  className="text-gray-600 text-sm font-medium hover:text-gray-800 disabled:text-gray-300 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {actionLoading === "release" && (
                    <LoadingSpinner className="w-3.5 h-3.5" />
                  )}
                  Release
                </button>
                <button
                  onClick={handleMarkBought}
                  disabled={isLoading}
                  className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                >
                  {actionLoading === "bought" && (
                    <LoadingSpinner className="w-3.5 h-3.5" />
                  )}
                  {actionLoading === "bought" ? "Updating..." : "Mark Bought"}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function InviteModal({
  registryId,
  onClose,
  onInvited,
}: {
  registryId: string;
  onClose: () => void;
  onInvited: () => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setSubmitting(true);
    setError(null);

    const { error: apiError } = await api.post(
      `/api/registries/${registryId}/invite`,
      {
        emails: [{ email, name: name || null }],
      },
    );

    if (apiError) {
      setError(apiError);
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setSubmitting(false);
    setTimeout(() => {
      onInvited();
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Invite Someone</h2>

        {success ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-6 h-6 text-green-600"
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
            <p className="text-green-700 font-medium">
              Invite sent successfully!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Name (optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
              >
                {submitting ? "Sending..." : "Send Invite"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
