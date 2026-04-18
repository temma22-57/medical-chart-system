import api from "../../services/api";

export interface CurrentUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  roles: string[];
}

export interface LoginResponse {
  token: string;
  user: CurrentUser;
  mfa_required: boolean;
}

export interface ManagedUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  roles: string[];
}

export interface ManagedUserPayload {
  username?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role: "Admin" | "Doctor" | "Nurse";
}

export const login = async (
  username: string,
  password: string,
): Promise<LoginResponse> => {
  const res = await api.post("/auth/login/", { username, password });
  localStorage.setItem("authToken", res.data.token);
  return res.data;
};

export const logout = async (): Promise<void> => {
  try {
    await api.post("/auth/logout/");
  } finally {
    localStorage.removeItem("authToken");
  }
};

export const getCurrentUser = async (): Promise<CurrentUser> => {
  const res = await api.get("/auth/me/");
  return res.data;
};

export const hasAuthToken = (): boolean => {
  return Boolean(localStorage.getItem("authToken"));
};

export const getManagedUsers = async (): Promise<ManagedUser[]> => {
  const res = await api.get("/auth/users/");
  return res.data;
};

export const createManagedUser = async (
  user: ManagedUserPayload,
): Promise<ManagedUser> => {
  const res = await api.post("/auth/users/", user);
  return res.data;
};

export const updateManagedUser = async (
  userId: number,
  user: Partial<ManagedUserPayload>,
): Promise<ManagedUser> => {
  const res = await api.patch(`/auth/users/${userId}/`, user);
  return res.data;
};

export const resetManagedUserPassword = async (
  userId: number,
  password: string,
): Promise<void> => {
  await api.post(`/auth/users/${userId}/reset-password/`, { password });
};

export const deleteManagedUser = async (userId: number): Promise<void> => {
  await api.delete(`/auth/users/${userId}/`);
};
