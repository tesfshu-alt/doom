import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Package, Users, User, CreditCard, Wallet, TrendingUp, AlertCircle, CheckCircle, MessageCircle, XCircle } from "lucide-react";
import Layout from "@/components/Layout";
import { useEffect } from "react";
import { useAvailableBalance } from "@/hooks/useAvailableBalance";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import BonusCodeClaim from "@/components/BonusCodeClaim";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: activeProducts } = useQuery({
    queryKey: ['activeProducts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_products')
        .select('*, products(*)')
        .eq('user_id', user?.id)
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: availableBalance } = useAvailableBalance(user?.id);

  const { data: telegramContact } = useQuery({
    queryKey: ['telegram-contact'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_service_contacts')
        .select('*')
        .eq('contact_type', 'telegram')
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: recentRecharges } = useQuery({
    queryKey: ['recent-recharges', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recharges')
        .select('*, products(name)')
        .eq('user_id', user?.id)
        .in('status', ['rejected', 'approved'])
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: recentWithdrawals } = useQuery({
    queryKey: ['recent-withdrawals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*, bank_accounts(account_name, bank_name)')
        .eq('user_id', user?.id)
        .in('status', ['rejected', 'approved'])
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Set up real-time subscription for user_products
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('user-products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_products',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refetch active products when changes occur
          queryClient.invalidateQueries({ queryKey: ['activeProducts', user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refetch when transactions change
          queryClient.invalidateQueries({ queryKey: ['activeProducts', user.id] });
          queryClient.invalidateQueries({ queryKey: ['availableBalance', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const shortcuts = [
    {
      icon: Package,
      label: "Products",
      description: "View all packages",
      path: "/products",
      gradient: "from-slate-900 to-blue-900",
    },
    {
      icon: Users,
      label: "Team",
      description: "View referrals",
      path: "/team",
      gradient: "from-blue-950 to-slate-900",
    },
    {
      icon: User,
      label: "My Account",
      description: "Profile & settings",
      path: "/mine",
      gradient: "from-slate-800 to-blue-800",
    },
    {
      icon: CreditCard,
      label: "Recharge",
      description: "Add funds",
      path: "/recharge",
      gradient: "from-blue-900 to-cyan-900",
    },
  ];

  const totalInvestment = activeProducts?.reduce((sum, p) => sum + Number(p.products?.price || 0), 0) || 0;
  const totalDailyIncome = activeProducts?.reduce((sum, p) => sum + Number(p.products?.daily_income || 0), 0) || 0;

  return (
    <Layout>
      <div className="max-w-lg mx-auto p-4 space-y-6">
        <div className="space-y-2 animate-fade-in">
          <h1 className="text-2xl font-bold">Welcome Back!</h1>
          <p className="text-muted-foreground">Phone: {profile?.phone_number}</p>
        </div>

        <Card className="shadow-elevated bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800 animate-fade-in border-2 border-blue-500/30">
          <CardContent className="p-6 text-center space-y-2">
            <p className="text-sm text-blue-300/90">Available Balance</p>
            <p className="text-4xl font-bold text-white">ETB {(availableBalance || 0).toFixed(2)}</p>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => navigate('/mine/records')}
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white border-0"
            >
              View Transaction History
            </Button>
          </CardContent>
        </Card>

        {/* Withdrawal Eligibility Alert */}
        {(availableBalance || 0) < 300 ? (
          <Card className="animate-fade-in border-2 border-blue-500/40 shadow-elevated bg-gradient-to-br from-slate-900 to-slate-800">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-400" />
                    <p className="font-bold text-white">
                      Withdrawal Progress
                    </p>
                  </div>
                  <p className="text-sm text-blue-200">
                    ETB {(availableBalance || 0).toFixed(2)} / ETB 300.00
                  </p>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => navigate('/products')}
                  className="bg-blue-600 hover:bg-blue-700 text-white border-0"
                >
                  Buy Products
                </Button>
              </div>
              <div className="space-y-2">
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-700 border border-blue-500/30">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-500"
                    style={{ width: `${((availableBalance || 0) / 300) * 100}%` }}
                  />
                </div>
                <p className="text-xs font-medium text-blue-200 text-center">
                  Need ETB {(300 - (availableBalance || 0)).toFixed(2)} more to reach minimum withdrawal
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (activeProducts?.length ?? 0) === 0 ? (
          <Alert className="animate-fade-in border-2 border-amber-500/50 bg-gradient-to-r from-slate-900 to-slate-800 shadow-elevated">
            <AlertCircle className="h-5 w-5 text-amber-400" />
            <AlertDescription className="flex items-center justify-between">
              <div>
                <p className="font-bold text-white">
                  Purchase a product to withdraw
                </p>
                <p className="text-sm text-slate-200 mt-1">
                  You have ETB {(availableBalance || 0).toFixed(2)} available
                </p>
              </div>
              <Button 
                size="sm" 
                onClick={() => navigate('/products')}
                className="ml-2 bg-blue-600 hover:bg-blue-700 text-white border-0"
              >
                View Products
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="animate-fade-in border-2 border-green-500/50 bg-gradient-to-r from-slate-900 to-slate-800 shadow-elevated">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <AlertDescription className="flex items-center justify-between">
              <div>
                <p className="font-bold text-white">
                  You can now withdraw!
                </p>
                <p className="text-sm text-slate-200 mt-1">
                  Available: ETB {(availableBalance || 0).toFixed(2)}
                </p>
              </div>
              <Button 
                size="sm" 
                onClick={() => navigate('/withdrawal')}
                className="ml-2 bg-green-600 hover:bg-green-700 text-white border-0"
              >
                Withdraw Now
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Recharge Status Messages */}
        {recentRecharges?.map((recharge) => (
          recharge.status === 'rejected' ? (
            <Alert key={recharge.id} className="animate-fade-in bg-gradient-to-r from-slate-900 to-slate-800 border-2 border-red-500 shadow-elevated">
              <XCircle className="h-5 w-5 text-red-500" />
              <AlertDescription>
                <p className="font-bold text-red-400 text-base">
                  ⚠️ Recharge Request Rejected
                </p>
                <p className="text-sm text-slate-200 mt-2 leading-relaxed">
                  Please pay the amount before requesting.
                </p>
                <p className="text-xs text-slate-300 mt-1 font-medium">
                  Product: {recharge.products?.name} • ETB {recharge.amount}
                </p>
              </AlertDescription>
            </Alert>
          ) : recharge.status === 'approved' ? (
            <Alert key={recharge.id} className="animate-fade-in bg-gradient-to-r from-blue-950 to-blue-900 border-2 border-blue-400 shadow-elevated">
              <CheckCircle className="h-5 w-5 text-blue-400" />
              <AlertDescription>
                <p className="font-bold text-blue-300 text-base">
                  🎉 Congratulations!
                </p>
                <p className="text-sm text-slate-100 mt-2 leading-relaxed">
                  Your product is now working and generating income!
                </p>
                <p className="text-xs text-blue-200 mt-1 font-medium">
                  {recharge.products?.name} • ETB {recharge.amount}
                </p>
              </AlertDescription>
            </Alert>
          ) : null
        ))}

        {/* Withdrawal Status Messages */}
        {recentWithdrawals?.map((withdrawal) => (
          withdrawal.status === 'rejected' ? (
            <Alert key={withdrawal.id} className="animate-fade-in bg-gradient-to-r from-slate-900 to-slate-800 border-2 border-red-500 shadow-elevated">
              <XCircle className="h-5 w-5 text-red-500" />
              <AlertDescription>
                <p className="font-bold text-red-400 text-base">
                  ⚠️ Withdrawal Request Rejected
                </p>
                <p className="text-sm text-slate-200 mt-2 leading-relaxed">
                  Dear user, you didn't invest or at least 3 of your team members must invest to be eligible for free withdrawal (withdrawal without investment).
                </p>
                <p className="text-xs text-slate-300 mt-1 font-medium">
                  ETB {withdrawal.amount}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Requested: {format(new Date(withdrawal.created_at), 'MMM dd, yyyy HH:mm')} • Reviewed: {withdrawal.approved_at ? format(new Date(withdrawal.approved_at), 'MMM dd, yyyy HH:mm') : 'Pending'}
                </p>
              </AlertDescription>
            </Alert>
          ) : withdrawal.status === 'approved' ? (
            <Alert key={withdrawal.id} className="animate-fade-in bg-gradient-to-r from-blue-950 to-blue-900 border-2 border-blue-400 shadow-elevated">
              <CheckCircle className="h-5 w-5 text-blue-400" />
              <AlertDescription>
                <p className="font-bold text-blue-300 text-base">
                  🎉 Congratulations!
                </p>
                <p className="text-sm text-slate-100 mt-2 leading-relaxed">
                  Your withdrawal request has been approved! The amount will be transferred to your account shortly.
                </p>
                <p className="text-xs text-blue-200 mt-1 font-medium">
                  ETB {withdrawal.amount} • {withdrawal.bank_accounts?.bank_name}
                </p>
                <p className="text-xs text-blue-300 mt-1">
                  Requested: {format(new Date(withdrawal.created_at), 'MMM dd, yyyy HH:mm')} • Approved: {withdrawal.approved_at ? format(new Date(withdrawal.approved_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
                </p>
              </AlertDescription>
            </Alert>
          ) : null
        ))}

        <div className="grid grid-cols-2 gap-4 animate-fade-in">
          <Card className="shadow-elevated bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-blue-500/30">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-2 text-blue-300">
                <Wallet className="h-5 w-5" />
                <span className="text-sm font-medium">Total Investment</span>
              </div>
              <p className="text-2xl font-bold text-white">ETB {totalInvestment.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card className="shadow-elevated bg-gradient-to-br from-blue-950 to-slate-900 border-2 border-cyan-500/30">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-2 text-cyan-300">
                <TrendingUp className="h-5 w-5" />
                <span className="text-sm font-medium">Daily Income</span>
              </div>
              <p className="text-2xl font-bold text-white">ETB {totalDailyIncome.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Quick Access</h2>
          <div className="grid grid-cols-2 gap-4">
            {shortcuts.map((shortcut) => {
              const Icon = shortcut.icon;
              return (
                <Card
                  key={shortcut.path}
                  className="cursor-pointer hover:shadow-elevated transition-all duration-300 overflow-hidden group shadow-elevated border-2 border-blue-500/20 hover:border-blue-400/40"
                  onClick={() => navigate(shortcut.path)}
                >
                  <CardContent className="p-0">
                    <div className={`bg-gradient-to-br ${shortcut.gradient} p-4 h-24 flex flex-col justify-between border-b-2 border-blue-400/30`}>
                      <Icon className="h-8 w-8 text-blue-200 group-hover:text-white transition-colors" />
                      <div>
                        <p className="font-bold text-white text-sm">{shortcut.label}</p>
                        <p className="text-xs text-blue-200">{shortcut.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {telegramContact && (
          <Card className="shadow-elevated animate-fade-in bg-gradient-to-br from-blue-950 via-slate-900 to-blue-900 border-2 border-blue-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500/20 p-3 rounded-full border border-blue-400/30">
                    <MessageCircle className="h-6 w-6 text-blue-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Join Our Telegram</h3>
                    <p className="text-sm text-blue-200">{telegramContact.value}</p>
                  </div>
                </div>
                <Button 
                  variant="secondary"
                  size="sm"
                  onClick={() => window.open(telegramContact.link, '_blank')}
                  className="bg-blue-600 hover:bg-blue-700 text-white border-0"
                >
                  Join Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <BonusCodeClaim />

        {activeProducts && activeProducts.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Active Products</h2>
            <div className="space-y-2">
              {activeProducts.filter(p => p.products).map((product) => (
                <Card key={product.id} className="shadow-card">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{product.products.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          ETB {product.products.daily_income}/day
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">ETB {product.products.price}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.products.validity_days} days
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
