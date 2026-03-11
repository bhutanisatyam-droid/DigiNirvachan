// ============================================================
//  Index.tsx  —  Orchestrator updated with real Fabric integration
// ============================================================
import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import StepIndicator from "@/components/voting/StepIndicator";
import IdentityGate from "@/components/voting/IdentityGate";
import Verification from "@/components/voting/Verification";
import Ballot from "@/components/voting/Ballot";
import Receipt from "@/components/voting/Receipt";
import { simulateBiometricHash, sha256 } from "@/hooks/useFabricVote";
import { Shield, Sun, Moon } from "lucide-react";

const stepLabels = ["Identity", "Verify", "Vote", "Receipt"];

// The anonymous token generated from biometrics replaces explicit user ID
// in the Digiyatra flow to ensure on-chain privacy.

const Index = () => {
  const [step, setStep] = useState(0);
  const [votedParty, setVotedParty] = useState("");
  const [txId, setTxId] = useState("");
  const [dark, setDark] = useState(true);
  const [anonymousToken, setAnonymousToken] = useState("");

  // Store biometric hashes from IdentityGate step
  const [biometrics, setBiometrics] = useState({
    faceHash: "",
    irisHash: "",
    fingerprintHash: "",
  });

  // Called when IdentityGate completes all 3 scans
  const handleIdentityComplete = useCallback(async (faceImage: string) => {
    // Generate REAL hash for Face ID, mock Iris & Fingerprint for now
    const [faceHash, irisHash, fingerprintHash] = await Promise.all([
      sha256(faceImage || "fallback-face-data-if-empty"),
      simulateBiometricHash("iris", "session-" + Date.now()),
      simulateBiometricHash("fingerprint", "session-" + Date.now()),
    ]);
    setBiometrics({ faceHash, irisHash, fingerprintHash });
    setStep(1);
  }, []);

  const handleVerificationComplete = useCallback((token: string) => {
    setAnonymousToken(token);
    setStep(2);
  }, []);

  const handleBallotComplete = useCallback((party: string, fabricTxId: string) => {
    setVotedParty(party);
    setTxId(fabricTxId);
    setStep(3);
  }, []);

  const toggleTheme = () => {
    setDark(!dark);
    document.documentElement.classList.toggle("dark", !dark);
  };

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
            SecureVote
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
            <IdentityGate key="identity" onComplete={handleIdentityComplete} />
          )}
          {step === 1 && (
            <Verification key="verify" biometrics={biometrics} onComplete={handleVerificationComplete} />
          )}
          {step === 2 && (
            <Ballot
              key="ballot"
              onComplete={handleBallotComplete}
              anonymousToken={anonymousToken}
              biometricPayload={biometrics}
            />
          )}
          {step === 3 && (
            <Receipt
              key="receipt"
              party={votedParty}
              txId={txId}
              onReset={() => {
                setStep(0);
                setVotedParty("");
                setTxId("");
                setAnonymousToken("");
                setBiometrics({ faceHash: "", irisHash: "", fingerprintHash: "" });
              }}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center">
        <a href="/admin" className="text-muted-foreground hover:text-primary transition-colors text-xs font-mono cursor-pointer block">
          Secured by Hyperledger Fabric · ZKP Verified · End-to-end encrypted
        </a>
      </footer>
    </div>
  );
};

export default Index;
