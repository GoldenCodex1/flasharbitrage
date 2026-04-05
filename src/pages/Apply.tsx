import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Globe, Users, DollarSign, Crown, Shield, Target, ChevronRight, ChevronLeft, Check, Star, TrendingUp, Award, Clock, MapPin, Briefcase } from "lucide-react";
import SiteLogo from "@/components/SiteLogo";
import { Link } from "react-router-dom";
import { useApplyContent } from "@/hooks/useApplyContent";

/* ─── Format large numbers ─── */
function formatCompact(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}

/* ─── Animated counter ─── */
function AnimatedCounter({ target, duration = 2000, prefix = "", suffix = "", compact = false }: { target: number; duration?: number; prefix?: string; suffix?: string; compact?: boolean }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const tick = () => {
          const elapsed = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          setCount(Math.floor(progress * target));
          if (progress < 1) requestAnimationFrame(tick);
        };
        tick();
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  const display = compact ? formatCompact(count) : count.toLocaleString();
  return <span ref={ref}>{prefix}{display}{suffix}</span>;
}

/* ─── Role definitions ─── */
const ROLES = [
  {
    key: "country_leader",
    title: "Country Leader",
    icon: Crown,
    color: "from-amber-500 to-yellow-600",
    description: "Lead the entire country operation. Oversee all regional heads and strategic partners.",
    responsibilities: ["Recruit and manage regional heads", "Set country-level growth targets", "Represent the brand nationally", "Conduct training sessions"],
    earning: "Up to $25,000/month",
  },
  {
    key: "regional_head",
    title: "Regional Head",
    icon: Target,
    color: "from-primary to-blue-600",
    description: "Manage a specific region within a country. Build and lead local teams.",
    responsibilities: ["Build regional user base", "Manage local promoters", "Organize regional events", "Report to Country Leader"],
    earning: "Up to $10,000/month",
  },
  {
    key: "strategic_partner",
    title: "Strategic Partner",
    icon: Shield,
    color: "from-accent to-emerald-600",
    description: "Leverage your existing network to drive growth through partnerships.",
    responsibilities: ["Bring in high-value users", "Create content and campaigns", "Collaborate on marketing", "Provide market insights"],
    earning: "Up to $5,000/month",
  },
];

const STEPS = ["Personal Info", "Location", "Experience", "Motivation", "Confirm"];

