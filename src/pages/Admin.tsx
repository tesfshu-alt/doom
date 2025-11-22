import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Users, Settings } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import AdminBankInfo from "./admin/AdminBankInfo";
import AdminProducts from "./admin/AdminProducts";
import AdminWithdrawals from "./admin/AdminWithdrawals";
import AdminDailyIncome from "./admin/AdminDailyIncome";
import AdminReferralSettings from "./admin/AdminReferralSettings";

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
        .select('id, phone_number')
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
    mutationFn: async (rechargeId: string) => {
      const recharge = pendingRecharges?.find(r => r.id === rechargeId);
      if (!recharge || !recharge.products) throw new Error('Recharge not found');

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + recharge.products.validity_days);

      // Update recharge status
      const { error: rechargeError } = await supabase.from('recharges').update({ 
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user?.id,
      }).eq('id', rechargeId);

      if (rechargeError) throw rechargeError;

      // Create user product
      const { error: productError } = await supabase.from('user_products').insert({
        user_id: recharge.user_id,
        product_id: recharge.product_id,
        recharge_id: rechargeId,
        expiry_date: expiryDate.toISOString(),
      });

      if (productError) throw productError;

      // Create transaction record
      const { error: transactionError } = await supabase.from('transactions').insert({
        user_id: recharge.user_id,
        amount: recharge.amount,
        type: 'purchase',
        description: `Purchased ${recharge.products.name}`,
      });

      if (transactionError) throw transactionError;

      // Check if this is the user's first purchase
      const { data: previousPurchases } = await supabase
        .from('user_products')
        .select('id')
        .eq('user_id', recharge.user_id);

      const isFirstPurchase = previousPurchases && previousPurchases.length === 1;

      // If first purchase, check for referral and award bonus
      if (isFirstPurchase) {
        // Get user's referral info
        const { data: profile } = await supabase
          .from('profiles')
          .select('referred_by')
          .eq('id', recharge.user_id)
          .single();

        if (profile?.referred_by) {
          // Get referral settings
          const { data: referralSettings } = await supabase
            .from('referral_settings')
            .select('*')
            .single();

          if (referralSettings?.enabled && referralSettings.bonus_amount > 0) {
            // Calculate 35% of the purchase amount as referral bonus
            const bonusAmount = (recharge.amount * referralSettings.bonus_amount) / 100;
            
            // Credit referral bonus to the referrer
            const { error: bonusError } = await supabase
              .from('transactions')
              .insert({
                user_id: profile.referred_by,
                amount: bonusAmount,
                type: 'referral_bonus',
                description: `Referral bonus (${referralSettings.bonus_amount}%) for inviting new user`,
              });

            if (bonusError) {
              console.error('Error crediting referral bonus:', bonusError);
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingRecharges'] });
      queryClient.invalidateQueries({ queryKey: ['activeProducts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({ title: "Success", description: "Recharge approved successfully" });
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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to Dashboard
          </Button>
        </div>

        <Tabs defaultValue="recharges" className="space-y-4">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="recharges">Recharges</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="income">Daily Income</TabsTrigger>
            <TabsTrigger value="referral">Referral</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="bank">Bank Info</TabsTrigger>
          </TabsList>

          <TabsContent value="recharges" className="space-y-4">
            <div className="space-y-3">
              <h2 className="text-xl font-bold">Pending Recharge Requests</h2>
              {pendingRecharges && pendingRecharges.length > 0 ? (
                pendingRecharges.map((recharge) => (
                  <Card key={recharge.id} className="shadow-card">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-lg">{recharge.profile?.phone_number || 'Unknown User'}</p>
                            <Badge>Pending</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{recharge.products?.name}</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Amount: </span>
                              <span className="font-bold text-primary">ETB {recharge.amount}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Date: </span>
                              <span>{format(new Date(recharge.created_at), 'MMM dd, yyyy HH:mm')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button 
                            size="sm" 
                            onClick={() => approveMutation.mutate(recharge.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                          >
                            <Check className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => rejectMutation.mutate(recharge.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                          >
                            <X className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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

          <TabsContent value="withdrawals" className="space-y-4">
            <AdminWithdrawals />
          </TabsContent>

          <TabsContent value="income" className="space-y-4">
            <AdminDailyIncome />
          </TabsContent>

          <TabsContent value="referral" className="space-y-4">
            <AdminReferralSettings />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="space-y-3">
              <h2 className="text-xl font-bold">All Users</h2>
              {allUsers?.map((user) => (
                <Card key={user.id} className="shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-semibold text-lg">{user.phone_number}</p>
                          <div className="flex flex-wrap gap-2 text-sm">
                            <Badge variant="outline">Code: {user.referral_code}</Badge>
                            <span className="text-muted-foreground">
                              Joined {format(new Date(user.created_at), 'MMM dd, yyyy')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="products">
            <AdminProducts />
          </TabsContent>

          <TabsContent value="bank">
            <AdminBankInfo />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;

