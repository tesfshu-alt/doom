import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save } from "lucide-react";

const AdminPlatformSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['platformSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('setting_key', 'welcome_popup')
        .single();
      if (error) throw error;
      return data;
    },
  });

  const currentSettings = settings?.setting_value as any;

  const [enabled, setEnabled] = useState(currentSettings?.enabled ?? true);
  const [title, setTitle] = useState(currentSettings?.title || 'Welcome to Dangote');
  const [minWithdrawal, setMinWithdrawal] = useState(currentSettings?.minimum_withdrawal || 300);
  const [packagesInfo, setPackagesInfo] = useState(
    currentSettings?.packages_info || 'View our investment packages to start earning daily income.'
  );

  const updateMutation = useMutation({
    mutationFn: async () => {
      const settingsValue = {
        enabled,
        title,
        minimum_withdrawal: Number(minWithdrawal),
        packages_info: packagesInfo,
      };

      const { error } = await supabase
        .from('platform_settings')
        .upsert({
          setting_key: 'welcome_popup',
          setting_value: settingsValue,
        }, { onConflict: 'setting_key' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platformSettings'] });
      toast({
        title: "Success",
        description: "Platform settings updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Platform Settings</h2>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Welcome Popup Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enabled">Enable Welcome Popup</Label>
                <p className="text-sm text-muted-foreground">
                  Show popup when users log in
                </p>
              </div>
              <Switch
                id="enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Popup Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter popup title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minWithdrawal">Minimum Withdrawal Amount (ETB)</Label>
              <Input
                id="minWithdrawal"
                type="number"
                min="0"
                step="1"
                value={minWithdrawal}
                onChange={(e) => setMinWithdrawal(e.target.value)}
                placeholder="300"
                required
              />
              <p className="text-xs text-muted-foreground">
                This will be displayed in the popup
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="packagesInfo">Packages Description</Label>
              <Textarea
                id="packagesInfo"
                value={packagesInfo}
                onChange={(e) => setPackagesInfo(e.target.value)}
                placeholder="Enter description about packages"
                rows={3}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={updateMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPlatformSettings;
