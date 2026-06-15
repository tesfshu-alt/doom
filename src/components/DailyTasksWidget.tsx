import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, ListTodo } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const todayEAT = () => {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Addis_Ababa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
};

const DailyTasksWidget = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["dailyTasksSettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("setting_value")
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

  const { data: completion } = useQuery({
    queryKey: ["dailyTaskCompletion", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_task_completions")
        .select("*")
        .eq("user_id", user!.id)
        .eq("task_date", todayEAT())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("complete_daily_task");
      if (error) throw new Error(error.message);
      return data as {
        completed_count: number;
        task_count: number;
        reward_claimed: boolean;
        reward_amount: number;
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["dailyTaskCompletion", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["mainBalance"] });
      queryClient.invalidateQueries({ queryKey: ["availableBalance"] });
      if (data.reward_claimed) {
        toast({
          title: "All tasks completed!",
          description: `You earned ETB ${Number(data.reward_amount).toFixed(2)}`,
        });
      } else {
        toast({
          title: "Task completed",
          description: `${data.completed_count} / ${data.task_count} done today`,
        });
      }
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (!settings?.enabled) return null;

  const taskCount: number = settings.task_count ?? 3;
  const done = completion?.completed_count ?? 0;
  const allDone = done >= taskCount;
  const progress = Math.min(100, (done / taskCount) * 100);

  return (
    <Card className="shadow-card animate-fade-in border-emerald-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-emerald-400" />
          Daily Tasks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Today's progress</span>
            <span className="font-semibold">
              {done} / {taskCount}
            </span>
          </div>
          <Progress value={progress} className="h-2 [&>div]:bg-emerald-500" />
        </div>

        <div className="grid grid-cols-1 gap-2">
          {Array.from({ length: taskCount }).map((_, i) => {
            const isDone = i < done;
            return (
              <div
                key={i}
                className={`flex items-center justify-between p-3 rounded-md border ${
                  isDone
                    ? "bg-emerald-950/40 border-emerald-500/40"
                    : "bg-muted/30 border-border"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-muted-foreground" />
                  )}
                  <span className="text-sm">Task {i + 1}</span>
                </div>
                {isDone && (
                  <span className="text-xs text-emerald-400">Done</span>
                )}
              </div>
            );
          })}
        </div>

        {allDone ? (
          <div className="text-center text-sm text-emerald-400 font-medium">
            ✓ All tasks completed. Reward credited
            {completion?.reward_amount
              ? `: ETB ${Number(completion.reward_amount).toFixed(2)}`
              : ""}
            . Come back tomorrow!
          </div>
        ) : (
          <Button
            className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white"
            disabled={completeMutation.isPending}
            onClick={() => completeMutation.mutate()}
          >
            {completeMutation.isPending
              ? "Submitting..."
              : `Complete Task ${done + 1}`}
          </Button>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Finish all tasks to receive your daily reward. Resets at midnight EAT.
        </p>
      </CardContent>
    </Card>
  );
};

export default DailyTasksWidget;
