import { useState } from "react";
import { login } from "../features/auth/authService";
import type { CurrentUser } from "../features/auth/authService";

interface LoginPageProps {
  onLogin: (user: CurrentUser) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      const response = await login(username, password);
      onLogin(response.user);
    } catch {
      setError("Invalid username or password.");
    }
  };

  return (
    <main style={{ padding: 20 }}>
      <h2>Sign in</h2>
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <button type="submit">Log in</button>
      </form>
      {error && <p>{error}</p>}
      <p>Use a Doctor or Nurse demo account after running the bootstrap command.</p>
    </main>
  );
}
