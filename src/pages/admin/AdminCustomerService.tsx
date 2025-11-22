import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";

const AdminCustomerService = () => {
  const queryClient = useQueryClient();
  const [telegramUsername, setTelegramUsername] = useState("");
  const [telegramLink, setTelegramLink] = useState("");

  const { data: contacts } = useQuery({
    queryKey: ["customer-service-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_service_contacts")
        .select("*")
        .eq("contact_type", "telegram")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (contacts) {
      setTelegramUsername(contacts.value);
      setTelegramLink(contacts.link);
    }
  }, [contacts]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!contacts?.id) {
        // Insert new contact
        const { error } = await supabase
          .from("customer_service_contacts")
          .insert({
            contact_type: "telegram",
            title: "Telegram",
            value: telegramUsername,
            link: telegramLink,
          });

        if (error) throw error;
      } else {
        // Update existing contact
        const { error } = await supabase
          .from("customer_service_contacts")
          .update({
            value: telegramUsername,
            link: telegramLink,
          })
          .eq("id", contacts.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-service-contacts"] });
      toast.success("Customer service contact updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update contact: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Customer Service Contact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="telegram-username">Telegram Username</Label>
              <Input
                id="telegram-username"
                placeholder="@platform_support"
                value={telegramUsername}
                onChange={(e) => setTelegramUsername(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">
                Include the @ symbol (e.g., @username)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telegram-link">Telegram Link</Label>
              <Input
                id="telegram-link"
                placeholder="https://t.me/platform_support"
                value={telegramLink}
                onChange={(e) => setTelegramLink(e.target.value)}
                required
                type="url"
              />
              <p className="text-sm text-muted-foreground">
                Full Telegram link (e.g., https://t.me/username)
              </p>
            </div>

            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCustomerService;
