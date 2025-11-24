import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Wallet, ArrowLeft, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAvailableBalance } from "@/hooks/useAvailableBalance";
import { useQuery } from "@tanstack/react-query";

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

  const withdrawalMutation = useMutation({
    mutationFn: async () => {
      const withdrawalAmount = parseFloat(amount);
      
      if (!selectedBankId) {
        throw new Error('Please select a bank account');
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

      const { error } = await supabase.from('withdrawals').insert({
        user_id: user?.id,
        bank_account_id: selectedBankId,
        amount: withdrawalAmount,
        status: 'pending',
      });

      if (error) throw error;
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

  return (
    <Layout>
      <div className="max-w-lg mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3 animate-fade-in">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Withdrawal</h1>
            <p className="text-sm text-muted-foreground">Request payout to your bank account</p>
          </div>
        </div>

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
                    disabled={availableBalance < 300}
                  />
                  <p className="text-xs text-muted-foreground">
                    {availableBalance < 300 
                      ? 'Minimum withdrawable balance: ETB 300'
                      : `Maximum: ETB ${availableBalance.toFixed(2)}`}
                  </p>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Note:</strong> You can only withdraw daily income and bonus earnings (minimum ETB 300). Initial investment amounts cannot be withdrawn. Your request will be reviewed by admin.
                  </AlertDescription>
                </Alert>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={withdrawalMutation.isPending || !selectedBankId || !amount || availableBalance < 300}
                >
                  {withdrawalMutation.isPending ? 'Submitting...' : 'Submit Withdrawal Request'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Withdrawal;
