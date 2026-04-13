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
