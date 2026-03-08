import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

interface VerificationProps {
  onComplete: () => void;
}

const Verification = ({ onComplete }: VerificationProps) => {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setDone(true), 2500);
    const t2 = setTimeout(() => onComplete(), 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center gap-8 w-full max-w-md mx-auto"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
          Verification
        </h2>
        <p className="text-muted-foreground text-sm">
          Processing with Government Ledger
        </p>
      </div>

      <div className="relative w-40 h-40 flex items-center justify-center">
        {!done ? (
          <>
            <motion.div
              className="absolute inset-0 rounded-full holographic"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              style={{ border: "2px solid hsl(207 90% 54% / 0.2)" }}
            />
            <motion.div
              className="absolute inset-3 rounded-full"
              animate={{ rotate: -360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              style={{ border: "2px dashed hsl(160 84% 45% / 0.2)" }}
            />
            <motion.div
              className="absolute inset-6 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              style={{ border: "1px solid hsl(207 90% 54% / 0.3)" }}
            />
            <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </>
        ) : (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 12 }}
            className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center glow-accent"
          >
            <ShieldCheck className="w-12 h-12 text-accent" />
          </motion.div>
        )}
      </div>

      {done && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-accent font-display font-bold text-lg"
        >
          Verified ✓
        </motion.p>
      )}
    </motion.div>
  );
};

export default Verification;
