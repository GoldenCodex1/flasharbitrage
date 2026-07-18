import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileCheck, Eye, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function AdminKyc() {
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{ url: string; title: string } | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const { data: submissions, isLoading } = useQuery({
    queryKey: ["admin-kyc", filter],
    queryFn: async () => {
      let query = supabase
        .from("kyc")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data } = await query;
      return data ?? [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles-map"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name");
      const map: Record<string, string> = {};
      data?.forEach((p) => { map[p.user_id] = p.full_name || "Unknown"; });
      return map;
    },
  });

  const getDocUrl = (path: string) => {
    return supabase.storage.from("kyc-documents").getPublicUrl(path).data.publicUrl;
  };

  const handleAction = async (kycId: string, userId: string, status: "approved" | "rejected") => {
    setActionLoading(kycId);
    try {
      const { error: kycErr } = await supabase
        .from("kyc")
        .update({
          status,
          admin_note: adminNote || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", kycId);

      if (kycErr) throw kycErr;

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ kyc_status: status })
        .eq("user_id", userId);

      if (profileErr) throw profileErr;

      toast.success(`KYC ${status}`);
      setAdminNote("");
      queryClient.invalidateQueries({ queryKey: ["admin-kyc"] });
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display font-bold text-xl sm:text-2xl flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-primary" /> KYC Management
        </h1>
        <div className="flex gap-1.5">
          {(["pending", "approved", "rejected", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : !submissions?.length ? (
        <div className="glass-card p-8 text-center text-muted-foreground">
          No {filter === "all" ? "" : filter} KYC submissions found.
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((kyc) => (
            <div key={kyc.id} className="glass-card p-5 space-y-4">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <p className="font-semibold text-sm">{profiles?.[kyc.user_id] || "Unknown User"}</p>
                  <p className="text-xs text-muted-foreground font-mono">{kyc.user_id.slice(0, 16)}...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Submitted {!isNaN(new Date(kyc.submitted_at).getTime()) ? formatDistanceToNow(new Date(kyc.submitted_at), { addSuffix: true }) : "recently"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium capitalize bg-secondary px-2 py-1 rounded">
                    {kyc.document_type?.replace("_", " ") || "Document"}
                  </span>
                  <span
                    className={
                      kyc.status === "approved" ? "status-badge-success" :
                      kyc.status === "rejected" ? "status-badge-danger" : "status-badge-warning"
                    }
                  >
                    {kyc.status}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 flex-wrap">
                {kyc.document_url && (
                  <button
                    onClick={() => setViewingDoc({ url: getDocUrl(kyc.document_url!), title: "Document" })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Document
                  </button>
                )}
                {kyc.selfie_url && (
                  <button
                    onClick={() => setViewingDoc({ url: getDocUrl(kyc.selfie_url!), title: "Selfie" })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Selfie
                  </button>
                )}
              </div>

              {kyc.status === "pending" && (
                <div className="flex items-end gap-3 flex-wrap border-t border-border/10 pt-4">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs text-muted-foreground mb-1 block">Admin Note (optional)</label>
                    <input
                      type="text"
                      placeholder="Reason for approval/rejection..."
                      value={actionLoading === kyc.id ? adminNote : ""}
                      onChange={(e) => { setAdminNote(e.target.value); setActionLoading(null); }}
                      onFocus={() => setAdminNote("")}
                      className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(kyc.id, kyc.user_id, "approved")}
                      disabled={actionLoading === kyc.id}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === kyc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(kyc.id, kyc.user_id, "rejected")}
                      disabled={actionLoading === kyc.id}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === kyc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {kyc.admin_note && kyc.status !== "pending" && (
                <p className="text-xs text-muted-foreground border-t border-border/10 pt-3">
                  <span className="font-medium">Admin note:</span> {kyc.admin_note}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setViewingDoc(null)}>
          <div className="bg-background rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-auto p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">{viewingDoc.title}</h3>
              <button onClick={() => setViewingDoc(null)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
            </div>
            <img src={viewingDoc.url} alt={viewingDoc.title} className="w-full rounded-lg" />
          </div>
        </div>
      )}
    </motion.div>
  );
}
