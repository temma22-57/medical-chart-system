import { useState } from "react";
import { Box, Button, Chip, Paper, Stack, TextField, Typography } from "@mui/material";
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
    <main
      style={{
        alignItems: "center",
        background:
          "radial-gradient(circle at top, rgba(88,140,128,0.22), transparent 28%), linear-gradient(180deg, #f4faf7 0%, #edf5f1 100%)",
        display: "flex",
        flex: 1,
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          background: "transparent",
          border: "none",
          maxWidth: 1080,
          width: "100%",
        }}
      >
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={0}
          sx={{
            border: "1px solid #cfe0d8",
            borderRadius: 4,
            overflow: "hidden",
            boxShadow: "0 24px 60px rgba(21, 63, 55, 0.12)",
          }}
        >
          <Box
            sx={{
              background:
                "linear-gradient(135deg, rgba(21,63,55,1) 0%, rgba(31,97,86,1) 52%, rgba(88,140,128,1) 100%)",
              color: "#f6fff8",
              flex: "1 1 50%",
              p: { xs: 3, md: 5 },
              position: "relative",
            }}
          >
            <Box
              sx={{
                background:
                  "radial-gradient(circle at top right, rgba(255,255,255,0.18), transparent 38%)",
                inset: 0,
                position: "absolute",
              }}
            />
            <Stack spacing={2} sx={{ position: "relative" }}>
              <Chip
                label="Medical Chart System"
                sx={{
                  alignSelf: "flex-start",
                  backgroundColor: "rgba(255,255,255,0.14)",
                  color: "#f6fff8",
                  fontWeight: 700,
                }}
              />
              <Typography component="h1" sx={{ color: "#ffffff", fontSize: { xs: 34, md: 48 }, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.05, m: 0 }}>
                Welcome back.
              </Typography>
              <Typography sx={{ color: "#d8f1e8", fontSize: 18, maxWidth: 520 }}>
                Sign in to review patient charts, recent vitals, visit history, medications,
                allergies, and user access tools from one place.
              </Typography>

              <Stack spacing={1.5} sx={{ mt: 2 }}>
                <Paper
                  elevation={0}
                  sx={{
                    backgroundColor: "rgba(7, 28, 24, 0.22)",
                    border: "1px solid rgba(216, 241, 232, 0.18)",
                    color: "#f6fff8",
                    p: 2,
                  }}
                >
                  <Typography variant="overline" sx={{ color: "#bde3d7", letterSpacing: "0.08em" }}>
                    Demo Access
                  </Typography>
                  <Typography sx={{ color: "#ffffff", fontWeight: 700 }}>
                    Doctor and Nurse accounts are available after bootstrap.
                  </Typography>
                  <Typography sx={{ color: "#d8f1e8", mt: 0.5 }}>
                    Use a Doctor or Nurse demo account after running the bootstrap command.
                  </Typography>
                </Paper>
                <Typography sx={{ color: "#d8f1e8" }}>
                  Admin users manage application accounts, while clinical users work with patient
                  records.
                </Typography>
              </Stack>
            </Stack>
          </Box>

          <Box
            sx={{
              backgroundColor: "#f8fcfa",
              display: "flex",
              flex: "1 1 50%",
              p: { xs: 3, md: 5 },
            }}
          >
            <Box sx={{ margin: "auto", maxWidth: 420, width: "100%" }}>
              <Typography component="h2" variant="h4" sx={{ color: "#153f37", fontWeight: 700 }}>
                Sign in
              </Typography>
              <Typography sx={{ color: "#4a5f58", mt: 1, mb: 3 }}>
                Enter your credentials to continue into the charting workspace.
              </Typography>

              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="Username"
                    placeholder="Username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    variant="outlined"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: "#ffffff",
                      },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Password"
                    placeholder="Password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    variant="outlined"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: "#ffffff",
                      },
                    }}
                  />

                  {error && (
                    <Paper
                      variant="outlined"
                      sx={{
                        backgroundColor: "#fff4f4",
                        borderColor: "#e6b3b3",
                        color: "#7a1f1f",
                        p: 1.5,
                      }}
                    >
                      <Typography>{error}</Typography>
                    </Paper>
                  )}

                  <Button
                    size="large"
                    type="submit"
                    variant="contained"
                    sx={{
                      backgroundColor: "#153f37",
                      fontWeight: 700,
                      py: 1.25,
                      "&:hover": {
                        backgroundColor: "#1f6156",
                      },
                    }}
                  >
                    Log in
                  </Button>
                </Stack>
              </Box>
            </Box>
          </Box>
        </Stack>
      </Paper>
    </main>
  );
}
