import api from "../../services/api";

export interface CurrentUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  roles: string[];
}

export interface MfaMethod {
  type: "email";
  label: string;
  masked_destination: string;
}

export interface LoginResponse {
  token?: string;
  user?: CurrentUser;
  mfa_required: boolean;
  warning?: string;
  challenge_id?: string;
  next_step?: "verify" | "delivery_failed";
  detail?: string;
  available_methods?: MfaMethod[];
  selected_method?: MfaMethod | null;
}

export interface ManagedUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  roles: string[];
}

export interface ManagedUserPayload {
  username?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  role: "Admin" | "Doctor" | "Nurse";
}

export type PatientCardKey = "medications" | "diagnoses" | "allergies" | "visits";

export interface PatientCardOrderPreference {
  card_order: PatientCardKey[];
}

export const login = async (
  username: string,
  password: string,
): Promise<LoginResponse> => {
  const res = await api.post("/auth/login/", { username, password });
  if (res.data.token) {
    localStorage.setItem("authToken", res.data.token);
  }
  return res.data;
};

export const verifyMfaCode = async (
  challengeId: string,
  code: string,
): Promise<LoginResponse> => {
  const res = await api.post("/auth/mfa/verify/", {
    challenge_id: challengeId,
    code,
  });
  if (res.data.token) {
    localStorage.setItem("authToken", res.data.token);
  }
  return res.data;
};

export const resendMfaCode = async (challengeId: string): Promise<LoginResponse> => {
  const res = await api.post("/auth/mfa/resend/", {
    challenge_id: challengeId,
  });
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

export const getPatientCardOrderPreference =
  async (): Promise<PatientCardOrderPreference> => {
    const res = await api.get("/auth/preferences/patient-card-order/");
    return res.data;
  };

export const updatePatientCardOrderPreference = async (
  cardOrder: PatientCardKey[],
): Promise<PatientCardOrderPreference> => {
  const res = await api.patch("/auth/preferences/patient-card-order/", {
    card_order: cardOrder,
  });
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
