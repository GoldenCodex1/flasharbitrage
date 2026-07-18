import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ShieldCheck, UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";

type AdminRow = {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
};

const ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "trade_manager", label: "Trade Manager" },
  { value: "finance_manager", label: "Finance Manager" },
  { value: "support", label: "Support" },
  { value: "viewer", label: "Viewer" },
];

export default function AdminAdmins() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [submitting, setSubmitting] = useState(false);

  const { data: admins, isLoading } = useQuery({
    queryKey: ["admins-list"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_admins");
      if (error) throw error;
      return (data ?? []) as AdminRow[];
    },
  });

  const handleAssign = async () => {
    if (!email.trim()) return toast.error("Email required");
    setSubmitting(true);
    const { data, error } = await supabase.rpc("assign_admin_role", {
      _email: email.trim(),
      _role: role,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    const res = data as { success: boolean; error?: string };
    if (!res?.success) return toast.error(res?.error || "Failed");
    toast.success("Admin role assigned");
    setEmail("");
    qc.invalidateQueries({ queryKey: ["admins-list"] });
  };

  const handleChangeRole = async (targetEmail: string, newRole: string) => {
    const { data, error } = await supabase.rpc("assign_admin_role", {
      _email: targetEmail,
      _role: newRole,
    });
    if (error) return toast.error(error.message);
    const res = data as { success: boolean; error?: string };
    if (!res?.success) return toast.error(res?.error || "Failed");
    toast.success("Role updated");
    qc.invalidateQueries({ queryKey: ["admins-list"] });
  };

  const handleDeactivate = async (targetUserId: string, targetEmail: string) => {
    if (!confirm(`Remove all admin access for ${targetEmail}?`)) return;
    const { data, error } = await supabase.rpc("deactivate_admin", {
      _target_user_id: targetUserId,
    });
    if (error) return toast.error(error.message);
    const res = data as { success: boolean; error?: string };
    if (!res?.success) return toast.error(res?.error || "Failed");
    toast.success("Admin deactivated");
    qc.invalidateQueries({ queryKey: ["admins-list"] });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-display font-bold">Admins</h1>
          <p className="text-sm text-muted-foreground">Manage admin roles and access.</p>
        </div>
      </div>

      {/* Assign / Promote */}
      <div className="rounded-xl border border-border/30 bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-4 h-4 text-primary" />
          <h2 className="font-display font-semibold">Promote a user</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Label className="text-xs">User email (must already have an account)</Label>
            <Input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleAssign} disabled={submitting}>
            {submitting ? "Assigning…" : "Assign role"}
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="rounded-xl border border-border/30 bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border/30">
          <h2 className="font-display font-semibold">All admins</h2>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
        ) : !admins || admins.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No admins found.</div>
        ) : (
          <div className="divide-y divide-border/30">
            {admins.map((a) => {
              const isSelf = a.user_id === user?.id;
              return (
                <div key={a.user_id} className="px-5 py-3 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{a.full_name || a.email}</div>
                    <div className="text-xs text-muted-foreground truncate">{a.email}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Since {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={a.role}
                      onValueChange={(v) => handleChangeRole(a.email, v)}
                      disabled={isSelf}
                    >
                      <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      disabled={isSelf}
                      title={isSelf ? "You cannot deactivate yourself" : "Deactivate admin"}
                      onClick={() => handleDeactivate(a.user_id, a.email)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
