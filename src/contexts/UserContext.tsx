"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/fetcher";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

interface UserContextValue {
  profile: UserProfile | null;
  loading: boolean;
  updateName: (name: string | null) => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      if (authLoading) return;

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data } = await api.get<UserProfile>("/api/user/profile");
      if (data) {
        setProfile(data);
      }
      setLoading(false);
    }

    fetchProfile();
  }, [user, authLoading]);

  const updateName = (name: string | null) => {
    if (profile) {
      setProfile({ ...profile, name });
    }
  };

  return (
    <UserContext.Provider value={{ profile, loading, updateName }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUserProfile must be used within a UserProvider");
  }
  return context;
}
