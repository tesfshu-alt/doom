import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Copy, CheckCircle, ChevronLeft, Building2, Smartphone } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Step = "form" | "transfer";

const Recharge = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
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

  const { data: adminBanks } = useQuery({
    queryKey: ['adminBanks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_bank_info')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
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

  const selectedBank = adminBanks?.find(b => b.id === selectedBankId) || null;

  const createRechargeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!selectedAmount) throw new Error('Please select an amount');
      if (!selectedBank) throw new Error('Please select a bank');
      if (!payerAccountNumber.trim()) throw new Error('Please enter payer account number');
      if (!buyerName.trim()) throw new Error('Please enter buyer name');
      if (!transactionId.trim()) throw new Error('Please enter transaction ID');

      const bankLabel = selectedBank.account_type === 'telebirr'
        ? `Telebirr (+251${selectedBank.account_number})`
        : `${selectedBank.bank_name} (${selectedBank.account_number})`;

      const { error } = await supabase
        .from('recharges')
        .insert({
          user_id: user.id,
          product_id: null,
          amount: selectedAmount,
          status: 'pending',
          payer_account_name: `${buyerName.trim()} (${payerAccountNumber.trim()}) → ${bankLabel}`,
          transaction_id: transactionId.trim(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recharges'] });
      toast({
        title: "Submitted!",
        description: "Your recharge is waiting for admin approval.",
      });
      navigate('/');
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard` });
  };

  const availableProducts = products?.filter(p => !userProducts?.includes(p.id)) || [];
  const rechargeAmounts = availableProducts.map(p => p.price);

  const formValid = !!selectedAmount && !!selectedBankId && payerAccountNumber.trim() && buyerName.trim();

  const handleConfirmTransfer = async (transferred: boolean) => {
    setConfirmOpen(false);
    if (!transferred) {
      setStep("form");
      return;
    }
    setIsSubmitting(true);
    await createRechargeMutation.mutateAsync();
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 bg-card/95 backdrop-blur-md border-b border-border shadow-elevated z-50">
        <div className="max-w-lg mx-auto flex items-center h-14 px-4">
          <Button variant="ghost" size="icon" onClick={() => step === "transfer" ? setStep("form") : navigate('/')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="ml-2 font-bold text-lg">
            {step === "form" ? "Recharge Balance" : "Transfer Payment"}
          </h1>
          <span className="ml-auto text-xs text-muted-foreground">Step {step === "form" ? "1" : "2"} of 2</span>
        </div>
      </nav>

      <main className="pt-14">
        <div className="max-w-lg mx-auto p-4 space-y-6">
          {step === "form" && (
            <>
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Select Payment Method</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {adminBanks?.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No payment methods available. Please contact admin.
                    </p>
                  )}
                  {adminBanks?.map((bank) => {
                    const isSelected = selectedBankId === bank.id;
                    const Icon = bank.account_type === 'telebirr' ? Smartphone : Building2;
                    return (
                      <button
                        key={bank.id}
                        type="button"
                        onClick={() => setSelectedBankId(bank.id)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="flex-1">
                          <p className="font-semibold">
                            {bank.account_type === 'telebirr' ? 'Telebirr' : bank.bank_name}
                          </p>
                          <p className="text-xs text-muted-foreground">{bank.account_name}</p>
                        </div>
                        {isSelected && <CheckCircle className="h-5 w-5 text-primary" />}
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Select Amount (ETB) *</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {rechargeAmounts.map((amount) => (
                        <Button
                          key={amount}
                          type="button"
                          variant={selectedAmount === amount ? "default" : "outline"}
                          className="h-12 text-lg font-semibold"
                          onClick={() => setSelectedAmount(Number(amount))}
                        >
                          ETB {Number(amount).toLocaleString()}
                        </Button>
                      ))}
                    </div>
                    {rechargeAmounts.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No packages available. Please contact admin.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="buyer-name" className="text-base font-semibold">Buyer Name *</Label>
                    <Input
                      id="buyer-name"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="Enter buyer name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payer-account" className="text-base font-semibold">Payer Account Number *</Label>
                    <Input
                      id="payer-account"
                      value={payerAccountNumber}
                      onChange={(e) => setPayerAccountNumber(e.target.value)}
                      placeholder="Enter payer account number"
                    />
                    {userBankAccount && (
                      <p className="text-xs text-muted-foreground">
                        Auto-filled from your saved bank account. You can edit if needed.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={() => setStep("transfer")}
                disabled={!formValid}
                className="w-full h-12 text-lg"
              >
                Next
              </Button>
            </>
          )}

          {step === "transfer" && selectedBank && (
            <>
              <Card className="shadow-elevated bg-gradient-primary">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Transfer ETB {selectedAmount?.toLocaleString()}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    {selectedBank.account_type === 'bank' && (
                      <div className="space-y-2">
                        <p className="text-sm text-white/80">Bank Name</p>
                        <div className="flex items-center justify-between bg-white/20 rounded p-2">
                          <span className="text-white font-semibold">{selectedBank.bank_name}</span>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(selectedBank.bank_name || '', 'Bank name')} className="text-white hover:bg-white/20">
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-sm text-white/80">
                        {selectedBank.account_type === 'telebirr' ? 'Telebirr Account Name' : 'Account Name'}
                      </p>
                      <div className="flex items-center justify-between bg-white/20 rounded p-2">
                        <span className="text-white font-semibold">{selectedBank.account_name}</span>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(selectedBank.account_name, 'Account name')} className="text-white hover:bg-white/20">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-white/80">
                        {selectedBank.account_type === 'telebirr' ? 'Telebirr Number' : 'Account Number'}
                      </p>
                      <div className="flex items-center justify-between bg-white/20 rounded p-2">
                        <span className="text-white font-semibold">
                          {selectedBank.account_type === 'telebirr' ? `+251${selectedBank.account_number}` : selectedBank.account_number}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(
                          selectedBank.account_type === 'telebirr' ? `+251${selectedBank.account_number}` : selectedBank.account_number,
                          selectedBank.account_type === 'telebirr' ? 'Telebirr number' : 'Account number'
                        )} className="text-white hover:bg-white/20">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-white/80">Amount to Transfer</p>
                      <div className="flex items-center justify-between bg-white/20 rounded p-2">
                        <span className="text-white font-bold text-lg">ETB {selectedAmount?.toLocaleString()}</span>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(String(selectedAmount), 'Amount')} className="text-white hover:bg-white/20">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-white/90 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <p>Transfer the exact amount to the account above</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <p>Enter the transaction ID below and submit</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardContent className="p-6 space-y-2">
                  <Label htmlFor="transaction-id" className="text-base font-semibold">Transaction ID *</Label>
                  <Input
                    id="transaction-id"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Enter transaction ID"
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the transaction ID from your payment confirmation
                  </p>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("form")} className="flex-1 h-12">
                  Back
                </Button>
                <Button
                  onClick={() => setConfirmOpen(true)}
                  disabled={isSubmitting || !transactionId.trim()}
                  className="flex-1 h-12 text-lg"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </>
          )}
        </div>
      </main>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Did you transfer the amount?</AlertDialogTitle>
            <AlertDialogDescription>
              Please confirm you have transferred ETB {selectedAmount?.toLocaleString()} to{" "}
              {selectedBank?.account_type === 'telebirr' ? 'Telebirr' : selectedBank?.bank_name}.
              If yes, your request will be sent for admin approval. If no, you can go back and review.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleConfirmTransfer(false)}>No, go back</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleConfirmTransfer(true)}>Yes, submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Recharge;
