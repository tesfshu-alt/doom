import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ListTodo, Save } from "lucide-react";

const AdminDailyTasks = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["adminDailyTasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .eq("setting_key", "daily_tasks")
        .maybeSingle();
      if (error) throw error;
      return (data?.setting_value as any) || {
        enabled: false,
        task_count: 3,
        default_reward_etb: 0,
      };
    },
  });

  const [enabled, setEnabled] = useState(false);
  const [taskCount, setTaskCount] = useState("3");
  const [defaultReward, setDefaultReward] = useState("0");

  useEffect(() => {
    if (settings) {
      setEnabled(!!settings.enabled);
      setTaskCount(String(settings.task_count ?? 3));
      setDefaultReward(String(settings.default_reward_etb ?? 0));
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        enabled,
        task_count: Math.max(1, parseInt(taskCount) || 1),
        default_reward_etb: Math.max(0, Number(defaultReward) || 0),
      };
      const { error } = await supabase
        .from("platform_settings")
        .upsert(
          { setting_key: "daily_tasks", setting_value: payload },
          { onConflict: "setting_key" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminDailyTasks"] });
      queryClient.invalidateQueries({ queryKey: ["dailyTasksSettings"] });
      toast({ title: "Saved", description: "Daily tasks settings updated" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ListTodo className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Daily Tasks</h2>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enabled">Enable Daily Tasks</Label>
              <p className="text-sm text-muted-foreground">
                When off, the widget is hidden from all users.
              </p>
            </div>
            <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="taskCount">Number of tasks per day</Label>
            <Input
              id="taskCount"
              type="number"
              min={1}
              max={20}
              value={taskCount}
              onChange={(e) => setTaskCount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Users must complete this many tasks to claim the daily reward.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultReward">
              Default reward for users without recharge (ETB)
            </Label>
            <Input
              id="defaultReward"
              type="number"
              min={0}
              step="0.01"
              value={defaultReward}
              onChange={(e) => setDefaultReward(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Users with active products earn the sum of their products'
              daily income (in ETB). Users with no active products earn
              this amount.
            </p>
          </div>

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDailyTasks;
