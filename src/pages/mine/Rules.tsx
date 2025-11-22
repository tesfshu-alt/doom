import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle } from "lucide-react";
import Layout from "@/components/Layout";

const Rules = () => {
  const navigate = useNavigate();

  const sections = [
    {
      title: "Account Rules",
      rules: [
        "One account per user using a unique phone number",
        "Users must be 18 years or older to register",
        "Account information must be accurate and up-to-date",
        "Sharing account credentials is strictly prohibited",
      ],
    },
    {
      title: "Investment Rules",
      rules: [
        "Minimum investment starts from ETB 100",
        "Each product has a fixed validity period",
        "Daily income is calculated based on the product package",
        "Products must be activated by admin before generating income",
      ],
    },
    {
      title: "Payment Rules",
      rules: [
        "All payments must be made via bank transfer",
        "Payment amount must match the product price exactly",
        "Recharge requests are processed within 24 hours",
        "Approved payments cannot be refunded",
      ],
    },
    {
      title: "Referral Rules",
      rules: [
        "Share your unique referral code to invite new users",
        "Referral bonuses are credited after successful registration",
        "Self-referrals are not allowed",
        "Build your team to earn additional rewards",
      ],
    },
  ];

  return (
    <Layout>
      <div className="max-w-lg mx-auto p-4 space-y-6 pb-24">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Platform Rules</h1>
            <p className="text-sm text-muted-foreground">Terms and conditions</p>
          </div>
        </div>

        <div className="space-y-4">
          {sections.map((section, index) => (
            <Card key={index} className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {section.rules.map((rule, ruleIndex) => (
                  <div key={ruleIndex} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">{rule}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="shadow-card bg-muted">
          <CardContent className="p-6 space-y-2">
            <p className="font-semibold">Important Notice</p>
            <p className="text-sm text-muted-foreground">
              By using this platform, you agree to abide by all the rules and regulations stated above. 
              Violation of any rules may result in account suspension or termination.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Rules;
