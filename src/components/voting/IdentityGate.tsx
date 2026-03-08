import { motion } from "framer-motion";
import { Fingerprint, ScanFace, Eye } from "lucide-react";
import { useState } from "react";

interface IdentityGateProps {
  onComplete: () => void;
}

const biometricOptions = [
  { icon: ScanFace, label: "Face ID", desc: "3D facial recognition" },
  { icon: Eye, label: "Iris Scan", desc: "Retinal pattern match" },
  { icon: Fingerprint, label: "Fingerprint", desc: "Biometric touch" },
];

const IdentityGate = ({ onComplete }: IdentityGateProps) => {
  const [scanning, setScanning] = useState<number | null>(null);
  const [scanned, setScanned] = useState<number | null>(null);

  const handleScan = (index: number) => {
    setScanning(index);
    setTimeout(() => {
      setScanned(index);
      setScanning(null);
      setTimeout(() => onComplete(), 1200);
    }, 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center gap-8 w-full max-w-md mx-auto"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
          Identity Gate
        </h2>
        <p className="text-muted-foreground text-sm">
          Authenticate with your biometric to proceed
        </p>
      </div>

      <div className="grid gap-4 w-full">
        {biometricOptions.map((opt, i) => {
          const isScanning = scanning === i;
          const isDone = scanned === i;
          return (
            <motion.button
              key={opt.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => !scanning && scanned === null && handleScan(i)}
              disabled={scanning !== null || scanned !== null}
              className={`glass-card glow-border p-5 flex items-center gap-4 text-left transition-all duration-500 ${
                isDone ? "!border-accent glow-accent" : ""
              } ${isScanning ? "!border-primary" : ""} disabled:opacity-60`}
            >
              <div className="relative">
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-500 ${
                    isDone
                      ? "bg-accent/20"
                      : isScanning
                      ? "bg-primary/20"
                      : "bg-secondary"
                  }`}
                >
                  <opt.icon
                    className={`w-7 h-7 transition-colors duration-500 ${
                      isDone
                        ? "text-accent"
                        : isScanning
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  />
                </div>
                {isScanning && (
                  <motion.div
                    className="absolute inset-0 rounded-xl border-2 border-primary"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                )}
              </div>
              <div className="flex-1">
                <p className="font-display font-semibold text-foreground">
                  {opt.label}
                </p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
              {isDone && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center"
                >
                  <span className="text-accent text-lg">✓</span>
                </motion.div>
              )}
              {isScanning && (
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default IdentityGate;
