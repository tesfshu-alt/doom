import { useRef, useState, useEffect } from "react";
import Layout from "@/components/Layout";
import HeroSection from "@/components/sections/HeroSection";
import DashboardSection from "@/components/sections/DashboardSection";
import ProductsSection from "@/components/sections/ProductsSection";
import TeamSection from "@/components/sections/TeamSection";
import AccountSection from "@/components/sections/AccountSection";
import WelcomePopup from "@/components/WelcomePopup";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const { user } = useAuth();
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  
  const dashboardRef = useRef<HTMLDivElement>(null);
  const productsRef = useRef<HTMLDivElement>(null);
  const teamRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      setShowWelcomePopup(true);
    }
  }, [user]);

  const scrollToSection = (section: string) => {
    const refs: Record<string, React.RefObject<HTMLDivElement>> = {
      dashboard: dashboardRef,
      products: productsRef,
      team: teamRef,
      account: accountRef,
    };
    
    const ref = refs[section];
    if (ref?.current) {
      const yOffset = -80;
      const y = ref.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
    setActiveSection(section);
  };

  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        { id: "dashboard", ref: dashboardRef },
        { id: "products", ref: productsRef },
        { id: "team", ref: teamRef },
        { id: "account", ref: accountRef },
      ];

      const scrollPosition = window.scrollY + 150;

      for (const section of sections.reverse()) {
        if (section.ref.current) {
          const sectionTop = section.ref.current.offsetTop;
          if (scrollPosition >= sectionTop) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <Layout activeSection={activeSection} onScrollToSection={scrollToSection}>
        <HeroSection onScrollToSection={scrollToSection} />
        
        <div ref={dashboardRef}>
          <DashboardSection onScrollToSection={scrollToSection} />
        </div>
        
        <div ref={productsRef} className="border-t border-border/50">
          <ProductsSection />
        </div>
        
        <div ref={teamRef} className="border-t border-border/50">
          <TeamSection />
        </div>
        
        <div ref={accountRef} className="border-t border-border/50">
          <AccountSection />
        </div>
      </Layout>

      <WelcomePopup 
        open={showWelcomePopup} 
        onClose={() => setShowWelcomePopup(false)} 
      />
    </>
  );
};

export default Dashboard;
