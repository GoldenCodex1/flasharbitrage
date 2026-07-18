import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";

export default function BotAnalytics() {
  const { data: chartData } = useQuery({
    queryKey: ["bot-analytics-7d"],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 7);
      const { data } = await supabase.from("trade_entries").select("profit, completed_at").eq("status", "completed").gte("completed_at", since.toISOString());
      
      const days: Record<string, { profit: number; loss: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString("en-US", { weekday: "short" });
        days[key] = { profit: 0, loss: 0 };
      }
      
      data?.forEach(t => {
        if (!t.completed_at) return;
        const key = new Date(t.completed_at).toLocaleDateString("en-US", { weekday: "short" });
        if (days[key]) {
          const p = Number(t.profit);
          if (p >= 0) days[key].profit += p;
          else days[key].loss += Math.abs(p);
        }
      });

      return Object.entries(days).map(([name, v]) => ({ name, ...v }));
    },
  });

  const { data: winLoss } = useQuery({
    queryKey: ["bot-analytics-winloss"],
    queryFn: async () => {
      const { data } = await supabase.from("trade_entries").select("profit").eq("status", "completed");
      const wins = data?.filter(t => Number(t.profit) > 0).length ?? 0;
      const losses = data?.filter(t => Number(t.profit) <= 0).length ?? 0;
      return [
        { name: "Wins", value: wins },
        { name: "Losses", value: losses },
      ];
    },
  });

  const COLORS = ["hsl(160, 84%, 39%)", "hsl(0, 72%, 51%)"];

  return (
    <div className="glass-card p-5 space-y-5">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h3 className="font-display font-semibold text-base">Performance Analytics</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 7-Day P&L Chart */}
        <div className="lg:col-span-2 p-4 rounded-xl bg-secondary/20 border border-border/20">
          <p className="text-xs text-muted-foreground mb-3">7-Day Profit & Loss</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 20%, 18%)" />
              <XAxis dataKey="name" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "hsl(222, 41%, 10%)", border: "1px solid hsl(222, 20%, 18%)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="profit" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="loss" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Win/Loss Pie */}
        <div className="p-4 rounded-xl bg-secondary/20 border border-border/20">
          <p className="text-xs text-muted-foreground mb-3">Win/Loss Ratio</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={winLoss ?? []} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                {winLoss?.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(222, 41%, 10%)", border: "1px solid hsl(222, 20%, 18%)", borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 text-xs mt-2">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> Wins: {winLoss?.[0]?.value ?? 0}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> Losses: {winLoss?.[1]?.value ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
