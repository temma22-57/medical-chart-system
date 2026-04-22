import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  getPatientCardOrderPreference,
  updatePatientCardOrderPreference,
} from "../features/auth/authService";
import type { PatientCardKey } from "../features/auth/authService";
import { getPatient } from "../features/patients/patientService";
import type {
  Allergy,
  Diagnosis,
  DiagnosisNote,
  Medication,
  PatientDetail as PatientDetailType,
  Visit,
} from "../features/patients/patientService";

const chartCardSx = {
  backgroundColor: "#242824",
  borderColor: "#3a453b",
  color: "#f4f7f1",
  "& .MuiCardHeader-root": {
    borderBottom: "1px solid #3a453b",
  },
  "& .MuiTypography-root": {
    color: "inherit",
  },
  "& .MuiTypography-colorTextSecondary": {
    color: "#c4ccbe",
  },
  "& .MuiTableCell-root": {
    borderColor: "#3a453b",
    color: "#f4f7f1",
  },
  "& .MuiTableHead-root .MuiTableCell-root": {
    color: "#dfe8d8",
    fontWeight: 700,
  },
  "& .MuiButton-text": {
    color: "#9bd18f",
  },
};

const notesClampSx = {
  display: "-webkit-box",
  maxWidth: 360,
  overflow: "hidden",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: 3,
};

const visitNotesBoxSx = {
  maxHeight: 120,
  maxWidth: 420,
  overflowY: "auto",
  pr: 1,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const defaultCardOrder: PatientCardKey[] = ["medications", "diagnoses", "allergies", "visits"];

const cardLabels: Record<PatientCardKey, string> = {
  medications: "Medications",
  diagnoses: "Diagnoses",
  allergies: "Allergies",
  visits: "Visits",
};

function displayValue(value: string | number | undefined | null) {
  return value === undefined || value === null || value === "" ? "Not recorded" : value;
}

function formatTimestamp(value?: string) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString();
}

function SectionTitle({
  addTo,
  title,
}: {
  addTo: string;
  title: string;
}) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
      <Button component={RouterLink} to={addTo} size="small" variant="contained">
        + Add
      </Button>
      <Typography component="h4" variant="h6">
        {title}
      </Typography>
    </Stack>
  );
}

function EmptyState({ children }: { children: string }) {
  return <Typography sx={{ color: "#c4ccbe" }}>{children}</Typography>;
}

function noteAuthorLabel(note: DiagnosisNote) {
  return note.author_display_name || note.author_username;
}

