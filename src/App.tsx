import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Recharge from "./pages/Recharge";
import Withdrawal from "./pages/Withdrawal";
import Admin from "./pages/Admin";
import BankAccounts from "./pages/mine/BankAccounts";
import Records from "./pages/mine/Records";
import About from "./pages/mine/About";
import Rules from "./pages/mine/Rules";
import Support from "./pages/mine/Support";
import ChangePassword from "./pages/mine/ChangePassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/recharge" element={<ProtectedRoute><Recharge /></ProtectedRoute>} />
            <Route path="/withdrawal" element={<ProtectedRoute><Withdrawal /></ProtectedRoute>} />
            <Route path="/mine/bank-accounts" element={<ProtectedRoute><BankAccounts /></ProtectedRoute>} />
            <Route path="/mine/records" element={<ProtectedRoute><Records /></ProtectedRoute>} />
            <Route path="/mine/about" element={<ProtectedRoute><About /></ProtectedRoute>} />
            <Route path="/mine/rules" element={<ProtectedRoute><Rules /></ProtectedRoute>} />
            <Route path="/mine/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
            <Route path="/mine/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
