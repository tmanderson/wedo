"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/fetcher";
import ProfileEditModal from "@/components/ProfileEditModal";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-lg text-gray-700">Loading...</div>
        </div>
      </main>
    );
  }

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
              className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
            >
              {userName || user.email}
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

        {registries.length === 0 ? (
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
            {registries.map((registry) => (
              <Link
                key={registry.id}
                href={`/registries/${registry.id}`}
                className="block bg-white border border-gray-200 rounded-xl p-6 hover:border-indigo-300 hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {registry.title}
                    </h2>
                    <p className="text-gray-600 text-sm mt-1">
                      {registry.isOwner
                        ? "You own this registry"
                        : `Created by ${registry.owner.name || registry.owner.email}`}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-gray-900 font-medium">
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

interface MemberItem {
  label: string;
  url: string;
}

interface InitialMember {
  email: string;
  name: string;
  items: MemberItem[];
  showItems: boolean;
}

function CreateRegistryModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (registry: {
    id: string;
    title: string;
    occasionDate: string | null;
    deadline: string | null;
    createdAt: string;
  }) => void;
}) {
  const [title, setTitle] = useState("");
  const [occasionDate, setOccasionDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [collaboratorsCanInvite, setCollaboratorsCanInvite] = useState(false);
  const [addExistingMembers, setAddExistingMembers] = useState(false);
  const [initialMembers, setInitialMembers] = useState<InitialMember[]>([
    { email: "", name: "", items: [], showItems: false },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMember = () => {
    setInitialMembers([
      ...initialMembers,
      { email: "", name: "", items: [], showItems: false },
    ]);
  };

  const removeMember = (index: number) => {
    setInitialMembers(initialMembers.filter((_, i) => i !== index));
  };

  const updateMember = (
    index: number,
    field: keyof InitialMember,
    value: string | boolean,
  ) => {
    const updated = [...initialMembers];
    updated[index] = { ...updated[index], [field]: value };
    setInitialMembers(updated);
  };

  const addItemToMember = (memberIndex: number) => {
    const updated = [...initialMembers];
    updated[memberIndex].items.push({ label: "", url: "" });
    setInitialMembers(updated);
  };

  const removeItemFromMember = (memberIndex: number, itemIndex: number) => {
    const updated = [...initialMembers];
    updated[memberIndex].items = updated[memberIndex].items.filter(
      (_, i) => i !== itemIndex,
    );
    setInitialMembers(updated);
  };

  const updateMemberItem = (
    memberIndex: number,
    itemIndex: number,
    field: keyof MemberItem,
    value: string,
  ) => {
    const updated = [...initialMembers];
    updated[memberIndex].items[itemIndex] = {
      ...updated[memberIndex].items[itemIndex],
      [field]: value,
    };
    setInitialMembers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    setSubmitting(true);
    setError(null);

    // Filter out empty members and items
    const validMembers = addExistingMembers
      ? initialMembers
          .filter((m) => m.email.trim())
          .map((m) => ({
            email: m.email.trim(),
            name: m.name.trim() || null,
            items: m.items.filter((i) => i.label.trim() || i.url.trim()),
          }))
      : [];

    const { data, error: apiError } = await api.post<{
      id: string;
      title: string;
      occasionDate: string | null;
      deadline: string | null;
      createdAt: string;
    }>("/api/registries", {
      title: title.trim(),
      occasionDate: occasionDate ? new Date(occasionDate).toISOString() : null,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      collaboratorsCanInvite,
      initialMembers: validMembers,
    });

    if (apiError || !data) {
      setError(apiError || "Failed to create registry");
      setSubmitting(false);
      return;
    }

    onCreated(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl my-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Create Registry
        </h2>

        <form
          onSubmit={handleSubmit}
          className="max-h-[70vh] overflow-y-auto px-1"
        >
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Holiday Gift Registry"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Occasion Date
            </label>
            <input
              type="date"
              value={occasionDate}
              onChange={(e) => setOccasionDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Deadline
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
            />
          </div>

          <div className="mb-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={collaboratorsCanInvite}
                onChange={(e) => setCollaboratorsCanInvite(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="ml-3 text-sm text-gray-700">
                Allow collaborators to invite others
              </span>
            </label>
          </div>

          <div className="mb-6">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={addExistingMembers}
                onChange={(e) => setAddExistingMembers(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="ml-3 text-sm text-gray-700">
                Add Existing Members and Items
              </span>
            </label>
          </div>

          {addExistingMembers && (
            <div className="mb-6 space-y-4">
              <h3 className="text-sm font-medium text-gray-900">Members</h3>
              {initialMembers.map((member, memberIndex) => (
                <div
                  key={memberIndex}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                >
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={member.email}
                        onChange={(e) =>
                          updateMember(memberIndex, "email", e.target.value)
                        }
                        placeholder="person@example.com"
                        required={addExistingMembers}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) =>
                          updateMember(memberIndex, "name", e.target.value)
                        }
                        placeholder="John Doe"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          updateMember(
                            memberIndex,
                            "showItems",
                            !member.showItems,
                          )
                        }
                        className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        <svg
                          className={`w-4 h-4 transition-transform ${member.showItems ? "rotate-90" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                        Items ({member.items.length})
                      </button>

                      {member.showItems && (
                        <div className="mt-3 space-y-2">
                          {member.items.map((item, itemIndex) => (
                            <div
                              key={itemIndex}
                              className="flex gap-2 items-start bg-white p-2 rounded border border-gray-200"
                            >
                              <div className="flex-1 space-y-2">
                                <input
                                  type="text"
                                  value={item.label}
                                  onChange={(e) =>
                                    updateMemberItem(
                                      memberIndex,
                                      itemIndex,
                                      "label",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Item label"
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-gray-900 placeholder-gray-400 focus:ring-1 focus:ring-indigo-100 focus:border-indigo-500"
                                />
                                <input
                                  type="url"
                                  value={item.url}
                                  onChange={(e) =>
                                    updateMemberItem(
                                      memberIndex,
                                      itemIndex,
                                      "url",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="https://..."
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-gray-900 placeholder-gray-400 focus:ring-1 focus:ring-indigo-100 focus:border-indigo-500"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  removeItemFromMember(memberIndex, itemIndex)
                                }
                                className="text-red-600 hover:text-red-700 p-1"
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
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addItemToMember(memberIndex)}
                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                          >
                            + Add another item
                          </button>
                        </div>
                      )}
                    </div>

                    {initialMembers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMember(memberIndex)}
                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        Remove member
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addMember}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                + Add another person
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-200">
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
              {submitting ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