function VisitsCard({ patientId, visits }: { patientId: number; visits: Visit[] }) {
  return (
    <Card variant="outlined" sx={chartCardSx}>
      <CardHeader title={<SectionTitle addTo={`/patients/${patientId}/visits/new`} title="Visits" />} />
      <CardContent>
        {visits.length === 0 ? (
          <EmptyState>No visits recorded.</EmptyState>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Physician</TableCell>
                <TableCell>Staff</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visits.map((visit) => (
                <TableRow key={visit.id}>
                  <TableCell>{visit.visit_date}</TableCell>
                  <TableCell>{visit.primary_care_physician}</TableCell>
                  <TableCell>{displayValue(visit.staff_assigned)}</TableCell>
                  <TableCell>
                    {visit.notes.length === 0 ? (
                      <Typography sx={{ color: "#c4ccbe" }}>No notes recorded.</Typography>
                    ) : (
                      <Box sx={visitNotesBoxSx}>
                        <Stack spacing={1}>
                          {visit.notes.map((note) => (
                            <Box key={note.id}>
                              <Typography variant="caption" sx={{ color: "#c4ccbe" }}>
                                {note.author_display_name}
                                {note.updated_at ? ` - ${formatTimestamp(note.updated_at)}` : ""}
                              </Typography>
                              <Typography>{note.content}</Typography>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Button
                        component={RouterLink}
                        to={`/patients/${patientId}/visits/${visit.id}/notes`}
                        size="small"
                      >
                        Notes
                      </Button>
                      <Button
                        component={RouterLink}
                        to={`/patients/${patientId}/visits/${visit.id}/edit`}
                        size="small"
                      >
                        Edit
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function MedicationsCard({
  patientId,
  medications,
}: {
  patientId: number;
  medications: Medication[];
}) {
  return (
    <Card variant="outlined" sx={chartCardSx}>
      <CardHeader
        title={<SectionTitle addTo={`/patients/${patientId}/medications/new`} title="Medications" />}
      />
      <CardContent>
        {medications.length === 0 ? (
          <EmptyState>No medications recorded.</EmptyState>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Dosage</TableCell>
                <TableCell>Frequency</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {medications.map((medication) => (
                <TableRow key={medication.id}>
                  <TableCell>{medication.name}</TableCell>
                  <TableCell>{medication.dosage}</TableCell>
                  <TableCell>{medication.frequency}</TableCell>
                  <TableCell>{displayValue(medication.duration)}</TableCell>
                  <TableCell>{medication.is_active ? "Active" : "Inactive"}</TableCell>
                  <TableCell>
                    <Button
                      component={RouterLink}
                      to={`/patients/${patientId}/medications/${medication.id}/edit`}
                      size="small"
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function DiagnosesCard({
  patientId,
  diagnoses,
}: {
  patientId: number;
  diagnoses: Diagnosis[];
}) {
  return (
    <Card variant="outlined" sx={chartCardSx}>
      <CardHeader
        title={<SectionTitle addTo={`/patients/${patientId}/diagnoses/new`} title="Diagnoses" />}
      />
      <CardContent>
        {diagnoses.length === 0 ? (
          <EmptyState>No diagnoses recorded.</EmptyState>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date Diagnosed</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Provider</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {diagnoses.map((diagnosis) => (
                <TableRow key={diagnosis.id}>
                  <TableCell>{diagnosis.name}</TableCell>
                  <TableCell>{diagnosis.status}</TableCell>
                  <TableCell>{diagnosis.date_diagnosed}</TableCell>
                  <TableCell>{displayValue(diagnosis.diagnosis_code)}</TableCell>
                  <TableCell>{displayValue(diagnosis.provider_name)}</TableCell>
                  <TableCell>
                    {diagnosis.notes.length === 0 ? (
                      <Typography sx={{ color: "#c4ccbe" }}>No notes recorded.</Typography>
                    ) : (
                      <Box sx={visitNotesBoxSx}>
                        <Stack spacing={1}>
                          {diagnosis.notes.map((note) => (
                            <Box key={note.id}>
                              <Typography variant="caption" sx={{ color: "#c4ccbe" }}>
                                {noteAuthorLabel(note)}
                                {note.updated_at ? ` - ${formatTimestamp(note.updated_at)}` : ""}
                              </Typography>
                              <Typography sx={notesClampSx}>{note.content}</Typography>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Button
                        component={RouterLink}
                        to={`/patients/${patientId}/diagnoses/${diagnosis.id}/notes`}
                        size="small"
                      >
                        Notes
                      </Button>
                      <Button
                        component={RouterLink}
                        to={`/patients/${patientId}/diagnoses/${diagnosis.id}/edit`}
                        size="small"
                      >
                        Edit
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function AllergiesCard({ patientId, allergies }: { patientId: number; allergies: Allergy[] }) {
  return (
    <Card variant="outlined" sx={chartCardSx}>
      <CardHeader
        title={<SectionTitle addTo={`/patients/${patientId}/allergies/new`} title="Allergies" />}
      />
      <CardContent>
        {allergies.length === 0 ? (
          <EmptyState>No allergies recorded.</EmptyState>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Substance</TableCell>
                <TableCell>Reaction</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allergies.map((allergy) => (
                <TableRow key={allergy.id}>
                  <TableCell>{allergy.substance}</TableCell>
                  <TableCell>{displayValue(allergy.reaction)}</TableCell>
                  <TableCell>
                    <Button
                      component={RouterLink}
                      to={`/patients/${patientId}/allergies/${allergy.id}/edit`}
                      size="small"
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function PatientDetail() {
  const { id } = useParams();
  const patientId = Number(id);
  const [patient, setPatient] = useState<PatientDetailType | null>(null);
  const [cardOrder, setCardOrder] = useState<PatientCardKey[]>(defaultCardOrder);
  const [draftCardOrder, setDraftCardOrder] = useState<PatientCardKey[]>(defaultCardOrder);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [error, setError] = useState("");
  const [preferenceError, setPreferenceError] = useState("");

  useEffect(() => {
    const loadPatient = async () => {
      if (!Number.isFinite(patientId)) {
        setError("Invalid patient id.");
        setPatient(null);
        return;
      }

      setLoading(true);
      setError("");
      setPreferenceError("");

      try {
        const [data, preference] = await Promise.all([
          getPatient(patientId),
          getPatientCardOrderPreference().catch(() => null),
        ]);
        setPatient(data);
        if (preference && isValidCardOrder(preference.card_order)) {
          setCardOrder(preference.card_order);
          setDraftCardOrder(preference.card_order);
        } else {
          setCardOrder(defaultCardOrder);
          setDraftCardOrder(defaultCardOrder);
        }
        if (!preference) {
          setPreferenceError("Using the default table order because saved preferences could not be loaded.");
        }
      } catch {
        setError("Unable to load patient details.");
        setPatient(null);
      } finally {
        setLoading(false);
      }
    };

    loadPatient();
  }, [patientId]);

  if (loading) {
    return <p>Loading patient details...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  if (!patient) {
    return <p>Select a patient to view medical record details.</p>;
  }

  const latestVitals = patient.latest_vitals;
  const orderedCards = buildOrderedCards(cardOrder, patient);

  const moveDraftCard = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= draftCardOrder.length) {
      return;
    }

    const nextOrder = [...draftCardOrder];
    [nextOrder[index], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[index]];
    setDraftCardOrder(nextOrder);
  };

  const openOrderDialog = () => {
    setDraftCardOrder(cardOrder);
    setOrderDialogOpen(true);
  };

  const saveCardOrder = async () => {
    setSavingOrder(true);
    setPreferenceError("");

    try {
      const preference = await updatePatientCardOrderPreference(draftCardOrder);
      const nextOrder = isValidCardOrder(preference.card_order)
        ? preference.card_order
        : defaultCardOrder;
      setCardOrder(nextOrder);
      setDraftCardOrder(nextOrder);
      setOrderDialogOpen(false);
    } catch {
      setPreferenceError("Unable to save table order. Please try again.");
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <Stack spacing={3} sx={{ textAlign: "left" }}>
      <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
        <Button component={RouterLink} to="/patients" size="small">
          Back to patients
        </Button>
        <Button size="small" variant="outlined" onClick={openOrderDialog}>
          Set Table Order
        </Button>
      </Stack>

      {preferenceError && (
        <Paper
          variant="outlined"
          sx={{ backgroundColor: "#fff7e6", borderColor: "#f2d28b", color: "#6b4b00", p: 1.5 }}
        >
          <Typography>{preferenceError}</Typography>
        </Paper>
      )}

      <Paper
        variant="outlined"
        sx={{
          alignItems: "center",
          backgroundColor: "#153f37",
          borderColor: "#2f6d5c",
          color: "#f6fff8",
          display: "flex",
          flexWrap: "wrap",
          gap: 3,
          justifyContent: "space-between",
          p: 2,
        }}
      >
        <Box>
          <Typography component="h2" variant="h5" sx={{ color: "#ffffff", fontWeight: 700 }}>
            {patient.first_name} {patient.last_name}
          </Typography>
          <Typography sx={{ color: "#d8f1e8" }}>DOB: {displayValue(patient.date_of_birth)}</Typography>
          <Typography sx={{ color: "#d8f1e8" }}>Phone: {displayValue(patient.phone)}</Typography>
        </Box>

        <Box sx={{ flex: "1 1 180px", textAlign: "center" }}>
          <Typography variant="caption" sx={{ color: "#bde3d7" }}>Primary Language</Typography>
          <Typography sx={{ color: "#ffffff", fontWeight: 700 }}>
            {displayValue(patient.primary_language)}
          </Typography>
        </Box>

        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="caption" sx={{ color: "#bde3d7" }}>Height</Typography>
            <Typography sx={{ color: "#ffffff" }}>{displayValue(latestVitals?.height)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: "#bde3d7" }}>Weight</Typography>
            <Typography sx={{ color: "#ffffff" }}>{displayValue(latestVitals?.weight)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: "#bde3d7" }}>Blood Pressure</Typography>
            <Typography sx={{ color: "#ffffff" }}>{displayValue(latestVitals?.blood_pressure)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: "#bde3d7" }}>Heart Rate</Typography>
            <Typography sx={{ color: "#ffffff" }}>{displayValue(latestVitals?.heart_rate)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: "#bde3d7" }}>Temperature</Typography>
            <Typography sx={{ color: "#ffffff" }}>{displayValue(latestVitals?.temperature)}</Typography>
          </Box>
        </Stack>
      </Paper>

      <Stack spacing={2}>
        {orderedCards.map(({ key, element }) => (
          <Box key={key}>{element}</Box>
        ))}
      </Stack>

      <Dialog open={orderDialogOpen} onClose={() => setOrderDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Set Table Order</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Typography sx={{ color: "#4a5f58" }}>
              Move tables up or down. This order applies to every patient chart you open.
            </Typography>
            {draftCardOrder.map((cardKey, index) => (
              <Paper
                key={cardKey}
                variant="outlined"
                sx={{
                  alignItems: "center",
                  display: "flex",
                  gap: 1.5,
                  justifyContent: "space-between",
                  p: 1.5,
                }}
              >
                <Typography sx={{ fontWeight: 700 }}>
                  {index + 1}. {cardLabels[cardKey]}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={index === 0}
                    onClick={() => moveDraftCard(index, -1)}
                  >
                    Up
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={index === draftCardOrder.length - 1}
                    onClick={() => moveDraftCard(index, 1)}
                  >
                    Down
                  </Button>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDialogOpen(false)} disabled={savingOrder}>
            Cancel
          </Button>
          <Button onClick={saveCardOrder} disabled={savingOrder} variant="contained">
            {savingOrder ? "Saving..." : "Save Order"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function isValidCardOrder(order: PatientCardKey[]): boolean {
  return order.length === defaultCardOrder.length && defaultCardOrder.every((key) => order.includes(key));
}

function buildOrderedCards(order: PatientCardKey[], patient: PatientDetailType) {
  const cardMap: Record<PatientCardKey, ReactElement> = {
    medications: <MedicationsCard patientId={patient.id} medications={patient.medications} />,
    diagnoses: <DiagnosesCard patientId={patient.id} diagnoses={patient.diagnoses} />,
    allergies: <AllergiesCard patientId={patient.id} allergies={patient.allergies} />,
    visits: <VisitsCard patientId={patient.id} visits={patient.visits} />,
  };

  const safeOrder = isValidCardOrder(order) ? order : defaultCardOrder;
  return safeOrder.map((key) => ({ key, element: cardMap[key] }));
}
