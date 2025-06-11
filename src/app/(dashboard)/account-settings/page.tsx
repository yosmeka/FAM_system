"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";

export default function AccountSettings() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Password validation
  const validatePassword = (password: string) => {
    // First check if the password meets minimum requirements
    const hasMinRequirements = 
      /[a-z]/.test(password) &&    // at least one lowercase letter
      /[A-Z]/.test(password) &&    // at least one uppercase letter
      /\d/.test(password) &&       // at least one number
      /[@$!%*?&]/.test(password) && // at least one special character
      password.length >= 8;        // at least 8 characters

    if (!hasMinRequirements) {
      setPasswordError("Password must be at least 8 characters and contain at least one lowercase letter, one uppercase letter, one number, and one special character (@$!%*?&)");
      return false;
    }
    setPasswordError("");
    return true;
  };

  // Profile update state
  const [name, setName] = useState(session?.user?.name || "");
  const [email, setEmail] = useState(session?.user?.email || "");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [currentTab, setCurrentTab] = useState("password");

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl shadow-xl mt-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Account Settings</h1>
      <div className="flex gap-4 mb-6">
        <button
          className={`px-4 py-2 rounded-lg font-semibold ${currentTab === "password" ? "bg-red-600 text-white" : "bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-100"}`}
          onClick={() => setCurrentTab("password")}
        >
          Change Password
        </button>
        <button
          className={`px-4 py-2 rounded-lg font-semibold ${currentTab === "profile" ? "bg-red-600 text-white" : "bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-100"}`}
          onClick={() => setCurrentTab("profile")}
        >
          Profile Info
        </button>
      </div>
      {currentTab === "password" && (
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setPasswordError("");
            setPasswordSuccess("");
            if (!userId) {
              setPasswordError("User not found");
              return;
            }
            if (newPassword !== confirmNewPassword) {
              setPasswordError("New passwords do not match");
              return;
            }
            if (!validatePassword(newPassword)) {
              return;
            }
            setPasswordLoading(true);
            try {
              const res = await fetch(`/api/users/${userId}/password`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Failed to update password");
              setPasswordSuccess("Password updated successfully!");
              setCurrentPassword("");
              setNewPassword("");
              setConfirmNewPassword("");
            } catch (err: any) {
              setPasswordError(err.message);
            } finally {
              setPasswordLoading(false);
            }
          }}
        >
          <label className="font-semibold">Current Password
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="block w-full mt-1 p-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
            />
          </label>
          <div className="space-y-1">
            <label className="font-semibold">New Password
              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  validatePassword(e.target.value);
                }}
                className="block w-full mt-1 p-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
              />
            </label>
            {passwordError && (
              <p className="text-sm text-red-500 dark:text-red-400">{passwordError}</p>
            )}
          </div>
          <div className="space-y-1">
            <label className="font-semibold">Confirm New Password
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="block w-full mt-1 p-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
              />
            </label>
            {passwordError && (
              <p className="text-sm text-red-500 dark:text-red-400">{passwordError}</p>
            )}
          </div>
          <button type="submit" className="mt-2 w-full rounded-lg bg-red-600 text-white py-2 font-semibold hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400" disabled={passwordLoading}>
            {passwordLoading ? "Updating..." : "Update Password"}
          </button>
          {passwordError && <div className="text-red-500 font-semibold mt-2">{passwordError}</div>}
          {passwordSuccess && <div className="text-green-500 font-semibold mt-2">{passwordSuccess}</div>}
        </form>
      )}
      {currentTab === "profile" && (
        <form
            className="flex flex-col gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setProfileError("");
              setProfileSuccess("");
              if (!userId) {
                setProfileError("User not found");
                return;
              }
              setProfileLoading(true);
              try {
                const res = await fetch(`/api/users/${userId}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name, email }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to update profile");
                setProfileSuccess("Profile updated successfully!");
              } catch (err: any) {
                setProfileError(err.message);
              } finally {
                setProfileLoading(false);
              }
            }}
          >
          <label className="font-semibold">Name
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="block w-full mt-1 p-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
            />
          </label>
          <label className="font-semibold">Email
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="block w-full mt-1 p-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
            />
          </label>
          <button type="submit" className="mt-2 w-full rounded-lg bg-red-600 text-white py-2 font-semibold hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400" disabled={profileLoading}>
  {profileLoading ? "Updating..." : "Update Profile"}
</button>
{profileError && <div className="text-red-500 font-semibold mt-2">{profileError}</div>}
{profileSuccess && <div className="text-green-500 font-semibold mt-2">{profileSuccess}</div>}
        </form>
      )}
    </div>
  );
}