import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useMainBalance } from "@/hooks/useMainBalance";
import { useToast } from "@/hooks/use-toast";
import { Package, TrendingUp, Calendar, DollarSign, CheckCircle, Lock } from "lucide-react";
import car1 from "@/assets/products/car-1.jpg";
import car2 from "@/assets/products/car-2.jpg";
import car3 from "@/assets/products/car-3.jpg";
import car4 from "@/assets/products/car-4.jpg";
import car5 from "@/assets/products/car-5.jpg";
import car6 from "@/assets/products/car-6.jpg";
import car7 from "@/assets/products/car-7.jpg";

const ProductsSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const productImages = [car1, car2, car3, car4, car5, car6, car7];

  const { data: mainBalance } = useMainBalance(user?.id);

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').eq('is_active', true).order('sort_order');
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

  const buyProductMutation = useMutation({
    mutationFn: async (product: any) => {
      if (!user) throw new Error('Not authenticated');
      
      // Check if user already owns this product
      if (userProducts?.includes(product.id)) {
        throw new Error('You already own this product. It is currently working and generating income for you.');
      }
      
      const balance = mainBalance || 0;
      if (balance < product.price) {
        throw new Error(`Insufficient balance. You need ETB ${product.price} but have ETB ${balance.toFixed(2)}`);
      }

      // Create purchase transaction
      const { error: txError } = await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'purchase',
        amount: product.price,
        description: `Purchased ${product.name}`,
      });
      if (txError) throw txError;

      // Calculate expiry date
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + product.validity_days);

      // Create user_product entry (create a dummy recharge_id since we're buying directly)
      const { data: rechargeData, error: rechargeError } = await supabase.from('recharges').insert({
        user_id: user.id,
        product_id: product.id,
        amount: product.price,
        status: 'approved',
        approved_at: new Date().toISOString(),
        payer_account_name: 'Balance Purchase',
        transaction_id: `BAL-${Date.now()}`,
      }).select().single();
      
      if (rechargeError) throw rechargeError;

      const { error: productError } = await supabase.from('user_products').insert({
        user_id: user.id,
        product_id: product.id,
        recharge_id: rechargeData.id,
        expiry_date: expiryDate.toISOString(),
        is_active: true,
      });
      if (productError) throw productError;

      return product;
    },
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ['mainBalance'] });
      queryClient.invalidateQueries({ queryKey: ['availableBalance'] });
      queryClient.invalidateQueries({ queryKey: ['activeProducts'] });
      queryClient.invalidateQueries({ queryKey: ['userProducts'] });
      queryClient.invalidateQueries({ queryKey: ['latestRecharge'] });
      toast({
        title: "Product Working!",
        description: `${product.name} is now working and generating income for you!`,
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Purchase Failed",
        description: error.message,
      });
    },
  });

  const handleBuyProduct = (product: any) => {
    if (isProductOwned(product.id)) {
      toast({
        variant: "destructive",
        title: "Already Owned",
        description: `You already own ${product.name}. It's generating income for you! Please buy the next product.`,
      });
      return;
    }
    buyProductMutation.mutate(product);
  };

  const isProductOwned = (productId: string) => {
    return userProducts?.includes(productId) || false;
  };

  if (isLoading) {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6 space-y-3">
              <div className="h-6 bg-muted rounded" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6 pb-20">
      <div className="space-y-2">
        <h2 className="text-xl font-bold">Investment Products</h2>
        <p className="text-sm text-muted-foreground">Your balance: <span className="font-bold text-primary">ETB {(mainBalance || 0).toFixed(2)}</span></p>
      </div>

      <div className="space-y-4">
        {products?.map((product, index) => {
          const isPremium = index >= 4;
          const imageUrl = product.image_url || productImages[index] || productImages[0];
          const canAfford = (mainBalance || 0) >= product.price;
          const owned = isProductOwned(product.id);
          return (
            <Card key={product.id} className={`shadow-card hover:shadow-elevated transition-all animate-fade-in ${isPremium ? 'border-accent border-2' : ''} ${owned ? 'border-emerald-500 border-2' : ''}`} style={{ animationDelay: `${index * 50}ms` }}>
              <CardContent className="p-0">
                <div className="relative h-40 w-full overflow-hidden rounded-t-lg">
                  <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  {isPremium && !owned && <span className="absolute top-2 right-2 px-2 py-1 text-xs font-bold rounded bg-gradient-gold text-foreground">Premium</span>}
                  {owned && (
                    <div className="absolute inset-0 bg-emerald-950/60 flex items-center justify-center">
                      <Badge className="bg-emerald-500 text-white text-lg px-4 py-2">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Working
                      </Badge>
                    </div>
                  )}
                  {!owned && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="bg-gray-800/80 text-gray-300">
                        <Lock className="h-3 w-3 mr-1" />
                        Locked
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Package className={`h-5 w-5 ${owned ? 'text-emerald-500' : isPremium ? 'text-accent' : 'text-primary'}`} />
                      <h3 className="font-bold">{product.name}</h3>
                    </div>
                    <p className="text-xl font-bold text-primary">ETB {product.price}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-muted/50 rounded p-2">
                      <Calendar className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Validity</p>
                      <p className="text-sm font-semibold">{product.validity_days}d</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <TrendingUp className="h-3 w-3 mx-auto mb-1 text-secondary" />
                      <p className="text-xs text-muted-foreground">Daily</p>
                      <p className="text-sm font-semibold text-secondary">ETB {product.daily_income}</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <DollarSign className="h-3 w-3 mx-auto mb-1 text-accent" />
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-sm font-semibold text-accent">ETB {product.total_income}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                {owned ? (
                  <Button disabled className="w-full bg-emerald-600 hover:bg-emerald-600">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Working - Generating Income
                  </Button>
                ) : (
                  <Button 
                    onClick={() => handleBuyProduct(product)} 
                    className="w-full" 
                    variant={isPremium ? "default" : "outline"}
                    disabled={!canAfford || buyProductMutation.isPending}
                  >
                    {buyProductMutation.isPending ? 'Processing...' : canAfford ? 'Buy Now' : 'Recharge First'}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ProductsSection;
