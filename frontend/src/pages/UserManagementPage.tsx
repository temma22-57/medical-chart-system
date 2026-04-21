import { useEffect, useState } from "react";
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
  phone: string;
  role: RoleName;
}

const initialForm: NewUserForm = {
  username: "",
  password: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
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
  const [contactDrafts, setContactDrafts] = useState<
    Record<number, { email: string; phone: string }>
  >({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    setError("");

    try {
      const loadedUsers = await getManagedUsers();
      setUsers(loadedUsers);
      setContactDrafts(
        Object.fromEntries(
          loadedUsers.map((user) => [
            user.id,
            {
              email: user.email || "",
              phone: user.phone || "",
            },
          ]),
        ),
      );
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

  const handleContactSave = async (user: ManagedUser) => {
    const draft = contactDrafts[user.id] || { email: user.email || "", phone: user.phone || "" };
    setError("");
    setMessage("");

    try {
      await updateManagedUser(user.id, {
        email: draft.email,
        phone: draft.phone,
      });
      setMessage(`Updated MFA contact details for ${user.username}.`);
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
    <section style={{ textAlign: "left" }}>
      <h2>User Management</h2>
      <p>Admin users can manage application accounts but cannot access patient records.</p>
      <p>Email is the only MFA delivery method. Phone is stored as employee contact information only.</p>

      <h3>Create User</h3>
      <form onSubmit={handleCreate}>
        <div>
          <label>
            Username
            <input
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              required
            />
          </label>
        </div>
        <div>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
            />
          </label>
        </div>
        <div>
          <label>
            First name
            <input
              value={form.first_name}
              onChange={(event) => setForm({ ...form, first_name: event.target.value })}
            />
          </label>
        </div>
        <div>
          <label>
            Last name
            <input
              value={form.last_name}
              onChange={(event) => setForm({ ...form, last_name: event.target.value })}
            />
          </label>
        </div>
        <div>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </label>
          <p style={{ marginTop: 4 }}>Used for MFA email delivery when configured.</p>
        </div>
        <div>
          <label>
            Phone
            <input
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </label>
          <p style={{ marginTop: 4 }}>Stored for employee contact information only.</p>
        </div>
        <div>
          <label>
            Role
            <select
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value as RoleName })}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="submit" disabled={saving}>
          {saving ? "Creating..." : "Create User"}
        </button>
      </form>

      <h3>Existing Users</h3>
      {loading ? (
        <p>Loading users...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Save Contact Info</th>
              <th>Role</th>
              <th>Reset Password</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>
                  {user.first_name} {user.last_name}
                </td>
                <td>
                  <input
                    type="email"
                    value={contactDrafts[user.id]?.email ?? user.email}
                    onChange={(event) =>
                      setContactDrafts({
                        ...contactDrafts,
                        [user.id]: {
                          email: event.target.value,
                          phone: contactDrafts[user.id]?.phone ?? user.phone ?? "",
                        },
                      })
                    }
                  />
                </td>
                <td>
                  <input
                    value={contactDrafts[user.id]?.phone ?? user.phone}
                    onChange={(event) =>
                      setContactDrafts({
                        ...contactDrafts,
                        [user.id]: {
                          email: contactDrafts[user.id]?.email ?? user.email ?? "",
                          phone: event.target.value,
                        },
                      })
                    }
                  />
                </td>
                <td>
                  <button type="button" onClick={() => handleContactSave(user)}>
                    Save
                  </button>
                </td>
                <td>
                  <select
                    value={(user.roles[0] || "Nurse") as RoleName}
                    onChange={(event) => handleRoleChange(user, event.target.value as RoleName)}
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="password"
                    placeholder="New password"
                    value={passwords[user.id] || ""}
                    onChange={(event) =>
                      setPasswords({ ...passwords, [user.id]: event.target.value })
                    }
                  />
                  <button type="button" onClick={() => handlePasswordReset(user)}>
                    Reset
                  </button>
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => handleDelete(user)}
                    disabled={user.id === currentUser.id}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {message && <p>{message}</p>}
      {error && <p>{error}</p>}
    </section>
  );
}
