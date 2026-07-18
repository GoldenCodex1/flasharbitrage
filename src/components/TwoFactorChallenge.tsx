import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface TwoFactorChallengeProps {
  onVerified: () => void;
  onCancel: () => void;
}

export default function TwoFactorChallenge({ onVerified, onCancel }: TwoFactorChallengeProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("totp", {
        body: { action: "verify-login", code },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      if (data.valid) {
        onVerified();
      } else {
        toast.error("Invalid code. Please try again.");
        setCode("");
      }
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-center">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
        <ShieldCheck className="w-6 h-6 text-primary" />
      </div>
      <div>
        <h2 className="font-display font-bold text-xl mb-1">Two-Factor Authentication</h2>
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code from your authenticator app
        </p>
      </div>
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
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : "Verify"}
      </button>
      <button onClick={onCancel} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
        Sign in with a different account
      </button>
    </div>
  );
}
