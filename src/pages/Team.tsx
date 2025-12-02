import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, Users, UserPlus, Calendar, Gift, CheckCircle2, Clock } from "lucide-react";
import Layout from "@/components/Layout";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";

const Team = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: referrals } = useQuery({
    queryKey: ['referrals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('referred_by', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // For each referral, check investment status
      const referralsWithStatus = await Promise.all(
        data.map(async (referral) => {
          const { data: investmentData } = await supabase
            .from('referral_investments')
            .select('total_invested, bonus_credited')
            .eq('user_id', referral.id)
            .eq('referred_by', user?.id)
            .maybeSingle();
          
          const totalInvested = investmentData?.total_invested || 0;
          const meetsMinimum = totalInvested >= 500;
          
          return {
            ...referral,
            hasInvested: meetsMinimum,
            totalInvested,
            investmentProgress: Math.min((totalInvested / 500) * 100, 100),
          };
        })
      );
      
      return referralsWithStatus;
    },
    enabled: !!user,
  });

  const { data: referralSettings } = useQuery({
    queryKey: ['referralSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_settings')
        .select('*')
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: referralEarnings } = useQuery({
    queryKey: ['referralEarnings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user?.id)
        .eq('type', 'referral_bonus');
      
      if (error) throw error;
      const total = data.reduce((sum, t) => sum + Number(t.amount), 0);
      return { total, count: data.length };
    },
    enabled: !!user,
  });

  const referralLink = profile ? `${window.location.origin}/auth?ref=${profile.referral_code}` : '';

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard",
    });
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto p-4 space-y-6">
        <div className="space-y-2 animate-fade-in">
          <h1 className="text-2xl font-bold">My Team</h1>
          <p className="text-muted-foreground">Build your network and earn rewards</p>
        </div>

        <Card className="shadow-elevated bg-gradient-primary">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-sm opacity-90">Your Referral Code</p>
                <p className="text-2xl font-bold">{profile?.referral_code || 'Loading...'}</p>
              </div>
              <Button
                variant="secondary"
                size="icon"
                onClick={copyReferralLink}
                className="rounded-full"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
              <p className="text-white text-sm break-all">{referralLink}</p>
            </div>

            <Button
              variant="secondary"
              className="w-full"
              onClick={copyReferralLink}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Referral Link
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="text-sm">Total Referrals</span>
              </div>
              <p className="text-2xl font-bold text-primary">{referrals?.length || 0}</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Gift className="h-4 w-4" />
                <span className="text-sm">Bonus Earned</span>
              </div>
              <p className="text-2xl font-bold text-accent">ETB {referralEarnings?.total.toFixed(2) || '0.00'}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card bg-primary/5 border-primary/20">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />
              Referral Bonus Rules
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex gap-2">
                <span className="text-primary font-semibold">•</span>
                <p>Earn <span className="font-semibold text-foreground">{referralSettings?.bonus_amount || 0}% bonus</span> when your direct referral makes their first investment</p>
              </div>
              <div className="flex gap-2">
                <span className="text-primary font-semibold">•</span>
                <p>Earn <span className="font-semibold text-foreground">3% bonus</span> when your referral's referral makes their first investment</p>
              </div>
              <div className="flex gap-2">
                <span className="text-primary font-semibold">•</span>
                <p>Bonuses are credited only after the investment is approved by admin</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Team Members</h2>
          {referrals && referrals.length > 0 ? (
            <div className="space-y-2">
              {referrals.map((referral) => (
                <Card key={referral.id} className="shadow-card">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold">{referral.phone_number}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>Joined {format(new Date(referral.created_at), 'MMM dd, yyyy')}</span>
                          </div>
                        </div>
                      </div>
                      {referral.hasInvested ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Investment Status (Min 500 ETB)</span>
                        <span className={referral.hasInvested ? "text-green-500 font-semibold" : "text-muted-foreground"}>
                          {referral.hasInvested ? "Eligible" : `ETB ${referral.totalInvested || 0}/500`}
                        </span>
                      </div>
                      <Progress value={referral.investmentProgress || 0} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="shadow-card">
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">No referrals yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Share your referral link to start building your team
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Team;
