import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
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
  const isAdmin = currentUser.roles.includes("Admin");
  const userDisplayName =
    `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username;

  return (
    <>
      <Box
        component="header"
        sx={{
          background: "linear-gradient(180deg, rgba(242,248,245,1) 0%, rgba(234,243,239,1) 100%)",
          borderBottom: "1px solid #d7e4de",
          p: { xs: 1, md: 1.25 },
          textAlign: "left",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            background: "linear-gradient(135deg, rgba(21,63,55,1) 0%, rgba(31,97,86,1) 52%, rgba(88,140,128,1) 100%)",
            border: "1px solid #2f6d5c",
            borderRadius: 2.5,
            color: "#f6fff8",
            overflow: "visible",
            p: { xs: 1, md: 1.25 },
            position: "relative",
          }}
        >
          <Box
            sx={{
              background:
                "radial-gradient(circle at top right, rgba(255,255,255,0.16), transparent 38%)",
              inset: 0,
              position: "absolute",
            }}
          />

          <Stack
            direction={{ xs: "column", xl: "row" }}
            spacing={1.25}
            sx={{
              alignItems: { xs: "stretch", xl: "center" },
              justifyContent: "space-between",
              overflow: "visible",
              position: "relative",
            }}
          >
            <Stack
              direction={{ xs: "column", lg: "row" }}
              spacing={1}
              sx={{
                alignItems: { xs: "stretch", lg: "center" },
                flex: { xl: 1 },
                justifyContent: "flex-start",
                minWidth: 0,
                overflow: "visible",
              }}
            >
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                {isAdmin ? (
                  <Button
                    component={NavLink}
                    to="/admin/users"
                    variant="contained"
                    sx={{
                      backgroundColor: "#f4f7f1",
                      color: "#153f37",
                      fontWeight: 700,
                      px: 2,
                      textTransform: "none",
                      "&:hover": {
                        backgroundColor: "#ffffff",
                      },
                    }}
                  >
                    User Management
                  </Button>
                ) : (
                  <Button
                    component={NavLink}
                    to="/patients"
                    variant="contained"
                    sx={{
                      backgroundColor: "#f4f7f1",
                      color: "#153f37",
                      fontWeight: 700,
                      minHeight: 36,
                      px: 1.75,
                      textTransform: "none",
                      "&:hover": {
                        backgroundColor: "#ffffff",
                      },
                    }}
                  >
                    Patients
                  </Button>
                )}
              </Stack>

              {!isAdmin && (
                <Box sx={{ flex: 1, maxWidth: 360, minWidth: { lg: 240 }, overflow: "visible" }}>
                  <PatientSearch onSelectPatient={(patientId) => navigate(`/patients/${patientId}`)} />
                </Box>
              )}
            </Stack>

            <Paper
              elevation={0}
              sx={{
                backgroundColor: "rgba(7, 28, 24, 0.24)",
                border: "1px solid rgba(216, 241, 232, 0.18)",
                borderRadius: 2.5,
                color: "#ffffff",
                minWidth: { xl: 250 },
                p: 1.1,
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row", xl: "column" }}
                spacing={0.75}
                sx={{ alignItems: { sm: "center", xl: "stretch" }, justifyContent: "space-between" }}
              >
                <Box>
                  <Typography variant="caption" sx={{ color: "#bde3d7" }}>
                    Signed In
                  </Typography>
                  <Typography sx={{ color: "#ffffff", fontWeight: 700 }}>
                    {userDisplayName}
                  </Typography>
                  <Typography sx={{ color: "#d8f1e8", fontSize: 13 }}>
                    {currentUser.roles.join(", ") || "No role"}
                  </Typography>
                </Box>
                <Button
                  type="button"
                  onClick={onLogout}
                  variant="text"
                  sx={{
                    alignSelf: { xs: "flex-start", sm: "auto", xl: "flex-start" },
                    color: "#f6fff8",
                    fontWeight: 700,
                    minWidth: 0,
                    p: 0,
                    textTransform: "none",
                  }}
                >
                  Log out
                </Button>
              </Stack>
            </Paper>
          </Stack>
        </Paper>
      </Box>
      <main style={{ padding: 20 }}>
        <Outlet />
      </main>
    </>
  );
}
