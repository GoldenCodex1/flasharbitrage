import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Crown, ArrowRight } from "lucide-react";

export default function ApplyCta() {
  return (
    <section className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-accent/10 p-6 md:p-8 text-center"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_60%)]" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 text-accent text-xs font-medium mb-4">
              <Crown className="w-3.5 h-3.5" />
              Now Recruiting Regional Leaders
            </div>
            <h3 className="text-2xl md:text-3xl font-display font-bold mb-2">
              Become a FlashArbitrage Leader
            </h3>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto mb-6">
              Build & earn across your country. Limited slots per region — apply today.
            </p>
            <Link to="/apply">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                Apply Now <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
