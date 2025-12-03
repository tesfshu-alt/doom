import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

interface HeroSectionProps {
  onScrollToSection: (section: string) => void;
}

const HeroSection = ({ onScrollToSection }: HeroSectionProps) => {
  return (
    <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/50 to-background" />
      
      <div className="relative z-10 text-center px-4 space-y-6 animate-fade-in">
        <h1 className="text-5xl md:text-7xl font-black tracking-tight">
          <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent animate-pulse">
            DOOM
          </span>
        </h1>
        <p className="text-xl md:text-2xl text-slate-300 max-w-md mx-auto">
          Maximize your money with smart investments
        </p>
        <Button 
          size="lg"
          onClick={() => onScrollToSection('dashboard')}
          className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-0 shadow-lg shadow-cyan-500/25"
        >
          Get Started
          <ChevronDown className="ml-2 h-5 w-5 animate-bounce" />
        </Button>
      </div>
    </section>
  );
};

export default HeroSection;
