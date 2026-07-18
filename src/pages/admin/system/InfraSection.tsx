import { useState, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Loader2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LogEntry {
  id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

interface InfraSectionProps<T extends Record<string, any>> {
  title: string;
  description: string;
  table: string;
  sectionKey: string;
  children: (data: T, update: (field: keyof T, value: any) => void) => ReactNode;
}

export default function InfraSection<T extends Record<string, any>>({
  title,
  description,
  table,
  sectionKey,
  children,
}: InfraSectionProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [original, setOriginal] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: rows } = await supabase.from(table as any).select("*").limit(1);
    if (rows && rows.length > 0) {
      setData(rows[0] as unknown as T);
      setOriginal(rows[0] as unknown as T);
    }
  };

  const update = (field: keyof T, value: any) => {
    if (!data) return;
    setData({ ...data, [field]: value });
  };

  const handleSave = async () => {
    if (!data || !original) return;
    setSaving(true);

    // Find changed fields
    const changes: Record<string, any> = {};
    const logEntries: { field_name: string; old_value: string; new_value: string }[] = [];
    for (const key of Object.keys(data)) {
      if (key === "id" || key === "updated_at") continue;
      if (String(data[key]) !== String(original[key])) {
        changes[key] = data[key];
        logEntries.push({
          field_name: key,
          old_value: String(original[key]),
          new_value: String(data[key]),
        });
      }
    }

    if (Object.keys(changes).length === 0) {
      toast.info("No changes to save");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from(table as any).update(changes).eq("id", data.id);
    if (error) {
      toast.error(error.message);
    } else {
      // Log changes
      const { data: userData } = await supabase.auth.getUser();
      for (const entry of logEntries) {
        await supabase.from("admin_action_logs" as any).insert({
          admin_id: userData?.user?.id,
          section: sectionKey,
          ...entry,
        });
      }
      toast.success(`${title} saved`);
      setOriginal({ ...data });
    }
    setSaving(false);
  };

  const loadLogs = async () => {
    const { data: rows } = await supabase
      .from("admin_action_logs" as any)
      .select("*")
      .eq("section", sectionKey)
      .order("created_at", { ascending: false })
      .limit(20);
    setLogs((rows as unknown as LogEntry[]) ?? []);
    setShowLogs(true);
  };

  if (!data) {
    return (
      <div className="glass-card p-6 animate-pulse">
        <div className="h-6 w-48 bg-secondary rounded mb-2" />
        <div className="h-4 w-72 bg-secondary/50 rounded" />
      </div>
    );
  }

  return (
    <div className="glass-card p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold text-base sm:text-lg">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={loadLogs} className="text-xs">
            <History className="w-3.5 h-3.5 mr-1" /> History
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children(data, update)}
      </div>

      <AnimatePresence>
        {showLogs && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/30 pt-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-muted-foreground">Change History</h4>
                <Button size="sm" variant="ghost" onClick={() => setShowLogs(false)} className="text-xs">Close</Button>
              </div>
              {logs.length === 0 ? (
                <p className="text-xs text-muted-foreground">No changes recorded yet.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {logs.map((l) => (
                    <div key={l.id} className="flex items-start gap-3 text-xs bg-secondary/30 rounded-lg p-2.5">
                      <span className="text-muted-foreground whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString()}
                      </span>
                      <span className="font-mono text-primary">{l.field_name}</span>
                      <span className="text-destructive line-through">{l.old_value}</span>
                      <span className="text-success">→ {l.new_value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
