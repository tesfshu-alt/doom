import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Gift, Plus, Copy, Check, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const AdminBonusCodes = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [maxClaims, setMaxClaims] = useState("100");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: bonusCodes } = useQuery({
    queryKey: ['bonusCodes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bonus_codes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // Generate random 8-character code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 12);

      const { error } = await supabase
        .from('bonus_codes')
        .insert({
          code,
          expires_at: expiresAt.toISOString(),
          max_bonus: 10,
          min_bonus: 5,
          max_claims: parseInt(maxClaims),
        });

      if (error) throw error;
      return code;
    },
    onSuccess: (code) => {
      queryClient.invalidateQueries({ queryKey: ['bonusCodes'] });
      toast({
        title: "Success",
        description: `Bonus code ${code} created successfully`,
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

  const deactivateMutation = useMutation({
    mutationFn: async (codeId: string) => {
      const { error } = await supabase
        .from('bonus_codes')
        .update({ is_active: false })
        .eq('id', codeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonusCodes'] });
      toast({
        title: "Success",
        description: "Bonus code deactivated",
      });
    },
  });

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({
      title: "Copied!",
      description: `Code ${code} copied to clipboard`,
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getStatusBadge = (bonusCode: any) => {
    const now = new Date();
    const expiresAt = new Date(bonusCode.expires_at);
    
    if (!bonusCode.is_active) {
      return <Badge variant="outline" className="bg-red-500/10 text-red-700">Inactive</Badge>;
    }
    if (expiresAt < now) {
      return <Badge variant="outline" className="bg-orange-500/10 text-orange-700">Expired</Badge>;
    }
    if (bonusCode.total_claims >= bonusCode.max_claims) {
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700">Full</Badge>;
    }
    return <Badge variant="outline" className="bg-green-500/10 text-green-700">Active</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Bonus Code Management</h2>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Create New Bonus Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maxClaims">Maximum Claims</Label>
              <Input
                id="maxClaims"
                type="number"
                min="1"
                value={maxClaims}
                onChange={(e) => setMaxClaims(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                How many users can claim this code
              </p>
            </div>

            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {createMutation.isPending ? 'Creating...' : 'Generate Bonus Code'}
            </Button>

            <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted rounded-md">
              <p>• Code valid for 12 hours from creation</p>
              <p>• Bonus ranges from ETB 5 to ETB 10</p>
              <p>• Early claimers get higher amounts</p>
              <p>• Each user can claim each code only once</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Active & Recent Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {bonusCodes && bonusCodes.length > 0 ? (
              bonusCodes.map((bonusCode) => (
                <div key={bonusCode.id} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <code className="text-lg font-bold bg-primary/10 px-3 py-1 rounded">
                        {bonusCode.code}
                      </code>
                      {getStatusBadge(bonusCode)}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(bonusCode.code)}
                      >
                        {copiedCode === bonusCode.code ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      {bonusCode.is_active && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deactivateMutation.mutate(bonusCode.id)}
                          disabled={deactivateMutation.isPending}
                        >
                          Deactivate
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Created: {format(new Date(bonusCode.created_at), 'MMM dd, HH:mm')}
                    </div>
                    <div>
                      Expires: {format(new Date(bonusCode.expires_at), 'MMM dd, HH:mm')}
                    </div>
                    <div>
                      Claims: {bonusCode.total_claims} / {bonusCode.max_claims}
                    </div>
                    <div>
                      Bonus: ETB {bonusCode.min_bonus} - {bonusCode.max_bonus}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No bonus codes created yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBonusCodes;
