import api from "../../services/api";

export interface Patient {
  id?: number;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  phone?: string;
  primary_language?: string;
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
  notes: VisitNote[];
  vitals: Vital[];
  created_at?: string;
  updated_at?: string;
}

export interface VisitNote {
  id: number;
  visit: number;
  author: number;
  author_username: string;
  author_display_name: string;
  content: string;
  can_edit: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Vital {
  id: number;
  visit: number;
  patient: number;
  height: string;
  weight: string;
  blood_pressure: string;
  heart_rate: number;
  temperature: string;
  collected_at: string;
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

export interface Diagnosis {
  id: number;
  patient: number;
  name: string;
  status: string;
  date_diagnosed: string;
  diagnosis_code?: string;
  provider_name?: string;
  resolution_date?: string | null;
  notes?: string;
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
  diagnoses: Diagnosis[];
  allergies: Allergy[];
  visits: Visit[];
  latest_vitals: Vital | null;
}

export interface VisitPayload {
  visit_date: string;
  primary_care_physician: string;
  staff_assigned?: string;
}

export interface VisitNotePayload {
  content: string;
}

export interface MedicationPayload {
  name: string;
  dosage: string;
  frequency: string;
}

export interface DiagnosisPayload {
  name: string;
  status: string;
  date_diagnosed: string;
  diagnosis_code?: string;
  provider_name?: string;
  resolution_date?: string;
  notes?: string;
}

export interface AllergyPayload {
  substance: string;
  reaction?: string;
}

export interface VitalPayload {
  height: string;
  weight: string;
  blood_pressure: string;
  heart_rate: number;
  temperature: string;
}

export const getPatients = async (): Promise<Patient[]> => {
  const res = await api.get("/patients/");
  return res.data;
};

export const searchPatients = async (search: string): Promise<Patient[]> => {
  const res = await api.get("/patients/", {
    params: { search },
  });
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

export const createVisit = async (
  patientId: number,
  visit: VisitPayload,
): Promise<Visit> => {
  const res = await api.post(`/patients/${patientId}/visits/`, visit);
  return res.data;
};

export const updateVisit = async (
  visitId: number,
  visit: Partial<VisitPayload>,
): Promise<Visit> => {
  const res = await api.patch(`/visits/${visitId}/`, visit);
  return res.data;
};

export const createVisitNote = async (
  visitId: number,
  note: VisitNotePayload,
): Promise<VisitNote> => {
  const res = await api.post(`/visits/${visitId}/notes/`, note);
  return res.data;
};

export const updateVisitNote = async (
  noteId: number,
  note: Partial<VisitNotePayload>,
): Promise<VisitNote> => {
  const res = await api.patch(`/visit-notes/${noteId}/`, note);
  return res.data;
};

export const createMedication = async (
  patientId: number,
  medication: MedicationPayload,
): Promise<Medication> => {
  const res = await api.post(`/patients/${patientId}/medications/`, medication);
  return res.data;
};

export const updateMedication = async (
  medicationId: number,
  medication: Partial<MedicationPayload>,
): Promise<Medication> => {
  const res = await api.patch(`/medications/${medicationId}/`, medication);
  return res.data;
};

export const createDiagnosis = async (
  patientId: number,
  diagnosis: DiagnosisPayload,
): Promise<Diagnosis> => {
  const res = await api.post(`/patients/${patientId}/diagnoses/`, diagnosis);
  return res.data;
};

export const updateDiagnosis = async (
  diagnosisId: number,
  diagnosis: Partial<DiagnosisPayload>,
): Promise<Diagnosis> => {
  const res = await api.patch(`/diagnoses/${diagnosisId}/`, diagnosis);
  return res.data;
};

export const createAllergy = async (
  patientId: number,
  allergy: AllergyPayload,
): Promise<Allergy> => {
  const res = await api.post(`/patients/${patientId}/allergies/`, allergy);
  return res.data;
};

export const updateAllergy = async (
  allergyId: number,
  allergy: Partial<AllergyPayload>,
): Promise<Allergy> => {
  const res = await api.patch(`/allergies/${allergyId}/`, allergy);
  return res.data;
};

export const createVital = async (
  visitId: number,
  vital: VitalPayload,
): Promise<Vital> => {
  const res = await api.post(`/visits/${visitId}/vitals/`, vital);
  return res.data;
};
