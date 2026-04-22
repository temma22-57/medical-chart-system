import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { CurrentUser } from "../features/auth/authService";
import {
  createDiagnosisNote,
  getPatient,
  updateDiagnosisNote,
} from "../features/patients/patientService";
import type {
  Diagnosis,
  DiagnosisNote,
  PatientDetail,
} from "../features/patients/patientService";

interface DiagnosisNotesPageProps {
  currentUser: CurrentUser;
}

const notesCardSx = {
  backgroundColor: "#242824",
  borderColor: "#3a453b",
  color: "#f4f7f1",
  "& .MuiCardHeader-root": {
    borderBottom: "1px solid #3a453b",
  },
  "& .MuiTypography-root": {
    color: "inherit",
  },
  "& .MuiInputBase-root": {
    backgroundColor: "#f7faf5",
  },
};

function formatTimestamp(value?: string) {
  if (!value) {
    return "Not saved yet";
  }

  return new Date(value).toLocaleString();
}

function noteAuthorLabel(note: DiagnosisNote) {
  return note.author_display_name || note.author_username;
}

export default function DiagnosisNotesPage({ currentUser }: DiagnosisNotesPageProps) {
  const { id, recordId } = useParams();
  const navigate = useNavigate();
  const patientId = Number(id);
  const diagnosisId = Number(recordId);
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const currentUserNote = useMemo(
    () => diagnosis?.notes.find((note) => note.author === currentUser.id) ?? null,
    [currentUser.id, diagnosis],
  );

  useEffect(() => {
    const loadDiagnosis = async () => {
      if (!Number.isFinite(patientId) || !Number.isFinite(diagnosisId)) {
        setError("Invalid diagnosis route.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const loadedPatient = await getPatient(patientId);
        const loadedDiagnosis = loadedPatient.diagnoses.find((item) => item.id === diagnosisId) ?? null;

        if (!loadedDiagnosis) {
          setError("Unable to find this diagnosis for the selected patient.");
          return;
        }

        const ownNote = loadedDiagnosis.notes.find((note) => note.author === currentUser.id);
        setPatient(loadedPatient);
        setDiagnosis(loadedDiagnosis);
        setContent(ownNote?.content ?? "");
      } catch {
        setError("Unable to load diagnosis notes.");
      } finally {
        setLoading(false);
      }
    };

    loadDiagnosis();
  }, [currentUser.id, diagnosisId, patientId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!diagnosis) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (currentUserNote) {
        await updateDiagnosisNote(currentUserNote.id, { content });
      } else {
        await createDiagnosisNote(diagnosis.id, { content });
      }

      navigate(`/patients/${patientId}`);
    } catch {
      setError("Unable to save your diagnosis note.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p>Loading diagnosis notes...</p>;
  }

  if (error && !diagnosis) {
    return <p>{error}</p>;
  }

  if (!patient || !diagnosis) {
    return <p>Select a diagnosis to manage notes.</p>;
  }

  return (
    <Stack spacing={2} sx={{ textAlign: "left" }}>
      <Button component={RouterLink} to={`/patients/${patientId}`} size="small">
        Back to patient chart
      </Button>

      <Card variant="outlined" sx={notesCardSx}>
        <CardHeader
          title="Diagnosis Notes"
          subheader={`${patient.first_name} ${patient.last_name} - ${diagnosis.name}`}
        />
        <CardContent>
          <Stack spacing={2}>
            <Box>
              <Typography component="h3" variant="h6">
                All Notes
              </Typography>
              {diagnosis.notes.length === 0 ? (
                <Typography sx={{ color: "#c4ccbe" }}>No notes recorded for this diagnosis.</Typography>
              ) : (
                <Stack
                  spacing={1.5}
                  sx={{
                    maxHeight: 260,
                    overflowY: "auto",
                    pr: 1,
                  }}
                >
                  {diagnosis.notes.map((note) => (
                    <Box key={note.id}>
                      <Typography variant="caption" sx={{ color: "#c4ccbe" }}>
                        {noteAuthorLabel(note)} - updated {formatTimestamp(note.updated_at)}
                        {note.author === currentUser.id ? " - your note" : ""}
                      </Typography>
                      <Typography sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {note.content}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>

            <Box component="form" onSubmit={handleSubmit}>
              <Typography component="h3" variant="h6">
                {currentUserNote ? "Edit Your Note" : "Add Your Note"}
              </Typography>
              <TextField
                label="Your diagnosis note"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                fullWidth
                multiline
                minRows={5}
                margin="normal"
                required
              />
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? "Saving..." : currentUserNote ? "Save Note" : "Add Note"}
              </Button>
              {error && <Typography sx={{ mt: 1, color: "#ffd8d8" }}>{error}</Typography>}
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
