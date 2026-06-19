import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gamepad2, Sparkles } from "lucide-react";
import TapCoinsGame from "@/components/TapCoinsGame";

const todayEAT = () => {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Addis_Ababa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
};

const daysBetween = (a: string, b: string) => {
  const da = new Date(a + "T00:00:00Z").getTime();
  const db = new Date(b + "T00:00:00Z").getTime();
  return Math.max(0, Math.round((db - da) / 86400000));
};

const DailyGameWidget = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const { data: gameCfg } = useQuery({
    queryKey: ["tapGameSettings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "tap_game")
        .maybeSingle();
      return (data?.setting_value as any) || {};
    },
  });

  const { data: exchangeRateSettings } = useQuery({
    queryKey: ["exchangeRateSettings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("*")
        .eq("setting_key", "exchange_rate")
        .maybeSingle();
      return data;
    },
  });

  const rate = (exchangeRateSettings?.setting_value as any)?.etb_to_usdt || 170;

  const { data: pending } = useQuery({
    queryKey: ["pendingDailyIncome", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_products")
        .select("id, last_income_claim_date, purchase_date, expiry_date, is_active, products(daily_income)")
        .eq("user_id", user?.id)
        .eq("is_active", true);
      if (error) throw error;
      const today = todayEAT();
      let etb = 0;
      let packages = 0;
      (data || []).forEach((up: any) => {
        if (new Date(up.expiry_date) <= new Date()) return;
        const last =
          up.last_income_claim_date ||
          (up.purchase_date ? new Date(up.purchase_date).toISOString().slice(0, 10) : today);
        const days = Math.min(7, daysBetween(last, today));
        if (days > 0) {
          etb += days * Number(up.products?.daily_income || 0) * rate;
          packages += 1;
        }
      });
      return { etb, packages, hasActive: (data || []).length > 0 };
    },
    enabled: !!user,
    refetchOnWindowFocus: true,
  });

  const enabled = gameCfg?.enabled ?? true;
  if (!enabled) return null;
  if (!pending?.hasActive) return null;

  const canPlay = (pending?.packages || 0) > 0;
  const reward = pending?.etb || 0;

  return (
    <>
      <Card className="shadow-elevated bg-gradient-to-br from-emerald-900 via-green-900 to-emerald-950 border-2 border-emerald-500/40 animate-fade-in overflow-hidden relative">
        <div className="absolute -top-6 -right-6 opacity-20">
          <Gamepad2 className="h-32 w-32 text-emerald-300" />
        </div>
        <CardContent className="p-5 relative space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-300" />
            <h3 className="font-bold text-white">Daily Game</h3>
          </div>
          {canPlay ? (
            <>
              <p className="text-sm text-emerald-100/90">
                Play once today to claim{" "}
                <span className="font-bold text-yellow-300">ETB {reward.toFixed(2)}</span> from your{" "}
                {pending?.packages} active package{(pending?.packages || 0) > 1 ? "s" : ""}.
              </p>
              <Button
                onClick={() => setOpen(true)}
                className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-emerald-950 font-bold"
              >
                <Gamepad2 className="h-4 w-4 mr-2" />
                Play Now
              </Button>
            </>
          ) : (
            <p className="text-sm text-emerald-100/80">
              ✅ You've played today. Come back tomorrow for your next daily reward!
            </p>
          )}
        </CardContent>
      </Card>

      {open && user && (
        <TapCoinsGame
          open={open}
          onOpenChange={setOpen}
          pendingDays={1}
          potentialEtb={reward}
          userId={user.id}
        />
      )}
    </>
  );
};

export default DailyGameWidget;
