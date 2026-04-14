import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "../features/auth/authService";
import { getPatients } from "../features/patients/patientService";
import PatientsPage from "./PatientsPage";

vi.mock("../features/patients/patientService", () => ({
  getPatients: vi.fn(),
}));

const doctorUser: CurrentUser = {
  id: 1,
  username: "doctor",
  first_name: "Demo",
  last_name: "Doctor",
  email: "doctor@example.com",
  roles: ["Doctor"],
};

describe("PatientsPage", () => {
  beforeEach(() => {
    vi.mocked(getPatients).mockReset();
  });

  it("renders loaded patients and the doctor add-patient action", async () => {
    vi.mocked(getPatients).mockResolvedValue([
      {
        id: 7,
        first_name: "Avery",
        last_name: "Stone",
        date_of_birth: "1990-04-12",
        phone: "555-0100",
      },
    ]);

    render(
      <MemoryRouter>
        <PatientsPage currentUser={doctorUser} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /patients/i })).toBeInTheDocument();
    expect(screen.getByText(/loading patients/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/avery stone/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /add patient/i })).toHaveAttribute(
      "href",
      "/patients/new",
    );
    expect(screen.getByRole("link", { name: /view record/i })).toHaveAttribute(
      "href",
      "/patients/7",
    );
  });

  it("renders the empty read-only nurse state", async () => {
    vi.mocked(getPatients).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <PatientsPage currentUser={{ ...doctorUser, username: "nurse", roles: ["Nurse"] }} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/no patients recorded yet/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/nurse access is read-only/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /add patient/i })).not.toBeInTheDocument();
  });
});
