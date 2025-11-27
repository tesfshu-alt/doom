import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

const AdminWithdrawalFee = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [feePercentage, setFeePercentage] = useState(0);
  const [enabled, setEnabled] = useState(false);

  const { data: feeSettings } = useQuery({
    queryKey: ['withdrawalFeeSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('withdrawal_fee_settings')
        .select('*')
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (feeSettings) {
      setFeePercentage(Number(feeSettings.fee_percentage));
      setEnabled(feeSettings.enabled);
    }
  }, [feeSettings]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!feeSettings?.id) throw new Error('Fee settings not found');

      const { error } = await supabase
        .from('withdrawal_fee_settings')
        .update({
          fee_percentage: feePercentage,
          enabled: enabled,
        })
        .eq('id', feeSettings.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawalFeeSettings'] });
      toast({
        title: "Success",
        description: "Withdrawal fee settings updated successfully",
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

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Withdrawal Fee Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="enabled">Enable Maintenance Fee</Label>
              <Switch
                id="enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="feePercentage">Fee Percentage (%)</Label>
              <Input
                id="feePercentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={feePercentage}
                onChange={(e) => setFeePercentage(Number(e.target.value))}
                disabled={!enabled}
              />
              <p className="text-xs text-muted-foreground">
                This percentage will be deducted from withdrawal amounts
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={updateMutation.isPending}
            >
              Save Settings
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• The maintenance fee is only charged when you enable it</p>
          <p>• Fee is calculated as a percentage of the withdrawal amount</p>
          <p>• Users will see the fee breakdown before confirming withdrawal</p>
          <p>• The fee is automatically deducted when admin approves the withdrawal</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWithdrawalFee;
