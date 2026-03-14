import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Save, Plus, Trash2, GripVertical, Eye, EyeOff, BarChart3, HelpCircle, Type, Search, Image, Globe, Users, Upload, FileText, LayoutGrid } from "lucide-react";

/* ─── types ─── */
interface Stat { id: string; key: string; value: string; label: string; auto_calculate: boolean; }
interface Faq { id: string; question: string; answer: string; display_order: number; is_visible: boolean; }
interface HeroContent { id: string; headline: string; subheadline: string; primary_cta_text: string; secondary_cta_text: string; }
interface SeoMeta { id: string; meta_title: string; meta_description: string; og_title: string; og_description: string; og_image: string; keywords: string; }
interface FooterPage { id: string; title: string; slug: string; content: string; is_visible: boolean; display_order: number; }
interface TeamMember { id: string; name: string; role: string; bio: string; photo_url: string | null; display_order: number; is_visible: boolean; }
interface SectionData { id: string; section_key: string; title: string; subtitle: string; items: SectionItem[]; }
interface SectionItem { icon: string; title: string; desc: string; }

export default function AdminHomepageControl() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [hero, setHero] = useState<HeroContent | null>(null);
  const [seo, setSeo] = useState<SeoMeta | null>(null);
  const [footerPages, setFooterPages] = useState<FooterPage[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [sections, setSections] = useState<SectionData[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("branding");

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [statsRes, faqRes, heroRes, seoRes, pagesRes, teamRes, settingsRes, sectionsRes] = await Promise.all([
      supabase.from("platform_stats").select("*"),
      supabase.from("homepage_faq").select("*").order("display_order"),
      supabase.from("homepage_hero").select("*").limit(1).maybeSingle(),
      supabase.from("homepage_seo").select("*").limit(1).maybeSingle(),
      supabase.from("footer_pages").select("*").order("display_order"),
      supabase.from("team_members").select("*").order("display_order"),
      supabase.from("site_settings").select("key, value"),
      supabase.from("homepage_sections").select("*"),
    ]);
    if (statsRes.data) setStats(statsRes.data);
    if (faqRes.data) setFaqs(faqRes.data);
    if (heroRes.data) setHero(heroRes.data);
    if (seoRes.data) setSeo(seoRes.data);
    if (pagesRes.data) setFooterPages(pagesRes.data);
    if (teamRes.data) setTeamMembers(teamRes.data);
    if (sectionsRes.data) setSections(sectionsRes.data.map((s: any) => ({ ...s, items: (s.items as unknown as SectionItem[]) || [] })));
    if (settingsRes.data) {
      settingsRes.data.forEach((s: any) => {
        if (s.key === "logo_url") setLogoUrl(s.value);
        if (s.key === "favicon_url") setFaviconUrl(s.value);
      });
    }
  };

  /* ── file upload helper ── */
  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("site-media").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed: " + error.message); return null; }
    const { data } = supabase.storage.from("site-media").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving("logo");
    const url = await uploadFile(file, "logos");
    if (url) {
      await supabase.from("site_settings").update({ value: url }).eq("key", "logo_url");
      setLogoUrl(url);
      toast.success("Logo updated");
    }
    setSaving(null);
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving("favicon");
    const url = await uploadFile(file, "favicons");
    if (url) {
      await supabase.from("site_settings").update({ value: url }).eq("key", "favicon_url");
      setFaviconUrl(url);
      toast.success("Favicon updated");
    }
    setSaving(null);
  };

  /* ── stat helpers ── */
  const saveStat = async (stat: Stat) => {
    setSaving(stat.id);
    const { error } = await supabase.from("platform_stats").update({ value: stat.value, auto_calculate: stat.auto_calculate }).eq("id", stat.id);
    setSaving(null);
    if (error) toast.error("Failed to save stat"); else toast.success("Stat updated");
  };

  /* ── FAQ helpers ── */
  const saveFaq = async (faq: Faq) => {
    setSaving(faq.id);
    const { error } = await supabase.from("homepage_faq").update({ question: faq.question, answer: faq.answer, display_order: faq.display_order, is_visible: faq.is_visible }).eq("id", faq.id);
    setSaving(null);
    if (error) toast.error("Failed to save FAQ"); else toast.success("FAQ updated");
  };
  const addFaq = async () => {
    await supabase.from("homepage_faq").insert({ question: "New Question", answer: "Answer here...", display_order: faqs.length + 1 });
    loadAll();
  };
  const deleteFaq = async (id: string) => { await supabase.from("homepage_faq").delete().eq("id", id); loadAll(); };

  /* ── Hero helpers ── */
  const saveHero = async () => {
    if (!hero) return;
    setSaving("hero");
    const { error } = await supabase.from("homepage_hero").update({ headline: hero.headline, subheadline: hero.subheadline, primary_cta_text: hero.primary_cta_text, secondary_cta_text: hero.secondary_cta_text }).eq("id", hero.id);
    setSaving(null);
    if (error) toast.error("Failed to save hero content"); else toast.success("Hero content updated");
  };

  /* ── SEO helpers ── */
  const saveSeo = async () => {
    if (!seo) return;
    setSaving("seo");
    const { error } = await supabase.from("homepage_seo").update({ meta_title: seo.meta_title, meta_description: seo.meta_description, og_title: seo.og_title, og_description: seo.og_description, og_image: seo.og_image, keywords: seo.keywords }).eq("id", seo.id);
    setSaving(null);
    if (error) toast.error("Failed to save SEO settings"); else toast.success("SEO settings updated");
  };

  /* ── Footer page helpers ── */
  const saveFooterPage = async (page: FooterPage) => {
    setSaving(page.id);
    const { error } = await supabase.from("footer_pages").update({ title: page.title, slug: page.slug, content: page.content, is_visible: page.is_visible, display_order: page.display_order }).eq("id", page.id);
    setSaving(null);
    if (error) toast.error("Failed to save page"); else toast.success("Page updated");
  };
  const addFooterPage = async () => {
    await supabase.from("footer_pages").insert({ title: "New Page", slug: "new-page-" + Date.now(), content: "<p>Page content here...</p>", display_order: footerPages.length + 1 });
    loadAll();
  };
  const deleteFooterPage = async (id: string) => { await supabase.from("footer_pages").delete().eq("id", id); loadAll(); };

  /* ── Team helpers ── */
  const saveTeamMember = async (member: TeamMember) => {
    setSaving(member.id);
    const { error } = await supabase.from("team_members").update({ name: member.name, role: member.role, bio: member.bio, photo_url: member.photo_url, display_order: member.display_order, is_visible: member.is_visible }).eq("id", member.id);
    setSaving(null);
    if (error) toast.error("Failed to save team member"); else toast.success("Team member updated");
  };
  const addTeamMember = async () => {
    await supabase.from("team_members").insert({ name: "New Member", role: "Role", bio: "Short bio...", display_order: teamMembers.length + 1 });
    loadAll();
  };
  const deleteTeamMember = async (id: string) => { await supabase.from("team_members").delete().eq("id", id); loadAll(); };
  const handleTeamPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, memberId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file, "team_photos");
    if (url) {
      setTeamMembers((m) => m.map((x) => x.id === memberId ? { ...x, photo_url: url } : x));
    }
  };

  const tabs = [
    { key: "branding", label: "Branding", icon: Image },
    { key: "hero", label: "Hero", icon: Type },
    { key: "stats", label: "Stats", icon: BarChart3 },
    { key: "faq", label: "FAQ", icon: HelpCircle },
    { key: "pages", label: "Pages", icon: FileText },
    { key: "team", label: "Team", icon: Users },
    { key: "seo", label: "SEO", icon: Search },
  ];

  const sectionAnim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

  return (
    <motion.div {...sectionAnim} className="space-y-6 max-w-5xl">
      <h2 className="font-display font-bold text-xl sm:text-2xl">Homepage Control</h2>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key ? "bg-primary text-primary-foreground" : "bg-card/50 text-muted-foreground hover:text-foreground border border-border/40"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── BRANDING ── */}
      {activeTab === "branding" && (
        <div className="glass-card p-5 sm:p-6 space-y-6">
          <h3 className="flex items-center gap-2 text-lg font-display font-semibold">
            <Image className="w-5 h-5 text-primary" /> Site Branding
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Logo */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Site Logo</Label>
              <p className="text-xs text-muted-foreground">PNG, JPG, or SVG. Recommended: 200×60px</p>
              {logoUrl && <img src={logoUrl} alt="Current logo" className="h-12 object-contain rounded border border-border/40 p-2 bg-card/50" />}
              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <input type="file" accept=".png,.jpg,.jpeg,.svg" className="hidden" onChange={handleLogoUpload} />
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border/40 text-sm hover:bg-accent transition-colors">
                    <Upload className="w-3.5 h-3.5" /> Upload Logo
                  </span>
                </label>
                {saving === "logo" && <span className="text-xs text-muted-foreground animate-pulse">Uploading...</span>}
              </div>
            </div>
            {/* Favicon */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Favicon</Label>
              <p className="text-xs text-muted-foreground">PNG or ICO. Standard: 32×32px</p>
              {faviconUrl && <img src={faviconUrl} alt="Current favicon" className="w-8 h-8 object-contain rounded border border-border/40 p-1 bg-card/50" />}
              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <input type="file" accept=".png,.ico" className="hidden" onChange={handleFaviconUpload} />
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border/40 text-sm hover:bg-accent transition-colors">
                    <Upload className="w-3.5 h-3.5" /> Upload Favicon
                  </span>
                </label>
                {saving === "favicon" && <span className="text-xs text-muted-foreground animate-pulse">Uploading...</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      {activeTab === "hero" && hero && (
        <div className="glass-card p-5 sm:p-6 space-y-4">
          <h3 className="flex items-center gap-2 text-lg font-display font-semibold">
            <Type className="w-5 h-5 text-primary" /> Hero Content
          </h3>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Headline</Label>
              <Input value={hero.headline} onChange={(e) => setHero({ ...hero, headline: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Subheadline</Label>
              <Textarea value={hero.subheadline} onChange={(e) => setHero({ ...hero, subheadline: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Primary CTA</Label>
                <Input value={hero.primary_cta_text} onChange={(e) => setHero({ ...hero, primary_cta_text: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Secondary CTA</Label>
                <Input value={hero.secondary_cta_text} onChange={(e) => setHero({ ...hero, secondary_cta_text: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={saveHero} disabled={saving === "hero"}><Save className="w-4 h-4 mr-2" /> Save Hero</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── STATS ── */}
      {activeTab === "stats" && (
        <div className="glass-card p-5 sm:p-6 space-y-4">
          <h3 className="flex items-center gap-2 text-lg font-display font-semibold">
            <BarChart3 className="w-5 h-5 text-primary" /> Live Platform Stats
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.map((stat) => (
              <div key={stat.id} className="rounded-xl border border-border/40 bg-card/50 p-4 space-y-3">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <Input value={stat.value} disabled={stat.auto_calculate} onChange={(e) => setStats((s) => s.map((x) => x.id === stat.id ? { ...x, value: e.target.value } : x))} />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch checked={stat.auto_calculate} onCheckedChange={(v) => setStats((s) => s.map((x) => x.id === stat.id ? { ...x, auto_calculate: v } : x))} />
                    Auto-calculate
                  </label>
                  <Button size="sm" onClick={() => saveStat(stat)} disabled={saving === stat.id}><Save className="w-3.5 h-3.5 mr-1" /> Save</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FAQ ── */}
      {activeTab === "faq" && (
        <div className="glass-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-display font-semibold">
              <HelpCircle className="w-5 h-5 text-primary" /> FAQ Manager
            </h3>
            <Button size="sm" variant="outline" onClick={addFaq}><Plus className="w-3.5 h-3.5 mr-1" /> Add FAQ</Button>
          </div>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.id} className="rounded-xl border border-border/40 bg-card/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Input value={faq.question} onChange={(e) => setFaqs((f) => f.map((x) => x.id === faq.id ? { ...x, question: e.target.value } : x))} placeholder="Question" className="font-medium" />
                </div>
                <Textarea value={faq.answer} onChange={(e) => setFaqs((f) => f.map((x) => x.id === faq.id ? { ...x, answer: e.target.value } : x))} placeholder="Answer" rows={3} />
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Order:</Label>
                  <Input type="number" value={faq.display_order} onChange={(e) => setFaqs((f) => f.map((x) => x.id === faq.id ? { ...x, display_order: parseInt(e.target.value) || 0 } : x))} className="w-20" />
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Switch checked={faq.is_visible} onCheckedChange={(v) => setFaqs((f) => f.map((x) => x.id === faq.id ? { ...x, is_visible: v } : x))} />
                      {faq.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />} Visible
                    </label>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteFaq(faq.id)}><Trash2 className="w-3.5 h-3.5 mr-1" /> Delete</Button>
                  </div>
                  <Button size="sm" onClick={() => saveFaq(faq)} disabled={saving === faq.id}><Save className="w-3.5 h-3.5 mr-1" /> Save</Button>
                </div>
              </div>
            ))}
            {faqs.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No FAQs yet.</p>}
          </div>
        </div>
      )}

      {/* ── FOOTER PAGES ── */}
      {activeTab === "pages" && (
        <div className="glass-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-display font-semibold">
              <FileText className="w-5 h-5 text-primary" /> Footer Pages
            </h3>
            <Button size="sm" variant="outline" onClick={addFooterPage}><Plus className="w-3.5 h-3.5 mr-1" /> Add Page</Button>
          </div>
          <div className="space-y-4">
            {footerPages.map((page) => (
              <div key={page.id} className="rounded-xl border border-border/40 bg-card/50 p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Title</Label>
                    <Input value={page.title} onChange={(e) => setFooterPages((p) => p.map((x) => x.id === page.id ? { ...x, title: e.target.value } : x))} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Slug</Label>
                    <Input value={page.slug} onChange={(e) => setFooterPages((p) => p.map((x) => x.id === page.id ? { ...x, slug: e.target.value } : x))} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Content (HTML)</Label>
                  <Textarea value={page.content} onChange={(e) => setFooterPages((p) => p.map((x) => x.id === page.id ? { ...x, content: e.target.value } : x))} rows={5} className="font-mono text-xs" />
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Switch checked={page.is_visible} onCheckedChange={(v) => setFooterPages((p) => p.map((x) => x.id === page.id ? { ...x, is_visible: v } : x))} />
                      Visible
                    </label>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteFooterPage(page.id)}><Trash2 className="w-3.5 h-3.5 mr-1" /> Delete</Button>
                  </div>
                  <Button size="sm" onClick={() => saveFooterPage(page)} disabled={saving === page.id}><Save className="w-3.5 h-3.5 mr-1" /> Save</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TEAM ── */}
      {activeTab === "team" && (
        <div className="glass-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-display font-semibold">
              <Users className="w-5 h-5 text-primary" /> Team Management
            </h3>
            <Button size="sm" variant="outline" onClick={addTeamMember}><Plus className="w-3.5 h-3.5 mr-1" /> Add Member</Button>
          </div>
          <div className="space-y-4">
            {teamMembers.map((member) => (
              <div key={member.id} className="rounded-xl border border-border/40 bg-card/50 p-4 space-y-3">
                <div className="flex items-start gap-4">
                  <div className="shrink-0">
                    {member.photo_url ? (
                      <img src={member.photo_url} alt={member.name} className="w-16 h-16 rounded-full object-cover border border-border/40" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <Users className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <label className="cursor-pointer mt-2 block">
                      <input type="file" accept=".png,.jpg,.jpeg" className="hidden" onChange={(e) => handleTeamPhotoUpload(e, member.id)} />
                      <span className="text-xs text-primary hover:underline">Change photo</span>
                    </label>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Name</Label>
                        <Input value={member.name} onChange={(e) => setTeamMembers((t) => t.map((x) => x.id === member.id ? { ...x, name: e.target.value } : x))} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Role</Label>
                        <Input value={member.role} onChange={(e) => setTeamMembers((t) => t.map((x) => x.id === member.id ? { ...x, role: e.target.value } : x))} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Bio</Label>
                      <Textarea value={member.bio} onChange={(e) => setTeamMembers((t) => t.map((x) => x.id === member.id ? { ...x, bio: e.target.value } : x))} rows={2} />
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Switch checked={member.is_visible} onCheckedChange={(v) => setTeamMembers((t) => t.map((x) => x.id === member.id ? { ...x, is_visible: v } : x))} />
                      Visible
                    </label>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteTeamMember(member.id)}><Trash2 className="w-3.5 h-3.5 mr-1" /> Delete</Button>
                  </div>
                  <Button size="sm" onClick={() => saveTeamMember(member)} disabled={saving === member.id}><Save className="w-3.5 h-3.5 mr-1" /> Save</Button>
                </div>
              </div>
            ))}
            {teamMembers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No team members yet.</p>}
          </div>
        </div>
      )}

      {/* ── SEO ── */}
      {activeTab === "seo" && seo && (
        <div className="glass-card p-5 sm:p-6 space-y-4">
          <h3 className="flex items-center gap-2 text-lg font-display font-semibold">
            <Search className="w-5 h-5 text-primary" /> SEO Meta Control
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Meta Title</Label>
                <Input value={seo.meta_title} onChange={(e) => setSeo({ ...seo, meta_title: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">OG Title</Label>
                <Input value={seo.og_title} onChange={(e) => setSeo({ ...seo, og_title: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Meta Description</Label>
              <Textarea value={seo.meta_description} onChange={(e) => setSeo({ ...seo, meta_description: e.target.value })} rows={2} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">OG Description</Label>
              <Textarea value={seo.og_description} onChange={(e) => setSeo({ ...seo, og_description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Social Share Image URL</Label>
                <Input value={seo.og_image} onChange={(e) => setSeo({ ...seo, og_image: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Keywords</Label>
                <Input value={seo.keywords} onChange={(e) => setSeo({ ...seo, keywords: e.target.value })} placeholder="crypto, arbitrage, AI" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={saveSeo} disabled={saving === "seo"}><Save className="w-4 h-4 mr-2" /> Save SEO</Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
