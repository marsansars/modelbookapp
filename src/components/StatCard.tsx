import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  accent?: boolean;
  onClick?: () => void;
}

export function StatCard({ label, value, sublabel, accent, onClick }: StatCardProps) {
  const interactive = !!onClick;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={interactive ? { y: -2 } : undefined}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); }
      } : undefined}
      className={`glass-card p-5 relative ${accent ? 'gold-glow' : ''} ${interactive ? 'cursor-pointer hover:border-primary/40 transition-colors' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground font-body">{label}</p>
        {interactive && (
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
        )}
      </div>
      <p className={`text-2xl font-heading font-semibold mt-1 ${accent ? 'text-gradient-gold' : 'text-foreground'}`}>
        {value}
      </p>
      {sublabel && (
        <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>
      )}
    </motion.div>
  );
}
