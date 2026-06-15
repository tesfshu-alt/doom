import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Gift } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const BonusCodeClaim = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [bonusCode, setBonusCode] = useState("");

  const claimMutation = useMutation({
    mutationFn: async () => {
      if (!bonusCode.trim()) {
        throw new Error("Please enter a bonus code");
      }

      const { data, error } = await supabase.rpc('claim_bonus_code', {
        _code: bonusCode.trim().toUpperCase(),
      });

      if (error) {
        throw new Error(error.message || "Failed to claim bonus code");
      }

      return Number(data);
    },
    onSuccess: (bonusAmount) => {
      queryClient.invalidateQueries({ queryKey: ['availableBalance'] });
      toast({
        title: "Success!",
        description: `You received ETB ${bonusAmount.toFixed(2)} bonus!`,
      });
      setBonusCode("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="shadow-card animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          Claim Bonus Code
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Enter bonus code"
              value={bonusCode}
              onChange={(e) => setBonusCode(e.target.value.toUpperCase())}
              className="text-center font-mono text-lg"
              maxLength={8}
            />
            <p className="text-xs text-muted-foreground text-center">
              Enter the 8-character code from our Telegram channel
            </p>
          </div>

          <Button
            onClick={() => claimMutation.mutate()}
            disabled={claimMutation.isPending || !bonusCode.trim()}
            className="w-full"
          >
            {claimMutation.isPending ? 'Claiming...' : 'Claim Bonus'}
          </Button>

          <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/50 rounded-md">
            <p>• Bonus codes are posted on our Telegram channel</p>
            <p>• Early claimers receive higher bonuses (ETB 5-10)</p>
            <p>• Each code can be claimed only once per user</p>
            <p>• Codes expire 12 hours after creation</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BonusCodeClaim;
