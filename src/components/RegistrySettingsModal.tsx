"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/fetcher";

interface Collaborator {
  id: string;
  email: string;
  name: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  status: string;
}

interface RegistrySettingsModalProps {
  registryId: string;
  currentTitle: string;
  currentOccasionDate: string | null;
  currentDeadline: string | null;
  currentCollaboratorsCanInvite: boolean;
  currentAllowSecretGifts: boolean;
  currentOwnerId: string;
  currentOwner: {
    id: string;
    name: string | null;
    email: string;
  };
  collaborators: Collaborator[];
  onClose: () => void;
  onUpdate: () => void;
}

export default function RegistrySettingsModal({
  registryId,
  currentTitle,
  currentOccasionDate,
  currentDeadline,
  currentCollaboratorsCanInvite,
  currentAllowSecretGifts,
  currentOwnerId,
  currentOwner,
  collaborators,
  onClose,
  onUpdate,
}: RegistrySettingsModalProps) {
  const [title, setTitle] = useState(currentTitle);
  const [occasionDate, setOccasionDate] = useState(
    currentOccasionDate ? currentOccasionDate.split("T")[0] : "",
  );
  const [deadline, setDeadline] = useState(
    currentDeadline ? currentDeadline.split("T")[0] : "",
  );
  const [collaboratorsCanInvite, setCollaboratorsCanInvite] = useState(
    currentCollaboratorsCanInvite,
  );
  const [allowSecretGifts, setAllowSecretGifts] = useState(
    currentAllowSecretGifts,
  );
  const [ownerId, setOwnerId] = useState(currentOwnerId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOwnershipWarning, setShowOwnershipWarning] = useState(false);

  useEffect(() => {
    setTitle(currentTitle);
    setOccasionDate(
      currentOccasionDate ? currentOccasionDate.split("T")[0] : "",
    );
    setDeadline(currentDeadline ? currentDeadline.split("T")[0] : "");
    setCollaboratorsCanInvite(currentCollaboratorsCanInvite);
    setAllowSecretGifts(currentAllowSecretGifts);
    setOwnerId(currentOwnerId);
  }, [
    currentTitle,
    currentOccasionDate,
    currentDeadline,
    currentCollaboratorsCanInvite,
    currentAllowSecretGifts,
    currentOwnerId,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If changing ownership, show warning first
    if (ownerId !== currentOwnerId && !showOwnershipWarning) {
      setShowOwnershipWarning(true);
      return;
    }

    setSubmitting(true);
    setError(null);

    const { data, error: apiError } = await api.patch(
      `/api/registries/${registryId}`,
      {
        title: title.trim(),
        occasionDate: occasionDate || null,
        deadline: deadline || null,
        collaboratorsCanInvite,
        allowSecretGifts,
        ...(ownerId !== currentOwnerId && { ownerId }),
      },
    );

    if (apiError || !data) {
      setError(apiError || "Failed to update registry settings");
      setSubmitting(false);
      return;
    }

    onUpdate();
    onClose();
  };

  // Get accepted collaborators for owner transfer
  const acceptedCollaborators = collaborators.filter(
    (c) => c.status === "ACCEPTED" && c.user,
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Registry Settings
        </h2>

        {showOwnershipWarning && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-900 font-semibold mb-2">
              ⚠️ Warning: Transfer Ownership
            </p>
            <p className="text-sm text-red-800 mb-3">
              You are about to transfer ownership of this registry. After this
              change, you will no longer be able to modify registry settings or
              transfer ownership again. Only the new owner will have these
              permissions.
            </p>
            <p className="text-sm text-red-800">
              Are you sure you want to continue?
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Registry Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={collaboratorsCanInvite}
                onChange={(e) => setCollaboratorsCanInvite(e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-900">
                Allow collaborators to invite others
              </span>
            </label>
          </div>

          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={allowSecretGifts}
                onChange={(e) => setAllowSecretGifts(e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-900">Allow Secret Gifts</span>
            </label>
            <p className="ml-6 text-xs text-gray-500 mt-1">
              Collaborators can add surprise items to other people's lists
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Registry Owner
            </label>
            <select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={currentOwnerId}>
                {currentOwner.name || currentOwner.email} (Current Owner)
              </option>
              {acceptedCollaborators
                .filter((c) => c.user!.id !== currentOwnerId)
                .map((c) => (
                  <option key={c.user!.id} value={c.user!.id}>
                    {c.user!.name || c.user!.email}
                  </option>
                ))}
            </select>
            {ownerId !== currentOwnerId && (
              <p className="text-xs text-red-600 mt-1">
                Warning: You will lose ownership if you transfer to another user
              </p>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                if (showOwnershipWarning) {
                  setShowOwnershipWarning(false);
                  setOwnerId(currentOwnerId);
                } else {
                  onClose();
                }
              }}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            >
              {showOwnershipWarning ? "Cancel Transfer" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {submitting
                ? "Saving..."
                : showOwnershipWarning
                  ? "Confirm Transfer"
                  : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
