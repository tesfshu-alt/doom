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

      // Find the bonus code
      const { data: codeData, error: codeError } = await supabase
        .from('bonus_codes')
        .select('*')
        .eq('code', bonusCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (codeError || !codeData) {
        throw new Error("Invalid or expired bonus code");
      }

      // Check if code is expired
      if (new Date(codeData.expires_at) < new Date()) {
        throw new Error("This bonus code has expired");
      }

      // Check if max claims reached
      if (codeData.total_claims >= codeData.max_claims) {
        throw new Error("This bonus code has reached maximum claims");
      }

      // Check if user already claimed this code
      const { data: existingClaim } = await supabase
        .from('bonus_code_claims')
        .select('id')
        .eq('user_id', user?.id)
        .eq('code_id', codeData.id)
        .maybeSingle();

      if (existingClaim) {
        throw new Error("You have already claimed this bonus code");
      }

      // Calculate bonus amount based on claims (higher for earlier claims)
      const claimRatio = codeData.total_claims / codeData.max_claims;
      const bonusRange = codeData.max_bonus - codeData.min_bonus;
      const bonusAmount = codeData.max_bonus - (bonusRange * claimRatio);

      // Create claim record
      const { error: claimError } = await supabase
        .from('bonus_code_claims')
        .insert({
          user_id: user?.id,
          code_id: codeData.id,
          bonus_amount: bonusAmount,
        });

      if (claimError) throw claimError;

      // Update total claims
      const { error: updateError } = await supabase
        .from('bonus_codes')
        .update({ total_claims: codeData.total_claims + 1 })
        .eq('id', codeData.id);

      if (updateError) throw updateError;

      // Credit bonus to user
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user?.id,
          amount: bonusAmount,
          type: 'referral_bonus',
          description: `Bonus code reward: ${codeData.code}`,
        });

      if (transactionError) throw transactionError;

      return bonusAmount;
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
