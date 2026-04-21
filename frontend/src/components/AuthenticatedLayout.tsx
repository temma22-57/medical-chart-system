import { NavLink, Outlet, useNavigate } from "react-router-dom";
import PatientSearch from "./PatientSearch";
import type { CurrentUser } from "../features/auth/authService";

interface AuthenticatedLayoutProps {
  currentUser: CurrentUser;
  authNotice?: string;
  onDismissAuthNotice: () => void;
  onLogout: () => void;
}

export default function AuthenticatedLayout({
  currentUser,
  authNotice,
  onDismissAuthNotice,
  onLogout,
}: AuthenticatedLayoutProps) {
  const navigate = useNavigate();
  const isAdmin = currentUser.roles.includes("Admin");

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
          {isAdmin ? (
            <NavLink to="/admin/users">User Management</NavLink>
          ) : (
            <>
              <NavLink to="/patients">Patients</NavLink>
              <PatientSearch onSelectPatient={(patientId) => navigate(`/patients/${patientId}`)} />
            </>
          )}
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
      {authNotice ? (
        <div
          style={{
            background: "#fff7e6",
            borderBottom: "1px solid #f2d28b",
            color: "#6b4b00",
            padding: "12px 20px",
            textAlign: "left",
          }}
        >
          <span>{authNotice}</span>
          <button type="button" style={{ marginLeft: 12 }} onClick={onDismissAuthNotice}>
            Dismiss
          </button>
        </div>
      ) : null}
      <main style={{ padding: 20 }}>
        <Outlet />
      </main>
    </>
  );
}
