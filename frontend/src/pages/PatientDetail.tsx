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
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  getPatientCardOrderPreference,
  updatePatientCardOrderPreference,
} from "../features/auth/authService";
import type { PatientCardKey } from "../features/auth/authService";
import {
  deleteAllergy,
  deleteDiagnosis,
  deleteMedication,
  deleteVisit,
  getPatient,
  updateDiagnosis,
  updateMedication,
} from "../features/patients/patientService";
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

const statusSelectSx = {
  minWidth: 120,
  "& .MuiInputBase-input": {
    color: "#f4f7f1",
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "#5d715f",
  },
  "& .MuiSelect-icon": {
    color: "#f4f7f1",
  },
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

function DeleteAction({
  canDelete,
  onDelete,
}: {
  canDelete: boolean;
  onDelete: () => void;
}) {
  if (!canDelete) {
    return null;
  }

  return (
    <Button color="error" size="small" onClick={onDelete}>
      Delete
    </Button>
  );
}

function VisitsCard({
  patientId,
  visits,
  onDelete,
}: {
  patientId: number;
  visits: Visit[];
  onDelete: (visit: Visit) => void;
}) {
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
                      <DeleteAction
                        canDelete={visit.can_delete}
                        onDelete={() => onDelete(visit)}
                      />
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
  onDelete,
  onStatusChange,
}: {
  patientId: number;
  medications: Medication[];
  onDelete: (medication: Medication) => void;
  onStatusChange: (medication: Medication, isActive: boolean) => void;
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
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      value={medication.is_active ? "true" : "false"}
                      onChange={(event) => onStatusChange(medication, event.target.value === "true")}
                      sx={statusSelectSx}
                    >
                      <MenuItem value="true">Active</MenuItem>
                      <MenuItem value="false">Inactive</MenuItem>
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <DeleteAction
                      canDelete={medication.can_delete}
                      onDelete={() => onDelete(medication)}
                    />
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
  onDelete,
  onStatusChange,
}: {
  patientId: number;
  diagnoses: Diagnosis[];
  onDelete: (diagnosis: Diagnosis) => void;
  onStatusChange: (diagnosis: Diagnosis, status: string) => void;
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
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      value={diagnosis.status}
                      onChange={(event) => onStatusChange(diagnosis, event.target.value)}
                      sx={{ ...statusSelectSx, minWidth: 135 }}
                    >
                      <MenuItem value="current">Current</MenuItem>
                      <MenuItem value="chronic">Chronic</MenuItem>
                      <MenuItem value="remission">Remission</MenuItem>
                      <MenuItem value="resolved">Resolved</MenuItem>
                    </TextField>
                  </TableCell>
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
                      <DeleteAction
                        canDelete={diagnosis.can_delete}
                        onDelete={() => onDelete(diagnosis)}
                      />
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

function AllergiesCard({
  patientId,
  allergies,
  onDelete,
}: {
  patientId: number;
  allergies: Allergy[];
  onDelete: (allergy: Allergy) => void;
}) {
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
                    <DeleteAction
                      canDelete={allergy.can_delete}
                      onDelete={() => onDelete(allergy)}
                    />
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
  const [mutationError, setMutationError] = useState("");
  const [preferenceError, setPreferenceError] = useState("");

  const refreshPatient = async () => {
    const data = await getPatient(patientId);
    setPatient(data);
  };

  useEffect(() => {
    const loadPatient = async () => {
      if (!Number.isFinite(patientId)) {
        setError("Invalid patient id.");
        setPatient(null);
        return;
      }

      setLoading(true);
      setError("");
      setMutationError("");
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

  const handleMedicationStatusChange = async (medication: Medication, isActive: boolean) => {
    if (medication.is_active === isActive) {
      return;
    }

    setMutationError("");
    try {
      await updateMedication(medication.id, { is_active: isActive });
      await refreshPatient();
    } catch {
      setMutationError("Unable to update medication status.");
    }
  };

  const handleDiagnosisStatusChange = async (diagnosis: Diagnosis, nextStatus: string) => {
    if (diagnosis.status === nextStatus) {
      return;
    }

    setMutationError("");
    try {
      await updateDiagnosis(diagnosis.id, { status: nextStatus });
      await refreshPatient();
    } catch {
      setMutationError("Unable to update diagnosis status.");
    }
  };

  const confirmRecentDelete = (recordName: string) =>
    window.confirm(
      `Delete this ${recordName}? Only records you created less than 8 hours ago can be deleted.`,
    );

  const handleVisitDelete = async (visit: Visit) => {
    if (!confirmRecentDelete("visit")) {
      return;
    }

    setMutationError("");
    try {
      await deleteVisit(visit.id);
      await refreshPatient();
    } catch {
      setMutationError("Unable to delete visit.");
    }
  };

  const handleMedicationDelete = async (medication: Medication) => {
    if (!confirmRecentDelete("medication")) {
      return;
    }

    setMutationError("");
    try {
      await deleteMedication(medication.id);
      await refreshPatient();
    } catch {
      setMutationError("Unable to delete medication.");
    }
  };

  const handleDiagnosisDelete = async (diagnosis: Diagnosis) => {
    if (!confirmRecentDelete("diagnosis")) {
      return;
    }

    setMutationError("");
    try {
      await deleteDiagnosis(diagnosis.id);
      await refreshPatient();
    } catch {
      setMutationError("Unable to delete diagnosis.");
    }
  };

  const handleAllergyDelete = async (allergy: Allergy) => {
    if (!confirmRecentDelete("allergy")) {
      return;
    }

    setMutationError("");
    try {
      await deleteAllergy(allergy.id);
      await refreshPatient();
    } catch {
      setMutationError("Unable to delete allergy.");
    }
  };

  const orderedCards = buildOrderedCards(cardOrder, patient, {
    onAllergyDelete: handleAllergyDelete,
    onDiagnosisDelete: handleDiagnosisDelete,
    onDiagnosisStatusChange: handleDiagnosisStatusChange,
    onMedicationDelete: handleMedicationDelete,
    onMedicationStatusChange: handleMedicationStatusChange,
    onVisitDelete: handleVisitDelete,
  });

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

      {mutationError && (
        <Paper
          variant="outlined"
          sx={{ backgroundColor: "#fdecec", borderColor: "#e4a3a3", color: "#7a1f1f", p: 1.5 }}
        >
          <Typography>{mutationError}</Typography>
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

type PatientCardActions = {
  onAllergyDelete: (allergy: Allergy) => void;
  onDiagnosisDelete: (diagnosis: Diagnosis) => void;
  onDiagnosisStatusChange: (diagnosis: Diagnosis, status: string) => void;
  onMedicationDelete: (medication: Medication) => void;
  onMedicationStatusChange: (medication: Medication, isActive: boolean) => void;
  onVisitDelete: (visit: Visit) => void;
};

function buildOrderedCards(
  order: PatientCardKey[],
  patient: PatientDetailType,
  actions: PatientCardActions,
) {
  const cardMap: Record<PatientCardKey, ReactElement> = {
    medications: (
      <MedicationsCard
        patientId={patient.id}
        medications={patient.medications}
        onDelete={actions.onMedicationDelete}
        onStatusChange={actions.onMedicationStatusChange}
      />
    ),
    diagnoses: (
      <DiagnosesCard
        patientId={patient.id}
        diagnoses={patient.diagnoses}
        onDelete={actions.onDiagnosisDelete}
        onStatusChange={actions.onDiagnosisStatusChange}
      />
    ),
    allergies: (
      <AllergiesCard
        patientId={patient.id}
        allergies={patient.allergies}
        onDelete={actions.onAllergyDelete}
      />
    ),
    visits: (
      <VisitsCard
        patientId={patient.id}
        visits={patient.visits}
        onDelete={actions.onVisitDelete}
      />
    ),
  };

  const safeOrder = isValidCardOrder(order) ? order : defaultCardOrder;
  return safeOrder.map((key) => ({ key, element: cardMap[key] }));
}
