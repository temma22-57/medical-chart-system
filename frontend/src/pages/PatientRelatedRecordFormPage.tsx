import { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  createAllergy,
  createDiagnosis,
  createMedication,
  createVital,
  createVisit,
  getPatient,
  updateAllergy,
  updateDiagnosis,
  updateMedication,
  updateVisit,
} from "../features/patients/patientService";
import type {
  Allergy,
  Diagnosis,
  Medication,
  PatientDetail,
  VitalPayload,
  Visit,
} from "../features/patients/patientService";

type RecordType = "visits" | "medications" | "diagnoses" | "allergies";
type FormValues = Record<string, string>;

interface PatientRelatedRecordFormPageProps {
  recordType: RecordType;
  mode: "add" | "edit";
}

const fieldLabels: Record<RecordType, Record<string, string>> = {
  visits: {
    visit_date: "Visit date",
    primary_care_physician: "Primary care physician",
    staff_assigned: "Staff assigned",
  },
  medications: {
    name: "Name",
    dosage: "Dosage",
    frequency: "Frequency",
    duration: "Duration",
  },
  diagnoses: {
    name: "Name",
    status: "Status",
    date_diagnosed: "Date diagnosed",
    diagnosis_code: "Diagnosis code",
    provider_name: "Provider",
    resolution_date: "Resolution date",
  },
  allergies: {
    substance: "Substance",
    reaction: "Reaction",
  },
};

const initialValues: Record<RecordType, FormValues> = {
  visits: {
    visit_date: "",
    primary_care_physician: "",
    staff_assigned: "",
    height: "",
    weight: "",
    blood_pressure: "",
    heart_rate: "",
    temperature: "",
  },
  medications: {
    name: "",
    dosage: "",
    frequency: "",
    duration: "",
  },
  diagnoses: {
    name: "",
    status: "current",
    date_diagnosed: "",
    diagnosis_code: "",
    provider_name: "",
    resolution_date: "",
  },
  allergies: {
    substance: "",
    reaction: "",
  },
};

function getRecord(patient: PatientDetail, recordType: RecordType, recordId: number) {
  if (recordType === "visits") {
    return patient.visits.find((record) => record.id === recordId);
  }

  if (recordType === "medications") {
    return patient.medications.find((record) => record.id === recordId);
  }

  if (recordType === "diagnoses") {
    return patient.diagnoses.find((record) => record.id === recordId);
  }

  return patient.allergies.find((record) => record.id === recordId);
}

function valuesFromRecord(recordType: RecordType, record: Visit | Medication | Diagnosis | Allergy): FormValues {
  if (recordType === "visits") {
    const visit = record as Visit;
    return {
      visit_date: visit.visit_date,
      primary_care_physician: visit.primary_care_physician,
      staff_assigned: visit.staff_assigned || "",
    };
  }

  if (recordType === "medications") {
    const medication = record as Medication;
    return {
      name: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      duration: medication.duration || "",
    };
  }

  if (recordType === "diagnoses") {
    const diagnosis = record as Diagnosis;
    return {
      name: diagnosis.name,
      status: diagnosis.status,
      date_diagnosed: diagnosis.date_diagnosed,
      diagnosis_code: diagnosis.diagnosis_code || "",
      provider_name: diagnosis.provider_name || "",
      resolution_date: diagnosis.resolution_date || "",
    };
  }

  const allergy = record as Allergy;
  return {
    substance: allergy.substance,
    reaction: allergy.reaction || "",
  };
}

function titleFor(recordType: RecordType) {
  if (recordType === "visits") {
    return "Visit";
  }

  if (recordType === "medications") {
    return "Medication";
  }

  if (recordType === "diagnoses") {
    return "Diagnosis";
  }

  return "Allergy";
}

function descriptionFor(recordType: RecordType) {
  if (recordType === "visits") {
    return "Capture encounter details, staff attribution, and chart notes for this patient.";
  }

  if (recordType === "medications") {
    return "Document an active medication with dosage, frequency, and duration details.";
  }

  if (recordType === "diagnoses") {
    return "Track diagnosis status, dates, provider details, and chart notes.";
  }

  return "Track allergy substances and any noted reactions in the patient record.";
}

