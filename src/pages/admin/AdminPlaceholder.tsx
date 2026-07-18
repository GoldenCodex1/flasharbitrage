import { motion } from "framer-motion";
import { Construction } from "lucide-react";

export default function AdminPlaceholder({ title }: { title: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
        <Construction className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="font-display font-bold text-xl">{title}</h2>
      <p className="text-sm text-muted-foreground">This section is ready for backend integration.</p>
    </motion.div>
  );
}
