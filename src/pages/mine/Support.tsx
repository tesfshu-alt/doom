import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, ArrowLeft } from "lucide-react";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Support = () => {
  const { data: contacts, isLoading } = useQuery({
    queryKey: ["customer-service-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_service_contacts")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  return (
    <Layout showBackOnly pageTitle="Customer Service">
      <div className="max-w-lg mx-auto p-4 space-y-6">
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
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : contacts && contacts.length > 0 ? (
            <div className="space-y-2">
              {contacts.map((contact) => (
                <Card key={contact.id} className="shadow-card">
                  <CardContent className="p-4">
                    <a
                      href={contact.link}
                      className="flex items-center justify-between group"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-blue-600">
                          <MessageCircle className="h-5 w-5" />
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
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No contact methods available</p>
          )}
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