const vitalFieldLabels: Record<keyof VitalPayload, string> = {
  height: "Height",
  weight: "Weight",
  blood_pressure: "Blood pressure",
  heart_rate: "Heart rate",
  temperature: "Temperature",
};

const vitalFields = Object.entries(vitalFieldLabels) as [keyof VitalPayload, string][];

function buildOptionalVitalPayload(values: FormValues): VitalPayload | null {
  const vitalValues = vitalFields.map(([field]) => String(values[field] || "").trim());
  const hasAnyVitals = vitalValues.some(Boolean);

  if (!hasAnyVitals) {
    return null;
  }

  if (!vitalValues.every(Boolean)) {
    throw new Error("complete_vitals_required");
  }

  return {
    height: values.height.trim(),
    weight: values.weight.trim(),
    blood_pressure: values.blood_pressure.trim(),
    heart_rate: Number(values.heart_rate),
    temperature: values.temperature.trim(),
  };
}

export default function PatientRelatedRecordFormPage({
  recordType,
  mode,
}: PatientRelatedRecordFormPageProps) {
  const { id, recordId } = useParams();
  const navigate = useNavigate();
  const patientId = Number(id);
  const relatedRecordId = Number(recordId);
  const [values, setValues] = useState<FormValues>(initialValues[recordType]);
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [currentRecord, setCurrentRecord] = useState<Visit | Medication | Diagnosis | Allergy | null>(null);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPageData = async () => {
      if (!Number.isFinite(patientId)) {
        setError("Invalid record route.");
        setLoading(false);
        return;
      }

      if (mode !== "edit") {
        setValues(initialValues[recordType]);
      }

      if (mode === "edit" && !Number.isFinite(relatedRecordId)) {
        setError("Invalid record route.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const loadedPatient = await getPatient(patientId);
        setPatient(loadedPatient);

        if (mode !== "edit") {
          setCurrentRecord(null);
          return;
        }

        const record = getRecord(loadedPatient, recordType, relatedRecordId);

        if (!record) {
          setError("Unable to find this record for the selected patient.");
          return;
        }

        setCurrentRecord(record);
        setValues(valuesFromRecord(recordType, record));
      } catch {
        setError(mode === "edit" ? "Unable to load record." : "Unable to load patient.");
      } finally {
        setLoading(false);
      }
    };

    loadPageData();
  }, [mode, patientId, recordType, relatedRecordId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (mode === "edit" && !window.confirm("Save these changes to the patient record?")) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (recordType === "visits") {
        const payload = {
          visit_date: values.visit_date,
          primary_care_physician: values.primary_care_physician,
          staff_assigned: values.staff_assigned,
        };
        if (mode === "add") {
          const visit = await createVisit(patientId, payload);
          const vitalPayload = buildOptionalVitalPayload(values);

          if (vitalPayload) {
            await createVital(visit.id, vitalPayload);
          }
        } else {
          await updateVisit(relatedRecordId, payload);
        }
      } else if (recordType === "medications") {
        const payload = {
          name: values.name,
          dosage: values.dosage,
          frequency: values.frequency,
          duration: values.duration,
        };
        if (mode === "add") {
          await createMedication(patientId, payload);
        } else {
          await updateMedication(relatedRecordId, payload);
        }
      } else if (recordType === "diagnoses") {
        const payload = {
          name: values.name,
          status: values.status,
          date_diagnosed: values.date_diagnosed,
          diagnosis_code: values.diagnosis_code,
          provider_name: values.provider_name,
          resolution_date: values.resolution_date || undefined,
        };
        if (mode === "add") {
          await createDiagnosis(patientId, payload);
        } else {
          await updateDiagnosis(relatedRecordId, payload);
        }
      } else {
        const payload = {
          substance: values.substance,
          reaction: values.reaction,
        };
        if (mode === "add") {
          await createAllergy(patientId, payload);
        } else {
          await updateAllergy(relatedRecordId, payload);
        }
      }

      navigate(`/patients/${patientId}`);
    } catch (caughtError) {
      if (
        caughtError instanceof Error &&
        caughtError.message === "complete_vitals_required"
      ) {
        setError("If you enter any initial vitals, please complete all vitals fields.");
      } else {
        setError("Unable to save this record.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p>Loading record...</p>;
  }

  const recordTitle = titleFor(recordType);
  const fields = Object.entries(fieldLabels[recordType]);
  const optionalFields = [
    "staff_assigned",
    "reaction",
    "duration",
    "diagnosis_code",
    "provider_name",
    "resolution_date",
    "notes",
  ];
  const patientName = patient ? `${patient.first_name} ${patient.last_name}` : "Patient";
  const showInitialVitalsFields = recordType === "visits" && mode === "add";
  const visitWithoutVitals =
    recordType === "visits" &&
    mode === "edit" &&
    currentRecord &&
    (currentRecord as Visit).vitals.length === 0;

  return (
    <Stack spacing={3} sx={{ textAlign: "left" }}>
      <Button component={RouterLink} to={`/patients/${patientId}`} size="small" sx={{ alignSelf: "flex-start" }}>
        Back to patient chart
      </Button>

      <Paper
        variant="outlined"
        sx={{
          background:
            "linear-gradient(135deg, rgba(21,63,55,1) 0%, rgba(31,97,86,1) 52%, rgba(88,140,128,1) 100%)",
          borderColor: "#2f6d5c",
          color: "#f6fff8",
          overflow: "hidden",
          p: { xs: 2.5, md: 3 },
          position: "relative",
        }}
      >
        <Box
          sx={{
            background:
              "radial-gradient(circle at top right, rgba(255,255,255,0.16), transparent 42%)",
            inset: 0,
            position: "absolute",
          }}
        />
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{ justifyContent: "space-between", position: "relative" }}
        >
          <Box sx={{ maxWidth: 640 }}>
            <Chip
              label={mode === "add" ? `Add ${recordTitle}` : `Edit ${recordTitle}`}
              sx={{
                backgroundColor: "rgba(255,255,255,0.14)",
                color: "#f6fff8",
                fontWeight: 700,
                mb: 1.5,
              }}
            />
            <Typography component="h2" variant="h4" sx={{ color: "#ffffff", fontWeight: 700 }}>
              {recordTitle} details for {patientName}
            </Typography>
            <Typography sx={{ color: "#d8f1e8", maxWidth: 560, mt: 1 }}>
              {descriptionFor(recordType)}
            </Typography>
          </Box>

          <Paper
            elevation={0}
            sx={{
              alignSelf: "flex-start",
              backgroundColor: "rgba(7, 28, 24, 0.24)",
              border: "1px solid rgba(216, 241, 232, 0.18)",
              color: "#ffffff",
              minWidth: 180,
              px: 2,
              py: 1.5,
            }}
          >
            <Typography variant="caption" sx={{ color: "#bde3d7" }}>
              Patient
            </Typography>
            <Typography sx={{ color: "#ffffff", fontWeight: 700 }}>
              {patientName}
            </Typography>
          </Paper>
        </Stack>
      </Paper>

      {error && (
        <Paper
          variant="outlined"
          sx={{ backgroundColor: "#fff4f4", borderColor: "#e6b3b3", color: "#7a1f1f", p: 2 }}
        >
          <Typography>{error}</Typography>
        </Paper>
      )}

      <Card
        variant="outlined"
        sx={{
          backgroundColor: "#242824",
          borderColor: "#3a453b",
          color: "#f4f7f1",
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h5" sx={{ color: "#f4f7f1", fontWeight: 700 }}>
                {mode === "add" ? `Add ${recordTitle}` : `Edit ${recordTitle}`}
              </Typography>
              <Typography sx={{ color: "#c4ccbe", mt: 0.5 }}>
                {mode === "add"
                  ? "Fill out the form below to add this record to the patient chart."
                  : "Update the fields below and save when you are ready to apply changes."}
              </Typography>
            </Box>

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <Box
                  sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: {
                      xs: "1fr",
                      md: recordType === "visits" ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))",
                    },
                  }}
                >
                  {fields.map(([field, label]) =>
                    field === "notes" ? (
                      <TextField
                        key={field}
                        fullWidth
                        label={label}
                        multiline
                        minRows={5}
                        required={!optionalFields.includes(field)}
                        value={values[field] || ""}
                        onChange={(event) => setValues({ ...values, [field]: event.target.value })}
                        sx={{
                          gridColumn: { xs: "span 1", md: "1 / -1" },
                          "& .MuiOutlinedInput-root": {
                            backgroundColor: "#f8fcfa",
                          },
                        }}
                      />
                    ) : field === "status" ? (
                      <TextField
                        key={field}
                        fullWidth
                        select
                        label={label}
                        required
                        value={values[field] || "current"}
                        onChange={(event) => setValues({ ...values, [field]: event.target.value })}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            backgroundColor: "#f8fcfa",
                          },
                        }}
                      >
                        <MenuItem value="current">Current</MenuItem>
                        <MenuItem value="chronic">Chronic</MenuItem>
                        <MenuItem value="remission">Remission</MenuItem>
                        <MenuItem value="resolved">Resolved</MenuItem>
                      </TextField>
                    ) : (
                      <TextField
                        key={field}
                        fullWidth
                        label={label}
                        type={["visit_date", "date_diagnosed", "resolution_date"].includes(field) ? "date" : "text"}
                        required={!optionalFields.includes(field)}
                        value={values[field] || ""}
                        onChange={(event) => setValues({ ...values, [field]: event.target.value })}
                        slotProps={
                          ["visit_date", "date_diagnosed", "resolution_date"].includes(field)
                            ? { inputLabel: { shrink: true } }
                            : undefined
                        }
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            backgroundColor: "#f8fcfa",
                          },
                        }}
                      />
                    ),
                  )}
                </Box>

                {showInitialVitalsFields && (
                  <Paper
                    variant="outlined"
                    sx={{
                      backgroundColor: "rgba(248, 252, 250, 0.08)",
                      borderColor: "#3a453b",
                      p: 2,
                    }}
                  >
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="h6" sx={{ color: "#f4f7f1", fontWeight: 700 }}>
                          Initial Vitals
                        </Typography>
                        <Typography sx={{ color: "#c4ccbe", mt: 0.5 }}>
                          Leave all vitals blank to create the visit without vitals, or complete every vitals field to save an initial entry.
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "grid",
                          gap: 2,
                          gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
                        }}
                      >
                        {vitalFields.map(([field, label]) => (
                          <TextField
                            key={field}
                            fullWidth
                            label={label}
                            type={field === "blood_pressure" ? "text" : "number"}
                            value={values[field] || ""}
                            onChange={(event) => setValues({ ...values, [field]: event.target.value })}
                            slotProps={{
                              htmlInput: {
                                min: field === "heart_rate" ? 0 : undefined,
                                step: field === "heart_rate" ? 1 : 0.01,
                              },
                            }}
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                backgroundColor: "#f8fcfa",
                              },
                            }}
                          />
                        ))}
                      </Box>
                    </Stack>
                  </Paper>
                )}

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  sx={{ alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between" }}
                >
                  <Stack spacing={1}>
                    {mode === "edit" && (
                      <Typography sx={{ color: "#c4ccbe" }}>
                        Saving edits requires a confirmation step after you submit this form.
                      </Typography>
                    )}
                    {visitWithoutVitals && (
                      <Typography sx={{ color: "#c4ccbe" }}>
                        No vitals have been recorded for this visit.{" "}
                        <Button
                          component={RouterLink}
                          to={`/patients/${patientId}/visits/${relatedRecordId}/vitals/new`}
                          size="small"
                          sx={{ color: "#9bd18f", minWidth: 0, p: 0, verticalAlign: "baseline" }}
                        >
                          Add Vitals
                        </Button>
                      </Typography>
                    )}
                  </Stack>

                  <Button
                    type="submit"
                    disabled={saving}
                    variant="contained"
                    sx={{
                      alignSelf: { xs: "stretch", sm: "flex-start" },
                      backgroundColor: "#9bd18f",
                      color: "#122017",
                      fontWeight: 700,
                      minWidth: 180,
                      "&:hover": {
                        backgroundColor: "#b3e3a8",
                      },
                    }}
                  >
                    {saving ? "Saving..." : mode === "add" ? `Add ${recordTitle}` : "Review and Save"}
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
