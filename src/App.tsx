import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import AdminLayout from "@/components/AdminLayout";
import Homepage from "@/pages/Homepage";
import FooterPage from "@/pages/FooterPage";
import TeamPage from "@/pages/TeamPage";
import Dashboard from "@/pages/Dashboard";
import Portfolio from "@/pages/Portfolio";
import Deposit from "@/pages/Deposit";
import Withdraw from "@/pages/Withdraw";
import TradeHistory from "@/pages/TradeHistory";
import Transactions from "@/pages/Transactions";
import AutoBot from "@/pages/AutoBot";
import Referral from "@/pages/Referral";
import Profile from "@/pages/Profile";
import Plans from "@/pages/Plans";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminTrades from "@/pages/admin/AdminTrades";
import AdminTradeCreate from "@/pages/admin/AdminTradeCreate";
import AdminTradeDetail from "@/pages/admin/AdminTradeDetail";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminUserDetail from "@/pages/admin/AdminUserDetail";
import AdminKyc from "@/pages/admin/AdminKyc";
import AdminHomepageControl from "@/pages/admin/AdminHomepageControl";
import AdminDeposits from "@/pages/admin/AdminDeposits";
import AdminWithdrawals from "@/pages/admin/AdminWithdrawals";
import AdminWallets from "@/pages/admin/AdminWallets";
import AdminTransactions from "@/pages/admin/AdminTransactions";
import AdminFinance from "@/pages/admin/AdminFinance";
import AdminReferrals from "@/pages/admin/AdminReferrals";
import AdminBotSettings from "@/pages/admin/AdminBotSettings";
import AdminSecurityLogs from "@/pages/admin/AdminSecurityLogs";
import AdminApiSettings from "@/pages/admin/AdminApiSettings";
import AdminSystemSettings from "@/pages/admin/AdminSystemSettings";
import AdminSettlementLogs from "@/pages/admin/AdminSettlementLogs";
import AdminPlans from "@/pages/admin/AdminPlans";
import AdminEmailSettings from "@/pages/admin/AdminEmailSettings";
import AdminTradeEngine from "@/pages/admin/AdminTradeEngine";
import TawkToWidget from "@/components/TawkToWidget";
import NotFound from "@/pages/NotFound";
import Apply from "@/pages/Apply";
import AdminApplications from "@/pages/admin/AdminApplications";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <TawkToWidget />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Homepage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/page/:slug" element={<FooterPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/apply" element={<Apply />} />

            {/* Protected User Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/portfolio" element={<ProtectedRoute><AppLayout><Portfolio /></AppLayout></ProtectedRoute>} />
            <Route path="/deposit" element={<ProtectedRoute><AppLayout><Deposit /></AppLayout></ProtectedRoute>} />
            <Route path="/withdraw" element={<ProtectedRoute><AppLayout><Withdraw /></AppLayout></ProtectedRoute>} />
            <Route path="/trades" element={<ProtectedRoute><AppLayout><TradeHistory /></AppLayout></ProtectedRoute>} />
            <Route path="/trade-history" element={<ProtectedRoute><AppLayout><TradeHistory /></AppLayout></ProtectedRoute>} />
            <Route path="/transactions" element={<ProtectedRoute><AppLayout><Transactions /></AppLayout></ProtectedRoute>} />
            <Route path="/auto-bot" element={<ProtectedRoute><AppLayout><AutoBot /></AppLayout></ProtectedRoute>} />
            <Route path="/referral" element={<ProtectedRoute><AppLayout><Referral /></AppLayout></ProtectedRoute>} />
            <Route path="/plans" element={<ProtectedRoute><AppLayout><Plans /></AppLayout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />

            {/* Protected Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="trades" element={<AdminTrades />} />
              <Route path="trades/create" element={<AdminTradeCreate />} />
              <Route path="trades/:id" element={<AdminTradeDetail />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="users/:id" element={<AdminUserDetail />} />
              <Route path="bot" element={<AdminBotSettings />} />
              <Route path="deposits" element={<AdminDeposits />} />
              <Route path="withdrawals" element={<AdminWithdrawals />} />
              <Route path="transactions" element={<AdminTransactions />} />
              <Route path="finance" element={<AdminFinance />} />
              <Route path="referrals" element={<AdminReferrals />} />
              <Route path="kyc" element={<AdminKyc />} />
              <Route path="wallets" element={<AdminWallets />} />
              <Route path="api" element={<AdminApiSettings />} />
              <Route path="system" element={<AdminSystemSettings />} />
              <Route path="email" element={<AdminEmailSettings />} />
              <Route path="security" element={<AdminSecurityLogs />} />
              <Route path="homepage-control" element={<AdminHomepageControl />} />
              <Route path="plans" element={<AdminPlans />} />
              <Route path="trades/settlement-logs" element={<AdminSettlementLogs />} />
              <Route path="trade-engine" element={<AdminTradeEngine />} />
              <Route path="applications" element={<AdminApplications />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
