import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Coins, Sparkles, Trophy } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userProductId: string;
  productName: string;
  pendingDays: number;
  potentialEtb: number;
  userId?: string;
}

interface FallingCoin {
  id: number;
  x: number; // 0-100 (%)
  y: number; // 0-100 (%)
  speed: number;
  value: number; // 1 = regular, 3 = bonus, -1 = bomb
  rotation: number;
  caught: boolean;
}

const DEFAULT_DURATION_MS = 12000;
const DEFAULT_TARGET_SCORE = 20;
const DEFAULT_BOMB_PENALTY = 1;

const TapCoinsGame = ({
  open,
  onOpenChange,
  userProductId,
  productName,
  pendingDays,
  potentialEtb,
  userId,
}: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const TARGET_SCORE = Number(gameCfg?.target_score) || DEFAULT_TARGET_SCORE;
  const DURATION_MS = (Number(gameCfg?.duration_seconds) || DEFAULT_DURATION_MS / 1000) * 1000;
  const BOMB_PENALTY = gameCfg?.bomb_penalty ?? DEFAULT_BOMB_PENALTY;

  const [phase, setPhase] = useState<"intro" | "playing" | "won" | "lost">("intro");
  const [coins, setCoins] = useState<FallingCoin[]>([]);
  const [score, setScore] = useState(0);
  const [bombsHit, setBombsHit] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION_MS);
  const [reward, setReward] = useState<number | null>(null);
  const [bonus, setBonus] = useState<number>(0);
  const rafRef = useRef<number>();
  const lastSpawnRef = useRef(0);
  const startRef = useRef(0);
  const nextIdRef = useRef(1);
  const bombsHitRef = useRef(0);

  const claimMutation = useMutation({
    mutationFn: async () => {
      const perfect = bombsHitRef.current === 0;
      const { data, error } = await supabase.rpc("claim_package_daily_income", {
        _user_product_id: userProductId,
        _perfect: perfect,
      } as any);
      if (error) throw new Error(error.message);
      return data as { reward_etb: number; days_credited: number; daily_etb: number; bonus_etb: number };
    },
    onSuccess: (data) => {
      setReward(Number(data.reward_etb));
      setBonus(Number(data.bonus_etb || 0));
      queryClient.invalidateQueries({ queryKey: ["mainBalance", userId] });
      queryClient.invalidateQueries({ queryKey: ["availableBalance", userId] });
      queryClient.invalidateQueries({ queryKey: ["packageClaims", userId] });
      const total = Number(data.reward_etb) + Number(data.bonus_etb || 0);
      toast({
        title: "Reward credited!",
        description: `ETB ${total.toFixed(2)} added (${data.days_credited} day${data.days_credited > 1 ? "s" : ""}${Number(data.bonus_etb || 0) > 0 ? ` + ETB ${Number(data.bonus_etb).toFixed(2)} perfect bonus` : ""}).`,
      });
    },
    onError: (e: Error) => {
      toast({ title: "Could not claim", description: e.message, variant: "destructive" });
      onOpenChange(false);
    },
  });

  const reset = () => {
    setPhase("intro");
    setCoins([]);
    setScore(0);
    setBombsHit(0);
    bombsHitRef.current = 0;
    setTimeLeft(DURATION_MS);
    setReward(null);
    setBonus(0);
    lastSpawnRef.current = 0;
    nextIdRef.current = 1;
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  // Game loop
  useEffect(() => {
    if (phase !== "playing") return;
    startRef.current = performance.now();

    const tick = (t: number) => {
      const elapsed = t - startRef.current;
      const remaining = Math.max(0, DURATION_MS - elapsed);
      setTimeLeft(remaining);

      // Spawn coins ~every 220ms (faster as time goes on)
      const spawnInterval = Math.max(140, 260 - elapsed / 100);
      if (t - lastSpawnRef.current > spawnInterval) {
        lastSpawnRef.current = t;
        const roll = Math.random();
        const value = roll < 0.1 ? 3 : roll < 0.22 ? -BOMB_PENALTY : 1;
        setCoins((prev) => [
          ...prev,
          {
            id: nextIdRef.current++,
            x: 5 + Math.random() * 90,
            y: -8,
            speed: 0.04 + Math.random() * 0.05,
            value,
            rotation: Math.random() * 360,
            caught: false,
          },
        ]);
      }

      // Move coins
      setCoins((prev) =>
        prev
          .map((c) => ({ ...c, y: c.y + c.speed * 16, rotation: c.rotation + 4 }))
          .filter((c) => c.y < 110 && !c.caught),
      );

      if (remaining <= 0) {
        setPhase((p) => {
          if (p !== "playing") return p;
          return score >= TARGET_SCORE ? "won" : "lost";
        });
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // When player wins, claim
  useEffect(() => {
    if (phase === "won" && !claimMutation.isPending && reward === null) {
      claimMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const tapCoin = (id: number, value: number) => {
    setCoins((prev) => prev.map((c) => (c.id === id ? { ...c, caught: true } : c)));
    setScore((s) => Math.max(0, s + value));
    if (value < 0) {
      bombsHitRef.current += 1;
      setBombsHit((b) => b + 1);
    }
  };

  const progressPct = Math.min(100, (score / TARGET_SCORE) * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-gradient-to-b from-emerald-950 via-slate-950 to-slate-900 border-emerald-500/40">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-emerald-300">
            <Coins className="h-5 w-5" /> {productName} — Daily Game
          </DialogTitle>
          <DialogDescription className="text-emerald-100/70">
            Catch {TARGET_SCORE} coins in {DURATION_MS / 1000}s. Avoid the bombs!
          </DialogDescription>
        </DialogHeader>

        {phase === "intro" && (
          <div className="px-4 pb-5 space-y-4">
            <div className="rounded-lg bg-emerald-900/30 border border-emerald-500/30 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-100/80">Pending days</span>
                <span className="font-bold text-emerald-300">{pendingDays}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-100/80">Reward on win</span>
                <span className="font-bold text-emerald-300">
                  ETB {potentialEtb.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="text-xs text-emerald-100/60 space-y-1">
              <p>🪙 Gold coin = +1</p>
              <p>✨ Sparkle coin = +3</p>
              <p>💣 Bomb = −1 (don't tap!)</p>
            </div>
            <Button
              className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white font-bold"
              onClick={() => setPhase("playing")}
            >
              Start Game
            </Button>
          </div>
        )}

        {phase === "playing" && (
          <div className="px-4 pb-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-emerald-300 font-bold">Score: {score}/{TARGET_SCORE}</span>
              <span className="text-emerald-100/80">{(timeLeft / 1000).toFixed(1)}s</span>
            </div>
            <Progress value={progressPct} className="h-2 [&>div]:bg-emerald-400" />
            <div
              className="relative w-full rounded-lg overflow-hidden border border-emerald-500/30 bg-gradient-to-b from-slate-900 to-emerald-950/40 select-none touch-none"
              style={{ height: 360 }}
            >
              {coins.map((c) => (
                <button
                  key={c.id}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    tapCoin(c.id, c.value);
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 transition-transform active:scale-90"
                  style={{
                    left: `${c.x}%`,
                    top: `${c.y}%`,
                    transform: `translate(-50%,-50%) rotate(${c.rotation}deg)`,
                  }}
                  aria-label="coin"
                >
                  {c.value < 0 ? (
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-red-500 to-red-800 flex items-center justify-center shadow-lg shadow-red-500/40 text-lg">
                      💣
                    </div>
                  ) : c.value === 3 ? (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-400/60 ring-2 ring-yellow-200">
                      <Sparkles className="h-5 w-5 text-amber-900" />
                    </div>
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-yellow-200 to-yellow-500 flex items-center justify-center shadow-lg shadow-yellow-500/40 font-bold text-amber-900">
                      $
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === "lost" && (
          <div className="px-4 pb-5 space-y-4 text-center">
            <p className="text-lg font-bold text-orange-300">
              So close! You got {score}/{TARGET_SCORE}.
            </p>
            <p className="text-sm text-emerald-100/70">
              No reward this time. Your {pendingDays} day{pendingDays > 1 ? "s" : ""} are still waiting — try again.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                onClick={() => {
                  reset();
                  setPhase("playing");
                }}
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {phase === "won" && (
          <div className="px-4 pb-6 space-y-4 text-center">
            <div className="flex justify-center">
              <Trophy className="h-14 w-14 text-yellow-400 animate-bounce" />
            </div>
            <p className="text-xl font-bold text-emerald-300">You won!</p>
            {claimMutation.isPending || reward === null ? (
              <p className="text-sm text-emerald-100/70">Crediting your reward…</p>
            ) : (
              <p className="text-lg font-bold text-emerald-200">
                +ETB {reward.toFixed(2)} added to your balance
              </p>
            )}
            <Button
              className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400"
              disabled={claimMutation.isPending || reward === null}
              onClick={() => onOpenChange(false)}
            >
              Awesome!
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TapCoinsGame;
