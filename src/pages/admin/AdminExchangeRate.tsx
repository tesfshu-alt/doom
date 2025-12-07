import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DollarSign } from "lucide-react";

const AdminExchangeRate = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rate, setRate] = useState("170");

  const { data: settings } = useQuery({
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

  useEffect(() => {
    if (settings?.setting_value) {
      const value = settings.setting_value as { etb_to_usdt?: number };
      setRate(value.etb_to_usdt?.toString() || "170");
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const newSettings = {
        etb_to_usdt: parseFloat(rate),
      };

      const { error } = await supabase
        .from('platform_settings')
        .upsert({
          setting_key: 'exchange_rate',
          setting_value: newSettings,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'setting_key' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchangeRateSettings'] });
      toast({ title: "Success", description: "Exchange rate updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Exchange Rate Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rate">1 USDT = ETB</Label>
            <Input
              id="rate"
              type="number"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="Enter exchange rate"
              required
            />
            <p className="text-xs text-muted-foreground">
              This rate is used to calculate USDT equivalents for product income display.
            </p>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm">
              <span className="text-muted-foreground">Current Rate: </span>
              <span className="font-bold text-primary">1 USDT = {rate} ETB</span>
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Exchange Rate'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdminExchangeRate;