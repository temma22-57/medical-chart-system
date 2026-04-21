import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { getCurrentUser, hasAuthToken, logout } from "./features/auth/authService";
import type { CurrentUser } from "./features/auth/authService";
import AuthenticatedLayout from "./components/AuthenticatedLayout";
import LoginPage from "./pages/LoginPage";
import PatientCreatePage from "./pages/PatientCreatePage";
import PatientDetail from "./pages/PatientDetail";
import PatientRelatedRecordFormPage from "./pages/PatientRelatedRecordFormPage";
import PatientsPage from "./pages/PatientsPage";
import UserManagementPage from "./pages/UserManagementPage";
import VisitNotesPage from "./pages/VisitNotesPage";
import VisitVitalsFormPage from "./pages/VisitVitalsFormPage";

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
    navigate(user.roles.includes("Admin") ? "/admin/users" : "/patients");
  };

  if (loading) {
    return <p style={{ padding: 20 }}>Loading...</p>;
  }

  const isAdmin = currentUser?.roles.includes("Admin") ?? false;

  return (
    <Routes>
      <Route
        path="/login"
        element={
          currentUser ? (
            <Navigate to={isAdmin ? "/admin/users" : "/patients"} replace />
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
        <Route
          path="/admin/users"
          element={
            isAdmin ? (
              <UserManagementPage currentUser={currentUser!} />
            ) : (
              <Navigate to="/patients" replace />
            )
          }
        />
        <Route
          path="/patients"
          element={
            isAdmin ? (
              <Navigate to="/admin/users" replace />
            ) : (
              <PatientsPage currentUser={currentUser!} />
            )
          }
        />
        <Route
          path="/patients/new"
          element={
            isAdmin ? (
              <Navigate to="/admin/users" replace />
            ) : (
              <PatientCreatePage currentUser={currentUser!} />
            )
          }
        />
        <Route
          path="/patients/:id"
          element={isAdmin ? <Navigate to="/admin/users" replace /> : <PatientDetail />}
        />
        <Route
          path="/patients/:id/visits/new"
          element={
            isAdmin ? (
              <Navigate to="/admin/users" replace />
            ) : (
              <PatientRelatedRecordFormPage recordType="visits" mode="add" />
            )
          }
        />
        <Route
          path="/patients/:id/visits/:recordId/edit"
          element={
            isAdmin ? (
              <Navigate to="/admin/users" replace />
            ) : (
              <PatientRelatedRecordFormPage recordType="visits" mode="edit" />
            )
          }
        />
        <Route
          path="/patients/:id/visits/:recordId/notes"
          element={
            isAdmin ? (
              <Navigate to="/admin/users" replace />
            ) : (
              <VisitNotesPage currentUser={currentUser!} />
            )
          }
        />
        <Route
          path="/patients/:id/visits/:recordId/vitals/new"
          element={isAdmin ? <Navigate to="/admin/users" replace /> : <VisitVitalsFormPage />}
        />
        <Route
          path="/patients/:id/medications/new"
          element={
            isAdmin ? (
              <Navigate to="/admin/users" replace />
            ) : (
              <PatientRelatedRecordFormPage recordType="medications" mode="add" />
            )
          }
        />
        <Route
          path="/patients/:id/medications/:recordId/edit"
          element={
            isAdmin ? (
              <Navigate to="/admin/users" replace />
            ) : (
              <PatientRelatedRecordFormPage recordType="medications" mode="edit" />
            )
          }
        />
        <Route
          path="/patients/:id/diagnoses/new"
          element={
            isAdmin ? (
              <Navigate to="/admin/users" replace />
            ) : (
              <PatientRelatedRecordFormPage recordType="diagnoses" mode="add" />
            )
          }
        />
        <Route
          path="/patients/:id/diagnoses/:recordId/edit"
          element={
            isAdmin ? (
              <Navigate to="/admin/users" replace />
            ) : (
              <PatientRelatedRecordFormPage recordType="diagnoses" mode="edit" />
            )
          }
        />
        <Route
          path="/patients/:id/allergies/new"
          element={
            isAdmin ? (
              <Navigate to="/admin/users" replace />
            ) : (
              <PatientRelatedRecordFormPage recordType="allergies" mode="add" />
            )
          }
        />
        <Route
          path="/patients/:id/allergies/:recordId/edit"
          element={
            isAdmin ? (
              <Navigate to="/admin/users" replace />
            ) : (
              <PatientRelatedRecordFormPage recordType="allergies" mode="edit" />
            )
          }
        />
      </Route>
      <Route
        path="*"
        element={
          <Navigate
            to={currentUser ? (currentUser.roles.includes("Admin") ? "/admin/users" : "/patients") : "/login"}
            replace
          />
        }
      />
    </Routes>
  );
}

export default App;
