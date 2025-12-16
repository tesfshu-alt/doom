import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, Users, Calendar, Gift, CheckCircle2, Clock, Share2 } from "lucide-react";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { maskPhoneNumber } from "@/lib/maskUtils";
import doomLogo from "@/assets/doom-logo.png";

const TeamSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: exchangeRateSettings } = useQuery({
    queryKey: ['exchangeRateSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('setting_key', 'exchange_rate')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const exchangeRate = (exchangeRateSettings?.setting_value as { etb_to_usdt?: number })?.etb_to_usdt || 170;

  // Level 1 referrals (direct)
  const { data: referrals } = useQuery({
    queryKey: ['referrals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('referred_by', user?.id).order('created_at', { ascending: false });
      if (error) throw error;
      const referralsWithStatus = await Promise.all(
        data.map(async (referral) => {
          const { data: investmentData } = await supabase.from('referral_investments').select('total_invested, bonus_credited').eq('user_id', referral.id).eq('referred_by', user?.id).maybeSingle();
          const totalInvested = investmentData?.total_invested || 0;
          const meetsMinimum = totalInvested >= 500;
          return { ...referral, hasInvested: meetsMinimum, totalInvested, investmentProgress: Math.min((totalInvested / 500) * 100, 100) };
        })
      );
      return referralsWithStatus;
    },
    enabled: !!user,
  });

  // Level 2 referrals (referrals of my referrals)
  const { data: level2Referrals } = useQuery({
    queryKey: ['level2Referrals', user?.id],
    queryFn: async () => {
      // Get my direct referrals' IDs
      const { data: directReferrals } = await supabase
        .from('profiles')
        .select('id')
        .eq('referred_by', user?.id);
      
      if (!directReferrals || directReferrals.length === 0) return [];
      
      const directIds = directReferrals.map(r => r.id);
      
      // Get users referred by my direct referrals
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('referred_by', directIds);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Level 3 referrals (referrals of level 2)
  const { data: level3Referrals } = useQuery({
    queryKey: ['level3Referrals', user?.id],
    queryFn: async () => {
      // Get my direct referrals' IDs
      const { data: directReferrals } = await supabase
        .from('profiles')
        .select('id')
        .eq('referred_by', user?.id);
      
      if (!directReferrals || directReferrals.length === 0) return [];
      
      const directIds = directReferrals.map(r => r.id);
      
      // Get level 2 IDs
      const { data: level2 } = await supabase
        .from('profiles')
        .select('id')
        .in('referred_by', directIds);
      
      if (!level2 || level2.length === 0) return [];
      
      const level2Ids = level2.map(r => r.id);
      
      // Get level 3 users
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('referred_by', level2Ids);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: referralSettings } = useQuery({
    queryKey: ['referralSettings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('referral_settings').select('*').single();
      if (error) throw error;
      return data;
    },
  });

  const { data: referralEarnings } = useQuery({
    queryKey: ['referralEarnings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('transactions').select('amount').eq('user_id', user?.id).eq('type', 'referral_bonus');
      if (error) throw error;
      const total = data.reduce((sum, t) => sum + Number(t.amount), 0);
      return { total, count: data.length };
    },
    enabled: !!user,
  });

  // Use Vite environment variable or fallback to Vercel domain
  const baseUrl = import.meta.env.VITE_BASE_URL || "https://doom-ebon-gamma.vercel.app";
  const referralLink = profile ? `${baseUrl}/auth?ref=${profile.referral_code}` : '';

  const shareMessage = `🚗 Your dream is here, join us now!\n\nStart earning daily income with DOOM - the ultimate car investment platform.\n\n👉 ${referralLink}`;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Copied!", description: "Referral link copied to clipboard" });
  };

  const shareReferralLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'DOOM - Your Dream is Here',
          text: shareMessage,
        });
        toast({ title: "Shared!", description: "Referral link shared successfully" });
      } catch (error) {
        // User cancelled or share failed, fall back to copy
        copyReferralLink();
      }
    } else {
      navigator.clipboard.writeText(shareMessage);
      toast({ title: "Copied!", description: "Referral message copied to clipboard" });
    }
  };

  const totalEarned = referralEarnings?.total || 0;

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6 pb-20">
      <div className="space-y-2">
        <h2 className="text-xl font-bold">My Team</h2>
        <p className="text-sm text-muted-foreground">Build your network and earn rewards</p>
      </div>

      <Card className="shadow-elevated bg-gradient-to-br from-emerald-950 via-green-950 to-emerald-900 border-2 border-emerald-500/30">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <img src={doomLogo} alt="Doom" className="w-16 h-16 object-contain" />
            <div className="text-white">
              <p className="text-lg font-bold">Your Dream is Here!</p>
              <p className="text-xs text-emerald-300">Share & Earn with DOOM</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-white">
              <p className="text-xs opacity-80">Your Referral Code</p>
              <p className="text-xl font-bold">{profile?.referral_code || '...'}</p>
            </div>
            <Button variant="secondary" size="icon" onClick={copyReferralLink} className="rounded-full">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded p-2">
            <p className="text-white text-xs break-all">{referralLink}</p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="flex-1" onClick={copyReferralLink}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Link
            </Button>
            <Button size="sm" className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600" onClick={shareReferralLink}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="shadow-card">
          <CardContent className="p-3 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-xs">Level 1 (Direct)</span>
            </div>
            <p className="text-2xl font-bold text-primary">{referrals?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-3 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Gift className="h-4 w-4" />
              <span className="text-xs">Total Earned</span>
            </div>
            <p className="text-2xl font-bold text-accent">ETB {totalEarned.toFixed(0)}</p>
            <p className="text-xs text-emerald-500">${(totalEarned / exchangeRate).toFixed(2)} USDT</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="shadow-card">
          <CardContent className="p-3 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-xs">Level 2 (3% bonus)</span>
            </div>
            <p className="text-2xl font-bold text-primary">{level2Referrals?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-3 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-xs">Level 3 (1% bonus)</span>
            </div>
            <p className="text-2xl font-bold text-primary">{level3Referrals?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card bg-primary/5 border-primary/20">
        <CardContent className="p-3 space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            Bonus Rules
          </h3>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>• Level 1: {referralSettings?.bonus_amount || 0}% from direct referral's first investment</p>
            <p>• Level 2: 3% from 2nd level referral's first investment</p>
            <p>• Level 3: 1% from 3rd level referral's first investment</p>
            <p>• Min ETB 500 investment required for bonus eligibility</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="font-semibold">Team Members</h3>
        {referrals && referrals.length > 0 ? (
          <div className="space-y-2">
            {referrals.map((referral) => (
              <Card key={referral.id} className="shadow-card">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center">
                        <Users className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{maskPhoneNumber(referral.phone_number)}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(referral.created_at), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                    </div>
                    {referral.hasInvested ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Clock className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Investment (Min 500)</span>
                      <span className={referral.hasInvested ? "text-green-500 font-semibold" : "text-muted-foreground"}>
                        {referral.hasInvested ? "Eligible" : `${referral.totalInvested || 0}/500`}
                      </span>
                    </div>
                    <Progress value={referral.investmentProgress || 0} className="h-1.5" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="shadow-card">
            <CardContent className="p-6 text-center">
              <Users className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No referrals yet</p>
              <p className="text-xs text-muted-foreground">Share your link to start earning</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TeamSection;
