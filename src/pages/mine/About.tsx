import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Shield, Users, ArrowRightLeft, Globe, Building2 } from "lucide-react";
import Layout from "@/components/Layout";
import doomLogo from "@/assets/doom-logo.png";

const About = () => {
  const features = [
    {
      icon: ArrowRightLeft,
      title: "ETB to Dollar Exchange",
      description: "Seamless currency exchange with competitive rates (1 USDT = 170 ETB)",
    },
    {
      icon: TrendingUp,
      title: "High Returns",
      description: "Competitive daily income rates on all exchange packages",
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
              <img src={doomLogo} alt="Doom" className="w-20 h-20 object-contain" />
              <div>
                <h2 className="text-2xl font-bold">Doom</h2>
                <p className="text-white/90">Ethiopian Branch</p>
              </div>
            </div>
            <p className="text-white/90">
              Your trusted partner for ETB to Dollar currency exchange and investment opportunities
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-emerald-500/30">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-lg">About Doom Ethiopia</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              <strong className="text-foreground">Doom</strong> is a newly established fintech company dedicated to providing seamless ETB to Dollar currency exchange services. As the official Ethiopian branch, we are committed to empowering Ethiopians with accessible and profitable currency exchange opportunities.
            </p>
            <p>
              Founded with the vision of bridging the gap between local currency and international markets, Doom offers a unique platform where users can invest in exchange packages and earn daily income through our innovative trading system.
            </p>
            <p>
              Our team of experienced financial experts and technology professionals work tirelessly to ensure secure, transparent, and profitable transactions for all our valued users.
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
              We are on a mission to democratize currency exchange and investment opportunities for every Ethiopian. Through our platform, users can participate in the global currency market and benefit from competitive exchange rates.
            </p>
            <p>
              Our platform combines cutting-edge technology with proven investment strategies to deliver consistent returns while maintaining the highest standards of security and transparency.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Why Choose Doom?</h3>
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

        <Card className="shadow-card bg-emerald-950/50 border-emerald-500/30">
          <CardContent className="p-6 text-center space-y-2">
            <p className="text-sm text-emerald-300">Current Exchange Rate</p>
            <p className="text-3xl font-bold text-white">1 USDT = 170 ETB</p>
            <p className="text-xs text-muted-foreground">Rates may vary based on market conditions</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default About;
