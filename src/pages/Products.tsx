import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Package, TrendingUp, Calendar, DollarSign } from "lucide-react";
import Layout from "@/components/Layout";
import package1 from "@/assets/products/package-1.jpg";
import package2 from "@/assets/products/package-2.jpg";
import package3 from "@/assets/products/package-3.jpg";
import package4 from "@/assets/products/package-4.jpg";
import package5 from "@/assets/products/package-5.jpg";
import package6 from "@/assets/products/package-6.jpg";
import package7 from "@/assets/products/package-7.jpg";

const Products = () => {
  const navigate = useNavigate();
  
  const productImages = [package1, package2, package3, package4, package5, package6, package7];

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data;
    },
  });

  const handleBuyProduct = (productId: string) => {
    navigate(`/recharge?product=${productId}`);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto p-4">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 space-y-3">
                  <div className="h-6 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto p-4 space-y-6">
        <div className="space-y-2 animate-fade-in">
          <h1 className="text-2xl font-bold">Investment Products</h1>
          <p className="text-muted-foreground">Choose a package that suits your goals</p>
        </div>

        <div className="space-y-4">
          {products?.map((product, index) => {
            const isPremium = index >= 4;
            const imageUrl = product.image_url || productImages[index] || productImages[0];
            return (
              <Card
                key={product.id}
                className={`shadow-card hover:shadow-elevated transition-all duration-300 animate-fade-in ${
                  isPremium ? 'border-accent border-2' : ''
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-0">
                  <div className="relative h-48 w-full overflow-hidden rounded-t-lg">
                    <img 
                      src={imageUrl} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className={`h-5 w-5 ${isPremium ? 'text-accent' : 'text-primary'}`} />
                        <h3 className="font-bold text-lg">{product.name}</h3>
                      </div>
                      {isPremium && (
                        <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-gradient-gold text-foreground">
                          Premium
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">${product.price}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span className="text-xs">Validity</span>
                      </div>
                      <p className="text-sm font-semibold">{product.validity_days} days</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        <span className="text-xs">Daily</span>
                      </div>
                      <p className="text-sm font-semibold text-secondary">${product.daily_income}</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <DollarSign className="h-3 w-3" />
                        <span className="text-xs">Total</span>
                      </div>
                      <p className="text-sm font-semibold text-accent">${product.total_income}</p>
                    </div>
                  </div>
                  </div>
                </CardContent>

                <CardFooter className="p-4 pt-0">
                  <Button
                    onClick={() => handleBuyProduct(product.id)}
                    className="w-full"
                    variant={isPremium ? "default" : "outline"}
                  >
                    Buy Now
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default Products;
