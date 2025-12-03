import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Package, TrendingUp, Calendar, DollarSign, Calculator } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import package1 from "@/assets/products/package-1.jpg";
import package2 from "@/assets/products/package-2.jpg";
import package3 from "@/assets/products/package-3.jpg";
import package4 from "@/assets/products/package-4.jpg";
import package5 from "@/assets/products/package-5.jpg";
import package6 from "@/assets/products/package-6.jpg";
import package7 from "@/assets/products/package-7.jpg";

const ProductsSection = () => {
  const navigate = useNavigate();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  
  const productImages = [package1, package2, package3, package4, package5, package6, package7];

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const handleBuyProduct = (productId: string) => {
    navigate(`/recharge?product=${productId}`);
  };

  const handleCalculate = (product: any) => {
    setSelectedProduct(product);
    setIsCalculatorOpen(true);
  };

  const calculateEarnings = (product: any) => {
    const dailyIncome = Number(product.daily_income);
    const validityDays = product.validity_days;
    const totalIncome = dailyIncome * validityDays;
    const profit = totalIncome - Number(product.price);
    const roi = ((profit / Number(product.price)) * 100).toFixed(2);
    return { dailyIncome, validityDays, totalIncome, profit, roi };
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
        <p className="text-sm text-muted-foreground">Choose a package that suits your goals</p>
      </div>

      <div className="space-y-4">
        {products?.map((product, index) => {
          const isPremium = index >= 4;
          const imageUrl = product.image_url || productImages[index] || productImages[0];
          return (
            <Card key={product.id} className={`shadow-card hover:shadow-elevated transition-all animate-fade-in ${isPremium ? 'border-accent border-2' : ''}`} style={{ animationDelay: `${index * 50}ms` }}>
              <CardContent className="p-0">
                <div className="relative h-40 w-full overflow-hidden rounded-t-lg">
                  <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  {isPremium && <span className="absolute top-2 right-2 px-2 py-1 text-xs font-bold rounded bg-gradient-gold text-foreground">Premium</span>}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Package className={`h-5 w-5 ${isPremium ? 'text-accent' : 'text-primary'}`} />
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
              <CardFooter className="p-4 pt-0 flex gap-2">
                <Dialog open={isCalculatorOpen && selectedProduct?.id === product.id} onOpenChange={setIsCalculatorOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => handleCalculate(product)} variant="outline" size="sm" className="flex-1">
                      <Calculator className="h-4 w-4 mr-1" />
                      Calculate
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Earnings Calculator</DialogTitle>
                    </DialogHeader>
                    {selectedProduct && (
                      <div className="space-y-3">
                        <Card className="bg-gradient-primary">
                          <CardContent className="p-4 space-y-2 text-white text-sm">
                            <div className="flex justify-between border-b border-white/20 pb-2">
                              <span className="text-white/80">Investment</span>
                              <span className="font-bold">ETB {selectedProduct.price}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/20 pb-2">
                              <span className="text-white/80">Daily Income</span>
                              <span className="font-bold text-accent">ETB {calculateEarnings(selectedProduct).dailyIncome}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/20 pb-2">
                              <span className="text-white/80">Period</span>
                              <span className="font-semibold">{calculateEarnings(selectedProduct).validityDays} days</span>
                            </div>
                            <div className="flex justify-between border-b border-white/20 pb-2">
                              <span className="text-white/80">Total Return</span>
                              <span className="font-bold">ETB {calculateEarnings(selectedProduct).totalIncome}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/20 pb-2">
                              <span className="text-white/80">Net Profit</span>
                              <span className="font-bold text-green-300">ETB {calculateEarnings(selectedProduct).profit}</span>
                            </div>
                            <div className="flex justify-between pt-1">
                              <span className="text-white/80">ROI</span>
                              <span className="font-bold text-xl text-accent">{calculateEarnings(selectedProduct).roi}%</span>
                            </div>
                          </CardContent>
                        </Card>
                        <Button onClick={() => { setIsCalculatorOpen(false); handleBuyProduct(selectedProduct.id); }} className="w-full">
                          Invest Now
                        </Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
                <Button onClick={() => handleBuyProduct(product.id)} size="sm" className="flex-1" variant={isPremium ? "default" : "outline"}>
                  Buy Now
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ProductsSection;
