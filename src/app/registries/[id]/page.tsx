"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/contexts/UserContext";
import { api } from "@/lib/fetcher";
import ProfileEditModal from "@/components/ProfileEditModal";
import RegistrySettingsModal from "@/components/RegistrySettingsModal";
import EditSublistModal from "@/components/EditSublistModal";
import EditItemModal from "@/components/EditItemModal";

interface Item {
  id: string;
  label: string | null;
  url: string | null;
  description: string | null;
  parsedTitle: string | null;
  isSecret: boolean;
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
  name: string | null;
  description: string | null;
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
  allowSecretGifts: boolean;
  isOwner: boolean;
  collaborators: Collaborator[];
}

export default function RegistryPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, updateName } = useUserProfile();

  const registryId = params.id as string;

  const [registry, setRegistry] = useState<Registry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

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

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/signin");
      return;
    }

    fetchRegistry();
  }, [authLoading, user?.id, registryId, fetchRegistry]); // router and user are intentionally excluded to prevent re-fetching

  if (error || (!loading && !registry)) {
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
          {profile && (
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowProfileModal(true)}
                className="flex gap-1 justify-center text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24px"
                  viewBox="0 -960 960 960"
                  width="24px"
                >
                  <path d="M234-276q51-39 114-61.5T480-360q69 0 132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 59 19.5 111t54.5 93Zm246-164q-59 0-99.5-40.5T340-580q0-59 40.5-99.5T480-720q59 0 99.5 40.5T620-580q0 59-40.5 99.5T480-440Zm0 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q53 0 100-15.5t86-44.5q-39-29-86-44.5T480-280q-53 0-100 15.5T294-220q39 29 86 44.5T480-160Zm0-360q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm0-60Zm0 360Z" />
                </svg>
                <div className="self-center">
                  {profile?.name || (user && user.email)}
                </div>
              </button>
              <button
                onClick={handleSignOut}
                className="text-gray-500 hover:text-gray-700 text-sm font-medium"
              >
                Sign Out
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

        <RegistryHeader
          loading={authLoading || loading}
          registry={registry}
          onRefresh={fetchRegistry}
        />

        <div className="space-y-6">
          {registry &&
            registry.collaborators.map((collaborator) => (
              <CollaboratorSublist
                key={collaborator.id}
                viewingUserId={user?.id || null}
                collaborator={collaborator}
                registryId={registry.id}
                isOwner={registry.isOwner}
                registry={registry}
                onUpdate={fetchRegistry}
              />
            ))}
        </div>

        {showProfileModal && user && (
          <ProfileEditModal
            userEmail={user.email!}
            userName={profile?.name || null}
            onClose={() => setShowProfileModal(false)}
            onUpdate={(name) => updateName(name)}
          />
        )}
      </div>
    </main>
  );
}

