import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "./button";

interface Action {
  label: string;
  onClick: () => void;
  permission?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

interface RoleBasedActionsProps {
  actions: Action[];
}

export function RoleBasedActions({ actions }: RoleBasedActionsProps) {
  const { checkPermission } = usePermissions();

  const filteredActions = actions.filter(
    (action) => !action.permission || checkPermission(action.permission)
  );

  if (filteredActions.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-2">
      {filteredActions.map((action, index) => (
        <Button
          key={index}
          onClick={action.onClick}
          variant={action.variant || "default"}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
} 