import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Copy, ArrowLeft, CheckCircle } from "lucide-react";
import Layout from "@/components/Layout";

const Recharge = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('product');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const createRechargeMutation = useMutation({
    mutationFn: async () => {
      if (!product || !user) throw new Error('Missing data');

      const { error } = await supabase
        .from('recharges')
        .insert({
          user_id: user.id,
          product_id: product.id,
          amount: product.price,
          status: 'pending',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recharges'] });
      toast({
        title: "Success!",
        description: "Your recharge request has been submitted. Please wait for admin approval.",
      });
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
      <Layout>
        <div className="max-w-lg mx-auto p-4">
          <Card className="shadow-card">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No product selected</p>
              <Button onClick={() => navigate('/products')} className="mt-4">
                View Products
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Recharge</h1>
            <p className="text-sm text-muted-foreground">Complete your payment</p>
          </div>
        </div>

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
              <span className="font-bold text-primary text-xl">${product.price}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Validity:</span>
              <span className="font-semibold">{product.validity_days} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Daily Income:</span>
              <span className="font-semibold text-secondary">${product.daily_income}</span>
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

                <div className="space-y-2">
                  <p className="text-sm text-white/80">Account Name</p>
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
                  <p className="text-sm text-white/80">Account Number</p>
                  <div className="flex items-center justify-between bg-white/20 rounded p-2">
                    <span className="text-white font-semibold">{adminBank.account_number}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(adminBank.account_number, 'Account number')}
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
                <p>After payment, click Submit below</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>Wait for admin approval (usually within 24 hours)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-12 text-lg"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Payment Request'}
        </Button>
      </div>
    </Layout>
  );
};

export default Recharge;
