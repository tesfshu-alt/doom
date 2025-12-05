import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import Layout from "@/components/Layout";

const Rules = () => {
  const sections = [
    {
      title: "Account Rules",
      rules: [
        "One account per user using a unique phone number",
        "Signup is only available via referral link",
        "Users must be 18 years or older to register",
        "Account information must be accurate and up-to-date",
        "Session expires after 2 minutes of inactivity",
      ],
    },
    {
      title: "Investment Rules",
      rules: [
        "Each car product can only be purchased once",
        "Products generate 20% daily income (distributed hourly)",
        "Income is calculated as 1/24th of daily income per hour",
        "Products have fixed validity periods",
        "Balance cannot go negative - sufficient funds required",
      ],
    },
    {
      title: "Payment Rules",
      rules: [
        "Recharge via CBE bank or Telebirr only",
        "Recharge amounts match exact product prices",
        "Transaction ID required for verification",
        "Recharge requests processed within 24 hours",
        "Approved payments are non-refundable",
      ],
    },
    {
      title: "Withdrawal Rules",
      rules: [
        "Minimum withdrawal amount: ETB 300",
        "Withdrawal hours: 9 AM - 5 PM (EAT)",
        "Must have purchased at least 1 product OR have 3+ invested team members",
        "One pending withdrawal request at a time",
        "Withdrawal fee may apply (set by admin)",
      ],
    },
    {
      title: "Referral Bonus Rules",
      rules: [
        "Level 1 (Direct): Admin-configured % from first investment",
        "Level 2: 3% from 2nd level referral's first investment",
        "Level 3: 1% from 3rd level referral's first investment",
        "Minimum ETB 500 investment required for bonus eligibility",
        "Bonus only credited when referred user is classified as 'Investor'",
        "New users get ETB 50 welcome bonus when signing up via referral",
      ],
    },
  ];

  return (
    <Layout showBackOnly pageTitle="Platform Rules">
      <div className="max-w-lg mx-auto p-4 space-y-6 pb-24">
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
