import { motion } from "framer-motion";
import GatewayRegistry from "./api/GatewayRegistry";
import ProviderConfig from "./api/ProviderConfig";
import WebhookPanel from "./api/WebhookPanel";
import HealthMonitor from "./api/HealthMonitor";
import RateLimits from "./api/RateLimits";
import ApiAuditLog from "./api/ApiAuditLog";

export default function AdminApiSettings() {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-xl sm:text-2xl">API & Payment Gateway Control</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage payment providers, webhook security, health monitoring, and rate controls.
        </p>
      </div>

      <GatewayRegistry />
      <ProviderConfig />
      <WebhookPanel />
      <HealthMonitor />
      <RateLimits />
      <ApiAuditLog />
    </motion.div>
  );
}
