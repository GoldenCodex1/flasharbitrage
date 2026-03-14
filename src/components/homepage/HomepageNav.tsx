import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import SiteLogo from "@/components/SiteLogo";

export default function HomepageNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 backdrop-blur-xl bg-background/80">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-sm">A</span>
          </div>
          <span className="font-display font-bold text-lg">
            Arb<span className="text-primary">AI</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
          <a href="#technology" className="hover:text-foreground transition-colors">Technology</a>
          <a href="#security" className="hover:text-foreground transition-colors">Security</a>
          <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link to="/auth">Login</Link>
          </Button>
          <Button asChild>
            <Link to="/auth">Get Started</Link>
          </Button>
        </div>

        <button className="md:hidden p-2" onClick={() => setOpen(true)}>
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed right-0 top-0 bottom-0 w-72 bg-card border-l border-border z-50 p-6 flex flex-col"
            >
              <div className="flex justify-between items-center mb-8">
                <span className="font-display font-bold">Menu</span>
                <button onClick={() => setOpen(false)}><X className="w-5 h-5" /></button>
              </div>
              <nav className="flex flex-col gap-4 text-sm font-medium">
                <a href="#how-it-works" onClick={() => setOpen(false)} className="py-2 text-muted-foreground hover:text-foreground">How It Works</a>
                <a href="#technology" onClick={() => setOpen(false)} className="py-2 text-muted-foreground hover:text-foreground">Technology</a>
                <a href="#security" onClick={() => setOpen(false)} className="py-2 text-muted-foreground hover:text-foreground">Security</a>
                <a href="#faq" onClick={() => setOpen(false)} className="py-2 text-muted-foreground hover:text-foreground">FAQ</a>
              </nav>
              <div className="mt-auto flex flex-col gap-3">
                <Button variant="outline" asChild className="w-full">
                  <Link to="/auth">Login</Link>
                </Button>
                <Button asChild className="w-full">
                  <Link to="/auth">Get Started</Link>
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
