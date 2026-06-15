import React, { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { getApiBaseUrl } from "@/lib/apiBase";
import { resolveAvatarUrl } from "@/lib/userApi";

type Role = "user" | "owner" | "admin";

export type AuthUser = {
  id: string;
  username: string;
  role: Role;
  name?: string;
  age?: number;
  location?: string;
  bio?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  stats?: {
    matchesPlayed?: number;
    winRate?: number;
    hoursActive?: number;
    followers?: number;
  };
  sports?: { name: string; level: string }[];
  schedule?: {
    day: string;
    time?: string;
    activity: string;
    matchId?: string;
  }[];
  favorites?: string[];
};

export type SuggestedPartner = {
  id: string;
  name: string;
  sport: string;
  level: string;
  distance: string | null;
  winRate: number;
  bio?: string;
  age?: number;
  location?: string;
  avatar?: string;
  isLocationClear?: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  role: Role;
  isAuthenticated: boolean;
  loading: boolean;
  login: (options: {
    identifier: string;
    password: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  register: (options: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  requestPasswordReset: (
    email: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  resetPassword: (options: {
    email: string;
    code: string;
    newPassword: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  setUserFromServer: (user: AuthUser) => void;
  refreshUser: () => Promise<void>;
  fetchSuggestedPartners: (options?: {
    maxDistance?: number;
    limit?: number;
    latitude?: number;
    longitude?: number;
    userLocation?: string;
  }) => Promise<{
    partners: SuggestedPartner[];
    total: number;
    userLocation: string | null;
  }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const API_BASE_URL = getApiBaseUrl();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const cached = localStorage.getItem("sportmate_user");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(false);

  const setUserFromServer = (u: AuthUser) => {
    setUser(u);
    localStorage.setItem("sportmate_user", JSON.stringify(u));
  };

  const login: AuthContextValue["login"] = async ({ identifier, password }) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data?.error || "Đăng nhập thất bại" };
      }
      setUserFromServer(data);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: "Không thể kết nối máy chủ" };
    } finally {
      setLoading(false);
    }
  };

  const register: AuthContextValue["register"] = async ({
    fullName,
    email,
    phone,
    password,
  }) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data?.error || "Đăng ký thất bại" };
      }
      setUserFromServer(data);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: "Không thể kết nối máy chủ" };
    } finally {
      setLoading(false);
    }
  };

  const requestPasswordReset: AuthContextValue["requestPasswordReset"] = async (
    email,
  ) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        const base = (data?.error as string) || "Không thể gửi mã";
        const detail = data?.detail ? `\n${String(data.detail)}` : "";
        return { ok: false, error: base + detail };
      }
      return { ok: true };
    } catch {
      return { ok: false, error: "Không thể kết nối máy chủ" };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword: AuthContextValue["resetPassword"] = async ({
    email,
    code,
    newPassword,
  }) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data?.error || "Đặt lại mật khẩu thất bại" };
      }
      return { ok: true };
    } catch {
      return { ok: false, error: "Không thể kết nối máy chủ" };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("sportmate_user");
  };

  const refreshUser: AuthContextValue["refreshUser"] = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/users/${encodeURIComponent(user.id)}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      setUser((prev) => {
        const updated = prev ? { ...prev, ...data, id: prev.id, role: prev.role } : prev;
        if (updated) {
          localStorage.setItem("sportmate_user", JSON.stringify(updated));
        }
        return updated;
      });
    } catch (e) {
      console.warn("⚠️ refreshUser failed:", e);
    }
  };

  const fetchSuggestedPartners: AuthContextValue["fetchSuggestedPartners"] =
    async ({
      maxDistance = 10,
      limit = 20,
      latitude,
      longitude,
      userLocation,
    } = {}) => {
      try {
        const params = new URLSearchParams({
          limit: String(limit),
        });

        if (user?.id) {
          params.append("userId", user.id);
        }

        if (latitude != null && longitude != null) {
          params.append("lat", String(latitude));
          params.append("lng", String(longitude));
        }

        if (userLocation) {
          params.append("currentLocation", userLocation);
        }

        const res = await fetch(
          `${API_BASE_URL}/api/partners/suggested?${params}`,
        );
        const data = await res.json();

        if (!res.ok) {
          console.error("Fetch partners error:", data?.error);
          return { partners: [], total: 0, userLocation: null };
        }

        const raw = data.partners || [];
        const partners = raw.map((p: SuggestedPartner) => ({
          ...p,
          avatar: resolveAvatarUrl(p.avatar),
        }));

        return {
          partners,
          total: data.total || 0,
          userLocation: data.userLocation,
        };
      } catch (error) {
        console.error("Failed to fetch suggested partners:", error);
        return { partners: [], total: 0, userLocation: null };
      }
    };

  const value: AuthContextValue = {
    user,
    role: (user?.role as Role) || "user",
    isAuthenticated: !!user,
    loading,
    login,
    register,
    requestPasswordReset,
    resetPassword,
    logout,
    setUserFromServer,
    refreshUser,
    fetchSuggestedPartners,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
