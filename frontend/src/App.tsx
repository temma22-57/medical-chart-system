import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { getCurrentUser, hasAuthToken, logout } from "./features/auth/authService";
import type { CurrentUser } from "./features/auth/authService";
import AuthenticatedLayout from "./components/AuthenticatedLayout";
import LoginPage from "./pages/LoginPage";
import PatientCreatePage from "./pages/PatientCreatePage";
import PatientDetail from "./pages/PatientDetail";
import PatientsPage from "./pages/PatientsPage";

function App() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

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
    navigate("/login");
  };

  const handleLogin = (user: CurrentUser) => {
    setCurrentUser(user);
    navigate("/patients");
  };

  if (loading) {
    return <p style={{ padding: 20 }}>Loading...</p>;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          currentUser ? (
            <Navigate to="/patients" replace />
          ) : (
            <LoginPage onLogin={handleLogin} />
          )
        }
      />
      <Route
        element={
          currentUser ? (
            <AuthenticatedLayout currentUser={currentUser} onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route path="/patients" element={<PatientsPage currentUser={currentUser!} />} />
        <Route path="/patients/new" element={<PatientCreatePage currentUser={currentUser!} />} />
        <Route path="/patients/:id" element={<PatientDetail />} />
      </Route>
      <Route path="*" element={<Navigate to={currentUser ? "/patients" : "/login"} replace />} />
    </Routes>
  );
}

export default App;
