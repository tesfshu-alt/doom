import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Play, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const AdminDailyIncome = () => {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<any>(null);

  const runDailyIncome = async () => {
    setIsRunning(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/daily-income-distributor`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ time: new Date().toISOString() }),
        }
      );

      const data = await response.json();
      
      if (data.success) {
        setLastRun(data.summary);
        toast({
          title: "Success",
          description: `Daily income distributed to ${data.summary.successfulCredits} users`,
        });
      } else {
        throw new Error(data.error || 'Failed to distribute income');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to run daily income distribution",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Daily Income Distribution</h2>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          The daily income distribution runs automatically every day at midnight UTC (00:00).
          You can manually trigger it here for testing purposes.
        </AlertDescription>
      </Alert>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Manual Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will credit daily income to all users with active products and mark expired products as inactive.
          </p>
          
          <Button
            onClick={runDailyIncome}
            disabled={isRunning}
            className="w-full"
          >
            <Play className="h-4 w-4 mr-2" />
            {isRunning ? 'Running...' : 'Run Daily Income Distribution'}
          </Button>
        </CardContent>
      </Card>

      {lastRun && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Last Run Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Timestamp</p>
                <p className="font-semibold text-sm">
                  {new Date(lastRun.timestamp).toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Processed</p>
                <p className="font-semibold text-sm">{lastRun.totalProcessed}</p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Successful Credits</span>
                </div>
                <span className="font-semibold text-green-600">{lastRun.successfulCredits}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm">Expired Products</span>
                </div>
                <span className="font-semibold text-yellow-600">{lastRun.expiredProducts}</span>
              </div>

              {lastRun.errors > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm">Errors</span>
                  </div>
                  <span className="font-semibold text-red-600">{lastRun.errors}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Automated Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Frequency</span>
              <span className="font-semibold">Daily</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Time (UTC)</span>
              <span className="font-semibold">00:00 (Midnight)</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Active
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDailyIncome;
