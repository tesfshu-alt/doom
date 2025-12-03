import { ReactNode } from "react";
import { Home, Package, Users, User } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
  activeSection?: string;
  onScrollToSection?: (section: string) => void;
}

const Layout = ({ children, activeSection = "dashboard", onScrollToSection }: LayoutProps) => {
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <nav className="fixed top-0 left-0 right-0 bg-card/95 backdrop-blur-md border-b border-border shadow-elevated z-50">
        <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-4">
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
      </nav>
      
      <main className="flex-1 pt-16">{children}</main>
    </div>
  );
};

export default Layout;
