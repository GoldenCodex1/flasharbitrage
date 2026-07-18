import { motion } from "framer-motion";
import WalletRegistry from "./wallets/WalletRegistry";
import DepositConfig from "./wallets/DepositConfig";
import WithdrawalConfig from "./wallets/WithdrawalConfig";
import LiquidityOverview from "./wallets/LiquidityOverview";
import SecurityControls from "./wallets/SecurityControls";

export default function AdminWallets() {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-xl sm:text-2xl">Wallet & Liquidity Control Center</h1>
        <p className="text-sm text-muted-foreground mt-1">Institutional treasury infrastructure — manage wallets, deposit/withdrawal policies, and liquidity coverage.</p>
      </div>

      <WalletRegistry />
      <DepositConfig />
      <WithdrawalConfig />
      <LiquidityOverview />
      <SecurityControls />
    </motion.div>
  );
}
