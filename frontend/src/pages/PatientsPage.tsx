import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { getPatients } from "../features/patients/patientService";
import type { CurrentUser } from "../features/auth/authService";
import type { Patient } from "../features/patients/patientService";

interface PatientsPageProps {
  currentUser: CurrentUser;
}

export default function PatientsPage({ currentUser }: PatientsPageProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canCreatePatients = currentUser.roles.includes("Doctor");
  const userDisplayName =
    `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username;

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getPatients();
      setPatients(data);
    } catch {
      setError("Unable to load patients.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={3} sx={{ textAlign: "left" }}>
      <Paper
        variant="outlined"
        sx={{
          background:
            "linear-gradient(135deg, rgba(21,63,55,1) 0%, rgba(31,97,86,1) 52%, rgba(88,140,128,1) 100%)",
          borderColor: "#2f6d5c",
          color: "#f6fff8",
          overflow: "hidden",
          p: { xs: 2.5, md: 3.5 },
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
          spacing={3}
          sx={{ justifyContent: "space-between", position: "relative" }}
        >
          <Box sx={{ maxWidth: 640 }}>
            <Chip
              label={canCreatePatients ? "Doctor Workspace" : "Nurse Workspace"}
              sx={{
                backgroundColor: "rgba(255,255,255,0.14)",
                color: "#f6fff8",
                fontWeight: 700,
                mb: 1.5,
              }}
            />
            <Typography component="h2" variant="h4" sx={{ color: "#ffffff", fontWeight: 700 }}>
              Welcome back, {userDisplayName}
            </Typography>
            <Typography sx={{ color: "#d8f1e8", maxWidth: 560, mt: 1 }}>
              Review patient charts, jump into recent records, and keep the day moving with a
              cleaner front door to the charting workflow.
            </Typography>
          </Box>

          <Stack
            direction={{ xs: "row", md: "column" }}
            spacing={1.5}
            sx={{ alignItems: { xs: "stretch", md: "flex-end" }, minWidth: { md: 220 } }}
          >
            <Paper
              elevation={0}
              sx={{
                backgroundColor: "rgba(7, 28, 24, 0.24)",
                border: "1px solid rgba(216, 241, 232, 0.18)",
                color: "#ffffff",
                minWidth: 140,
                px: 2,
                py: 1.5,
              }}
            >
              <Typography variant="caption" sx={{ color: "#bde3d7" }}>
                Total Patients
              </Typography>
              <Typography variant="h5" sx={{ color: "#ffffff", fontWeight: 700 }}>
                {patients.length}
              </Typography>
            </Paper>

            {canCreatePatients ? (
              <Button
                component={RouterLink}
                to="/patients/new"
                variant="contained"
                sx={{
                  backgroundColor: "#f4f7f1",
                  color: "#153f37",
                  fontWeight: 700,
                  px: 2,
                  "&:hover": {
                    backgroundColor: "#ffffff",
                  },
                }}
              >
                Add Patient
              </Button>
            ) : (
              <Typography sx={{ color: "#d8f1e8", maxWidth: 260 }}>
                Nurse access is read-only for patient records in this prototype.
              </Typography>
            )}
          </Stack>
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
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between", mb: 2.5 }}
          >
            <Box>
              <Typography variant="h5" sx={{ color: "#f4f7f1", fontWeight: 700 }}>
                Patients
              </Typography>
              <Typography sx={{ color: "#c4ccbe", mt: 0.5 }}>
                Open a chart to review demographics, vitals, visits, medications, and allergies.
              </Typography>
            </Box>
            <Chip
              label={loading ? "Refreshing list" : `${patients.length} record${patients.length === 1 ? "" : "s"}`}
              sx={{
                backgroundColor: "rgba(155, 209, 143, 0.14)",
                color: "#dfe8d8",
                fontWeight: 700,
              }}
            />
          </Stack>

          {loading ? (
            <Typography sx={{ color: "#c4ccbe" }}>Loading patients...</Typography>
          ) : patients.length === 0 ? (
            <Paper
              variant="outlined"
              sx={{
                backgroundColor: "#1d211d",
                borderColor: "#344036",
                color: "#dfe8d8",
                p: 3,
              }}
            >
              <Typography variant="h6" sx={{ color: "#f4f7f1", mb: 1 }}>
                No patients recorded yet.
              </Typography>
              <Typography sx={{ color: "#c4ccbe", mb: canCreatePatients ? 2 : 0 }}>
                Once patient records are created, they will appear here for quick access.
              </Typography>
              {canCreatePatients && (
                <Button
                  component={RouterLink}
                  to="/patients/new"
                  variant="contained"
                  sx={{
                    backgroundColor: "#9bd18f",
                    color: "#122017",
                    fontWeight: 700,
                    "&:hover": {
                      backgroundColor: "#b3e3a8",
                    },
                  }}
                >
                  Add Patient
                </Button>
              )}
            </Paper>
          ) : (
            <Stack spacing={1.5}>
              {patients.map((patient) => {
                const patientId = patient.id;

                return (
                  <Paper
                    key={patientId}
                    variant="outlined"
                    sx={{
                      alignItems: { xs: "flex-start", md: "center" },
                      backgroundColor: "#1d211d",
                      borderColor: "#344036",
                      display: "flex",
                      flexDirection: { xs: "column", md: "row" },
                      gap: 2,
                      justifyContent: "space-between",
                      p: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="h6" sx={{ color: "#f4f7f1", fontWeight: 700 }}>
                        {patient.first_name} {patient.last_name}
                      </Typography>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 0.75 }}>
                        <Typography sx={{ color: "#c4ccbe" }}>
                          DOB: {patient.date_of_birth || "Not recorded"}
                        </Typography>
                        <Typography sx={{ color: "#c4ccbe" }}>
                          Phone: {patient.phone || "Not recorded"}
                        </Typography>
                        <Typography sx={{ color: "#c4ccbe" }}>
                          Language: {patient.primary_language || "Not recorded"}
                        </Typography>
                      </Stack>
                    </Box>

                    {patientId !== undefined && (
                      <Button
                        component={RouterLink}
                        to={`/patients/${patientId}`}
                        variant="text"
                        sx={{ color: "#9bd18f", fontWeight: 700, whiteSpace: "nowrap" }}
                      >
                        View Record
                      </Button>
                    )}
                  </Paper>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
