import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Info,
  FileText,
  History,
  Headphones,
  CreditCard,
  ChevronRight,
  Shield,
  Wallet,
} from "lucide-react";
import Layout from "@/components/Layout";

const Mine = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const { data: isAdmin } = useQuery({
    queryKey: ['isAdmin', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .eq('role', 'admin')
        .single();
      return !!data;
    },
    enabled: !!user,
  });

  const menuItems = [
    {
      icon: CreditCard,
      label: "Bank Accounts",
      description: "Manage your bank details",
      path: "/mine/bank-accounts",
      color: "text-primary",
    },
    {
      icon: Wallet,
      label: "Withdrawal",
      description: "Request payout",
      path: "/withdrawal",
      color: "text-accent",
    },
    {
      icon: History,
      label: "Account Records",
      description: "View all transactions",
      path: "/mine/records",
      color: "text-secondary",
    },
    {
      icon: Info,
      label: "About Us",
      description: "Learn about our platform",
      path: "/mine/about",
      color: "text-accent",
    },
    {
      icon: FileText,
      label: "Platform Rules",
      description: "Terms and conditions",
      path: "/mine/rules",
      color: "text-primary",
    },
    {
      icon: Headphones,
      label: "Customer Service",
      description: "Get help and support",
      path: "/mine/support",
      color: "text-secondary",
    },
  ];

  return (
    <Layout>
      <div className="max-w-lg mx-auto p-4 space-y-6">
        <div className="space-y-2 animate-fade-in">
          <h1 className="text-2xl font-bold">My Account</h1>
          <p className="text-muted-foreground">Manage your profile and settings</p>
        </div>

        {isAdmin && (
          <Card className="shadow-elevated bg-gradient-primary animate-fade-in">
            <CardContent className="p-4">
              <button
                onClick={() => navigate('/admin')}
                className="w-full flex items-center justify-between text-white"
              >
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6" />
                  <div className="text-left">
                    <p className="font-semibold text-lg">Admin Panel</p>
                    <p className="text-sm text-white/80">Manage platform settings</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5" />
              </button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.path}
                className="cursor-pointer hover:shadow-elevated transition-all duration-300 shadow-card animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => navigate(item.path)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`${item.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="shadow-card">
          <CardContent className="p-4">
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => signOut()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Mine;
