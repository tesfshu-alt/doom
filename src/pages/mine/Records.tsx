import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, History, DollarSign, Gift, Wallet, ShoppingCart } from "lucide-react";
import Layout from "@/components/Layout";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Records = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState("all");

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

  const filteredTransactions = transactions?.filter((t) => {
    if (selectedTab === "all") return true;
    return t.type === selectedTab;
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'daily_income':
        return <DollarSign className="h-5 w-5 text-green-600" />;
      case 'referral_bonus':
        return <Gift className="h-5 w-5 text-primary" />;
      case 'withdrawal':
        return <TrendingDown className="h-5 w-5 text-red-600" />;
      case 'recharge':
        return <Wallet className="h-5 w-5 text-blue-600" />;
      case 'purchase':
        return <ShoppingCart className="h-5 w-5 text-orange-600" />;
      default:
        return <TrendingUp className="h-5 w-5 text-green-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'daily_income':
        return 'bg-green-500/10';
      case 'referral_bonus':
        return 'bg-primary/10';
      case 'withdrawal':
        return 'bg-red-500/10';
      case 'recharge':
        return 'bg-blue-500/10';
      case 'purchase':
        return 'bg-orange-500/10';
      default:
        return 'bg-muted';
    }
  };

  const getTransactionAmountColor = (type: string) => {
    if (type === 'withdrawal' || type === 'purchase') {
      return 'text-red-600';
    }
    return 'text-green-600';
  };

  const getTransactionSign = (type: string) => {
    if (type === 'withdrawal' || type === 'purchase') {
      return '-';
    }
    return '+';
  };

  const transactionStats = {
    all: transactions?.length || 0,
    daily_income: transactions?.filter(t => t.type === 'daily_income').length || 0,
    referral_bonus: transactions?.filter(t => t.type === 'referral_bonus').length || 0,
    withdrawal: transactions?.filter(t => t.type === 'withdrawal').length || 0,
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3 animate-fade-in">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Transaction History</h1>
            <p className="text-sm text-muted-foreground">View and filter all transactions</p>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="animate-fade-in">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="text-xs">
              All ({transactionStats.all})
            </TabsTrigger>
            <TabsTrigger value="daily_income" className="text-xs">
              Income ({transactionStats.daily_income})
            </TabsTrigger>
            <TabsTrigger value="referral_bonus" className="text-xs">
              Bonus ({transactionStats.referral_bonus})
            </TabsTrigger>
            <TabsTrigger value="withdrawal" className="text-xs">
              Withdrawal ({transactionStats.withdrawal})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="space-y-3 mt-4">
            {filteredTransactions && filteredTransactions.length > 0 ? (
              <div className="space-y-2">
                {filteredTransactions.map((transaction) => (
                  <Card key={transaction.id} className="shadow-card hover:shadow-elevated transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${getTransactionColor(transaction.type)}`}>
                            {getTransactionIcon(transaction.type)}
                          </div>
                          <div className="space-y-1 flex-1 min-w-0">
                            <p className="font-semibold truncate">{transaction.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {transaction.type.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                        <p className={`text-lg font-bold flex-shrink-0 ${getTransactionAmountColor(transaction.type)}`}>
                          {getTransactionSign(transaction.type)}ETB {Math.abs(Number(transaction.amount)).toFixed(2)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="shadow-card">
                <CardContent className="p-8 text-center">
                  <History className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {selectedTab === "all" 
                      ? "No transactions yet" 
                      : `No ${selectedTab.replace('_', ' ')} transactions`}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Records;