export default function Apply() {
  const content = useApplyContent();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    full_name: "", email: "", phone: "",
    country: "", city: "",
    experience: "", network_size: "",
    motivation: "",
  });

  // simulator
  const [simReferrals, setSimReferrals] = useState(10);
  const [simTeam, setSimTeam] = useState(50);
  const estimatedEarning = simReferrals * content.sim_referral_multiplier + simTeam * content.sim_team_multiplier;

  const set = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const canNext = () => {
    if (step === 0) return form.full_name && form.email && form.phone;
    if (step === 1) return form.country && form.city;
    if (step === 2) return form.experience && form.network_size;
    if (step === 3) return form.motivation;
    return true;
  };

  const handleSubmit = async () => {
    if (!selectedRole) { toast({ title: "Please select a role first", variant: "destructive" }); return; }
    setSubmitting(true);
    const { error } = await supabase.from("applications").insert({
      ...form,
      selected_role: selectedRole,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
    } else {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Application Submitted!</h1>
          <p className="text-muted-foreground mb-8">Our team will review your application and contact you within 48 hours.</p>
          <Link to="/"><Button>Back to Home</Button></Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/"><SiteLogo /></Link>
          <Link to="/auth"><Button size="sm" variant="outline">Login</Button></Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }}>
            <Badge className="mb-4 bg-accent/20 text-accent border-accent/30 text-sm px-4 py-1">{content.badge_text}</Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              {content.hero_title.includes("Regional Leader") ? (
                <>
                  Become a <span className="text-primary">Regional Leader</span> —<br />
                  {content.hero_title.split("—")[1]?.trim() || "Build & Earn Across Your Country"}
                </>
              ) : (
                content.hero_title
              )}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              {content.hero_subtitle}
            </p>
          </motion.div>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
            {[
              { label: "Leaders", value: content.counter_leaders, icon: Users },
              { label: "Countries", value: content.counter_countries, icon: Globe },
              { label: "Paid Out", value: content.counter_paid, prefix: "$", suffix: "+", compact: true, icon: DollarSign },
            ].map((s) => (
              <div key={s.label} className="bg-card/50 border border-border rounded-xl p-4">
                <s.icon className="w-5 h-5 text-primary mx-auto mb-1" />
                <div className="text-2xl md:text-3xl font-bold text-foreground truncate">
                  <AnimatedCounter target={s.value} prefix={s.prefix} suffix={s.suffix} compact={s.compact} />
                </div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── ROLE SELECTION ── */}
      <section className="py-16 max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-2">Choose Your Role</h2>
        <p className="text-muted-foreground text-center mb-10">Select the position that best fits your experience and ambition.</p>

        <div className="grid md:grid-cols-3 gap-6">
          {ROLES.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.key;
            const isExpanded = expandedRole === role.key;
            return (
              <motion.div key={role.key} layout whileHover={{ y: -4 }} className="cursor-pointer" onClick={() => { setExpandedRole(isExpanded ? null : role.key); setSelectedRole(role.key); }}>
                <Card className={`relative overflow-hidden transition-all duration-300 ${isSelected ? "ring-2 ring-primary border-primary" : "border-border hover:border-primary/50"}`}>
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${role.color}`} />
                  {isSelected && <div className="absolute top-3 right-3"><Check className="w-5 h-5 text-primary" /></div>}
                  <CardHeader className="pb-2">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-3`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-lg">{role.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{role.description}</p>
                    <div className="text-primary font-semibold text-sm mb-2">{role.earning}</div>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="pt-3 border-t border-border mt-3 space-y-1.5">
                            {role.responsibilities.map((r) => (
                              <div key={r} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <ChevronRight className="w-3 h-3 mt-1 text-accent shrink-0" />
                                <span>{r}</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── EARNING BREAKDOWN ── */}
      <section className="py-16 bg-card/30">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-2">Earning Structure</h2>
          <p className="text-muted-foreground text-center mb-10">Multi-level commissions plus leadership bonuses.</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { level: "Level 1", pct: content.earning_l1, desc: "Direct referrals", icon: Users, color: "text-primary" },
              { level: "Level 2", pct: content.earning_l2, desc: "Indirect referrals", icon: TrendingUp, color: "text-accent" },
              { level: "Level 3", pct: content.earning_l3, desc: "Third-level network", icon: Globe, color: "text-amber-400" },
              { level: "Bonus", pct: "Varies", desc: "Leadership bonuses", icon: Award, color: "text-purple-400" },
            ].map((e) => (
              <Card key={e.level} className="text-center border-border bg-card/60">
                <CardContent className="pt-6">
                  <e.icon className={`w-8 h-8 mx-auto mb-3 ${e.color}`} />
                  <div className="text-2xl font-bold text-foreground">{e.pct}</div>
                  <div className="font-medium text-sm">{e.level}</div>
                  <div className="text-xs text-muted-foreground mt-1">{e.desc}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── EARNING SIMULATOR ── */}
      <section className="py-16 max-w-3xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-2">Earning Simulator</h2>
        <p className="text-muted-foreground text-center mb-8">Estimate your potential monthly earnings.</p>

        <Card className="border-border bg-card/60">
          <CardContent className="pt-6 space-y-6">
            <div>
              <Label>Direct Referrals: <span className="text-primary font-bold">{simReferrals}</span></Label>
              <input type="range" min={1} max={100} value={simReferrals} onChange={(e) => setSimReferrals(+e.target.value)} className="w-full mt-2 accent-primary" />
            </div>
            <div>
              <Label>Estimated Team Size: <span className="text-primary font-bold">{simTeam}</span></Label>
              <input type="range" min={1} max={500} value={simTeam} onChange={(e) => setSimTeam(+e.target.value)} className="w-full mt-2 accent-primary" />
            </div>
            <div className="text-center pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground">Estimated Monthly Earnings</div>
              <div className="text-4xl font-bold text-accent mt-1">${estimatedEarning.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── LEADERBOARD ── */}
      {content.leaderboard_visible && (
        <section className="py-16 bg-card/30">
          <div className="max-w-3xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-8">Top Leaders</h2>
            <div className="space-y-3">
              {[
                { rank: 1, name: "J****n M.", country: "Nigeria", earned: "$18,400" },
                { rank: 2, name: "A****a K.", country: "South Africa", earned: "$12,750" },
                { rank: 3, name: "R****l S.", country: "India", earned: "$9,320" },
              ].map((l) => (
                <Card key={l.rank} className="border-border bg-card/60">
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${l.rank === 1 ? "bg-amber-500/20 text-amber-400" : l.rank === 2 ? "bg-gray-400/20 text-gray-300" : "bg-orange-500/20 text-orange-400"}`}>
                      #{l.rank}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{l.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{l.country}</div>
                    </div>
                    <div className="text-accent font-bold">{l.earned}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── REQUIREMENTS ── */}
      <section className="py-16 max-w-3xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-8">Requirements</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: Users, title: "Network", desc: "Must have an existing audience, network, or community." },
            { icon: TrendingUp, title: "Active Promoter", desc: "Willing to actively promote and build your territory." },
            { icon: Briefcase, title: "Crypto Awareness", desc: "Basic understanding of cryptocurrency is preferred." },
          ].map((r) => (
            <Card key={r.title} className="border-border bg-card/60 text-center">
              <CardContent className="pt-6">
                <r.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                <div className="font-semibold mb-1">{r.title}</div>
                <div className="text-xs text-muted-foreground">{r.desc}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── SCARCITY ── */}
      <section className="py-10">
        <div className="max-w-xl mx-auto px-4 text-center">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} transition={{ repeat: Infinity, repeatType: "reverse", duration: 2 }}>
            <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-sm px-6 py-2">
              <Clock className="w-4 h-4 mr-2 inline" /> {content.scarcity_text}
            </Badge>
          </motion.div>
        </div>
      </section>

      {/* ── APPLICATION FORM ── */}
      <section className="py-16 max-w-2xl mx-auto px-4" id="apply-form">
        <h2 className="text-3xl font-bold text-center mb-2">Apply Now</h2>
        <p className="text-muted-foreground text-center mb-8">Complete all steps to submit your application.</p>

        {!selectedRole && (
          <div className="text-center text-amber-400 mb-6 text-sm">⚠️ Please select a role above before applying.</div>
        )}

        <div className="mb-8">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            {STEPS.map((s, i) => (
              <span key={s} className={i <= step ? "text-primary font-medium" : ""}>{s}</span>
            ))}
          </div>
          <Progress value={((step + 1) / STEPS.length) * 100} className="h-2" />
        </div>

        <Card className="border-border bg-card/60">
          <CardContent className="pt-6">
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2 }}>
                {step === 0 && (
                  <div className="space-y-4">
                    <div><Label>Full Name *</Label><Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="John Doe" /></div>
                    <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="john@example.com" /></div>
                    <div><Label>Phone *</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 234 567 8900" /></div>
                  </div>
                )}
                {step === 1 && (
                  <div className="space-y-4">
                    <div><Label>Country *</Label><Input value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="Nigeria" /></div>
                    <div><Label>City *</Label><Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Lagos" /></div>
                  </div>
                )}
                {step === 2 && (
                  <div className="space-y-4">
                    <div><Label>Marketing / Trading Experience *</Label><Textarea value={form.experience} onChange={(e) => set("experience", e.target.value)} placeholder="Describe your relevant experience..." rows={3} /></div>
                    <div><Label>Network Size *</Label><Input value={form.network_size} onChange={(e) => set("network_size", e.target.value)} placeholder="e.g. 500+ social media followers, 200 WhatsApp contacts" /></div>
                  </div>
                )}
                {step === 3 && (
                  <div className="space-y-4">
                    <div><Label>Why should we choose you? *</Label><Textarea value={form.motivation} onChange={(e) => set("motivation", e.target.value)} placeholder="Tell us what makes you the right fit..." rows={5} /></div>
                  </div>
                )}
                {step === 4 && (
                  <div className="space-y-3 text-sm">
                    <h3 className="font-semibold text-lg mb-4">Review Your Application</h3>
                    {[
                      ["Role", ROLES.find(r => r.key === selectedRole)?.title || "-"],
                      ["Name", form.full_name],
                      ["Email", form.email],
                      ["Phone", form.phone],
                      ["Country", form.country],
                      ["City", form.city],
                      ["Experience", form.experience],
                      ["Network", form.network_size],
                      ["Motivation", form.motivation],
                    ].map(([k, v]) => (
                      <div key={k} className="flex gap-3">
                        <span className="text-muted-foreground w-24 shrink-0">{k}:</span>
                        <span className="text-foreground">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              {step < 4 ? (
                <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={submitting || !selectedRole} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  {submitting ? "Submitting..." : "Submit Application"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} All rights reserved.
      </footer>
    </div>
  );
}
