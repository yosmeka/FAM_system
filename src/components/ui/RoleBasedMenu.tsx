import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { Menu } from "@headlessui/react";
import { ChevronDown } from "lucide-react";

interface MenuItem {
  label: string;
  onClick: () => void;
  permission?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface RoleBasedMenuProps {
  items: MenuItem[];
  label: string;
  className?: string;
}

export function RoleBasedMenu({
  items,
  label,
  className,
}: RoleBasedMenuProps) {
  const { checkPermission } = usePermissions();

  const filteredItems = items.filter(
    (item) => !item.permission || checkPermission(item.permission)
  );

  if (filteredItems.length === 0) {
    return null;
  }

  return (
    <Menu as="div" className={cn("relative inline-block text-left", className)}>
      <Menu.Button className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
        {label}
        <ChevronDown className="ml-2 -mr-1 h-5 w-5" aria-hidden="true" />
      </Menu.Button>

      <Menu.Items className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
        <div className="py-1">
          {filteredItems.map((item, index) => (
            <Menu.Item key={index}>
              {({ active }) => (
                <button
                  onClick={item.onClick}
                  disabled={item.disabled}
                  className={cn(
                    "flex items-center w-full px-4 py-2 text-sm",
                    active ? "bg-gray-100 text-gray-900" : "text-gray-700",
                    item.disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {item.icon && (
                    <span className="mr-3 h-5 w-5">{item.icon}</span>
                  )}
                  {item.label}
                </button>
              )}
            </Menu.Item>
          ))}
        </div>
      </Menu.Items>
    </Menu>
  );
} 