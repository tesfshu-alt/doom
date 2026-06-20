import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import perimeraLogo from "@/assets/perimera-logo.png.asset.json";

const phoneSchema = z
  .string()
  .trim()
  .min(7, "Phone number is too short")
  .max(20, "Phone number is too long")
  .regex(/^\+?[0-9]{7,15}$/, "Enter a valid phone number (digits only)");

const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(72, "Password must be 72 characters or fewer");

const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "Password is required").max(72),
});

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(100, "Full name is too long"),
  phone: phoneSchema,
  password: passwordSchema,
  referralCode: z
    .string()
    .trim()
    .min(4, "Referral code is required")
    .max(20, "Referral code is too long")
    .regex(/^[a-zA-Z0-9]+$/, "Referral code must be alphanumeric"),
});

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupFullName, setSignupFullName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [isReferralFromLink, setIsReferralFromLink] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferralCode(refCode);
      setIsReferralFromLink(true);
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = loginSchema.safeParse({ phone: loginPhone, password: loginPassword });
    if (!parsed.success) {
      toast({
        variant: "destructive",
        title: "Invalid input",
        description: parsed.error.errors[0]?.message ?? "Please check your input",
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(parsed.data.phone, parsed.data.password);

    if (error) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message,
      });
    } else {
      toast({
        title: "Success!",
        description: "You have been logged in successfully.",
      });
    }

    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = signupSchema.safeParse({
      fullName: signupFullName,
      phone: signupPhone,
      password: signupPassword,
      referralCode,
    });
    if (!parsed.success) {
      toast({
        variant: "destructive",
        title: "Invalid input",
        description: parsed.error.errors[0]?.message ?? "Please check your input",
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(
      parsed.data.phone,
      parsed.data.password,
      parsed.data.referralCode,
      parsed.data.fullName,
    );

    if (error) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message,
      });
    } else {
      toast({
        title: "Welcome! 🎉",
        description: "Your account has been created successfully. You've received 50 ETB as a welcome bonus!",
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="space-y-2">
          <div className="flex justify-center">
            <img
              src={perimeraLogo.url}
              alt="Perimera"
              className="h-16 w-auto object-contain"
            />
          </div>
          <CardTitle className="font-brand text-4xl font-black text-center bg-gradient-primary bg-clip-text text-transparent">
            Perimera
          </CardTitle>
          <CardDescription className="text-center">
            Start your investment journey today
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-phone">Phone Number</Label>
                  <Input
                    id="login-phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Login
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Forgot password? Contact support via Telegram
                </p>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-fullname">Full Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="signup-fullname"
                    type="text"
                    placeholder="Enter your full name"
                    value={signupFullName}
                    onChange={(e) => setSignupFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Phone Number</Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referral">Referral Code <span className="text-destructive">*</span></Label>
                  <Input
                    id="referral"
                    type="text"
                    placeholder="Enter referral code"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    disabled={isReferralFromLink}
                    required
                    className={isReferralFromLink ? "bg-muted cursor-not-allowed" : ""}
                  />
                  <p className="text-xs text-muted-foreground">
                    {isReferralFromLink 
                      ? "Referral code applied from your invite link" 
                      : "Required: Ask your referrer for their code to sign up"}
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign Up
                </Button>
              </form>
            </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
