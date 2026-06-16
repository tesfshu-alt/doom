import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (phoneNumber: string, password: string, referralCode: string, fullName: string) => Promise<{ error: any }>;
  signIn: (phoneNumber: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Session timeout: 2 minutes of inactivity
  useEffect(() => {
    if (!user) return;

    const TIMEOUT_DURATION = 2 * 60 * 1000; // 2 minutes in milliseconds
    let timeoutId: ReturnType<typeof setTimeout>;

    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/auth');
      }, TIMEOUT_DURATION);
    };

    // Track user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, resetTimeout);
    });

    // Start the timeout
    resetTimeout();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, resetTimeout);
      });
    };
  }, [user, navigate]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);

        if (event === 'SIGNED_IN' && session?.user) {
          sessionStorage.setItem('show_welcome', '1');
          navigate('/');
        }
        if (event === 'SIGNED_OUT') {
          sessionStorage.removeItem('show_welcome');
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const signUp = async (phoneNumber: string, password: string, referralCode: string, fullName: string) => {
    const email = `${phoneNumber}@platform.local`;
    const redirectUrl = `${window.location.origin}/`;
    
    // Validate referral code exists
    if (!referralCode || referralCode.trim() === "") {
      return { error: { message: "Referral code is required to sign up" } };
    }

    const { data: referrerId, error: referrerError } = await supabase
      .rpc('get_user_id_by_referral_code', { _code: referralCode.trim() });

    if (referrerError) {
      return { error: { message: `Database error: ${referrerError.message}` } };
    }

    if (!referrerId) {
      return { error: { message: "Invalid referral code. Please check and try again." } };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          phone_number: phoneNumber,
          referred_by: referrerId,
          full_name: fullName.trim(),
        },
      },
    });

    return { error };
  };

  const signIn = async (phoneNumber: string, password: string) => {
    const email = `${phoneNumber}@platform.local`;
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
