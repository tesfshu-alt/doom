import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Mail, Phone } from "lucide-react";
import Layout from "@/components/Layout";

const Support = () => {
  const navigate = useNavigate();

  const contacts = [
    {
      icon: MessageCircle,
      title: "Telegram",
      value: "@platform_support",
      link: "https://t.me/platform_support",
      color: "text-blue-600",
    },
    {
      icon: MessageCircle,
      title: "WhatsApp",
      value: "+1234567890",
      link: "https://wa.me/1234567890",
      color: "text-green-600",
    },
    {
      icon: Mail,
      title: "Email",
      value: "support@platform.com",
      link: "mailto:support@platform.com",
      color: "text-primary",
    },
    {
      icon: Phone,
      title: "Phone",
      value: "+1 (234) 567-890",
      link: "tel:+1234567890",
      color: "text-secondary",
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
            <h1 className="text-2xl font-bold">Customer Service</h1>
            <p className="text-sm text-muted-foreground">Get help and support</p>
          </div>
        </div>

        <Card className="shadow-elevated bg-gradient-primary">
          <CardContent className="p-6 text-white space-y-2">
            <h2 className="text-xl font-bold">We're Here to Help</h2>
            <p className="text-white/90">
              Our support team is available 24/7 to assist you with any questions or concerns
            </p>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Contact Us</h2>
          <div className="space-y-2">
            {contacts.map((contact, index) => {
              const Icon = contact.icon;
              return (
                <Card key={index} className="shadow-card">
                  <CardContent className="p-4">
                    <a
                      href={contact.link}
                      className="flex items-center justify-between group"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full bg-muted flex items-center justify-center ${contact.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold">{contact.title}</p>
                          <p className="text-sm text-muted-foreground">{contact.value}</p>
                        </div>
                      </div>
                      <ArrowLeft className="h-5 w-5 text-muted-foreground rotate-180 group-hover:translate-x-1 transition-transform" />
                    </a>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="font-semibold text-sm">How long does recharge approval take?</p>
              <p className="text-sm text-muted-foreground">
                Recharge requests are typically processed within 24 hours of submission.
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-sm">When is daily income credited?</p>
              <p className="text-sm text-muted-foreground">
                Daily income is automatically credited to your account every 24 hours after product activation.
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-sm">How do I withdraw funds?</p>
              <p className="text-sm text-muted-foreground">
                Contact customer support to initiate a withdrawal request to your registered bank account.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Support;
