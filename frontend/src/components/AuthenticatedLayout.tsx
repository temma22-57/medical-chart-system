import { NavLink, Outlet, useNavigate } from "react-router-dom";
import PatientSearch from "./PatientSearch";
import type { CurrentUser } from "../features/auth/authService";

interface AuthenticatedLayoutProps {
  currentUser: CurrentUser;
  onLogout: () => void;
}

export default function AuthenticatedLayout({
  currentUser,
  onLogout,
}: AuthenticatedLayoutProps) {
  const navigate = useNavigate();

  return (
    <>
      <header
        style={{
          alignItems: "center",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          justifyContent: "space-between",
          padding: 20,
          textAlign: "left",
        }}
      >
        <nav style={{ alignItems: "center", display: "flex", gap: 12 }}>
          <NavLink to="/patients">Patients</NavLink>
          <PatientSearch onSelectPatient={(patientId) => navigate(`/patients/${patientId}`)} />
        </nav>
        <div>
          <span>
            Signed in as {currentUser.username} ({currentUser.roles.join(", ") || "No role"})
          </span>
          <button type="button" style={{ marginLeft: 8 }} onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>
      <main style={{ padding: 20 }}>
        <Outlet />
      </main>
    </>
  );
}
