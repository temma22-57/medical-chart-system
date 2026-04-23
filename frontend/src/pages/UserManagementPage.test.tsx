import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import UserManagementPage from "./UserManagementPage";
import {
  getManagedUsers,
  resetManagedUserPassword,
  updateManagedUser,
} from "../features/auth/authService";

vi.mock("../features/auth/authService", () => ({
  createManagedUser: vi.fn(),
  deleteManagedUser: vi.fn(),
  getManagedUsers: vi.fn(),
  resetManagedUserPassword: vi.fn(),
  updateManagedUser: vi.fn(),
}));

describe("UserManagementPage", () => {
  beforeEach(() => {
    vi.mocked(getManagedUsers).mockReset();
    vi.mocked(updateManagedUser).mockReset();
    vi.mocked(resetManagedUserPassword).mockReset();
    vi.mocked(getManagedUsers).mockResolvedValue([
      {
        id: 2,
        username: "doctor",
        first_name: "Avery",
        last_name: "Stone",
        email: "",
        phone: "",
        roles: ["Doctor"],
      },
    ]);
  });

  it("lets admins add an email from the user table", async () => {
    vi.mocked(updateManagedUser).mockResolvedValue({
      id: 2,
      username: "doctor",
      first_name: "Avery",
      last_name: "Stone",
      email: "doctor@example.com",
      phone: "",
      roles: ["Doctor"],
    });

    render(
      <UserManagementPage
        currentUser={{
          id: 1,
          username: "admin",
          first_name: "Admin",
          last_name: "User",
          email: "admin@example.com",
          phone: "",
          roles: ["Admin"],
        }}
      />,
    );

    await screen.findByText("doctor");
    fireEvent.click(screen.getByRole("button", { name: "Edit Email" }));

    const emailInput = screen.getAllByLabelText("Email").at(-1);
    expect(emailInput).toBeDefined();
    fireEvent.change(emailInput!, { target: { value: "doctor@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(updateManagedUser).toHaveBeenCalledWith(2, { email: "doctor@example.com" }),
    );
    await waitFor(() =>
      expect(screen.getByText("Added email for doctor.")).toBeInTheDocument(),
    );
  });
});
