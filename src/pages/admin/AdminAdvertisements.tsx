import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, Save, Trash2, Plus } from "lucide-react";

type Ad = {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
};

const AdminAdvertisements = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sortOrder, setSortOrder] = useState(0);

  const { data: ads } = useQuery({
    queryKey: ['adminAds'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('advertisements')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as Ad[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from('advertisements').insert({
        title,
        content,
        image_url: imageUrl || null,
        sort_order: sortOrder,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAds'] });
      queryClient.invalidateQueries({ queryKey: ['activeAdvertisements'] });
      setTitle(""); setContent(""); setImageUrl(""); setSortOrder(0);
      toast({ title: "Created", description: "Advertisement added" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any).from('advertisements').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAds'] });
      queryClient.invalidateQueries({ queryKey: ['activeAdvertisements'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('advertisements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAds'] });
      queryClient.invalidateQueries({ queryKey: ['activeAdvertisements'] });
      toast({ title: "Deleted", description: "Advertisement removed" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Megaphone className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Advertisements & Messages</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        These appear after users click "Get Started" in the welcome popup.
      </p>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Add New</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="ad-title">Title</Label>
              <Input id="ad-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ad-content">Message / Content</Label>
              <Textarea id="ad-content" rows={4} value={content} onChange={(e) => setContent(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ad-image">Image URL (optional)</Label>
              <Input id="ad-image" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ad-order">Sort Order</Label>
              <Input id="ad-order" type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
            </div>
            <Button type="submit" disabled={createMutation.isPending} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              {createMutation.isPending ? "Saving..." : "Add Advertisement"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Existing Ads</h3>
        {ads && ads.length > 0 ? ads.map((ad) => (
          <Card key={ad.id} className="shadow-card">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <h4 className="font-bold">{ad.title}</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ad.content}</p>
                  {ad.image_url && <p className="text-xs text-muted-foreground break-all">Image: {ad.image_url}</p>}
                  <p className="text-xs text-muted-foreground">Order: {ad.sort_order}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Active</Label>
                    <Switch
                      checked={ad.is_active}
                      onCheckedChange={(v) => toggleMutation.mutate({ id: ad.id, is_active: v })}
                    />
                  </div>
                  <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(ad.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )) : (
          <Card><CardContent className="p-6 text-center text-muted-foreground">No advertisements yet.</CardContent></Card>
        )}
      </div>
    </div>
  );
};

export default AdminAdvertisements;
