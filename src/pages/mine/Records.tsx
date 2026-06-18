import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, History, DollarSign, Gift, Wallet, ShoppingCart, Clock, CheckCircle, XCircle } from "lucide-react";
import Layout from "@/components/Layout";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { maskAccountNumber } from "@/lib/maskUtils";

const Records = () => {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState("all");

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

  const { data: recharges } = useQuery({
    queryKey: ['recharges', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recharges')
        .select('*, products(name)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: withdrawals } = useQuery({
    queryKey: ['withdrawals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*, bank_accounts(bank_name, account_number)')
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-600/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-600/20"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-600/20"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Layout showBackOnly pageTitle="Transaction History">
      <div className="max-w-lg mx-auto p-4 space-y-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="animate-fade-in">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="text-xs">
              Transactions
            </TabsTrigger>
            <TabsTrigger value="recharges" className="text-xs">
              Recharges
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="text-xs">
              Withdrawals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3 mt-4">
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
                        <div className="text-right flex-shrink-0">
                          <p className={`text-lg font-bold ${getTransactionAmountColor(transaction.type)}`}>
                            {getTransactionSign(transaction.type)}ETB {Math.abs(Number(transaction.amount)).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="shadow-card">
                <CardContent className="p-8 text-center">
                  <History className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No transactions yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="recharges" className="space-y-3 mt-4">
            {recharges && recharges.length > 0 ? (
              <div className="space-y-2">
                {recharges.map((recharge) => (
                  <Card key={recharge.id} className="shadow-card hover:shadow-elevated transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-500/10">
                            <Wallet className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="space-y-1 flex-1 min-w-0">
                            <p className="font-semibold truncate">{recharge.products?.name || 'Product'}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(recharge.created_at), 'MMM dd, yyyy HH:mm')}
                            </p>
                            {getStatusBadge(recharge.status)}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-bold text-primary">
                            ETB {Number(recharge.amount).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="shadow-card">
                <CardContent className="p-8 text-center">
                  <Wallet className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No recharge requests yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="withdrawals" className="space-y-3 mt-4">
            {withdrawals && withdrawals.length > 0 ? (
              <div className="space-y-2">
                {withdrawals.map((withdrawal) => (
                  <Card key={withdrawal.id} className="shadow-card hover:shadow-elevated transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 bg-red-500/10">
                            <TrendingDown className="h-5 w-5 text-red-600" />
                          </div>
                          <div className="space-y-1 flex-1 min-w-0">
                            <p className="font-semibold truncate">
                              {withdrawal.bank_accounts?.bank_name} - {maskAccountNumber(withdrawal.bank_accounts?.account_number)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Request:</span> {format(new Date(withdrawal.created_at), 'MMM dd, yyyy HH:mm')}
                            </p>
                            {withdrawal.approved_at && (
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium">Approved:</span> {format(new Date(withdrawal.approved_at), 'MMM dd, yyyy HH:mm')}
                              </p>
                            )}
                            {getStatusBadge(withdrawal.status)}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-bold text-red-600">
                            -ETB {Number(withdrawal.amount).toFixed(2)}
                          </p>
                          <p className="text-xs text-emerald-500">
                            ${(Number(withdrawal.amount) / exchangeRate).toFixed(2)} USDT
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="shadow-card">
                <CardContent className="p-8 text-center">
                  <TrendingDown className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No withdrawal requests yet</p>
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
