import { useEffect, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { getPatient } from "../features/patients/patientService";
import type {
  Allergy,
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

function displayValue(value: string | number | undefined | null) {
  return value === undefined || value === null || value === "" ? "Not recorded" : value;
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
                    <Box sx={notesClampSx}>{visit.notes}</Box>
                  </TableCell>
                  <TableCell>
                    <Button
                      component={RouterLink}
                      to={`/patients/${patientId}/visits/${visit.id}/edit`}
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
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {medications.map((medication) => (
                <TableRow key={medication.id}>
                  <TableCell>{medication.name}</TableCell>
                  <TableCell>{medication.dosage}</TableCell>
                  <TableCell>{medication.frequency}</TableCell>
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPatient = async () => {
      if (!Number.isFinite(patientId)) {
        setError("Invalid patient id.");
        setPatient(null);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const data = await getPatient(patientId);
        setPatient(data);
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

  return (
    <Stack spacing={3} sx={{ textAlign: "left" }}>
      <Button component={RouterLink} to="/patients" size="small">
        Back to patients
      </Button>

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
        <MedicationsCard patientId={patient.id} medications={patient.medications} />
        <AllergiesCard patientId={patient.id} allergies={patient.allergies} />
        <VisitsCard patientId={patient.id} visits={patient.visits} />
      </Stack>
    </Stack>
  );
}
