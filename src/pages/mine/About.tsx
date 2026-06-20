import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Shield, Users, Globe, Building2, Cpu, Plane, Car, Smartphone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import brandLogo from "@/assets/doom-logo.png";

const About = () => {
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

  const features = [
    {
      icon: Cpu,
      title: "Cutting-Edge Technology",
      description: "Invest in electronics, gadgets, and innovative tech products",
    },
    {
      icon: TrendingUp,
      title: "High Returns",
      description: "Competitive daily income rates on all investment packages",
    },
    {
      icon: Shield,
      title: "Secure Platform",
      description: "Your investments are protected with advanced security measures",
    },
    {
      icon: Users,
      title: "Referral Rewards",
      description: "Earn bonuses by building your investment network",
    },
  ];

  return (
    <Layout showBackOnly pageTitle="About Us">
      <div className="max-w-lg mx-auto p-4 space-y-6">
        <Card className="shadow-elevated bg-gradient-primary">
          <CardContent className="p-6 text-white space-y-4">
            <div className="flex items-center gap-4">
              <img src={brandLogo} alt="Perimera" className="w-20 h-20 object-contain" />
              <div>
                <h2 className="font-brand text-3xl font-black tracking-wide">Perimera</h2>
                <p className="text-white/90">Technology Investment Company</p>
              </div>
            </div>
            <p className="text-white/90">
              Your trusted partner for technology investments and daily returns
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-emerald-500/30">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-lg">About Perimera</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              <strong className="font-brand text-foreground">Perimera</strong> is a technology-based investment company. We invest in cutting-edge technologies including electronics, automobiles, mobile devices, aircraft, and other innovative tech sectors, giving everyday investors access to the growth of the global tech industry.
            </p>
            <p>
              Our platform allows users to participate in technology investments and earn daily returns. All payments are processed and credited in the local currency (ETB). We are not a forex exchanger — Perimera is a technology investment company.
            </p>
            <div className="flex items-center gap-6 py-4">
              <Car className="h-8 w-8 text-emerald-500" />
              <Smartphone className="h-8 w-8 text-emerald-500" />
              <Plane className="h-8 w-8 text-emerald-500" />
              <Cpu className="h-8 w-8 text-emerald-500" />
            </div>
            <p>
              Our team of experienced investment professionals and technology experts work tirelessly to ensure secure, transparent, and profitable returns for all our valued users.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-emerald-500/30">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center">
                <Globe className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-lg">Our Mission</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground">
            <p>
              We are on a mission to democratize technology investments for everyone. Through our platform, users can participate in the growth of cutting-edge technologies and benefit from competitive daily returns.
            </p>
            <p>
              All earnings are calculated in USD and paid out in ETB at the current exchange rate, ensuring transparent and fair compensation for our investors.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Why Choose Perimera?</h3>
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="shadow-card">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

      </div>
    </Layout>
  );
};

export default About;
