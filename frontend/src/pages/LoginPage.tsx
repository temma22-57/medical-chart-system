import { useState } from "react";
import {
  login,
  resendMfaCode,
  verifyMfaCode,
} from "../features/auth/authService";
import type {
  CurrentUser,
  LoginResponse,
} from "../features/auth/authService";

interface LoginPageProps {
  onLogin: (user: CurrentUser, authNotice?: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [mfaStep, setMfaStep] = useState<"credentials" | "verify" | "delivery_failed">(
    "credentials",
  );
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const applyLoginResponse = (response: LoginResponse) => {
    if (!response.mfa_required && response.user) {
      onLogin(response.user, response.warning);
      return;
    }

    setChallengeId(response.challenge_id || "");
    setMaskedEmail(
      response.selected_method?.masked_destination ||
        response.available_methods?.[0]?.masked_destination ||
        "",
    );
    setMessage(response.detail || "");
    setMfaStep(response.next_step === "delivery_failed" ? "delivery_failed" : "verify");
    setCode("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await login(username, password);
      applyLoginResponse(response);
    } catch (loginError: unknown) {
      setError(
        getErrorMessage(loginError, "Unable to sign in with those credentials right now."),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await verifyMfaCode(challengeId, code);
      if (response.user) {
        onLogin(response.user, response.warning);
      }
    } catch (verifyError: unknown) {
      setError(getErrorMessage(verifyError, "That verification code could not be accepted."));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await resendMfaCode(challengeId);
      setMessage(response.detail || "A new verification code was sent.");
    } catch (resendError: unknown) {
      setError(getErrorMessage(resendError, "Unable to resend the verification code right now."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: 20 }}>
      <h2>Sign in</h2>
      {mfaStep === "credentials" ? (
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
          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Log in"}
          </button>
        </form>
      ) : null}
      {mfaStep === "verify" ? (
        <section>
          <p>
            {message ||
              `Enter the 8-digit code sent to ${maskedEmail || "your email address"}.`}
          </p>
          <form onSubmit={handleVerifyCode}>
            <input
              inputMode="numeric"
              maxLength={8}
              placeholder="8-digit code"
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 8))
              }
            />
            <button type="submit" disabled={loading || code.length !== 8}>
              {loading ? "Verifying..." : "Verify code"}
            </button>
          </form>
          <button type="button" onClick={handleResend} disabled={loading}>
            Resend code
          </button>
        </section>
      ) : null}
      {mfaStep === "delivery_failed" ? (
        <section>
          <p>{message || "We couldn't send your verification code by email right now."}</p>
        </section>
      ) : null}
      {error && <p>{error}</p>}
      {!error && message && mfaStep !== "verify" ? <p>{message}</p> : null}
      <p>Demo accounts can sign in with their username and password. MFA is used when email is configured.</p>
    </main>
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "detail" in error.response.data &&
    typeof error.response.data.detail === "string"
  ) {
    return error.response.data.detail;
  }

  return fallback;
}
