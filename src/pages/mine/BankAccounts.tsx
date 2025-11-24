import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/Layout";

const BankAccounts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    accountName: '',
    accountNumber: '',
    bankName: '',
  });

  const { data: bankAccounts } = useQuery({
    queryKey: ['bankAccounts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addBankMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('bank_accounts')
        .insert({
          user_id: user.id,
          account_name: formData.accountName,
          account_number: formData.accountNumber,
          bank_name: formData.bankName,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
      setIsDialogOpen(false);
      setFormData({ accountName: '', accountNumber: '', bankName: '' });
      toast({
        title: "Success!",
        description: "Bank account added successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addBankMutation.mutate();
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Bank Accounts</h1>
            <p className="text-sm text-muted-foreground">Manage your bank details</p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Bank Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Bank Account</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Select
                  value={formData.bankName}
                  onValueChange={(value) => setFormData({ ...formData, bankName: value })}
                  required
                >
                  <SelectTrigger id="bankName">
                    <SelectValue placeholder="Select bank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CBE">CBE</SelectItem>
                    <SelectItem value="Telebirr">Telebirr</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountName">Account Name</Label>
                <Input
                  id="accountName"
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={addBankMutation.isPending}>
                {addBankMutation.isPending ? 'Adding...' : 'Add Account'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <div className="space-y-3">
          {bankAccounts && bankAccounts.length > 0 ? (
            bankAccounts.map((account) => (
              <Card key={account.id} className="shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                      <CreditCard className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-semibold">{account.bank_name}</p>
                      <p className="text-sm text-muted-foreground">{account.account_name}</p>
                      <p className="text-sm font-mono">{account.account_number}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="shadow-card">
              <CardContent className="p-8 text-center">
                <CreditCard className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">No bank accounts added yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add a bank account to receive withdrawals
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default BankAccounts;
