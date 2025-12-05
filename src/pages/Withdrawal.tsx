import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Wallet, ChevronLeft, AlertCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAvailableBalance } from "@/hooks/useAvailableBalance";
import { useQuery } from "@tanstack/react-query";
import { toZonedTime } from "date-fns-tz";

const Withdrawal = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [selectedBankId, setSelectedBankId] = useState("");

  const { data: bankAccounts } = useQuery({
    queryKey: ['bankAccounts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: balance } = useAvailableBalance(user?.id);

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

  const { data: userProducts } = useQuery({
    queryKey: ['userProducts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_products')
        .select('id')
        .eq('user_id', user?.id)
        .limit(1);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const hasProducts = (userProducts?.length ?? 0) > 0;

  // Check for pending withdrawals
  const { data: pendingWithdrawals } = useQuery({
    queryKey: ['pendingWithdrawals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('id')
        .eq('user_id', user?.id)
        .eq('status', 'pending')
        .limit(1);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const hasPendingWithdrawal = (pendingWithdrawals?.length ?? 0) > 0;

  const checkWithdrawalTime = () => {
    const now = new Date();
    const eatTime = toZonedTime(now, 'Africa/Addis_Ababa');
    const hours = eatTime.getHours();
    return hours >= 9 && hours < 17; // 9 AM to 5 PM
  };

  const isWithdrawalTimeAllowed = checkWithdrawalTime();

  const withdrawalMutation = useMutation({
    mutationFn: async () => {
      const withdrawalAmount = parseFloat(amount);
      
      if (!isWithdrawalTimeAllowed) {
        throw new Error('Withdrawal requests are only allowed between 9 AM and 5 PM (Ethiopian Time)');
      }

      if (hasPendingWithdrawal) {
        throw new Error('You have a pending withdrawal request. Please wait for it to be processed before submitting a new request.');
      }

      if (!selectedBankId) {
        throw new Error('Please select a bank account');
      }

      if (!hasProducts) {
        throw new Error('You must purchase at least one product before making a withdrawal');
      }

      if (withdrawalAmount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      if (balance !== undefined && balance < 300) {
        throw new Error('Minimum withdrawable balance is ETB 300');
      }

      if (balance !== undefined && withdrawalAmount > balance) {
        throw new Error('Insufficient balance');
      }

      const { error: withdrawalError } = await supabase.from('withdrawals').insert({
        user_id: user?.id,
        bank_account_id: selectedBankId,
        amount: withdrawalAmount,
        status: 'pending',
      });

      if (withdrawalError) throw withdrawalError;

      // Debit the balance immediately by creating a withdrawal transaction
      const { error: transactionError } = await supabase.from('transactions').insert({
        user_id: user?.id,
        amount: -withdrawalAmount,
        type: 'withdrawal',
        description: `Withdrawal request for ETB ${withdrawalAmount.toFixed(2)}`,
      });

      if (transactionError) throw transactionError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availableBalance'] });
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      toast({
        title: "Success",
        description: "Withdrawal request submitted successfully. Awaiting admin approval.",
      });
      setAmount("");
      setSelectedBankId("");
      navigate('/mine/records');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    withdrawalMutation.mutate();
  };

  const availableBalance = balance || 0;
  const withdrawalAmount = parseFloat(amount) || 0;
  const feeAmount = (feeSettings?.enabled && withdrawalAmount > 0) 
    ? withdrawalAmount * (Number(feeSettings.fee_percentage) / 100) 
    : 0;
  const netAmount = withdrawalAmount - feeAmount;

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 bg-card/95 backdrop-blur-md border-b border-border shadow-elevated z-50">
        <div className="max-w-lg mx-auto flex items-center h-14 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="ml-2 font-bold text-lg">Withdrawal</h1>
        </div>
      </nav>
      <main className="pt-14">
        <div className="max-w-lg mx-auto p-4 space-y-6">

        <Card className="shadow-card animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">ETB {availableBalance.toFixed(2)}</p>
          </CardContent>
        </Card>

        {hasPendingWithdrawal && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              You have a pending withdrawal request. Please wait for it to be processed before submitting a new request.
            </AlertDescription>
          </Alert>
        )}

        {!isWithdrawalTimeAllowed && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> Withdrawal requests are only accepted between 9:00 AM and 5:00 PM (Ethiopian Time). Recharge is available 24/7.
            </AlertDescription>
          </Alert>
        )}

        {bankAccounts && bankAccounts.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You need to add a bank account first before making a withdrawal.
              <Button
                variant="link"
                className="px-2"
                onClick={() => navigate('/mine/bank-accounts')}
              >
                Add Bank Account
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <Card className="shadow-card animate-fade-in">
            <CardHeader>
              <CardTitle>Withdrawal Request</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bankAccount">Bank Account</Label>
                  <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts?.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.bank_name} - {account.account_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (ETB)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="300"
                    max={availableBalance}
                    placeholder="Enter amount (minimum 300)"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    disabled={availableBalance < 300 || !hasProducts}
                  />
                  <p className="text-xs text-muted-foreground">
                    {!hasProducts
                      ? 'You must purchase at least one product to withdraw'
                      : availableBalance < 300 
                      ? 'Minimum withdrawable balance: ETB 300'
                      : `Maximum: ETB ${availableBalance.toFixed(2)}`}
                  </p>
                </div>

                {feeSettings?.enabled && withdrawalAmount > 0 && (
                  <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Withdrawal Amount:</span>
                      <span className="font-semibold">ETB {withdrawalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-destructive">
                      <span>Maintenance Fee ({feeSettings.fee_percentage}%):</span>
                      <span className="font-semibold">- ETB {feeAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-semibold">Net Amount:</span>
                      <span className="font-bold text-primary">ETB {netAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Note:</strong> You must purchase at least one product before withdrawing. You can only withdraw daily income and bonus earnings (minimum ETB 300). Initial investment amounts cannot be withdrawn. Your request will be reviewed by admin.
                  </AlertDescription>
                </Alert>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={withdrawalMutation.isPending || !selectedBankId || !amount || availableBalance < 300 || !hasProducts || hasPendingWithdrawal || !isWithdrawalTimeAllowed}
                >
                  {withdrawalMutation.isPending ? 'Submitting...' : 'Submit Withdrawal Request'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
        </div>
      </main>
    </div>
  );
};

export default Withdrawal;
