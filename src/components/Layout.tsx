import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Package, Users, User } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Package, label: "Products", path: "/products" },
    { icon: Users, label: "Team", path: "/team" },
    { icon: User, label: "Mine", path: "/mine" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 pb-20">{children}</main>
      
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-elevated z-50">
        <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 flex-1 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
