import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import StepIndicator from "@/components/voting/StepIndicator";
import IdentityGate from "@/components/voting/IdentityGate";
import Verification from "@/components/voting/Verification";
import Ballot from "@/components/voting/Ballot";
import Receipt from "@/components/voting/Receipt";
import { Shield, Sun, Moon } from "lucide-react";

const stepLabels = ["Identity", "Verify", "Vote", "Receipt"];

const Index = () => {
  const [step, setStep] = useState(0);
  const [votedParty, setVotedParty] = useState("");
  const [dark, setDark] = useState(true);

  const handleVerificationComplete = useCallback(() => setStep(2), []);
  const handleBallotComplete = useCallback((party: string) => {
    setVotedParty(party);
    setStep(3);
  }, []);

  const toggleTheme = () => {
    setDark(!dark);
    document.documentElement.classList.toggle("dark", !dark);
  };

  // Ensure dark class is set on mount
  if (typeof document !== "undefined") {
    if (dark && !document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.add("dark");
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 md:p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <span className="font-display font-bold text-lg text-foreground tracking-tight">
            tobedecided
          </span>
        </div>
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
        >
          {dark ? (
            <Sun className="w-4 h-4 text-foreground" />
          ) : (
            <Moon className="w-4 h-4 text-foreground" />
          )}
        </button>
      </header>

      {/* Step indicator */}
      <div className="px-4 py-4">
        <StepIndicator currentStep={step} steps={stepLabels} />
      </div>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 pb-8">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <IdentityGate key="identity" onComplete={() => setStep(1)} />
          )}
          {step === 1 && (
            <Verification key="verify" onComplete={handleVerificationComplete} />
          )}
          {step === 2 && (
            <Ballot key="ballot" onComplete={handleBallotComplete} />
          )}
          {step === 3 && (
            <Receipt
              key="receipt"
              party={votedParty}
              onReset={() => {
                setStep(0);
                setVotedParty("");
              }}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center">
        <p className="text-muted-foreground text-xs font-mono">
          Secured by Blockchain · End-to-end encrypted
        </p>
      </footer>
    </div>
  );
};

export default Index;
