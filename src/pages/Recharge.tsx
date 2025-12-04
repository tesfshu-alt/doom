import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Copy, ArrowLeft, CheckCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ChevronLeft } from "lucide-react";

const Recharge = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('product');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payerAccountNumber, setPayerAccountNumber] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [transactionId, setTransactionId] = useState("");

  const { data: product } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) return null;
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  const { data: adminBank } = useQuery({
    queryKey: ['adminBank'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_bank_info')
        .select('*')
        .eq('is_active', true)
        .single();
      
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
      
      // Auto-fill the account number when bank account is loaded
      if (data && !payerAccountNumber) {
        setPayerAccountNumber(data.account_number);
      }
      
      return data;
    },
    enabled: !!user,
  });

  const createRechargeMutation = useMutation({
    mutationFn: async () => {
      if (!product || !user) throw new Error('Missing data');
      if (!payerAccountNumber.trim()) throw new Error('Please enter payer account number');
      if (!buyerName.trim()) throw new Error('Please enter buyer name');
      if (!transactionId.trim()) throw new Error('Please enter transaction ID');

      const { error } = await supabase
        .from('recharges')
        .insert({
          user_id: user.id,
          product_id: product.id,
          amount: product.price,
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


  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="fixed top-0 left-0 right-0 bg-card/95 backdrop-blur-md border-b border-border shadow-elevated z-50">
          <div className="max-w-lg mx-auto flex items-center h-14 px-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="ml-2 font-bold text-lg">Recharge</h1>
          </div>
        </nav>
        <main className="pt-14">
          <div className="max-w-lg mx-auto p-4">
            <Card className="shadow-card">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No product selected</p>
                <Button onClick={() => navigate('/')} className="mt-4">
                  View Products
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 bg-card/95 backdrop-blur-md border-b border-border shadow-elevated z-50">
        <div className="max-w-lg mx-auto flex items-center h-14 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="ml-2 font-bold text-lg">Recharge</h1>
        </div>
      </nav>
      <main className="pt-14">
        <div className="max-w-lg mx-auto p-4 space-y-6">

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Product Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Product:</span>
              <span className="font-semibold">{product.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-bold text-primary text-xl">ETB {product.price}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Validity:</span>
              <span className="font-semibold">{product.validity_days} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Daily Income:</span>
              <span className="font-semibold text-secondary">ETB {product.daily_income}</span>
            </div>
          </CardContent>
        </Card>

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
                        onClick={() => copyToClipboard(adminBank.bank_name, 'Bank name')}
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
                <p>Transfer the exact amount to the account above</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>Confirm your payer account number</p>
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
            disabled={isSubmitting || !payerAccountNumber.trim() || !buyerName.trim() || !transactionId.trim()}
            className="w-full h-12 text-lg"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Payment Request'}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Recharge;
