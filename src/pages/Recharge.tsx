import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Copy, CheckCircle, ChevronLeft } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const Recharge = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [payerAccountNumber, setPayerAccountNumber] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [transactionId, setTransactionId] = useState("");

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: userProducts } = useQuery({
    queryKey: ['userProducts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_products')
        .select('product_id')
        .eq('user_id', user?.id)
        .eq('is_active', true);
      if (error) throw error;
      return data?.map(up => up.product_id) || [];
    },
    enabled: !!user,
  });

  const { data: adminBank } = useQuery({
    queryKey: ['adminBank'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_bank_info')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: userBankAccount } = useQuery({
    queryKey: ['userBankAccount', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data && !payerAccountNumber) {
        setPayerAccountNumber(data.account_number);
      }
      
      return data;
    },
    enabled: !!user,
  });

  const createRechargeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!selectedAmount) throw new Error('Please select an amount');
      if (!payerAccountNumber.trim()) throw new Error('Please enter payer account number');
      if (!buyerName.trim()) throw new Error('Please enter buyer name');
      if (!transactionId.trim()) throw new Error('Please enter transaction ID');

      const { error } = await supabase
        .from('recharges')
        .insert({
          user_id: user.id,
          product_id: null,
          amount: selectedAmount,
          status: 'pending',
          payer_account_name: `${buyerName.trim()} (${payerAccountNumber.trim()})`,
          transaction_id: transactionId.trim(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recharges'] });
      toast({
        title: "Success!",
        description: "Your recharge request has been submitted. Please wait for admin approval.",
      });
      setSelectedAmount(null);
      setBuyerName("");
      setPayerAccountNumber("");
      setTransactionId("");
      navigate('/');
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await createRechargeMutation.mutateAsync();
    setIsSubmitting(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  // Get product prices for products user doesn't already own
  const availableProducts = products?.filter(p => !userProducts?.includes(p.id)) || [];
  const rechargeAmounts = availableProducts.map(p => p.price);

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 bg-card/95 backdrop-blur-md border-b border-border shadow-elevated z-50">
        <div className="max-w-lg mx-auto flex items-center h-14 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="ml-2 font-bold text-lg">Recharge Balance</h1>
        </div>
      </nav>
      <main className="pt-14">
        <div className="max-w-lg mx-auto p-4 space-y-6">

        <Card className="shadow-elevated bg-gradient-primary">
          <CardHeader>
            <CardTitle className="text-lg text-white">Payment Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {adminBank && (
              <div className="space-y-3 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                {adminBank.account_type === 'bank' && (
                  <div className="space-y-2">
                    <p className="text-sm text-white/80">Bank Name</p>
                    <div className="flex items-center justify-between bg-white/20 rounded p-2">
                      <span className="text-white font-semibold">{adminBank.bank_name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(adminBank.bank_name || '', 'Bank name')}
                        className="text-white hover:bg-white/20"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-sm text-white/80">
                    {adminBank.account_type === 'telebirr' ? 'Telebirr Account Name' : 'Account Name'}
                  </p>
                  <div className="flex items-center justify-between bg-white/20 rounded p-2">
                    <span className="text-white font-semibold">{adminBank.account_name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(adminBank.account_name, 'Account name')}
                      className="text-white hover:bg-white/20"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-white/80">
                    {adminBank.account_type === 'telebirr' ? 'Telebirr Number' : 'Account Number'}
                  </p>
                  <div className="flex items-center justify-between bg-white/20 rounded p-2">
                    <span className="text-white font-semibold">
                      {adminBank.account_type === 'telebirr' ? `+251${adminBank.account_number}` : adminBank.account_number}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(
                        adminBank.account_type === 'telebirr' ? `+251${adminBank.account_number}` : adminBank.account_number,
                        adminBank.account_type === 'telebirr' ? 'Telebirr number' : 'Account number'
                      )}
                      className="text-white hover:bg-white/20"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 text-white/90 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>Select a recharge amount (matches product prices)</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>Transfer the exact amount to the account above</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>Fill in the form below with payment details</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>Wait for admin approval (usually within 24 hours)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                Select Amount (ETB) *
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {rechargeAmounts.map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant={selectedAmount === amount ? "default" : "outline"}
                    className={`h-12 text-lg font-semibold ${
                      selectedAmount === amount 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-primary/10"
                    }`}
                    onClick={() => setSelectedAmount(Number(amount))}
                  >
                    ETB {Number(amount).toLocaleString()}
                  </Button>
                ))}
              </div>
              {rechargeAmounts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No products available. Please contact admin.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="buyer-name" className="text-base font-semibold">
                Buyer Name *
              </Label>
              <Input
                id="buyer-name"
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Enter buyer name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payer-account" className="text-base font-semibold">
                Payer Account Number *
              </Label>
              <Input
                id="payer-account"
                type="text"
                value={payerAccountNumber}
                onChange={(e) => setPayerAccountNumber(e.target.value)}
                placeholder="Enter payer account number"
                required
              />
              {userBankAccount && (
                <p className="text-xs text-muted-foreground">
                  Auto-filled from your saved bank account. You can edit if needed.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction-id" className="text-base font-semibold">
                Transaction ID *
              </Label>
              <Input
                id="transaction-id"
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Enter transaction ID"
                maxLength={100}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter the transaction ID from your payment confirmation
              </p>
            </div>
          </CardContent>
        </Card>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedAmount || !payerAccountNumber.trim() || !buyerName.trim() || !transactionId.trim()}
            className="w-full h-12 text-lg"
          >
            {isSubmitting ? 'Submitting...' : `Submit Recharge Request (ETB ${selectedAmount?.toLocaleString() || '0'})`}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Recharge;
