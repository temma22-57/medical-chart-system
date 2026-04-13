import { useEffect, useState } from "react";
import { getCurrentUser, hasAuthToken, logout } from "./features/auth/authService";
import type { CurrentUser } from "./features/auth/authService";
import PatientSearch from "./components/PatientSearch";
import LoginPage from "./pages/LoginPage";
import PatientsPage from "./pages/PatientsPage";

function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);

  useEffect(() => {
    const loadCurrentUser = async () => {
      if (!hasAuthToken()) {
        setLoading(false);
        return;
      }

      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch {
        localStorage.removeItem("authToken");
      } finally {
        setLoading(false);
      }
    };

    loadCurrentUser();
  }, []);

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
    setSelectedPatientId(null);
  };

  if (loading) {
    return <p style={{ padding: 20 }}>Loading...</p>;
  }

  if (!currentUser) {
    return <LoginPage onLogin={setCurrentUser} />;
  }

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
        <PatientSearch onSelectPatient={setSelectedPatientId} />
        <div>
          <span>
            Signed in as {currentUser.username} ({currentUser.roles.join(", ") || "No role"})
          </span>
          <button type="button" style={{ marginLeft: 8 }} onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>
      <PatientsPage
        currentUser={currentUser}
        selectedPatientId={selectedPatientId}
        onSelectPatient={setSelectedPatientId}
      />
    </>
  );
}

export default App;
