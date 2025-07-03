"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
// import { useRouter } from "next/navigation"; // Unused for now
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

import { usePermissions } from "@/hooks/usePermissions";
import { usePermissionsContext } from "@/contexts/PermissionsContext";
import UserPermissionsModal from "./UserPermissionsModal";

export default function UsersPage() {
  const { permissions } = usePermissionsContext();
  console.log("Current permissions:", permissions);
  const { checkPermission } = usePermissions();
  const { data: session, status } = useSession();
  // const router = useRouter(); // Unused for now
  const isAdmin = session?.user?.role === "ADMIN";

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  //const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "USER",
  });
  const [passwordError, setPasswordError] = useState("");
  const [addingUser, setAddingUser] = useState(false);

  // Password validation regex
  const validatePassword = (password: string) => {
    // First check if the password meets minimum requirements
    const hasMinRequirements =
      /[a-z]/.test(password) && // at least one lowercase letter
      /[A-Z]/.test(password) && // at least one uppercase letter
      /\d/.test(password) && // at least one number
      /[@$!%*?&]/.test(password) && // at least one special character
      password.length >= 8; // at least 8 characters

    if (!hasMinRequirements) {
      setPasswordError(
        "Password must be at least 8 characters and contain at least one lowercase letter, one uppercase letter, one number, and one special character (@$!%*?&)"
      );
      //toast.error("Password must be at least 8 characters and contain at least one lowercase letter, one uppercase letter, one number, and one special character (@$!%*?&)");
      return false;
    }

    // If it meets minimum requirements, allow any additional characters
    setPasswordError("");
    return true;
  };

  // Handle password input change - inline in the form

  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "USER",
  });
  const [permissionsModalUser, setPermissionsModalUser] = useState<{
    id: string;
    email: string;
  } | null>(null);

  // Open edit modal and prefill form
  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || "",
      email: user.email,
      role: user.role,
    });
  };

  // Close edit modal
  const handleCloseEditModal = () => {
    setEditingUser(null);
    setEditForm({ name: "", email: "", role: "USER" });
  };

  // Submit edit form
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        let errorMsg = "Failed to update user";
        try {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await res.json();
            errorMsg = errorData.error || errorMsg;
          }
        } catch (e) {
          // Ignore JSON parse errors, fallback to default errorMsg
        }
        throw new Error(errorMsg);
      }
      toast.success("User updated successfully!");
      fetchUsers();
      handleCloseEditModal();
    } catch (err: unknown) {
      toast.error("Error updating user");
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (checkPermission("User view (list and detail)")) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [checkPermission]);

  // Conditional returns AFTER all hooks
  if (!checkPermission("User view (list and detail)")) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Access Denied</h1>
        <p className="mt-2 text-gray-600">
          You do not have permission to view users.
        </p>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 dark:border-red-400"></div>
      </div>
    );
  }

  const handleAddUser = async () => {
    if (!validatePassword(form.password)) return;

    setAddingUser(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        if (errorData?.error) {
          // Show the error message directly from the API
          toast.error(errorData.error);
          return;
        }
        toast.error("Failed to create user");
        return;
      }

      setForm({ name: "", email: "", password: "", role: "USER" });
      setShowModal(false);
      fetchUsers();
      toast.success("User added successfully!");
    } catch (err: unknown) {
      toast.error("An unexpected error occurred");
      console.error(err);
    } finally {
      setAddingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    try {
      const res = await fetch(`/api/users/${deleteUserId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete user");
      fetchUsers(); // Refresh the user list
      toast.success("User deleted successfully!");
    } catch (err) {
      toast.error("Error deleting user");
      console.error(err);
    } finally {
      setDeleteUserId(null); // Close confirmation modal
    }
  };

  // Admin UI
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        {checkPermission("User create/invite") && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Add New User
          </button>
        )}
      </div>
      {loading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
        </div>
      ) : error ? (
        <p className="text-center text-red-500">{error}</p>
      ) : users.length === 0 ? (
        <p className="text-center text-gray-500">No users found.</p>
      ) : (
        <div className="overflow-x-auto shadow-lg rounded-lg">
          <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="border px-4 py-2 text-left">Name</th>
                <th className="border px-4 py-2 text-left">Email</th>
                <th className="border px-4 py-2 text-left">Role</th>
                <th className="border px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="border px-4 py-2 dark:border-gray-700 dark:text-white">
                    {user.name || "N/A"}
                  </td>
                  <td className="border px-4 py-2 dark:border-gray-700 dark:text-white">
                    {user.email}
                  </td>
                  <td className="border px-4 py-2 capitalize">{user.role}</td>
                  <td className="border px-4 py-2">
                    {checkPermission("User edit/update") && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditClick(user)}
                          className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-800 "
                        >
                          Edit
                        </button>
                        {(checkPermission("User manage permissions") ||
                          isAdmin) && (
                          <button
                            onClick={() =>
                              setPermissionsModalUser({
                                id: user.id,
                                email: user.email,
                              })
                            }
                            className="bg-[#000000] text-white px-3 py-1 rounded hover:bg-gray-600"
                          >
                            Permissions
                          </button>
                        )}
                        {checkPermission("User delete") && (
                          <button
                            onClick={() => setDeleteUserId(user.id)}
                            className="bg-[#ff0000] text-white px-3 py-1 rounded hover:bg-red-600"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit User</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                className="w-full border px-3 py-2 rounded dark:bg-gray-700"
              />
              <input
                type="email"
                placeholder="Email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
                className="w-full border px-3 py-2 rounded dark:bg-gray-700"
              />
              <select
                value={editForm.role}
                onChange={(e) =>
                  setEditForm({ ...editForm, role: e.target.value })
                }
                className="w-full border px-3 py-2 rounded dark:bg-gray-700"
              >
                <option value="USER">User</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="px-4 py-2 rounded text-black bg-gray-300 hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md dark:bg-gray-900">
            <h2 className="text-xl font-bold mb-4">Add New User</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border px-3 py-2 rounded dark:bg-gray-800"
              />
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border px-3 py-2 rounded dark:bg-gray-800"
              />
              <div className="space-y-1">
                <input
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) => {
                    setForm({ ...form, password: e.target.value });
                    validatePassword(e.target.value);
                  }}
                  className="w-full border px-3 py-2 rounded dark:bg-gray-800"
                />
                {passwordError && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {passwordError}
                  </p>
                )}
              </div>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full border px-3 py-2 rounded dark:bg-gray-800"
              >
                <option value="USER">User</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
                <option value="AUDITOR">Auditor</option> 
              </select>
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                disabled={addingUser}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {addingUser ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding User...
                  </>
                ) : (
                  "Add User"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteUserId && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md dark:bg-gray-900">
            <h2 className="text-xl font-bold mb-4 dark:text-white">
              Confirm Deletion
            </h2>
            <p className="dark:text-white">
              Are you sure you want to delete this user?
            </p>
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => setDeleteUserId(null)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-400 dark:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit User Modal */}
      {editingUser && checkPermission("User edit") && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit User</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                className="w-full border px-3 py-2 rounded"
              />
              <input
                type="email"
                placeholder="Email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
                className="w-full border px-3 py-2 rounded"
              />
              <select
                value={editForm.role}
                onChange={(e) =>
                  setEditForm({ ...editForm, role: e.target.value })
                }
                className="w-full border px-3 py-2 rounded"
              >
                <option value="USER">User</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/users/${editingUser.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(editForm),
                    });
                    if (!res.ok) throw new Error("Failed to update user");
                    toast.success("User updated successfully!");
                    setEditingUser(null);
                    fetchUsers();
                  } catch (err) {
                    toast.error("Error updating user");
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      {/* User Permissions Modal */}
      {permissionsModalUser && (
        <UserPermissionsModal
          userId={permissionsModalUser.id}
          userEmail={permissionsModalUser.email}
          open={!!permissionsModalUser}
          onClose={() => setPermissionsModalUser(null)}
        />
      )}
      {/* Toast Notification Container */}
      <ToastContainer />
    </div>
  );
}
