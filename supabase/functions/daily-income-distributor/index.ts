import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting hourly income distribution...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active user products with their product details
    const { data: userProducts, error: fetchError } = await supabase
      .from('user_products')
      .select(`
        id,
        user_id,
        product_id,
        purchase_date,
        expiry_date,
        is_active,
        products (
          name,
          daily_income,
          validity_days
        )
      `)
      .eq('is_active', true);

    if (fetchError) {
      console.error('Error fetching user products:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${userProducts?.length || 0} active user products`);

    const now = new Date();
    let successCount = 0;
    let expiredCount = 0;
    let errorCount = 0;

    for (const userProduct of userProducts || []) {
      try {
        const expiryDate = new Date(userProduct.expiry_date);
        
        // Check if product has expired
        if (now > expiryDate) {
          console.log(`Product ${userProduct.id} has expired, marking as inactive`);
          
          // Mark product as inactive
          const { error: updateError } = await supabase
            .from('user_products')
            .update({ is_active: false })
            .eq('id', userProduct.id);
          
          if (updateError) {
            console.error(`Error deactivating product ${userProduct.id}:`, updateError);
            errorCount++;
          } else {
            expiredCount++;
          }
          continue;
        }

        // Credit hourly income (1/24th of daily income)
        const dailyIncome = userProduct.products.daily_income;
        const hourlyIncome = dailyIncome / 24;
        
        console.log(`Crediting ${hourlyIncome} (hourly) to user ${userProduct.user_id} for product ${userProduct.products.name}`);
        
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: userProduct.user_id,
            amount: hourlyIncome,
            type: 'daily_income',
            description: `Hourly income from ${userProduct.products.name}`,
          });

        if (transactionError) {
          console.error(`Error creating transaction for user ${userProduct.user_id}:`, transactionError);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing product ${userProduct.id}:`, error);
        errorCount++;
      }
    }

    const summary = {
      timestamp: now.toISOString(),
      totalProcessed: userProducts?.length || 0,
      successfulCredits: successCount,
      expiredProducts: expiredCount,
      errors: errorCount,
    };

    console.log('Hourly income distribution completed:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Hourly income distribution completed',
        summary,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in hourly income distribution:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
