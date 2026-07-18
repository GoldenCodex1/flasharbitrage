import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Faq {
  id: string;
  question: string;
  answer: string;
}

export default function FaqSection() {
  const [faqs, setFaqs] = useState<Faq[]>([]);

  useEffect(() => {
    supabase
      .from("homepage_faq")
      .select("id, question, answer")
      .eq("is_visible", true)
      .order("display_order")
      .then(({ data }) => {
        if (data) setFaqs(data);
      });
  }, []);

  return (
    <section id="faq" className="py-20 md:py-28 bg-secondary/30">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-muted-foreground">Everything you need to know about FlashArbitrage.</p>
        </motion.div>
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id} className="glass-card px-6 border-none">
              <AccordionTrigger className="hover:no-underline text-left font-display font-medium">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
