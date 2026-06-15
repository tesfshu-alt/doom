import { ReactNode } from "react";
import { Home, Package, Users, User, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";

interface LayoutProps {
  children: ReactNode;
  activeSection?: string;
  onScrollToSection?: (section: string) => void;
  showBackOnly?: boolean;
  pageTitle?: string;
}

const Layout = ({ 
  children, 
  activeSection = "dashboard", 
  onScrollToSection,
  showBackOnly = false,
  pageTitle
}: LayoutProps) => {
  const navigate = useNavigate();
  
  const navItems = [
    { icon: Home, label: "Home", section: "dashboard" },
    { icon: Package, label: "Products", section: "products" },
    { icon: Users, label: "Team", section: "team" },
    { icon: User, label: "Account", section: "account" },
  ];

  const handleNavClick = (section: string) => {
    if (onScrollToSection) {
      onScrollToSection(section);
    }
  };

  // Show back-only header for inner pages
  if (showBackOnly) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <nav className="fixed top-0 left-0 right-0 bg-card/95 backdrop-blur-md border-b border-border shadow-elevated z-50">
          <div className="max-w-lg mx-auto flex items-center h-16 px-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Back</span>
            </button>
            {pageTitle && (
              <h1 className="flex-1 text-center font-semibold text-foreground">{pageTitle}</h1>
            )}
            <ThemeToggle />
          </div>
        </nav>
        
        <main className="flex-1 pt-16">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <nav className="fixed top-0 left-0 right-0 bg-card/95 backdrop-blur-md border-b border-border shadow-elevated z-50">
        <div className="max-w-lg mx-auto flex items-center h-16 px-4 relative">
          <div className="flex items-center justify-around flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.section;
              
              return (
                <button
                  key={item.section}
                  onClick={() => handleNavClick(item.section)}
                  className={`flex flex-col items-center gap-1 flex-1 transition-all duration-300 ${
                    isActive 
                      ? "text-primary scale-105" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className={`h-5 w-5 transition-transform ${isActive ? "scale-110" : ""}`} />
                  <span className="text-xs font-medium">{item.label}</span>
                  {isActive && (
                    <div className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
          <ThemeToggle />
        </div>
      </nav>
      
      <main className="flex-1 pt-16">{children}</main>
    </div>
  );
};

export default Layout;
