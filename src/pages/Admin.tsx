import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Users, CreditCard } from "lucide-react";
import { format } from "date-fns";

const Admin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: isAdmin } = useQuery({
    queryKey: ['isAdmin', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .eq('role', 'admin')
        .single();
      return !!data;
    },
    enabled: !!user,
  });

  const { data: pendingRecharges } = useQuery({
    queryKey: ['pendingRecharges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recharges')
        .select('*, profiles(phone_number), products(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const { data: allUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const approveMutation = useMutation({
    mutationFn: async (rechargeId: string) => {
      const recharge = pendingRecharges?.find(r => r.id === rechargeId);
      if (!recharge) throw new Error('Recharge not found');

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + recharge.products.validity_days);

      await supabase.from('recharges').update({ 
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user?.id,
      }).eq('id', rechargeId);

      await supabase.from('user_products').insert({
        user_id: recharge.user_id,
        product_id: recharge.product_id,
        recharge_id: rechargeId,
        expiry_date: expiryDate.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingRecharges'] });
      toast({ title: "Success", description: "Recharge approved successfully" });
    },
  });

  if (!isAdmin) return <div className="p-4">Access Denied</div>;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Admin Panel</h1>

        <Tabs defaultValue="recharges">
          <TabsList>
            <TabsTrigger value="recharges">Pending Recharges</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="recharges" className="space-y-4">
            {pendingRecharges?.map((recharge) => (
              <Card key={recharge.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <p className="font-semibold">{recharge.profiles.phone_number}</p>
                      <p className="text-sm">{recharge.products.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(recharge.created_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                      <p className="text-lg font-bold">${recharge.amount}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => approveMutation.mutate(recharge.id)}>
                        <Check className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive">
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            {allUsers?.map((user) => (
              <Card key={user.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold">{user.phone_number}</p>
                      <p className="text-sm text-muted-foreground">Code: {user.referral_code}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined {format(new Date(user.created_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
