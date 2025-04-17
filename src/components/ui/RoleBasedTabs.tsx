import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
  permission?: string;
}

interface RoleBasedTabsProps {
  tabs: Tab[];
  defaultTab?: string;
  className?: string;
}

export function RoleBasedTabs({
  tabs,
  defaultTab,
  className,
}: RoleBasedTabsProps) {
  const { checkPermission } = usePermissions();
  const filteredTabs = tabs.filter(
    (tab) => !tab.permission || checkPermission(tab.permission)
  );

  const [activeTab, setActiveTab] = useState(
    defaultTab || (filteredTabs[0]?.id ?? "")
  );

  if (filteredTabs.length === 0) {
    return null;
  }

  const activeTabContent = filteredTabs.find((tab) => tab.id === activeTab)
    ?.content;

  return (
    <div className={className}>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {filteredTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm",
                activeTab === tab.id
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="mt-4">{activeTabContent}</div>
    </div>
  );
} 