function CollaboratorSublist({
  viewingUserId,
  collaborator,
  registryId,
  isOwner,
  registry,
  onUpdate,
}: {
  viewingUserId: string | null;
  collaborator: Collaborator;
  registryId: string;
  isOwner: boolean;
  registry: Registry;
  onUpdate: () => Promise<void>;
}) {
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [isSecretItem, setIsSecretItem] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newItemLabel, setNewItemLabel] = useState("");
  const [newItemUrl, setNewItemUrl] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const displayName =
    collaborator.user?.name || collaborator.name || collaborator.email;
  const isPending = collaborator.status === "PENDING";
  const sublistName = collaborator.sublist?.name || "Untitled List";

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemLabel && !newItemUrl) return;
    if (!collaborator.sublist) return;

    setSubmitting(true);
    await api.post(`/api/sublists/${collaborator.sublist.id}/items`, {
      label: newItemLabel || null,
      url: newItemUrl || null,
      description: newItemDescription || null,
      isSecret: isSecretItem,
    });
    setNewItemLabel("");
    setNewItemUrl("");
    setNewItemDescription("");
    setShowAddItemForm(false);
    setSubmitting(false);
    onUpdate();
  };

  const openAddItemForm = (isSecret: boolean) => {
    setIsSecretItem(isSecret);
    setShowAddItemForm(true);
  };

  const closeAddItemForm = () => {
    setShowAddItemForm(false);
    setNewItemLabel("");
    setNewItemUrl("");
    setNewItemDescription("");
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
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-semibold text-gray-900 break-words">
              {sublistName}
            </h2>
            {collaborator.isViewer && (
              <span className="text-sm text-indigo-600 font-medium">(You)</span>
            )}
          </div>
          {collaborator.sublist?.description && (
            <p className="text-sm text-gray-600 mb-2 break-words">
              {collaborator.sublist.description}
            </p>
          )}
          {isPending && (
            <span className="text-sm text-amber-600">Invite pending</span>
          )}
        </div>
        <div className="flex gap-3 flex-shrink-0">
          {collaborator.isViewer && (
            <button
              onClick={() => setShowEditModal(true)}
              className="text-gray-600 text-sm font-medium hover:text-gray-900 flex items-center gap-1"
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit
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

      {collaborator.sublist?.items.length === 0 && !showAddItemForm ? (
        <p className="text-gray-500 text-sm mb-4">No items yet</p>
      ) : (
        <div className="space-y-2 mb-4">
          {collaborator.sublist?.items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              isOwner={collaborator.isViewer}
              isClaimant={viewingUserId === item.claimedByUser?.id}
              ownerName={collaborator.name}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}

      {showAddItemForm ? (
        <form
          onSubmit={handleAddItem}
          className={`p-4 rounded-lg border ${
            isSecretItem
              ? "bg-purple-50 border-purple-200 mt-3"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          {isSecretItem && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded">
                SECRET GIFT
              </span>
              <span className="text-xs text-purple-600">
                {collaborator.user?.name ||
                  collaborator.name ||
                  collaborator.email}{" "}
                won't see this
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            <input
              type="text"
              placeholder="Item name (required if no URL)"
              value={newItemLabel}
              onChange={(e) => setNewItemLabel(e.target.value)}
              className={`px-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 ${
                isSecretItem
                  ? "border-purple-300 focus:ring-purple-100 focus:border-purple-500"
                  : "border-gray-300 focus:ring-indigo-100 focus:border-indigo-500"
              }`}
            />
            <input
              type="url"
              placeholder="URL (required if no name)"
              value={newItemUrl}
              onChange={(e) => setNewItemUrl(e.target.value)}
              className={`px-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 ${
                isSecretItem
                  ? "border-purple-300 focus:ring-purple-100 focus:border-purple-500"
                  : "border-gray-300 focus:ring-indigo-100 focus:border-indigo-500"
              }`}
            />
          </div>
          {isSecretItem && (
            <p className="text-xs text-purple-600 mb-3">
              Provide at least one: a name, a URL, or both. If only a URL is
              provided, the page title will be fetched automatically.
            </p>
          )}
          <div className="mb-3">
            <textarea
              placeholder="Description (optional)"
              value={newItemDescription}
              onChange={(e) => setNewItemDescription(e.target.value)}
              rows={2}
              className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 ${
                isSecretItem
                  ? "border-purple-300 focus:ring-purple-100 focus:border-purple-500"
                  : "border-gray-300 focus:ring-indigo-100 focus:border-indigo-500"
              }`}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || (!newItemLabel && !newItemUrl)}
              className={`px-4 py-2 rounded-lg text-sm font-medium disabled:bg-gray-300 transition-colors ${
                isSecretItem
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              {isSecretItem ? "Add Secret Gift" : "Add"}
            </button>
            <button
              type="button"
              onClick={closeAddItemForm}
              className="text-gray-600 px-4 py-2 text-sm font-medium hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          {collaborator.isViewer && (
            <button
              onClick={() => openAddItemForm(false)}
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
          {!collaborator.isViewer && registry.allowSecretGifts && (
            <button
              onClick={() => openAddItemForm(true)}
              className="text-purple-600 text-sm font-medium hover:text-purple-700 flex items-center gap-1 mt-2"
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
              Add Secret Item
            </button>
          )}
        </>
      )}

      {showEditModal && collaborator.sublist && (
        <EditSublistModal
          sublistId={collaborator.sublist.id}
          currentName={collaborator.sublist.name}
          currentDescription={collaborator.sublist.description}
          onClose={() => setShowEditModal(false)}
          onUpdate={onUpdate}
        />
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
  ownerName,
  isClaimant,
  isOwner,
  onUpdate,
}: {
  item: Item;
  ownerName: string | null;
  isOwner: boolean;
  isClaimant: boolean;
  onUpdate: () => Promise<void>;
}) {
  const [actionLoading, setActionLoading] = useState<
    "claim" | "release" | "bought" | "delete" | null
  >(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Determine display text based on name/URL/parsedTitle combination
  // If both name and URL: use name as link text
  // If only URL: use parsedTitle (scraped) or URL as fallback
  // If only name: display name (no link)
  const displayName =
    item.label || item.parsedTitle || item.url || "Unnamed item";
  const isDeleted = !!item.deletedAt;
  const isLoading = actionLoading !== null;

  const handleClaim = async () => {
    setActionLoading("claim");
    await api.post(`/api/items/${item.id}/claim`);
    await onUpdate();
    setActionLoading(null);
  };

  const handleRelease = async () => {
    setActionLoading("release");
    await api.post(`/api/items/${item.id}/release`);
    await onUpdate();
    setActionLoading(null);
  };

  const handleMarkBought = async () => {
    setActionLoading("bought");
    await api.post(`/api/items/${item.id}/mark-bought`);
    await onUpdate();
    setActionLoading(null);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this item?")) return;
    setActionLoading("delete");
    await api.delete(`/api/items/${item.id}`);
    await onUpdate();
    setActionLoading(null);
  };

  return (
    <>
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
                Claimed by{" "}
                {item.claimedByUser?.name || item.claimedByUser?.email}
              </span>
            )}
            {!isOwner && item.status === "BOUGHT" && (
              <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded font-medium break-words">
                Bought by{" "}
                {item.claimedByUser?.name || item.claimedByUser?.email}
              </span>
            )}
            {!isOwner && item.isSecret && (
              <span
                className="text-xs text-purple-700 bg-purple-100 px-2 py-0.5 rounded font-medium whitespace-nowrap cursor-help"
                title={`${ownerName} cannot see this item. It is a surprise.`}
              >
                Secret
              </span>
            )}
          </div>
          {item.description && (
            <p className="text-sm text-gray-500 mt-1 break-words">
              {item.description}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 items-center flex-shrink-0">
          {isOwner && !isDeleted && (
            <>
              <button
                onClick={() => setShowEditModal(true)}
                disabled={isLoading}
                className="text-gray-600 text-sm font-medium hover:text-gray-800 disabled:text-gray-300 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                Edit
              </button>
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
            </>
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
              {(item.status === "CLAIMED" || item.status === "BOUGHT") &&
                isClaimant && (
                  <>
                    <button
                      onClick={handleRelease}
                      disabled={isLoading}
                      className="text-gray-600 self-stretch text-sm border-1 border-gray-400 px-4 py-1.5 rounded-lg font-medium hover:text-gray-800 disabled:text-gray-300 disabled:cursor-not-allowed flex items-center gap-1.5 justify-center"
                    >
                      {actionLoading === "release" && (
                        <LoadingSpinner className="w-3.5 h-3.5" />
                      )}
                      Release
                    </button>
                    {item.status !== "BOUGHT" && (
                      <button
                        onClick={handleMarkBought}
                        disabled={isLoading}
                        className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                      >
                        {actionLoading === "bought" && (
                          <LoadingSpinner className="w-3.5 h-3.5" />
                        )}
                        {actionLoading === "bought"
                          ? "Updating..."
                          : "Mark Bought"}
                      </button>
                    )}
                  </>
                )}
            </>
          )}
        </div>
      </div>

      {showEditModal && (
        <EditItemModal
          itemId={item.id}
          currentLabel={item.label}
          currentUrl={item.url}
          currentDescription={item.description}
          onClose={() => setShowEditModal(false)}
          onUpdate={onUpdate}
        />
      )}
    </>
  );
}

function InviteModal({
  registryId,
  onClose,
}: {
  registryId: string;
  onClose: () => void;
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

function RegistryHeader({
  loading,
  registry,
  onRefresh,
}: {
  loading: boolean;
  registry: Registry | null;
  onRefresh: () => void;
}) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const canInvite =
    registry && (registry.isOwner || registry.collaboratorsCanInvite);

  if (loading || !registry) {
    return (
      <div className="flex justify-between items-start gap-4 animate-pulse w-full">
        <div className="flex-1 min-w-0">
          <h2 className="h-8 mb-2.5 w-2/6 text-xl font-semibold text-gray-900 break-words bg-neutral-300" />
          <p className="h-5 mb-2.5 w-1/4 text-gray-600 text-sm mt-1 break-words bg-neutral-300" />
        </div>
        <div className="w-full text-right text-sm max-w-1/6">
          <div className="h-12 mb-2.5 w-full rounded-2xl bg-indigo-200 border-indigo-500" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <div className="flex justify-between items-start gap-4">
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
          <div className="hidden md:flex gap-2 flex-shrink-0">
            {registry.isOwner && (
              <button
                onClick={() => setShowSettingsModal(true)}
                className="bg-gray-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Settings
              </button>
            )}
            {canInvite && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Invite People
              </button>
            )}
          </div>
        </div>
        <div className="flex md:hidden gap-2 mt-4">
          {registry.isOwner && (
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex-1 bg-gray-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              Settings
            </button>
          )}
          {canInvite && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex-1 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Invite People
            </button>
          )}
        </div>
      </div>
      {showInviteModal && (
        <InviteModal
          registryId={registry.id}
          onClose={() => setShowInviteModal(false)}
        />
      )}
      {showSettingsModal && (
        <RegistrySettingsModal
          registryId={registry.id}
          currentTitle={registry.title}
          currentOccasionDate={registry.occasionDate}
          currentDeadline={registry.deadline}
          currentCollaboratorsCanInvite={registry.collaboratorsCanInvite}
          currentAllowSecretGifts={registry.allowSecretGifts}
          currentOwnerId={registry.ownerId}
          currentOwner={registry.owner}
          collaborators={registry.collaborators}
          onClose={() => setShowSettingsModal(false)}
          onUpdate={() => {
            setShowSettingsModal(false);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
