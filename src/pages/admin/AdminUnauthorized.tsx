import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminUnauthorized() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <ShieldAlert className="w-7 h-7 text-destructive" />
      </div>
      <h1 className="text-2xl font-display font-bold mb-2">Access denied</h1>
      <p className="text-muted-foreground max-w-md mb-6">
        Your admin role does not have permission to view this section. Contact a super admin if you believe this is a mistake.
      </p>
      <Button asChild>
        <Link to="/admin">Back to dashboard</Link>
      </Button>
    </div>
  );
}
