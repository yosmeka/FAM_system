import { usePermissions } from "@/hooks/usePermissions";
import { RoleBasedButton as Button } from "@/components/ui/RoleBasedButton";

interface Action {
  label: string;
  onClick: () => void;
  permission?: string;
  variant?: "primary" | "secondary" | "danger" | "success";
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
          variant={action.variant || "primary"}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
