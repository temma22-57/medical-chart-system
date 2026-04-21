import { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  createAllergy,
  createMedication,
  createVisit,
  getPatient,
  updateAllergy,
  updateMedication,
  updateVisit,
} from "../features/patients/patientService";
import type { Allergy, Medication, PatientDetail, Visit } from "../features/patients/patientService";

type RecordType = "visits" | "medications" | "allergies";
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
    notes: "Notes",
  },
  medications: {
    name: "Name",
    dosage: "Dosage",
    frequency: "Frequency",
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
    notes: "",
  },
  medications: {
    name: "",
    dosage: "",
    frequency: "",
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

  return patient.allergies.find((record) => record.id === recordId);
}

function valuesFromRecord(recordType: RecordType, record: Visit | Medication | Allergy): FormValues {
  if (recordType === "visits") {
    const visit = record as Visit;
    return {
      visit_date: visit.visit_date,
      primary_care_physician: visit.primary_care_physician,
      staff_assigned: visit.staff_assigned || "",
      notes: visit.notes,
    };
  }

  if (recordType === "medications") {
    const medication = record as Medication;
    return {
      name: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
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

  return "Allergy";
}

function descriptionFor(recordType: RecordType) {
  if (recordType === "visits") {
    return "Capture encounter details, staff attribution, and chart notes for this patient.";
  }

  if (recordType === "medications") {
    return "Document an active medication with dosage and frequency details.";
  }

  return "Track allergy substances and any noted reactions in the patient record.";
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
  const [currentRecord, setCurrentRecord] = useState<Visit | Medication | Allergy | null>(null);
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
          notes: values.notes,
        };
        if (mode === "add") {
          await createVisit(patientId, payload);
        } else {
          await updateVisit(relatedRecordId, payload);
        }
      } else if (recordType === "medications") {
        const payload = {
          name: values.name,
          dosage: values.dosage,
          frequency: values.frequency,
        };
        if (mode === "add") {
          await createMedication(patientId, payload);
        } else {
          await updateMedication(relatedRecordId, payload);
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
    } catch {
      setError("Unable to save this record.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p>Loading record...</p>;
  }

  const recordTitle = titleFor(recordType);
  const fields = Object.entries(fieldLabels[recordType]);
  const patientName = patient ? `${patient.first_name} ${patient.last_name}` : "Patient";
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
                        required
                        value={values[field] || ""}
                        onChange={(event) => setValues({ ...values, [field]: event.target.value })}
                        sx={{
                          gridColumn: { xs: "span 1", md: "1 / -1" },
                          "& .MuiOutlinedInput-root": {
                            backgroundColor: "#f8fcfa",
                          },
                        }}
                      />
                    ) : (
                      <TextField
                        key={field}
                        fullWidth
                        label={label}
                        type={field === "visit_date" ? "date" : "text"}
                        required={!["staff_assigned", "reaction"].includes(field)}
                        value={values[field] || ""}
                        onChange={(event) => setValues({ ...values, [field]: event.target.value })}
                        slotProps={field === "visit_date" ? { inputLabel: { shrink: true } } : undefined}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            backgroundColor: "#f8fcfa",
                          },
                        }}
                      />
                    ),
                  )}
                </Box>

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
