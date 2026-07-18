import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Loader2, Copy, Check } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import QRCode from "qrcode";

interface TwoFactorSetupProps {
  isEnabled: boolean;
  onComplete: () => void;
}

export default function TwoFactorSetup({ isEnabled, onComplete }: TwoFactorSetupProps) {
  const [step, setStep] = useState<"idle" | "qr" | "verify">("idle");
  const [uri, setUri] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");

  const handleSetup = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("totp", {
        body: { action: "setup" },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setUri(data.uri);
      setSecret(data.secret);
      const dataUrl = await QRCode.toDataURL(data.uri, { width: 200, margin: 2 });
      setQrDataUrl(dataUrl);
      setStep("qr");
    } catch (err: any) {
      toast.error(err.message || "Failed to setup 2FA");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("totp", {
        body: { action: "verify-setup", code },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      toast.success("Two-factor authentication enabled!");
      setStep("idle");
      setCode("");
      onComplete();
    } catch (err: any) {
      toast.error(err.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("totp", {
        body: { action: "disable" },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      toast.success("Two-factor authentication disabled");
      onComplete();
    } catch (err: any) {
      toast.error(err.message || "Failed to disable 2FA");
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (step === "qr") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Scan this QR code with Google Authenticator or any TOTP app:
        </p>
        <div className="flex justify-center p-4 bg-white rounded-lg w-fit mx-auto">
          <img src={qrDataUrl} alt="2FA QR Code" width={180} height={180} />
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-secondary p-2 rounded font-mono break-all">
            {secret}
          </code>
          <button onClick={copySecret} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
            {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Can't scan? Enter the secret key manually in your authenticator app.
        </p>
        <button onClick={() => setStep("verify")} className="w-full py-2.5 rounded-lg font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          I've scanned it — Continue
        </button>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code from your authenticator app to confirm setup:
        </p>
        <div className="flex justify-center">
          <InputOTP maxLength={6} value={code} onChange={setCode}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <button
          onClick={handleVerify}
          disabled={loading || code.length !== 6}
          className="w-full py-2.5 rounded-lg font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : "Verify & Enable"}
        </button>
        <button onClick={() => { setStep("idle"); setCode(""); }} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <Shield className="w-4 h-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Two-Factor Authentication</p>
          <p className="text-xs text-muted-foreground">
            {isEnabled ? "Protected with Google Authenticator" : "Add an extra layer of security"}
          </p>
        </div>
      </div>
      <button
        onClick={isEnabled ? handleDisable : handleSetup}
        disabled={loading}
        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
          isEnabled
            ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
            : "bg-primary/10 text-primary hover:bg-primary/20"
        }`}
      >
        {loading ? "..." : isEnabled ? "Disable" : "Enable"}
      </button>
    </div>
  );
}
