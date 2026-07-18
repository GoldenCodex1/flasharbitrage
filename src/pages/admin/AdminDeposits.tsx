import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { Eye, Search } from "lucide-react";

export default function AdminDeposits() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [noteId, setNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

  const { data: deposits } = useQuery({
    queryKey: ["admin-deposits", filter],
    queryFn: async () => {
      let q = supabase.from("deposits").select("*").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data } = await q;
      return data ?? [];
    },
  });

  const handleAction = async (id: string, action: "approved" | "rejected") => {
    const updates: Record<string, string> = { status: action };
    if (noteId === id && noteText) updates.admin_note = noteText;
    const { error } = await supabase.from("deposits").update(updates).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Deposit ${action}`);
      setNoteId(null);
      setNoteText("");
      queryClient.invalidateQueries({ queryKey: ["admin-deposits"] });
    }
  };

  const handleSaveNote = async (id: string) => {
    const { error } = await supabase.from("deposits").update({ admin_note: noteText }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Note saved");
      setNoteId(null);
      setNoteText("");
      queryClient.invalidateQueries({ queryKey: ["admin-deposits"] });
    }
  };

  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2 });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h1 className="font-display font-bold text-xl sm:text-2xl">Manual Deposits</h1>

      <div className="flex flex-wrap gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Currency</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Network</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">TX Hash</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Proof</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Time</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deposits && deposits.length > 0 ? deposits.map((d) => (
                <tr key={d.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{d.user_id.slice(0, 8)}...</td>
                  <td className="px-4 py-3 font-semibold">{fmt(Number(d.amount))}</td>
                  <td className="px-4 py-3">{d.currency}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.network ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{d.tx_hash?.slice(0, 12) ?? "—"}{d.tx_hash ? "..." : ""}</td>
                  <td className="px-4 py-3">
                    {d.screenshot_url ? (
                      <button onClick={() => setScreenshotUrl(d.screenshot_url)} className="text-primary hover:underline flex items-center gap-1 text-xs">
                        <Eye className="w-3 h-3" /> View
                      </button>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</td>
                  <td className="px-4 py-3">
                    <span className={d.status === "approved" ? "status-badge-success" : d.status === "rejected" ? "status-badge-danger" : "status-badge-warning"}>{d.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1.5">
                      {d.status === "pending" && (
                        <div className="flex gap-2">
                          <button onClick={() => handleAction(d.id, "approved")} className="px-3 py-1 rounded text-xs font-medium bg-success/15 text-success hover:bg-success/25 transition-colors">Approve</button>
                          <button onClick={() => handleAction(d.id, "rejected")} className="px-3 py-1 rounded text-xs font-medium bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors">Reject</button>
                        </div>
                      )}
                      <button
                        onClick={() => { setNoteId(noteId === d.id ? null : d.id); setNoteText(d.admin_note ?? ""); }}
                        className="text-xs text-primary hover:underline text-left"
                      >
                        {d.admin_note ? "Edit Note" : "Add Note"}
                      </button>
                      {noteId === d.id && (
                        <div className="flex gap-2 mt-1">
                          <input value={noteText} onChange={(e) => setNoteText(e.target.value)} className="bg-secondary border border-border/30 rounded px-2 py-1 text-xs flex-1 text-foreground" placeholder="Admin note..." />
                          <button onClick={() => handleSaveNote(d.id)} className="px-2 py-1 rounded text-xs bg-primary text-primary-foreground">Save</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No deposits found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Screenshot Modal */}
      {screenshotUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setScreenshotUrl(null)}>
          <div className="max-w-lg w-full mx-4 glass-card p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-display font-semibold">Payment Proof</h3>
              <button onClick={() => setScreenshotUrl(null)} className="text-muted-foreground hover:text-foreground text-sm">Close</button>
            </div>
            <img src={screenshotUrl} alt="Payment proof" className="w-full rounded-lg" />
          </div>
        </div>
      )}
    </motion.div>
  );
}
