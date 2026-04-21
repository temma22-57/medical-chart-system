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
  createVisitNote,
  getPatient,
  updateVisitNote,
} from "../features/patients/patientService";
import type {
  PatientDetail,
  Visit,
  VisitNote,
} from "../features/patients/patientService";

interface VisitNotesPageProps {
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

function noteAuthorLabel(note: VisitNote) {
  return note.author_display_name || note.author_username;
}

export default function VisitNotesPage({ currentUser }: VisitNotesPageProps) {
  const { id, recordId } = useParams();
  const navigate = useNavigate();
  const patientId = Number(id);
  const visitId = Number(recordId);
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const currentUserNote = useMemo(
    () => visit?.notes.find((note) => note.author === currentUser.id) ?? null,
    [currentUser.id, visit],
  );

  useEffect(() => {
    const loadVisit = async () => {
      if (!Number.isFinite(patientId) || !Number.isFinite(visitId)) {
        setError("Invalid visit route.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const loadedPatient = await getPatient(patientId);
        const loadedVisit = loadedPatient.visits.find((item) => item.id === visitId) ?? null;

        if (!loadedVisit) {
          setError("Unable to find this visit for the selected patient.");
          return;
        }

        const ownNote = loadedVisit.notes.find((note) => note.author === currentUser.id);
        setPatient(loadedPatient);
        setVisit(loadedVisit);
        setContent(ownNote?.content ?? "");
      } catch {
        setError("Unable to load visit notes.");
      } finally {
        setLoading(false);
      }
    };

    loadVisit();
  }, [currentUser.id, patientId, visitId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!visit) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (currentUserNote) {
        await updateVisitNote(currentUserNote.id, { content });
      } else {
        await createVisitNote(visit.id, { content });
      }

      navigate(`/patients/${patientId}`);
    } catch {
      setError("Unable to save your visit note.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p>Loading visit notes...</p>;
  }

  if (error && !visit) {
    return <p>{error}</p>;
  }

  if (!patient || !visit) {
    return <p>Select a visit to manage notes.</p>;
  }

  return (
    <Stack spacing={2} sx={{ textAlign: "left" }}>
      <Button component={RouterLink} to={`/patients/${patientId}`} size="small">
        Back to patient chart
      </Button>

      <Card variant="outlined" sx={notesCardSx}>
        <CardHeader
          title="Visit Notes"
          subheader={`${patient.first_name} ${patient.last_name} - ${visit.visit_date}`}
        />
        <CardContent>
          <Stack spacing={2}>
            <Box>
              <Typography component="h3" variant="h6">
                All Notes
              </Typography>
              {visit.notes.length === 0 ? (
                <Typography sx={{ color: "#c4ccbe" }}>No notes recorded for this visit.</Typography>
              ) : (
                <Stack
                  spacing={1.5}
                  sx={{
                    maxHeight: 260,
                    overflowY: "auto",
                    pr: 1,
                  }}
                >
                  {visit.notes.map((note) => (
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
                label="Your visit note"
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
