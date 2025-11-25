import React, { useState } from "react";
import { api } from "@/lib/fetcher";

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

export default CreateRegistryModal;
