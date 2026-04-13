import { useEffect, useState } from "react";
import { getCurrentUser, hasAuthToken, logout } from "./features/auth/authService";
import type { CurrentUser } from "./features/auth/authService";
import LoginPage from "./pages/LoginPage";
import PatientsPage from "./pages/PatientsPage";

function App() {
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
  };

  if (loading) {
    return <p style={{ padding: 20 }}>Loading...</p>;
  }

  if (!currentUser) {
    return <LoginPage onLogin={setCurrentUser} />;
  }

  return (
    <PatientsPage
      currentUser={currentUser}
      onLogout={handleLogout}
    />
  );
}

export default App;
