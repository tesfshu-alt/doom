import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Megaphone } from "lucide-react";

interface WelcomePopupProps {
  open: boolean;
  onClose: () => void;
}

const WelcomePopup = ({ open, onClose }: WelcomePopupProps) => {
  const { data: ads, isLoading } = useQuery({
    queryKey: ["activeAdvertisements"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("advertisements")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Array<{
        id: string;
        title: string;
        content: string;
        image_url: string | null;
      }>;
    },
  });

  // If there are no ads to show, don't render at all.
  if (!isLoading && (!ads || ads.length === 0)) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            <DialogTitle className="text-2xl font-bold">Announcements</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground">Latest updates from Dangote</p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {ads?.map((ad) => (
            <Card key={ad.id} className="border-primary/20">
              <CardContent className="p-4 space-y-2">
                {ad.image_url && (
                  <img
                    src={ad.image_url}
                    alt={ad.title}
                    className="w-full max-h-48 object-cover rounded-md"
                  />
                )}
                <h4 className="font-bold text-lg text-primary">{ad.title}</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {ad.content}
                </p>
              </CardContent>
            </Card>
          ))}

          <Button
            onClick={onClose}
            className="w-full h-12 text-lg bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500"
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomePopup;
