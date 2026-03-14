import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { User, Mail, Shield, Key, Upload, FileCheck, Loader2, Camera, Zap } from "lucide-react";
import TwoFactorSetup from "@/components/TwoFactorSetup";
import { useUserPlan } from "@/hooks/useUserPlan";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function Profile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [docType, setDocType] = useState("passport");
  const docInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: kyc } = useQuery({
    queryKey: ["kyc", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("kyc").select("*").eq("user_id", user!.id).order("submitted_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile]);

  const avatarUrl = profile?.avatar_url
    ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_url).data.publicUrl
    : null;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Avatar must be under 2MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }

    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file);
      if (uploadErr) throw uploadErr;

      const { error: updateErr } = await supabase.from("profiles").update({ avatar_url: path }).eq("user_id", user.id);
      if (updateErr) throw updateErr;

      toast.success("Avatar updated");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (err: any) {
      toast.error(err.message || "Avatar upload failed");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSendingReset(false);
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent to your email");
  };

  const handle2FAComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["profile"] });
  };

  const handleKycUpload = async () => {
    if (!user) return;
    const docFile = docInputRef.current?.files?.[0];
    const selfieFile = selfieInputRef.current?.files?.[0];
    if (!docFile) { toast.error("Please select a document file"); return; }
    if (!selfieFile) { toast.error("Please select a selfie file"); return; }

    const maxSize = 5 * 1024 * 1024;
    if (docFile.size > maxSize || selfieFile.size > maxSize) {
      toast.error("Files must be under 5MB"); return;
    }

    setUploading(true);
    try {
      const docExt = docFile.name.split('.').pop();
      const selfieExt = selfieFile.name.split('.').pop();
      const docPath = `${user.id}/document-${Date.now()}.${docExt}`;
      const selfiePath = `${user.id}/selfie-${Date.now()}.${selfieExt}`;

      const [docUpload, selfieUpload] = await Promise.all([
        supabase.storage.from("kyc-documents").upload(docPath, docFile),
        supabase.storage.from("kyc-documents").upload(selfiePath, selfieFile),
      ]);

      if (docUpload.error) throw docUpload.error;
      if (selfieUpload.error) throw selfieUpload.error;

      const { error } = await supabase.from("kyc").insert({
        user_id: user.id,
        document_type: docType,
        document_url: docPath,
        selfie_url: selfiePath,
        status: "pending",
      });

      if (error) throw error;
      toast.success("KYC documents submitted for review");
      queryClient.invalidateQueries({ queryKey: ["kyc"] });
      if (docInputRef.current) docInputRef.current.value = "";
      if (selfieInputRef.current) selfieInputRef.current.value = "";
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const { plan, planStartedAt, planExpiresAt, daysRemaining } = useUserPlan();
  const kycStatus = kyc?.status ?? profile?.kyc_status ?? "pending";
  const kycBadge = kycStatus === "approved" ? "status-badge-success" : kycStatus === "rejected" ? "status-badge-danger" : "status-badge-warning";

  const fmtLimit = (n: number) => n >= 999999 ? "Unlimited" : n.toLocaleString();

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
      <h1 className="font-display font-bold text-2xl">Profile</h1>

      <div className="glass-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
            <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center overflow-hidden">
              {avatarUploading ? (
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              ) : avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-primary" />
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div>
            <p className="font-display font-bold text-lg">{profile?.full_name || "User"}</p>
            <p className="text-sm text-muted-foreground">
              Member {profile?.created_at && !isNaN(new Date(profile.created_at).getTime()) ? formatDistanceToNow(new Date(profile.created_at), { addSuffix: false }) : ""}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2.5 text-sm text-foreground" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Email</label>
            <div className="flex items-center gap-2">
              <input type="email" value={user?.email ?? ""} readOnly className="flex-1 bg-secondary border border-border/30 rounded-lg px-3 py-2.5 text-sm text-foreground opacity-70" />
              <span className="status-badge-success"><Mail className="w-3 h-3" /> Verified</span>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-lg font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Current Plan Section */}
      {plan && (
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Current Plan
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-display font-bold text-primary">{plan.name}</p>
              <p className="text-xs text-muted-foreground">{plan.description}</p>
            </div>
            <Link to="/plans" className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              Upgrade Plan
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex justify-between p-2 bg-secondary/50 rounded-lg"><span className="text-muted-foreground">Max Trades/Day</span><span className="font-semibold">{fmtLimit(plan.max_trades_per_day)}</span></div>
            <div className="flex justify-between p-2 bg-secondary/50 rounded-lg"><span className="text-muted-foreground">Max Trade Amount</span><span className="font-semibold">${fmtLimit(plan.max_trade_amount)}</span></div>
            <div className="flex justify-between p-2 bg-secondary/50 rounded-lg"><span className="text-muted-foreground">Auto Bot Slots</span><span className="font-semibold">{fmtLimit(plan.max_auto_trade_slots)}</span></div>
            <div className="flex justify-between p-2 bg-secondary/50 rounded-lg"><span className="text-muted-foreground">Daily Withdrawal</span><span className="font-semibold">${fmtLimit(plan.daily_withdrawal_limit)}</span></div>
          </div>
        </div>
      )}

      <div className="glass-card p-6 space-y-4">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" /> Security
        </h3>
        <div className="flex items-center justify-between py-3 border-b border-border/10">
          <div className="flex items-center gap-3">
            <Key className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-muted-foreground">Send a reset link to your email</p>
            </div>
          </div>
          <button onClick={handlePasswordReset} disabled={sendingReset} className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-secondary text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50">
            {sendingReset ? "Sending..." : "Change Password"}
          </button>
        </div>
        <TwoFactorSetup
          isEnabled={!!profile?.two_factor_enabled}
          onComplete={handle2FAComplete}
        />
      </div>

      <div className="glass-card p-6 space-y-4">
        <h3 className="font-display font-semibold flex items-center gap-2 mb-1">
          <FileCheck className="w-4 h-4 text-primary" /> KYC Verification
        </h3>
        <div className="flex items-center gap-3 mb-4">
          <span className={kycBadge}>{kycStatus}</span>
          <p className="text-sm text-muted-foreground">
            {kycStatus === "approved" ? "Your identity is verified." : kycStatus === "rejected" ? (kyc?.admin_note || "Your submission was rejected. Please resubmit.") : "Submit your documents to increase limits."}
          </p>
        </div>

        {kycStatus !== "approved" && (
          <div className="space-y-4 border-t border-border/10 pt-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Document Type</label>
              <select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2.5 text-sm text-foreground">
                <option value="passport">Passport</option>
                <option value="national_id">National ID</option>
                <option value="drivers_license">Driver's License</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Document Photo</label>
              <input ref={docInputRef} type="file" accept="image/*,.pdf" className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-semibold file:cursor-pointer text-muted-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Selfie with Document</label>
              <input ref={selfieInputRef} type="file" accept="image/*" className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-semibold file:cursor-pointer text-muted-foreground" />
            </div>
            <button onClick={handleKycUpload} disabled={uploading} className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Submit Documents</>}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
