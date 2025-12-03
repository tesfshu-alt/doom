import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, Shield, Users } from "lucide-react";
import Layout from "@/components/Layout";

const About = () => {
  const navigate = useNavigate();

  const features = [
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
    <Layout>
      <div className="max-w-lg mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">About Us</h1>
            <p className="text-sm text-muted-foreground">Learn about our platform</p>
          </div>
        </div>

        <Card className="shadow-elevated bg-gradient-primary">
          <CardContent className="p-6 text-white space-y-2">
            <h2 className="text-2xl font-bold">Doom</h2>
            <p className="text-white/90">
              Your trusted partner for smart investment opportunities
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
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

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Our Mission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground">
            <p>
              We are committed to providing accessible investment opportunities that help our users grow their wealth through carefully designed financial products.
            </p>
            <p>
              Our platform combines cutting-edge technology with proven investment strategies to deliver consistent returns while maintaining the highest standards of security and transparency.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default About;
