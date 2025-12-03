import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LogOut, Info, FileText, History, Headphones, CreditCard, ChevronRight, Wallet, Key } from "lucide-react";

const AccountSection = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { icon: CreditCard, label: "Bank Accounts", description: "Manage bank details", path: "/mine/bank-accounts", color: "text-blue-500" },
    { icon: Key, label: "Change Password", description: "Update password", path: "/mine/change-password", color: "text-purple-500" },
    { icon: Wallet, label: "Withdrawal", description: "Request payout", path: "/withdrawal", color: "text-green-500" },
    { icon: History, label: "Records", description: "Transaction history", path: "/mine/records", color: "text-orange-500" },
    { icon: Info, label: "About Us", description: "About platform", path: "/mine/about", color: "text-cyan-500" },
    { icon: FileText, label: "Rules", description: "Terms & conditions", path: "/mine/rules", color: "text-pink-500" },
    { icon: Headphones, label: "Support", description: "Get help", path: "/mine/support", color: "text-teal-500" },
  ];

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4 pb-20">
      <div className="space-y-2">
        <h2 className="text-xl font-bold">My Account</h2>
        <p className="text-sm text-muted-foreground">Manage your profile and settings</p>
      </div>

      <div className="space-y-2">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Card key={item.path} className="cursor-pointer hover:shadow-elevated transition-all shadow-card animate-fade-in" style={{ animationDelay: `${index * 30}ms` }} onClick={() => navigate(item.path)}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={item.color}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="shadow-card">
        <CardContent className="p-3">
          <Button variant="destructive" className="w-full" onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountSection;
