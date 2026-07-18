import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Users, Search } from "lucide-react";
import { useState } from "react";

export default function BotUserOverrides() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const perPage = 10;

  const { data: bots } = useQuery({
    queryKey: ["bot-user-overrides"],
    queryFn: async () => {
      const { data } = await supabase.from("bot_activity").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = bots?.filter(b => b.user_id.toLowerCase().includes(search.toLowerCase())) ?? [];
  const paged = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const updateBot = async (id: string, userId: string, field: string, value: any, prev: any) => {
    const { error } = await supabase.from("bot_activity").update({ [field]: value }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    const user = (await supabase.auth.getUser()).data.user;
    await supabase.from("bot_logs").insert({
      admin_id: user?.id,
      user_id: userId,
      action_type: `override_${field}`,
      category: "override",
      previous_value: String(prev),
      new_value: String(value),
    });
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["bot-user-overrides"] });
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold text-base">User Override Controls</h3>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search user ID..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-8 w-56 h-9 text-sm" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30">
              {["User ID", "Bot Status", "Risk Level", "Daily Cap", "Trades Today", "Exposure", "Compound"].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map(b => (
              <tr key={b.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                <td className="px-3 py-2.5 font-mono text-xs">{b.user_id.slice(0, 10)}...</td>
                <td className="px-3 py-2.5">
                  <Switch checked={b.bot_enabled} onCheckedChange={(v) => updateBot(b.id, b.user_id, "bot_enabled", v, b.bot_enabled)} />
                </td>
                <td className="px-3 py-2.5">
                  <Select value={b.risk_profile} onValueChange={(v) => updateBot(b.id, b.user_id, "risk_profile", v, b.risk_profile)}>
                    <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conservative">Conservative</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="aggressive">Aggressive</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2.5">
                  <Input type="number" className="h-8 w-20 text-xs" value={b.daily_trade_limit} onChange={(e) => updateBot(b.id, b.user_id, "daily_trade_limit", Number(e.target.value), b.daily_trade_limit)} />
                </td>
                <td className="px-3 py-2.5">{b.trades_today}</td>
                <td className="px-3 py-2.5 text-warning">${Number(b.profit_today).toFixed(2)}</td>
                <td className="px-3 py-2.5">
                  <Switch checked={b.compound_profits} onCheckedChange={(v) => updateBot(b.id, b.user_id, "compound_profits", v, b.compound_profits)} />
                </td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Page {page + 1} of {totalPages}</span>
          <div className="flex gap-1">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-2 py-1 rounded bg-secondary/50 disabled:opacity-30">Prev</button>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-2 py-1 rounded bg-secondary/50 disabled:opacity-30">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
