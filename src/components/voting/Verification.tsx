import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

interface VerificationProps {
  onComplete: () => void;
}

const steps = [
  "Connecting to Government Ledger...",
  "Cross-referencing citizen registry...",
  "Validating biometric hash...",
  "Confirming eligibility...",
  "Identity verified",
];

const Verification = ({ onComplete }: VerificationProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (currentStep < steps.length - 1) {
      const timer = setTimeout(() => setCurrentStep((s) => s + 1), 900);
      return () => clearTimeout(timer);
    } else {
      setTimeout(() => setDone(true), 400);
      setTimeout(() => onComplete(), 2200);
    }
  }, [currentStep, onComplete]);

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

      {/* Holographic DNA animation */}
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

      {/* Steps log */}
      <div className="glass-card glow-border p-5 w-full space-y-2 font-mono text-xs">
        {steps.map((step, i) => (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: -10 }}
            animate={{
              opacity: i <= currentStep ? 1 : 0.2,
              x: i <= currentStep ? 0 : -10,
            }}
            transition={{ delay: i <= currentStep ? 0 : 0 }}
            className={`flex items-center gap-2 ${
              i < currentStep
                ? "text-accent"
                : i === currentStep
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <span>
              {i < currentStep ? "✓" : i === currentStep ? (done ? "✓" : "›") : "·"}
            </span>
            <span>{step}</span>
          </motion.div>
        ))}
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
