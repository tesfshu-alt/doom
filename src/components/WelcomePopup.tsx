import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Coins, TrendingUp, Wallet, ArrowRightLeft, Megaphone } from "lucide-react";
import doomLogo from "@/assets/doom-logo.png";

interface WelcomePopupProps {
  open: boolean;
  onClose: () => void;
}

const WelcomePopup = ({ open, onClose }: WelcomePopupProps) => {
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (open) setStep(1);
  }, [open]);

  const { data: platformSettings } = useQuery({
    queryKey: ['platformSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('setting_key', 'welcome_popup')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: exchangeRateSettings } = useQuery({
    queryKey: ['exchangeRateSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('setting_key', 'exchange_rate')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const ETB_TO_USDT_RATE = (exchangeRateSettings?.setting_value as any)?.etb_to_usdt || 170;

  const { data: products } = useQuery({
    queryKey: ['productsForWelcome'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: ads } = useQuery({
    queryKey: ['activeAdvertisements'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('advertisements')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as Array<{ id: string; title: string; content: string; image_url: string | null }>;
    },
  });

  const settings = platformSettings?.setting_value as any;

  if (!settings?.enabled) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        {step === 1 ? (
          <>
            <DialogHeader className="text-center space-y-4">
              <img src={doomLogo} alt="Dangote" className="w-32 h-32 mx-auto object-contain" />
              <DialogTitle className="text-2xl font-bold">
                {settings?.title || 'Welcome to Dangote'}
              </DialogTitle>
              <p className="text-lg text-emerald-400 font-semibold">Your dream is here!</p>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">
                  {settings?.packages_info || 'Choose your exchange package to start earning daily income.'}
                </p>
                <p className="text-sm text-emerald-400 font-medium">
                  Exchange Rate: 1 USDT = {ETB_TO_USDT_RATE} ETB
                </p>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Minimum Withdrawal</h3>
                </div>
                <p className="text-2xl font-bold text-primary">
                  ETB {settings?.minimum_withdrawal || 300}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  You need at least this amount to request a withdrawal
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-primary" />
                  Available Exchange Packages
                </h3>
                <div className="grid gap-3">
                  {products?.map((product) => {
                    const dailyIncomeETB = (Number(product.daily_income) * ETB_TO_USDT_RATE).toFixed(2);
                    const totalIncomeETB = (Number(product.total_income) * ETB_TO_USDT_RATE).toFixed(2);
                    return (
                      <Card key={product.id} className="border-primary/20 hover:border-primary/40 transition-colors">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                                  <ArrowRightLeft className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-lg">{product.name}</h4>
                                  <p className="text-2xl font-bold text-primary">
                                    ETB {product.price}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 text-sm">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  <span>Validity</span>
                                </div>
                                <p className="font-semibold">{product.validity_days} days</p>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Coins className="h-3 w-3" />
                                  <span>Daily Income</span>
                                </div>
                                <p className="font-semibold text-emerald-400">${product.daily_income}</p>
                                <p className="text-xs text-muted-foreground">ETB {dailyIncomeETB}</p>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <TrendingUp className="h-3 w-3" />
                                  <span>Total Income</span>
                                </div>
                                <p className="font-semibold text-emerald-400">${product.total_income}</p>
                                <p className="text-xs text-muted-foreground">ETB {totalIncomeETB}</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <Button
                onClick={() => setStep(2)}
                className="w-full h-12 text-lg bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500"
              >
                Get Started
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Megaphone className="h-6 w-6 text-primary" />
                <DialogTitle className="text-2xl font-bold">Announcements</DialogTitle>
              </div>
              <p className="text-sm text-muted-foreground">Latest updates from Dangote</p>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {ads && ads.length > 0 ? (
                ads.map((ad) => (
                  <Card key={ad.id} className="border-primary/20">
                    <CardContent className="p-4 space-y-2">
                      {ad.image_url && (
                        <img src={ad.image_url} alt={ad.title} className="w-full max-h-48 object-cover rounded-md" />
                      )}
                      <h4 className="font-bold text-lg text-primary">{ad.title}</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ad.content}</p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    <Megaphone className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No announcements at this time.</p>
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={onClose}
                className="w-full h-12 text-lg bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500"
              >
                Next
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WelcomePopup;
