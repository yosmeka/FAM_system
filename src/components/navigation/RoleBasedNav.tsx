import { usePermissions } from "@/hooks/usePermissions";
import { useRole } from "@/hooks/useRole";
import Link from "next/link";

interface NavItem {
  href: string;
  label: string;
  permission?: string;
}

export function RoleBasedNav() {
  const { checkPermission } = usePermissions();
  const { isAdmin, isManager } = useRole();

  const navItems: NavItem[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
    },
    {
      href: "/assets",
      label: "Assets",
      permission: "manage_assets",
    },
    {
      href: "/maintenance",
      label: "Maintenance",
      permission: "manage_maintenance",
    },
    {
      href: "/disposals",
      label: "Disposals",
      permission: "manage_disposals",
    },
    {
      href: "/reports",
      label: "Reports",
      permission: "view_reports",
    },
    {
      href: "/users",
      label: "Users",
      permission: "manage_users",
    },
    {
      href: "/settings",
      label: "Settings",
      permission: "manage_settings",
    },
  ];

  const filteredNavItems = navItems.filter(
    (item) => !item.permission || checkPermission(item.permission)
  );

  return (
    <nav className="space-y-2">
      {filteredNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
} 