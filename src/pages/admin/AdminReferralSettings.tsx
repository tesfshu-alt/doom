import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Gift, Save } from "lucide-react";

const AdminReferralSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['referralSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_settings')
        .select('*')
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const [bonusAmount, setBonusAmount] = useState(settings?.bonus_amount?.toString() || '10.00');
  const [enabled, setEnabled] = useState(settings?.enabled ?? true);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!settings?.id) throw new Error('Settings not found');

      const { error } = await supabase
        .from('referral_settings')
        .update({
          bonus_amount: parseFloat(bonusAmount),
          enabled: enabled,
        })
        .eq('id', settings.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referralSettings'] });
      toast({
        title: "Success",
        description: "Referral settings updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  // Update local state when settings are loaded
  if (settings && bonusAmount === '10.00' && settings.bonus_amount !== 10) {
    setBonusAmount(settings.bonus_amount.toString());
    setEnabled(settings.enabled);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Referral Bonus Settings</h2>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Configure Referral Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enabled">Enable Referral Bonus</Label>
                  <p className="text-sm text-muted-foreground">
                    Award bonus when referred users make their first purchase
                  </p>
                </div>
                <Switch
                  id="enabled"
                  checked={enabled}
                  onCheckedChange={setEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bonusAmount">Bonus Amount ($)</Label>
                <Input
                  id="bonusAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={bonusAmount}
                  onChange={(e) => setBonusAmount(e.target.value)}
                  required
                  disabled={!enabled}
                />
                <p className="text-xs text-muted-foreground">
                  Amount credited to the referrer when their referred user makes their first purchase
                </p>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={updateMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. When a new user registers with a referral code, the system tracks the referrer.</p>
          <p>2. When the referred user makes their first investment (recharge is approved), the referrer receives the bonus.</p>
          <p>3. The bonus is automatically credited as a transaction to the referrer's account.</p>
          <p>4. Each user can only earn the referral bonus once per referred user.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReferralSettings;
