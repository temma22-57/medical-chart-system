import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  createManagedUser,
  deleteManagedUser,
  getManagedUsers,
  resetManagedUserPassword,
  updateManagedUser,
} from "../features/auth/authService";
import type { CurrentUser, ManagedUser } from "../features/auth/authService";

interface UserManagementPageProps {
  currentUser: CurrentUser;
}

const roleOptions = ["Admin", "Doctor", "Nurse"] as const;
type RoleName = (typeof roleOptions)[number];

interface NewUserForm {
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  email: string;
  role: RoleName;
}

const initialForm: NewUserForm = {
  username: "",
  password: "",
  first_name: "",
  last_name: "",
  email: "",
  role: "Nurse",
};

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response
  ) {
    const data = error.response.data;

    if (typeof data === "string") {
      return data;
    }

    if (typeof data === "object" && data !== null) {
      return Object.values(data).flat().join(" ");
    }
  }

  return "Unable to complete this user-management action.";
}

export default function UserManagementPage({ currentUser }: UserManagementPageProps) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [form, setForm] = useState<NewUserForm>(initialForm);
  const [passwords, setPasswords] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const userDisplayName =
    `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username;

  const loadUsers = async () => {
    setLoading(true);
    setError("");

    try {
      setUsers(await getManagedUsers());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await createManagedUser(form);
      setForm(initialForm);
      setMessage("User created.");
      await loadUsers();
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (user: ManagedUser, role: RoleName) => {
    setError("");
    setMessage("");

    try {
      await updateManagedUser(user.id, { role });
      setMessage(`Updated ${user.username}.`);
      await loadUsers();
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    }
  };

  const handlePasswordReset = async (user: ManagedUser) => {
    const password = passwords[user.id] || "";

    if (!password) {
      setError("Enter a new password before resetting.");
      return;
    }

    setError("");
    setMessage("");

    try {
      await resetManagedUserPassword(user.id, password);
      setPasswords({ ...passwords, [user.id]: "" });
      setMessage(`Password reset for ${user.username}.`);
    } catch (resetError) {
      setError(getErrorMessage(resetError));
    }
  };

  const handleDelete = async (user: ManagedUser) => {
    if (!window.confirm(`Delete user ${user.username}?`)) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await deleteManagedUser(user.id);
      setMessage(`Deleted ${user.username}.`);
      await loadUsers();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    }
  };

  return (
    <Stack spacing={3} sx={{ textAlign: "left" }}>
      <Paper
        variant="outlined"
        sx={{
          background:
            "linear-gradient(135deg, rgba(21,63,55,1) 0%, rgba(31,97,86,1) 52%, rgba(88,140,128,1) 100%)",
          borderColor: "#2f6d5c",
          color: "#f6fff8",
          overflow: "hidden",
          p: { xs: 2.5, md: 3.5 },
          position: "relative",
        }}
      >
        <Box
          sx={{
            background:
              "radial-gradient(circle at top right, rgba(255,255,255,0.16), transparent 42%)",
            inset: 0,
            position: "absolute",
          }}
        />
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={3}
          sx={{ justifyContent: "space-between", position: "relative" }}
        >
          <Box sx={{ maxWidth: 640 }}>
            <Chip
              label="Admin Workspace"
              sx={{
                backgroundColor: "rgba(255,255,255,0.14)",
                color: "#f6fff8",
                fontWeight: 700,
                mb: 1.5,
              }}
            />
            <Typography component="h2" variant="h4" sx={{ color: "#ffffff", fontWeight: 700 }}>
              Manage access with confidence, {userDisplayName}
            </Typography>
            <Typography sx={{ color: "#d8f1e8", maxWidth: 560, mt: 1 }}>
              Create accounts, assign roles, reset credentials, and keep the application team
              organized without crossing into patient record access.
            </Typography>
          </Box>

          <Stack
            direction={{ xs: "row", md: "column" }}
            spacing={1.5}
            sx={{ alignItems: { xs: "stretch", md: "flex-end" }, minWidth: { md: 220 } }}
          >
            <Paper
              elevation={0}
              sx={{
                backgroundColor: "rgba(7, 28, 24, 0.24)",
                border: "1px solid rgba(216, 241, 232, 0.18)",
                color: "#ffffff",
                minWidth: 140,
                px: 2,
                py: 1.5,
              }}
            >
              <Typography variant="caption" sx={{ color: "#bde3d7" }}>
                Total Users
              </Typography>
              <Typography variant="h5" sx={{ color: "#ffffff", fontWeight: 700 }}>
                {users.length}
              </Typography>
            </Paper>
            <Typography sx={{ color: "#d8f1e8", maxWidth: 260 }}>
              Admin users can manage application accounts but cannot access patient records.
            </Typography>
          </Stack>
        </Stack>
      </Paper>

      {message && (
        <Paper
          variant="outlined"
          sx={{ backgroundColor: "#f1fbf5", borderColor: "#a8d5b6", color: "#1f5b33", p: 2 }}
        >
          <Typography>{message}</Typography>
        </Paper>
      )}

      {error && (
        <Paper
          variant="outlined"
          sx={{ backgroundColor: "#fff4f4", borderColor: "#e6b3b3", color: "#7a1f1f", p: 2 }}
        >
          <Typography>{error}</Typography>
        </Paper>
      )}

      <Stack direction={{ xs: "column", xl: "row" }} spacing={3} sx={{ alignItems: "stretch" }}>
        <Card
          variant="outlined"
          sx={{
            backgroundColor: "#242824",
            borderColor: "#3a453b",
            color: "#f4f7f1",
            flex: { xl: "0 0 360px" },
          }}
        >
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h5" sx={{ color: "#f4f7f1", fontWeight: 700 }}>
              Create User
            </Typography>
            <Typography sx={{ color: "#c4ccbe", mt: 0.5, mb: 2.5 }}>
              Add a new admin or clinical user and assign a single application role.
            </Typography>

            <Box component="form" onSubmit={handleCreate}>
              <Stack spacing={2}>
                <TextField
                  label="Username"
                  required
                  value={form.username}
                  onChange={(event) => setForm({ ...form, username: event.target.value })}
                  sx={{ "& .MuiOutlinedInput-root": { backgroundColor: "#f8fcfa" } }}
                />
                <TextField
                  label="Password"
                  required
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  sx={{ "& .MuiOutlinedInput-root": { backgroundColor: "#f8fcfa" } }}
                />
                <TextField
                  label="First name"
                  value={form.first_name}
                  onChange={(event) => setForm({ ...form, first_name: event.target.value })}
                  sx={{ "& .MuiOutlinedInput-root": { backgroundColor: "#f8fcfa" } }}
                />
                <TextField
                  label="Last name"
                  value={form.last_name}
                  onChange={(event) => setForm({ ...form, last_name: event.target.value })}
                  sx={{ "& .MuiOutlinedInput-root": { backgroundColor: "#f8fcfa" } }}
                />
                <TextField
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  sx={{ "& .MuiOutlinedInput-root": { backgroundColor: "#f8fcfa" } }}
                />
                <TextField
                  select
                  label="Role"
                  value={form.role}
                  onChange={(event) => setForm({ ...form, role: event.target.value as RoleName })}
                  sx={{ "& .MuiOutlinedInput-root": { backgroundColor: "#f8fcfa" } }}
                >
                  {roleOptions.map((role) => (
                    <MenuItem key={role} value={role}>
                      {role}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  type="submit"
                  disabled={saving}
                  variant="contained"
                  sx={{
                    alignSelf: "flex-start",
                    backgroundColor: "#9bd18f",
                    color: "#122017",
                    fontWeight: 700,
                    "&:hover": {
                      backgroundColor: "#b3e3a8",
                    },
                  }}
                >
                  {saving ? "Creating..." : "Create User"}
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>

        <Card
          variant="outlined"
          sx={{
            backgroundColor: "#242824",
            borderColor: "#3a453b",
            color: "#f4f7f1",
            flex: 1,
            "& .MuiTableCell-root": {
              borderColor: "#3a453b",
              color: "#f4f7f1",
              verticalAlign: "top",
            },
            "& .MuiTableHead-root .MuiTableCell-root": {
              color: "#dfe8d8",
              fontWeight: 700,
            },
          }}
        >
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              sx={{
                alignItems: { xs: "flex-start", sm: "center" },
                justifyContent: "space-between",
                mb: 2.5,
              }}
            >
              <Box>
                <Typography variant="h5" sx={{ color: "#f4f7f1", fontWeight: 700 }}>
                  Existing Users
                </Typography>
                <Typography sx={{ color: "#c4ccbe", mt: 0.5 }}>
                  Review account details, change roles, reset passwords, or remove access.
                </Typography>
              </Box>
              <Chip
                label={loading ? "Refreshing users" : `${users.length} account${users.length === 1 ? "" : "s"}`}
                sx={{
                  backgroundColor: "rgba(155, 209, 143, 0.14)",
                  color: "#dfe8d8",
                  fontWeight: 700,
                }}
              />
            </Stack>

            {loading ? (
              <Typography sx={{ color: "#c4ccbe" }}>Loading users...</Typography>
            ) : users.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  backgroundColor: "#1d211d",
                  borderColor: "#344036",
                  color: "#dfe8d8",
                  p: 3,
                }}
              >
                <Typography variant="h6" sx={{ color: "#f4f7f1", mb: 1 }}>
                  No users found.
                </Typography>
                <Typography sx={{ color: "#c4ccbe" }}>
                  Create the first account from the panel on the left to get started.
                </Typography>
              </Paper>
            ) : (
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Username</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Reset Password</TableCell>
                      <TableCell>Delete</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Typography sx={{ color: "#f4f7f1", fontWeight: 700 }}>
                            {user.username}
                          </Typography>
                          {user.id === currentUser.id && (
                            <Typography sx={{ color: "#9bd18f", fontSize: 13, mt: 0.5 }}>
                              Current account
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {`${user.first_name} ${user.last_name}`.trim() || "Not provided"}
                        </TableCell>
                        <TableCell>{user.email || "Not provided"}</TableCell>
                        <TableCell sx={{ minWidth: 150 }}>
                          <TextField
                            select
                            size="small"
                            value={(user.roles[0] || "Nurse") as RoleName}
                            onChange={(event) =>
                              handleRoleChange(user, event.target.value as RoleName)
                            }
                            sx={{
                              minWidth: 130,
                              "& .MuiOutlinedInput-root": {
                                backgroundColor: "#f8fcfa",
                              },
                            }}
                          >
                            {roleOptions.map((role) => (
                              <MenuItem key={role} value={role}>
                                {role}
                              </MenuItem>
                            ))}
                          </TextField>
                        </TableCell>
                        <TableCell sx={{ minWidth: 220 }}>
                          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                            <TextField
                              size="small"
                              type="password"
                              placeholder="New password"
                              value={passwords[user.id] || ""}
                              onChange={(event) =>
                                setPasswords({ ...passwords, [user.id]: event.target.value })
                              }
                              sx={{
                                minWidth: 140,
                                "& .MuiOutlinedInput-root": {
                                  backgroundColor: "#f8fcfa",
                                },
                              }}
                            />
                            <Button
                              type="button"
                              onClick={() => handlePasswordReset(user)}
                              variant="text"
                              sx={{ color: "#9bd18f", fontWeight: 700, whiteSpace: "nowrap" }}
                            >
                              Reset
                            </Button>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            onClick={() => handleDelete(user)}
                            disabled={user.id === currentUser.id}
                            variant="text"
                            sx={{
                              color: user.id === currentUser.id ? "#718079" : "#ffb5b5",
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                            }}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Stack>
  );
}
