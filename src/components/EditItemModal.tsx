import React, { useState } from "react";
import { api } from "@/lib/fetcher";

interface EditItemModalProps {
  itemId: string;
  currentLabel: string | null;
  currentUrl: string | null;
  currentDescription: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

function EditItemModal({
  itemId,
  currentLabel,
  currentUrl,
  currentDescription,
  onClose,
  onUpdate,
}: EditItemModalProps) {
  const [label, setLabel] = useState(currentLabel ?? "");
  const [url, setUrl] = useState(currentUrl ?? "");
  const [description, setDescription] = useState(currentDescription ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate that at least one of label or url is provided
    if (!label.trim() && !url.trim()) {
      setError("Either item name or URL must be provided");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: apiError } = await api.patch(`/api/items/${itemId}`, {
      label: label.trim() || null,
      url: url.trim() || null,
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Edit Item</h2>

        <form onSubmit={handleUpdate}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Item Name
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Item name (required if no URL)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="URL (required if no name)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              If provided without a name, the page title will be used
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description for this item"
              rows={3}
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
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditItemModal;
