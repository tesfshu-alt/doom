import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Search, Key, Copy, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const AdminPasswordReset = () => {
  const { toast } = useToast();
  const [searchPhone, setSearchPhone] = useState("");
  const [foundUser, setFoundUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const searchUserMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, phone_number, created_at')
        .eq('phone_number', phoneNumber)
        .single();

      if (error) throw new Error("User not found");
      return data;
    },
    onSuccess: (data) => {
      setFoundUser(data);
      toast({
        title: "User Found",
        description: `Phone: ${data.phone_number}`,
      });
    },
    onError: () => {
      setFoundUser(null);
      toast({
        variant: "destructive",
        title: "User Not Found",
        description: "No user exists with this phone number",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { userId, newPassword: password },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return password;
    },
    onSuccess: (password) => {
      setTempPassword(password);
      setNewPassword("");
      toast({
        title: "Password Reset Successful",
        description: "Share the temporary password with the user via Telegram",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: error.message,
      });
    },
  });

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setTempPassword("");
    setFoundUser(null);
    searchUserMutation.mutate(searchPhone);
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Invalid Password",
        description: "Password must be at least 6 characters",
      });
      return;
    }
    resetPasswordMutation.mutate({ userId: foundUser.id, password: newPassword });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied",
      description: "Temporary password copied to clipboard",
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold mb-2">Password Reset</h2>
        <p className="text-sm text-muted-foreground">
          Search for users and reset their passwords. Share the temporary password with them via Telegram support.
        </p>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search-phone">Search User by Phone Number</Label>
              <div className="flex gap-2">
                <Input
                  id="search-phone"
                  type="tel"
                  placeholder="Enter phone number"
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  required
                />
                <Button type="submit" disabled={searchUserMutation.isPending}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {foundUser && (
        <Card className="shadow-card border-primary/50">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">User Found</h3>
              <div className="grid gap-1 text-sm">
                <p><span className="text-muted-foreground">Phone:</span> <span className="font-mono">{foundUser.phone_number}</span></p>
                <p><span className="text-muted-foreground">User ID:</span> <span className="font-mono text-xs">{foundUser.id}</span></p>
              </div>
            </div>

            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Temporary Password</Label>
                <div className="flex gap-2">
                  <Input
                    id="new-password"
                    type="text"
                    placeholder="Enter temporary password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <Button type="button" variant="outline" onClick={generateRandomPassword}>
                    <Key className="h-4 w-4 mr-2" />
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Minimum 6 characters. Click "Generate" for a random password.
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={resetPasswordMutation.isPending}
              >
                Reset Password
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {tempPassword && (
        <Alert className="border-primary/50 bg-primary/5">
          <AlertDescription>
            <div className="space-y-3">
              <p className="font-semibold">Password Reset Successfully!</p>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Temporary Password (share with user via Telegram):
                </p>
                <div className="flex items-center gap-2 p-3 bg-background rounded-md border">
                  <code className="flex-1 font-mono text-lg font-bold">{tempPassword}</code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyToClipboard}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  ⚠️ Make sure to send this password to the user via Telegram. They should change it after logging in.
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default AdminPasswordReset;
