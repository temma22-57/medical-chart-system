import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPatientCardOrderPreference } from "../features/auth/authService";
import { getPatient } from "../features/patients/patientService";
import PatientDetail from "./PatientDetail";

vi.mock("../features/auth/authService", () => ({
  getPatientCardOrderPreference: vi.fn(),
  updatePatientCardOrderPreference: vi.fn(),
}));

vi.mock("../features/patients/patientService", () => ({
  getPatient: vi.fn(),
}));

describe("PatientDetail", () => {
  beforeEach(() => {
    vi.mocked(getPatient).mockReset();
    vi.mocked(getPatientCardOrderPreference).mockReset();
    vi.mocked(getPatientCardOrderPreference).mockResolvedValue({
      card_order: ["medications", "diagnoses", "allergies", "visits"],
    });
  });

  it("renders patient demographics, latest vitals, and related record sections", async () => {
    vi.mocked(getPatient).mockResolvedValue({
      id: 7,
      first_name: "Avery",
      last_name: "Stone",
      date_of_birth: "1990-04-12",
      phone: "555-0100",
      primary_language: "English",
      medications: [
        {
          id: 3,
          patient: 7,
          name: "Lisinopril",
          dosage: "10 mg",
          frequency: "Daily",
          duration: "Ongoing",
          is_active: true,
        },
      ],
      diagnoses: [
        {
          id: 8,
          patient: 7,
          name: "Hypertension",
          status: "current",
          date_diagnosed: "2026-04-01",
          diagnosis_code: "I10",
          provider_name: "Dr. Smith",
          notes: [
            {
              id: 12,
              diagnosis: 8,
              author: 2,
              author_username: "doctor",
              author_display_name: "Dr. Smith",
              content: "Monitor blood pressure.",
              can_edit: false,
              updated_at: "2026-04-13T17:00:00Z",
            },
          ],
        },
      ],
      allergies: [
        {
          id: 4,
          patient: 7,
          substance: "Penicillin",
          reaction: "Rash",
        },
      ],
      visits: [
        {
          id: 5,
          patient: 7,
          visit_date: "2026-04-13",
          primary_care_physician: "Dr. Smith",
          staff_assigned: "Nurse Gomez",
          notes: [
            {
              id: 10,
              visit: 5,
              author: 2,
              author_username: "doctor",
              author_display_name: "Dr. Smith",
              content: "Medication review.",
              can_edit: false,
              updated_at: "2026-04-13T17:00:00Z",
            },
          ],
          vitals: [],
        },
      ],
      latest_vitals: {
        id: 6,
        visit: 5,
        patient: 7,
        height: "67.50",
        weight: "145.25",
        blood_pressure: "122/78",
        heart_rate: 74,
        temperature: "98.70",
        collected_at: "2026-04-13T16:30:00Z",
      },
    });

    render(
      <MemoryRouter initialEntries={["/patients/7"]}>
        <Routes>
          <Route path="/patients/:id" element={<PatientDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/loading patient details/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /avery stone/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/dob: 1990-04-12/i)).toBeInTheDocument();
    expect(screen.getByText(/phone: 555-0100/i)).toBeInTheDocument();
    expect(screen.getByText(/primary language/i)).toBeInTheDocument();
    expect(screen.getByText("English")).toBeInTheDocument();
    expect(screen.getByText("122/78")).toBeInTheDocument();
    expect(screen.getByText("Hypertension")).toBeInTheDocument();
    expect(screen.getByText("current")).toBeInTheDocument();
    expect(screen.getByText("I10")).toBeInTheDocument();
    expect(screen.getByText("Lisinopril")).toBeInTheDocument();
    expect(screen.getByText("Ongoing")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Penicillin")).toBeInTheDocument();
    expect(screen.getByText("Medication review.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /set table order/i })).toBeInTheDocument();
  });

  it("uses the saved user card order when rendering patient tables", async () => {
    vi.mocked(getPatientCardOrderPreference).mockResolvedValue({
      card_order: ["visits", "allergies", "diagnoses", "medications"],
    });
    vi.mocked(getPatient).mockResolvedValue({
      id: 7,
      first_name: "Avery",
      last_name: "Stone",
      date_of_birth: "1990-04-12",
      phone: "555-0100",
      primary_language: "English",
      medications: [],
      diagnoses: [],
      allergies: [],
      visits: [],
      latest_vitals: null,
    });

    render(
      <MemoryRouter initialEntries={["/patients/7"]}>
        <Routes>
          <Route path="/patients/:id" element={<PatientDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /avery stone/i })).toBeInTheDocument();
    });

    const visitsHeading = screen.getByRole("heading", { name: /visits/i });
    const medicationsHeading = screen.getByRole("heading", { name: /medications/i });

    expect(
      visitsHeading.compareDocumentPosition(medicationsHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders an error state when patient details cannot load", async () => {
    vi.mocked(getPatient).mockRejectedValue(new Error("request failed"));

    render(
      <MemoryRouter initialEntries={["/patients/7"]}>
        <Routes>
          <Route path="/patients/:id" element={<PatientDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/unable to load patient details/i)).toBeInTheDocument();
    });
  });
});
