import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Package, Users, User, CreditCard, Wallet, TrendingUp } from "lucide-react";
import Layout from "@/components/Layout";
import { useEffect } from "react";

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
      gradient: "from-primary to-secondary",
    },
    {
      icon: Users,
      label: "Team",
      description: "View referrals",
      path: "/team",
      gradient: "from-secondary to-primary",
    },
    {
      icon: User,
      label: "My Account",
      description: "Profile & settings",
      path: "/mine",
      gradient: "from-accent to-primary",
    },
    {
      icon: CreditCard,
      label: "Recharge",
      description: "Add funds",
      path: "/recharge",
      gradient: "from-primary to-accent",
    },
  ];

  const totalInvestment = activeProducts?.reduce((sum, p) => sum + Number(p.products.price), 0) || 0;
  const totalDailyIncome = activeProducts?.reduce((sum, p) => sum + Number(p.products.daily_income), 0) || 0;

  return (
    <Layout>
      <div className="max-w-lg mx-auto p-4 space-y-6">
        <div className="space-y-2 animate-fade-in">
          <h1 className="text-2xl font-bold">Welcome Back!</h1>
          <p className="text-muted-foreground">Phone: {profile?.phone_number}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 animate-fade-in">
          <Card className="shadow-card">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Wallet className="h-4 w-4" />
                <span className="text-sm">Total Investment</span>
              </div>
              <p className="text-2xl font-bold text-primary">ETB {totalInvestment.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Daily Income</span>
              </div>
              <p className="text-2xl font-bold text-secondary">ETB {totalDailyIncome.toFixed(2)}</p>
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
                  className="cursor-pointer hover:shadow-elevated transition-all duration-300 overflow-hidden group shadow-card"
                  onClick={() => navigate(shortcut.path)}
                >
                  <CardContent className="p-0">
                    <div className={`bg-gradient-to-br ${shortcut.gradient} p-4 h-24 flex flex-col justify-between`}>
                      <Icon className="h-8 w-8 text-white" />
                      <div>
                        <p className="font-semibold text-white text-sm">{shortcut.label}</p>
                        <p className="text-xs text-white/80">{shortcut.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {activeProducts && activeProducts.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Active Products</h2>
            <div className="space-y-2">
              {activeProducts.map((product) => (
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
