import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Settings } from "lucide-react";
import { format } from "date-fns";
import { useAvailableBalance } from "@/hooks/useAvailableBalance";

const AdminWithdrawals = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: feeSettings } = useQuery({
    queryKey: ['withdrawalFeeSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('withdrawal_fee_settings')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: pendingWithdrawals } = useQuery({
    queryKey: ['pendingWithdrawals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*, bank_accounts(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = data?.map(w => w.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, phone_number, full_name')
        .in('id', userIds);
      
      // Fetch user types from most recent approved recharge
      const { data: recharges } = await supabase
        .from('recharges')
        .select('user_id, user_type, approved_at')
        .eq('status', 'approved')
        .in('user_id', userIds)
        .not('user_type', 'is', null)
        .order('approved_at', { ascending: false });
      
      // Get the most recent user_type for each user
      const userTypes = new Map();
      recharges?.forEach(recharge => {
        if (!userTypes.has(recharge.user_id)) {
          userTypes.set(recharge.user_id, recharge.user_type);
        }
      });
      
      return data?.map(withdrawal => ({
        ...withdrawal,
        profile: profiles?.find(p => p.id === withdrawal.user_id),
        user_type: userTypes.get(withdrawal.user_id)
      }));
    },
  });

  // Component to display user balance
  const UserBalance = ({ userId }: { userId: string }) => {
    const { data: balance } = useAvailableBalance(userId);
    return (
      <span className="text-muted-foreground">
        Available: <span className="font-semibold text-foreground">ETB {(balance || 0).toFixed(2)}</span>
      </span>
    );
  };

  const approveMutation = useMutation({
    mutationFn: async (withdrawalId: string) => {
      const withdrawal = pendingWithdrawals?.find(w => w.id === withdrawalId);
      if (!withdrawal) throw new Error('Withdrawal not found');

      // Update withdrawal status only - balance was already debited when user submitted the request
      const { error: withdrawalError } = await supabase
        .from('withdrawals')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq('id', withdrawalId);

      if (withdrawalError) throw withdrawalError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingWithdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['availableBalance'] });
      toast({ title: "Success", description: "Withdrawal approved successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (withdrawalId: string) => {
      const withdrawal = pendingWithdrawals?.find(w => w.id === withdrawalId);
      if (!withdrawal) throw new Error('Withdrawal not found');

      // Update withdrawal status
      const { error } = await supabase
        .from('withdrawals')
        .update({ 
          status: 'rejected',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq('id', withdrawalId);
      
      if (error) throw error;

      // Refund the balance by deleting the withdrawal transaction that was created on request
      // Or create a refund transaction to restore the balance
      const { error: refundError } = await supabase
        .from('transactions')
        .insert({
          user_id: withdrawal.user_id,
          amount: withdrawal.amount,
          type: 'daily_income',
          description: `Refund for rejected withdrawal request`,
        });
      
      if (refundError) throw refundError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingWithdrawals'] });
      toast({ title: "Success", description: "Withdrawal rejected" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Pending Withdrawal Requests</h2>
      {pendingWithdrawals && pendingWithdrawals.length > 0 ? (
        pendingWithdrawals.map((withdrawal) => (
          <Card key={withdrawal.id} className="shadow-card">
            <CardContent className="p-4">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-lg">
                      {withdrawal.profile?.full_name || 'No Name'}
                    </p>
                    <Badge>Pending</Badge>
                    {withdrawal.user_type && (
                      <Badge variant={withdrawal.user_type === 'investor' ? 'default' : 'secondary'}>
                        {withdrawal.user_type.charAt(0).toUpperCase() + withdrawal.user_type.slice(1)}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Phone: {withdrawal.profile?.phone_number || 'Unknown'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Bank: {withdrawal.bank_accounts?.bank_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Account: {withdrawal.bank_accounts?.account_number}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Name: {withdrawal.bank_accounts?.account_name}
                    </p>
                    <p className="text-sm">
                      <UserBalance userId={withdrawal.user_id} />
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Amount: </span>
                      <span className="font-bold text-primary">ETB {withdrawal.amount}</span>
                      {feeSettings?.enabled && (
                        <>
                          <br />
                          <span className="text-xs text-destructive">
                            Fee ({feeSettings.fee_percentage}%): ETB {(withdrawal.amount * Number(feeSettings.fee_percentage) / 100).toFixed(2)}
                          </span>
                          <br />
                          <span className="text-xs font-semibold">
                            Net: ETB {(withdrawal.amount - (withdrawal.amount * Number(feeSettings.fee_percentage) / 100)).toFixed(2)}
                          </span>
                        </>
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date: </span>
                      <span>{format(new Date(withdrawal.created_at), 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button 
                    size="sm" 
                    onClick={() => approveMutation.mutate(withdrawal.id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                  >
                    <Check className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => rejectMutation.mutate(withdrawal.id)}
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
            <p className="text-muted-foreground">No pending withdrawal requests</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminWithdrawals;
