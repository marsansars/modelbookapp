import { motion } from "framer-motion";

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  accent?: boolean;
}

export function StatCard({ label, value, sublabel, accent }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card p-5 ${accent ? 'gold-glow' : ''}`}
    >
      <p className="text-sm text-muted-foreground font-body">{label}</p>
      <p className={`text-2xl font-heading font-semibold mt-1 ${accent ? 'text-gradient-gold' : 'text-foreground'}`}>
        {value}
      </p>
      {sublabel && (
        <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>
      )}
    </motion.div>
  );
}
