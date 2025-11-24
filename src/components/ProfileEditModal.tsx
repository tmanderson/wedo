"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/fetcher";

interface ProfileEditModalProps {
  userEmail: string;
  userName: string | null;
  onClose: () => void;
  onUpdate: (name: string | null) => void;
}

export default function ProfileEditModal({
  userEmail,
  userName,
  onClose,
  onUpdate,
}: ProfileEditModalProps) {
  const [name, setName] = useState(userName || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(userName || "");
  }, [userName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    setError(null);

    const { data, error: apiError } = await api.patch<{
      id: string;
      email: string;
      name: string | null;
      createdAt: string;
    }>("/api/user/profile", {
      name: name.trim() || null,
    });

    if (apiError || !data) {
      setError(apiError || "Failed to update profile");
      setSubmitting(false);
      return;
    }

    onUpdate(data.name);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Edit Profile</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Email
            </label>
            <input
              type="email"
              value={userEmail}
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-500 bg-gray-100 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
              Email cannot be changed
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              maxLength={100}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              This will be displayed to other users in registries
            </p>
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
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
