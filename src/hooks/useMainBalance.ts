import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useMainBalance = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['mainBalance', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      // Main balance = recharge + daily_income + referral_bonus + welcome_bonus - purchase - withdrawal
      const mainBalance = data.reduce((sum, transaction) => {
        if (
          transaction.type === 'recharge' || 
          transaction.type === 'daily_income' || 
          transaction.type === 'referral_bonus' || 
          transaction.type === 'welcome_bonus'
        ) {
          return sum + Number(transaction.amount);
        }
        if (transaction.type === 'purchase' || transaction.type === 'withdrawal') {
          return sum - Number(transaction.amount);
        }
        return sum;
      }, 0);
      
      return mainBalance;
    },
    enabled: !!userId,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchInterval: 15000,
    staleTime: 0,
  });
};
