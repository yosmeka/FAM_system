// ... existing code ...

export async function GET() {
  // Role is an enum, not a table. Count enum values manually
  const roles = ["ADMIN", "MANAGER", "USER"];
  const count = roles.length;
  return Response.json({ count });
}

// ... existing code ...
