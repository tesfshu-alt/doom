import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, History } from "lucide-react";
import Layout from "@/components/Layout";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const Records = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: recharges } = useQuery({
    queryKey: ['recharges', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recharges')
        .select('*, products(*)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      case 'rejected':
        return 'bg-red-500/10 text-red-700 dark:text-red-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Account Records</h1>
            <p className="text-sm text-muted-foreground">View all your transactions</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Recharge History</h2>
            {recharges && recharges.length > 0 ? (
              <div className="space-y-2">
                {recharges.map((recharge) => (
                  <Card key={recharge.id} className="shadow-card">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                            <TrendingUp className="h-5 w-5 text-white" />
                          </div>
                          <div className="space-y-1">
                            <p className="font-semibold">{recharge.products.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(recharge.created_at), 'MMM dd, yyyy HH:mm')}
                            </p>
                            <Badge className={getStatusColor(recharge.status)}>
                              {recharge.status}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-lg font-bold text-primary">${recharge.amount}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="shadow-card">
                <CardContent className="p-8 text-center">
                  <History className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No recharge history</p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Transactions</h2>
            {transactions && transactions.length > 0 ? (
              <div className="space-y-2">
                {transactions.map((transaction) => {
                  const isWithdrawal = transaction.type === 'withdrawal';
                  return (
                    <Card key={transaction.id} className="shadow-card">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isWithdrawal ? 'bg-red-500/10' : 'bg-green-500/10'
                            }`}>
                              {isWithdrawal ? (
                                <TrendingDown className="h-5 w-5 text-red-600" />
                              ) : (
                                <TrendingUp className="h-5 w-5 text-green-600" />
                              )}
                            </div>
                            <div className="space-y-1">
                              <p className="font-semibold">{transaction.description}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}
                              </p>
                              <Badge variant="outline">{transaction.type}</Badge>
                            </div>
                          </div>
                          <p className={`text-lg font-bold ${
                            isWithdrawal ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {isWithdrawal ? '-' : '+'}ETB {Math.abs(Number(transaction.amount)).toFixed(2)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="shadow-card">
                <CardContent className="p-8 text-center">
                  <History className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No transactions yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Records;
