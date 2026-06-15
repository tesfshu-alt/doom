import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Users, Settings, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import AdminBankInfo from "./admin/AdminBankInfo";
import AdminProducts from "./admin/AdminProducts";
import AdminWithdrawals from "./admin/AdminWithdrawals";
import AdminDailyIncome from "./admin/AdminDailyIncome";
import AdminReferralSettings from "./admin/AdminReferralSettings";
import AdminCustomerService from "./admin/AdminCustomerService";
import AdminPasswordReset from "./admin/AdminPasswordReset";
import AdminDailyTasks from "./admin/AdminDailyTasks";
import AdminWithdrawalFee from "./admin/AdminWithdrawalFee";
import AdminPlatformSettings from "./admin/AdminPlatformSettings";
import AdminExchangeRate from "./admin/AdminExchangeRate";
import RechargeApprovalCard from "@/components/RechargeApprovalCard";

const UserHistoryContent = ({ userId }: { userId: string }) => {
  const { data: userRecharges } = useQuery({
    queryKey: ['userRecharges', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recharges')
        .select('*, products(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: userWithdrawals } = useQuery({
    queryKey: ['userWithdrawals', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*, bank_accounts(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: userBalance } = useQuery({
    queryKey: ['userBalance', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', userId);
      if (error) throw error;
      
      // Calculate available balance: only earnings (daily_income, referral_bonus, welcome_bonus) minus withdrawals
      const balance = data?.reduce((acc, transaction) => {
        if (transaction.type === 'daily_income' || transaction.type === 'referral_bonus' || transaction.type === 'welcome_bonus') {
          return acc + transaction.amount;
        }
        if (transaction.type === 'withdrawal') {
          return acc - transaction.amount;
        }
        return acc; // Don't count recharge/purchase
      }, 0) || 0;
      
      return balance;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/10 text-green-700';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-700';
      case 'rejected':
        return 'bg-red-500/10 text-red-700';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-muted rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Current Balance</h3>
        <p className="text-2xl font-bold text-primary">
          ETB {userBalance?.toFixed(2) || '0.00'}
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Recharge History</h3>
        {userRecharges && userRecharges.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {userRecharges.map((recharge) => (
              <Card key={recharge.id}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">{recharge.products?.name || 'Balance Recharge'}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(recharge.created_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                      {recharge.transaction_id && (
                        <p className="text-xs font-mono">TXN: {recharge.transaction_id}</p>
                      )}
                      {recharge.payer_account_name && (
                        <p className="text-xs">Payer: {recharge.payer_account_name}</p>
                      )}
                      <Badge className={getStatusColor(recharge.status)} variant="outline">
                        {recharge.status}
                      </Badge>
                    </div>
                    <p className="font-bold text-primary">ETB {recharge.amount}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No recharge history</p>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Withdrawal History</h3>
        {userWithdrawals && userWithdrawals.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {userWithdrawals.map((withdrawal) => (
              <Card key={withdrawal.id}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">Withdrawal Request</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(withdrawal.created_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                      <p className="text-xs">
                        {withdrawal.bank_accounts.bank_name} - {withdrawal.bank_accounts.account_number}
                      </p>
                      <Badge className={getStatusColor(withdrawal.status)} variant="outline">
                        {withdrawal.status}
                      </Badge>
                      {withdrawal.rejection_reason && (
                        <p className="text-xs text-red-600">Reason: {withdrawal.rejection_reason}</p>
                      )}
                    </div>
                    <p className="font-bold text-red-600">-ETB {withdrawal.amount}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No withdrawal history</p>
        )}
      </div>
    </div>
  );
};


const Admin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  const { data: pendingRecharges } = useQuery({
    queryKey: ['pendingRecharges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recharges')
        .select('*, products(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = data?.map(r => r.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, phone_number, full_name')
        .in('id', userIds);
      
      return data?.map(recharge => ({
        ...recharge,
        profile: profiles?.find(p => p.id === recharge.user_id)
      }));
    },
    enabled: isAdmin,
  });

  const { data: allUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ rechargeId, userType }: { rechargeId: string; userType: 'promoter' | 'investor' }) => {
      const recharge = pendingRecharges?.find(r => r.id === rechargeId);
      if (!recharge) throw new Error('Recharge not found');

      // Update recharge status with user_type
      const { error: rechargeError } = await supabase.from('recharges').update({ 
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user?.id,
        user_type: userType,
      }).eq('id', rechargeId);

      if (rechargeError) throw rechargeError;

      // Create recharge transaction to credit balance
      const { error: transactionError } = await supabase.from('transactions').insert({
        user_id: recharge.user_id,
        amount: recharge.amount,
        type: 'recharge',
        description: `Balance recharge - ETB ${recharge.amount}`,
      });

      if (transactionError) throw transactionError;

      // Track for referral bonus (based on recharge amount, not product purchase)
      const { data: profile } = await supabase
        .from('profiles')
        .select('referred_by')
        .eq('id', recharge.user_id)
        .single();

      if (profile?.referred_by && userType === 'investor') {
        // Check if referred user has invested at least 500 ETB
        const { data: referralInvestment } = await supabase
          .from('referral_investments')
          .select('*')
          .eq('user_id', recharge.user_id)
          .eq('referred_by', profile.referred_by)
          .maybeSingle();

        const totalInvested = (referralInvestment?.total_invested || 0) + recharge.amount;

        // Update or create referral investment record
        if (referralInvestment) {
          await supabase
            .from('referral_investments')
            .update({ total_invested: totalInvested })
            .eq('id', referralInvestment.id);
        } else {
          await supabase
            .from('referral_investments')
            .insert({
              user_id: recharge.user_id,
              referred_by: profile.referred_by,
              total_invested: totalInvested,
              bonus_credited: false,
            });
        }

        // Only credit bonus if total investment is at least 500 ETB and bonus not yet credited
        if (totalInvested >= 500 && !referralInvestment?.bonus_credited) {
          // Get referral settings
          const { data: referralSettings } = await supabase
            .from('referral_settings')
            .select('*')
            .single();

          if (referralSettings?.enabled && referralSettings.bonus_amount > 0) {
            // Calculate bonus based on total invested amount
            const bonusAmount = (totalInvested * referralSettings.bonus_amount) / 100;
            
            // Credit referral bonus to the direct referrer (1st level)
            await supabase
              .from('transactions')
              .insert({
                user_id: profile.referred_by,
                amount: bonusAmount,
                type: 'referral_bonus',
                description: `Referral bonus (${referralSettings.bonus_amount}%) for inviting new user`,
              });

            // Mark bonus as credited
            await supabase
              .from('referral_investments')
              .update({ bonus_credited: true })
              .eq('user_id', recharge.user_id)
              .eq('referred_by', profile.referred_by);

            // Check for 2nd level referral (referrer's referrer)
            const { data: referrerProfile } = await supabase
              .from('profiles')
              .select('referred_by')
              .eq('id', profile.referred_by)
              .single();

            if (referrerProfile?.referred_by) {
              // Calculate 3% bonus for 2nd level referrer
              const secondLevelBonus = (totalInvested * 3) / 100;
              
              // Credit 2nd level referral bonus
              await supabase
                .from('transactions')
                .insert({
                  user_id: referrerProfile.referred_by,
                  amount: secondLevelBonus,
                  type: 'referral_bonus',
                  description: `2nd level referral bonus (3%) from indirect referral`,
                });
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingRecharges'] });
      queryClient.invalidateQueries({ queryKey: ['mainBalance'] });
      queryClient.invalidateQueries({ queryKey: ['availableBalance'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({ title: "Success", description: "Recharge approved - balance credited" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (rechargeId: string) => {
      await supabase.from('recharges').update({ 
        status: 'rejected',
        approved_at: new Date().toISOString(),
        approved_by: user?.id,
      }).eq('id', rechargeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingRecharges'] });
      toast({ title: "Success", description: "Recharge rejected" });
    },
  });

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md mx-4">
          <CardContent className="p-8 text-center space-y-4">
            <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to access the admin panel.</p>
            <Button onClick={() => navigate('/')}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to Dashboard
          </Button>
        </div>

        <Tabs defaultValue="recharges" className="space-y-4">
          <div className="overflow-x-auto pb-2">
            <TabsList className="flex flex-wrap gap-1 h-auto p-1">
              <TabsTrigger value="recharges" className="text-xs px-2 py-1.5">Recharges</TabsTrigger>
              <TabsTrigger value="withdrawals" className="text-xs px-2 py-1.5">Withdrawals</TabsTrigger>
              <TabsTrigger value="income" className="text-xs px-2 py-1.5">Income</TabsTrigger>
              <TabsTrigger value="referral" className="text-xs px-2 py-1.5">Referral</TabsTrigger>
              <TabsTrigger value="daily-tasks" className="text-xs px-2 py-1.5">Tasks</TabsTrigger>
              <TabsTrigger value="users" className="text-xs px-2 py-1.5">Users</TabsTrigger>
              <TabsTrigger value="products" className="text-xs px-2 py-1.5">Products</TabsTrigger>
              <TabsTrigger value="bank" className="text-xs px-2 py-1.5">Bank</TabsTrigger>
              <TabsTrigger value="password" className="text-xs px-2 py-1.5">Password</TabsTrigger>
              <TabsTrigger value="support" className="text-xs px-2 py-1.5">Support</TabsTrigger>
              <TabsTrigger value="withdrawal-fee" className="text-xs px-2 py-1.5">W.Fee</TabsTrigger>
              <TabsTrigger value="exchange-rate" className="text-xs px-2 py-1.5">Rate</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs px-2 py-1.5">Settings</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="recharges" className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto">
            <div className="space-y-3">
              <h2 className="text-lg sm:text-xl font-bold">Pending Recharge Requests</h2>
              {pendingRecharges && pendingRecharges.length > 0 ? (
                pendingRecharges.map((recharge) => (
                  <RechargeApprovalCard
                    key={recharge.id}
                    recharge={recharge}
                    onApprove={(rechargeId, userType) => approveMutation.mutate({ rechargeId, userType })}
                    onReject={(rechargeId) => rejectMutation.mutate(rechargeId)}
                    isLoading={approveMutation.isPending || rejectMutation.isPending}
                  />
                ))
              ) : (
                <Card className="shadow-card">
                  <CardContent className="p-8 text-center">
                    <Settings className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">No pending recharge requests</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="withdrawals" className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto">
            <AdminWithdrawals />
          </TabsContent>

          <TabsContent value="income" className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto">
            <AdminDailyIncome />
          </TabsContent>

          <TabsContent value="referral" className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto">
            <AdminReferralSettings />
          </TabsContent>

          <TabsContent value="daily-tasks" className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto">
            <AdminDailyTasks />
          </TabsContent>

          <TabsContent value="users" className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto">
            <div className="space-y-3">
              <h2 className="text-lg sm:text-xl font-bold">All Users</h2>
              {allUsers?.map((user) => (
                <Card key={user.id} className="shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-semibold text-lg">{user.full_name || 'No Name'}</p>
                          <p className="text-sm text-muted-foreground">{user.phone_number}</p>
                          <div className="flex flex-wrap gap-2 text-sm">
                            <Badge variant="outline">Code: {user.referral_code}</Badge>
                            <span className="text-muted-foreground">
                              Joined {format(new Date(user.created_at), 'MMM dd, yyyy')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View History
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>User History - {user.full_name || user.phone_number}</DialogTitle>
                          </DialogHeader>
                          <UserHistoryContent userId={user.id} />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="products" className="max-h-[calc(100vh-250px)] overflow-y-auto">
            <AdminProducts />
          </TabsContent>

          <TabsContent value="bank" className="max-h-[calc(100vh-250px)] overflow-y-auto">
            <AdminBankInfo />
          </TabsContent>

          <TabsContent value="password" className="max-h-[calc(100vh-250px)] overflow-y-auto">
            <AdminPasswordReset />
          </TabsContent>

          <TabsContent value="support" className="max-h-[calc(100vh-250px)] overflow-y-auto">
            <AdminCustomerService />
          </TabsContent>

          <TabsContent value="withdrawal-fee" className="max-h-[calc(100vh-250px)] overflow-y-auto">
            <AdminWithdrawalFee />
          </TabsContent>

          <TabsContent value="exchange-rate" className="max-h-[calc(100vh-250px)] overflow-y-auto">
            <AdminExchangeRate />
          </TabsContent>

          <TabsContent value="settings" className="max-h-[calc(100vh-250px)] overflow-y-auto">
            <AdminPlatformSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;

