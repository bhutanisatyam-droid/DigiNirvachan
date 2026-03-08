import { motion } from "framer-motion";

interface StepIndicatorProps {
  currentStep: number;
  steps: string[];
}

const StepIndicator = ({ currentStep, steps }: StepIndicatorProps) => {
  return (
    <div className="flex items-center gap-2 justify-center">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1.5">
            <motion.div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-display font-bold transition-all duration-500 ${
                i < currentStep
                  ? "step-indicator-done text-accent-foreground"
                  : i === currentStep
                  ? "step-indicator-active text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
              animate={i === currentStep ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {i < currentStep ? "✓" : i + 1}
            </motion.div>
            <span
              className={`text-[10px] font-display font-medium hidden sm:block ${
                i <= currentStep ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-8 md:w-16 h-px mb-5 sm:mb-0 transition-colors duration-500 ${
                i < currentStep ? "bg-accent" : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default StepIndicator;
