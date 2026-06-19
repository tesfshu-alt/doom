import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Users, User, CreditCard, Wallet, TrendingUp, MessageCircle, History, Headphones, FileText, Info, ChevronLeft, Shield, CheckCircle, XCircle, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useMainBalance } from "@/hooks/useMainBalance";
import WelcomePopup from "@/components/WelcomePopup";

import heroBg from "@/assets/hero-bg.jpg";
import { maskPhoneNumber } from "@/lib/maskUtils";

// Section components
import ProductsSection from "@/components/sections/ProductsSection";
import TeamSection from "@/components/sections/TeamSection";
import AccountSection from "@/components/sections/AccountSection";
import DailyGameWidget from "@/components/DailyGameWidget";

type ActiveView = "home" | "products" | "team" | "account" | "records";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>("home");
  const [showHero, setShowHero] = useState(true);

  useEffect(() => {
    if (user && sessionStorage.getItem('show_welcome') === '1') {
      setShowWelcomePopup(true);
      sessionStorage.removeItem('show_welcome');
    }
  }, [user]);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: activeProducts } = useQuery({
    queryKey: ['activeProducts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_products').select('*, products(*)').eq('user_id', user?.id).eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: latestRecharge } = useQuery({
    queryKey: ['latestRecharge', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('recharges').select('*, products(name)').eq('user_id', user?.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: latestWithdrawal } = useQuery({
    queryKey: ['latestWithdrawal', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('withdrawals').select('*').eq('user_id', user?.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: mainBalance } = useMainBalance(user?.id);

  const { data: exchangeRateSettings } = useQuery({
    queryKey: ['exchangeRateSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('setting_key', 'exchange_rate')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const exchangeRate = (exchangeRateSettings?.setting_value as { etb_to_usdt?: number })?.etb_to_usdt || 170;

  const { data: telegramContact } = useQuery({
    queryKey: ['telegram-contact'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customer_service_contacts').select('*').eq('contact_type', 'telegram').eq('is_active', true).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: isAdmin } = useQuery({
    queryKey: ['isAdmin', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user?.id).eq('role', 'admin').single();
      return !!data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('user-products-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_products', filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['activeProducts', user.id] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['mainBalance', user.id] });
        queryClient.invalidateQueries({ queryKey: ['availableBalance', user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  const totalInvestment = activeProducts?.reduce((sum, p) => sum + Number(p.products?.price || 0), 0) || 0;
  const totalDailyIncomeUSDT = activeProducts?.reduce((sum, p) => sum + Number(p.products?.daily_income || 0), 0) || 0;
  const totalDailyIncomeETB = totalDailyIncomeUSDT * exchangeRate;

  const shortcuts = [
    { icon: Package, label: "Packages", description: "View exchange packages", action: () => setActiveView("products"), gradient: "from-emerald-600 to-green-600" },
    { icon: Users, label: "Team", description: "View referrals & bonuses", action: () => setActiveView("team"), gradient: "from-teal-600 to-emerald-600" },
    { icon: User, label: "Account", description: "Profile & settings", action: () => setActiveView("account"), gradient: "from-green-600 to-teal-600" },
    { icon: CreditCard, label: "Recharge", description: "Add funds", action: () => navigate('/recharge'), gradient: "from-emerald-700 to-green-700" },
    { icon: Wallet, label: "Withdraw", description: "Request payout", action: () => navigate('/withdrawal'), gradient: "from-green-700 to-emerald-700" },
    { icon: History, label: "Records", description: "Transaction history", action: () => navigate('/mine/records'), gradient: "from-teal-700 to-green-700" },
  ];

  const quickLinks = [
    { icon: Info, label: "About", path: "/mine/about" },
    { icon: FileText, label: "Rules", path: "/mine/rules" },
    { icon: Headphones, label: "Support", path: "/mine/support" },
  ];

  // Render section views
  if (activeView !== "home") {
    return (
      <div className="min-h-screen bg-background">
        <nav className="fixed top-0 left-0 right-0 bg-card/95 backdrop-blur-md border-b border-border shadow-elevated z-50">
          <div className="max-w-lg mx-auto flex items-center h-14 px-4">
            <Button variant="ghost" size="icon" onClick={() => setActiveView("home")}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="ml-2 font-bold text-lg capitalize">{activeView}</h1>
          </div>
        </nav>
        <main className="pt-14">
          {activeView === "products" && <ProductsSection />}
          {activeView === "team" && <TeamSection />}
          {activeView === "account" && <AccountSection />}
        </main>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        {showHero && (
          <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${heroBg})` }} />
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/80 via-emerald-950/60 to-background" />
            
            <div className="relative z-10 text-center px-4 space-y-6 animate-fade-in">
              <h1 className="text-5xl md:text-7xl font-black tracking-tight">
                <span className="bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-400 bg-clip-text text-transparent">
                  DANGOTE
                </span>
              </h1>
              <p className="text-xl text-emerald-100 max-w-md mx-auto">
                Are you ready to explore your future! The place is here
              </p>
              <Button 
                size="lg"
                onClick={() => setShowHero(false)}
                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white border-0 shadow-lg shadow-emerald-500/25 animate-pulse"
              >
                Get Started
              </Button>
            </div>
          </section>
        )}

        {/* Main Dashboard Content */}
        <div className={`max-w-lg mx-auto p-4 space-y-6 ${showHero ? '' : 'pt-6'}`}>
          {/* Welcome & Balance */}
          <div className="space-y-2 animate-fade-in">
            <h2 className="text-xl font-bold">Welcome, {profile?.full_name || maskPhoneNumber(profile?.phone_number)}</h2>
          </div>

          <Card className="shadow-elevated bg-gradient-to-br from-emerald-950 via-green-950 to-emerald-900 border-2 border-emerald-500/30 animate-scale-in">
            <CardContent className="p-6 text-center space-y-2">
              <p className="text-sm text-emerald-300/90">Available Balance</p>
              <p className="text-4xl font-bold text-white">ETB {(mainBalance || 0).toFixed(2)}</p>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="shadow-card bg-gradient-to-br from-emerald-950 to-green-900 border border-emerald-500/20 animate-fade-in">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center gap-2 text-emerald-300">
                  <Wallet className="h-4 w-4" />
                  <span className="text-xs">Investment</span>
                </div>
                <p className="text-xl font-bold text-white">ETB {totalInvestment.toFixed(0)}</p>
              </CardContent>
            </Card>
            <Card className="shadow-card bg-gradient-to-br from-green-950 to-emerald-900 border border-green-500/20 animate-fade-in">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center gap-2 text-green-300">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs">Daily Income</span>
                </div>
                <p className="text-xl font-bold text-emerald-400">ETB {totalDailyIncomeETB.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Daily Game */}
          <DailyGameWidget />

          {/* Recharge/Product Status */}
          {latestRecharge && (
            <Alert className={`border-l-4 animate-fade-in ${
              latestRecharge.status === 'approved' 
                ? 'bg-emerald-950/50 border-emerald-500' 
                : latestRecharge.status === 'rejected'
                ? 'bg-red-950/50 border-red-500'
                : 'bg-yellow-950/50 border-yellow-500'
            }`}>
              <div className="flex items-center gap-2">
                {latestRecharge.status === 'approved' ? (
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                ) : latestRecharge.status === 'rejected' ? (
                  <XCircle className="h-5 w-5 text-red-400" />
                ) : (
                  <Clock className="h-5 w-5 text-yellow-400" />
                )}
                <AlertDescription className={`font-medium ${
                  latestRecharge.status === 'approved' 
                    ? 'text-emerald-200' 
                    : latestRecharge.status === 'rejected'
                    ? 'text-red-200'
                    : 'text-yellow-200'
                }`}>
                  {latestRecharge.status === 'approved' 
                    ? (activeProducts && activeProducts.length > 0
                        ? `Your purchased product ${activeProducts[activeProducts.length - 1]?.products?.name || 'package'} is now working!`
                        : 'Balance added successfully! Go to Products to purchase your investment.')
                    : latestRecharge.status === 'rejected'
                    ? 'Recharge Rejected - Please pay the product amount before requesting.'
                    : 'Recharge Pending - Waiting for admin approval.'}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Withdrawal Status */}
          {latestWithdrawal && (
            <Card className={`shadow-card animate-fade-in border-l-4 ${
              latestWithdrawal.status === 'approved' 
                ? 'bg-emerald-950/50 border-emerald-500' 
                : latestWithdrawal.status === 'rejected'
                ? 'bg-red-950/50 border-red-500'
                : 'bg-blue-950/50 border-blue-500'
            }`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {latestWithdrawal.status === 'approved' ? (
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                    ) : latestWithdrawal.status === 'rejected' ? (
                      <XCircle className="h-5 w-5 text-red-400" />
                    ) : (
                      <Clock className="h-5 w-5 text-blue-400" />
                    )}
                    <span className="font-semibold text-white">Withdrawal Status</span>
                  </div>
                  <span className={`text-sm font-medium px-2 py-1 rounded ${
                    latestWithdrawal.status === 'approved' 
                      ? 'bg-emerald-500/20 text-emerald-300' 
                      : latestWithdrawal.status === 'rejected'
                      ? 'bg-red-500/20 text-red-300'
                      : 'bg-blue-500/20 text-blue-300'
                  }`}>
                    {latestWithdrawal.status.toUpperCase()}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount: ETB {Number(latestWithdrawal.amount).toFixed(2)}</span>
                  </div>
                  <Progress 
                    value={latestWithdrawal.status === 'approved' ? 100 : latestWithdrawal.status === 'rejected' ? 0 : 50} 
                    className={`h-2 ${
                      latestWithdrawal.status === 'approved' 
                        ? '[&>div]:bg-emerald-500' 
                        : latestWithdrawal.status === 'rejected'
                        ? '[&>div]:bg-red-500'
                        : '[&>div]:bg-blue-500'
                    }`}
                  />
                  <p className={`text-xs ${
                    latestWithdrawal.status === 'approved' 
                      ? 'text-emerald-300' 
                      : latestWithdrawal.status === 'rejected'
                      ? 'text-red-300'
                      : 'text-blue-300'
                  }`}>
                    {latestWithdrawal.status === 'approved' 
                      ? 'Congratulations! Your withdrawal has been approved and will be transferred shortly.' 
                      : latestWithdrawal.status === 'rejected'
                      ? latestWithdrawal.rejection_reason || 'Your withdrawal was rejected. Please contact support.'
                      : 'Your withdrawal is being processed. Please wait for admin approval.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Admin Panel Shortcut */}
          {isAdmin && (
            <Card className="shadow-elevated bg-gradient-to-r from-amber-600 to-orange-600 animate-fade-in cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => navigate('/admin')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 text-white">
                  <Shield className="h-6 w-6" />
                  <div>
                    <p className="font-bold">Admin Panel</p>
                    <p className="text-xs text-white/80">Manage platform</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Shortcuts Grid */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Quick Access</h3>
            <div className="grid grid-cols-2 gap-3">
              {shortcuts.map((shortcut, index) => {
                const Icon = shortcut.icon;
                return (
                  <Card
                    key={shortcut.label}
                    className="cursor-pointer hover:scale-[1.03] transition-all duration-300 overflow-hidden shadow-card animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={shortcut.action}
                  >
                    <CardContent className="p-0">
                      <div className={`bg-gradient-to-br ${shortcut.gradient} p-4 h-24 flex flex-col justify-between`}>
                        <Icon className="h-7 w-7 text-white/90" />
                        <div>
                          <p className="font-bold text-white text-sm">{shortcut.label}</p>
                          <p className="text-xs text-white/70">{shortcut.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex gap-2 justify-center">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Button key={link.label} variant="outline" size="sm" onClick={() => navigate(link.path)} className="flex-1">
                  <Icon className="h-4 w-4 mr-1" />
                  {link.label}
                </Button>
              );
            })}
          </div>

          {/* Telegram */}
          {telegramContact && (
            <Card className="shadow-card bg-gradient-to-r from-emerald-950 to-green-900 border border-emerald-500/30 animate-fade-in">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-500/20 p-2 rounded-full">
                      <MessageCircle className="h-5 w-5 text-emerald-300" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">Join Telegram</p>
                      <p className="text-xs text-emerald-200">{telegramContact.value}</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => window.open(telegramContact.link, '_blank')} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    Join
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <WelcomePopup open={showWelcomePopup} onClose={() => setShowWelcomePopup(false)} />
    </>
  );
};

export default Dashboard;
