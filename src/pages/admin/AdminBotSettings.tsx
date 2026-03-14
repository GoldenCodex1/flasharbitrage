import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Power, Settings2, Wallet, Users, BarChart3, Activity, ScrollText, Bell } from "lucide-react";
import BotOverviewMetrics from "./bot/BotOverviewMetrics";
import BotGlobalControls from "./bot/BotGlobalControls";
import BotStrategyConfig from "./bot/BotStrategyConfig";
import RiskProfileConfig from "./bot/RiskProfileConfig";
import BotCapitalAllocation from "./bot/BotCapitalAllocation";
import BotUserOverrides from "./bot/BotUserOverrides";
import BotAnalytics from "./bot/BotAnalytics";
import BotEngineMonitor from "./bot/BotEngineMonitor";
import BotActivityLogs from "./bot/BotActivityLogs";
import BotAlertSettings from "./bot/BotAlertSettings";

const tabs = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "controls", label: "Controls", icon: Power },
  { value: "strategy", label: "Strategy", icon: Settings2 },
  { value: "capital", label: "Capital", icon: Wallet },
  { value: "users", label: "Users", icon: Users },
  { value: "analytics", label: "Analytics", icon: BarChart3 },
  { value: "engine", label: "Engine", icon: Activity },
  { value: "logs", label: "Logs", icon: ScrollText },
  { value: "alerts", label: "Alerts", icon: Bell },
];

export default function AdminBotSettings() {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-xl sm:text-2xl">Arbitrage Engine Control Center</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage bot operations, risk parameters, and platform exposure.</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-secondary/30 p-1 rounded-xl">
          {tabs.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="flex items-center gap-1.5 text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg px-3 py-2">
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-5">
          <BotOverviewMetrics />
          <BotEngineMonitor />
          <BotAnalytics />
        </TabsContent>

        <TabsContent value="controls">
          <BotGlobalControls />
        </TabsContent>

        <TabsContent value="strategy">
          <BotStrategyConfig />
        </TabsContent>

        <TabsContent value="capital">
          <BotCapitalAllocation />
        </TabsContent>

        <TabsContent value="users">
          <BotUserOverrides />
        </TabsContent>

        <TabsContent value="analytics">
          <BotAnalytics />
        </TabsContent>

        <TabsContent value="engine">
          <BotEngineMonitor />
        </TabsContent>

        <TabsContent value="logs">
          <BotActivityLogs />
        </TabsContent>

        <TabsContent value="alerts">
          <BotAlertSettings />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
