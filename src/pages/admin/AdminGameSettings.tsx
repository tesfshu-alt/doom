import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Gamepad2, Save } from "lucide-react";

const SETTING_KEY = "tap_game";

const AdminGameSettings = () => {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["platformSettings", SETTING_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .eq("setting_key", SETTING_KEY)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const cfg = (data?.setting_value as any) || {};
  const [enabled, setEnabled] = useState(true);
  const [targetScore, setTargetScore] = useState(5);
  const [durationSeconds, setDurationSeconds] = useState(10);
  const [bombPenalty, setBombPenalty] = useState(1);

  useEffect(() => {
    if (cfg) {
      setEnabled(cfg.enabled ?? true);
      setTargetScore(cfg.target_score ?? 5);
      setDurationSeconds(cfg.duration_seconds ?? 10);
      setBombPenalty(cfg.bomb_penalty ?? 1);
    }
    // eslint-disable-next-line
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("platform_settings").upsert(
        {
          setting_key: SETTING_KEY,
          setting_value: {
            enabled,
            target_score: Number(targetScore),
            duration_seconds: Number(durationSeconds),
            bomb_penalty: Number(bombPenalty),
          },
        },
        { onConflict: "setting_key" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platformSettings", SETTING_KEY] });
      qc.invalidateQueries({ queryKey: ["tapGameSettings"] });
      toast({ title: "Saved", description: "Game settings updated" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Gamepad2 className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Daily Game Settings</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Controls the tap-to-collect mini-game players use to claim daily income from each package they own.
      </p>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Tap-to-Collect Coins</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
            className="space-y-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Game</Label>
                <p className="text-xs text-muted-foreground">When off, daily income auto-credits.</p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="space-y-2">
              <Label>Target Score (coins to catch to win)</Label>
              <Input
                type="number"
                min={1}
                value={targetScore}
                onChange={(e) => setTargetScore(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Duration (seconds)</Label>
              <Input
                type="number"
                min={3}
                max={60}
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Bomb Penalty (points lost per bomb)</Label>
              <Input
                type="number"
                min={0}
                value={bombPenalty}
                onChange={(e) => setBombPenalty(Number(e.target.value))}
              />
            </div>

            <Button type="submit" className="w-full" disabled={save.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {save.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminGameSettings;
