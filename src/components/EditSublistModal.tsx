import React, { useState } from "react";
import { api } from "@/lib/fetcher";

interface EditSublistModalProps {
  sublistId: string;
  currentName: string | null;
  currentDescription: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

function EditSublistModal({
  sublistId,
  currentName,
  currentDescription,
  onClose,
  onUpdate,
}: EditSublistModalProps) {
  const [name, setName] = useState(currentName ?? "");
  const [description, setDescription] = useState(currentDescription ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    setError(null);

    const { error: apiError } = await api.patch(`/api/sublists/${sublistId}`, {
      name: name.trim() || null,
      description: description.trim() || null,
    });

    if (apiError) {
      setError(apiError);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onUpdate();
    onClose();
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this list? All items in this list will also be deleted. This action cannot be undone.",
      )
    ) {
      return;
    }

    setDeleting(true);
    setError(null);

    const { error: apiError } = await api.delete(`/api/sublists/${sublistId}`);

    if (apiError) {
      setError(apiError);
      setDeleting(false);
      return;
    }

    setDeleting(false);
    onUpdate();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Edit Your List</h2>

        <form onSubmit={handleUpdate}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              List Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My List"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description for your list"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
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
                {submitting ? "Saving..." : "Save Changes"}
              </button>
            </div>

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="w-full bg-red-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-red-700 disabled:bg-red-400 transition-colors"
            >
              {deleting ? "Deleting..." : "Delete This List"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditSublistModal;
