import api from "../../services/api";

export interface Patient {
  id?: number;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
}

export const getPatients = async (): Promise<Patient[]> => {
  const res = await api.get("/patients/");
  return res.data;
};

export const createPatient = async (patient: Patient): Promise<Patient> => {
  const res = await api.post("/patients/", patient);
  return res.data;
};
