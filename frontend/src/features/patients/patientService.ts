import api from "../../services/api";

export interface Patient {
  id?: number;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  phone?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Visit {
  id: number;
  patient: number;
  visit_date: string;
  primary_care_physician: string;
  staff_assigned?: string;
  notes: string;
  created_at?: string;
  updated_at?: string;
}

export interface Medication {
  id: number;
  patient: number;
  name: string;
  dosage: string;
  frequency: string;
  created_at?: string;
  updated_at?: string;
}

export interface Allergy {
  id: number;
  patient: number;
  substance: string;
  reaction?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PatientDetail extends Patient {
  id: number;
  medications: Medication[];
  allergies: Allergy[];
  visits: Visit[];
}

export const getPatients = async (): Promise<Patient[]> => {
  const res = await api.get("/patients/");
  return res.data;
};

export const createPatient = async (patient: Patient): Promise<Patient> => {
  const res = await api.post("/patients/", patient);
  return res.data;
};

export const getPatient = async (id: number): Promise<PatientDetail> => {
  const res = await api.get(`/patients/${id}/`);
  return res.data;
};
