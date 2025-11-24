import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAvailableBalance = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['availableBalance', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      // Calculate withdrawable balance: only daily_income and referral_bonus
      // Subtract: withdrawal
      const availableBalance = data.reduce((sum, transaction) => {
        if (transaction.type === 'daily_income' || transaction.type === 'referral_bonus') {
          return sum + Number(transaction.amount);
        }
        if (transaction.type === 'withdrawal') {
          return sum - Number(transaction.amount);
        }
        return sum; // Don't count recharge/purchase
      }, 0);
      
      return availableBalance;
    },
    enabled: !!userId,
  });
};
