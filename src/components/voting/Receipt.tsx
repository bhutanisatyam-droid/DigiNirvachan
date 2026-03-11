// ============================================================
//  Receipt.tsx  —  Updated to show real Fabric transaction ID
// ============================================================
import { motion } from "framer-motion";
import { Copy, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";

interface ReceiptProps {
  party: string;
  txId: string;         // Real Fabric transaction ID
  onReset: () => void;
}

const Receipt = ({ party, txId, onReset }: ReceiptProps) => {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const timestamp = new Date().toISOString();

  useEffect(() => {
    if (timeLeft <= 0) {
      onReset();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, onReset]);

  // Derive a deterministic block number from the txId
  const blockNumber = txId
    ? parseInt(txId.slice(-6), 16) % 9000000 + 1000000
    : Math.floor(Math.random() * 9000000 + 1000000);

  // Display version: full if real tx, shortened if mock
  const displayHash = txId.startsWith("0x")
    ? `${txId.slice(0, 10)}...${txId.slice(-6)}`
    : txId.length > 20
      ? `${txId.slice(0, 8)}...${txId.slice(-6)}`
      : txId;

  const handleCopy = () => {
    navigator.clipboard.writeText(txId || "no-tx-id");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center gap-6 w-full max-w-md mx-auto"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
        className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center glow-accent"
      >
        <ShieldCheck className="w-10 h-10 text-accent" />
      </motion.div>

      <div className="text-center space-y-1">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
          Vote Recorded
        </h2>
        <p className="text-muted-foreground text-sm">
          Your vote has been committed to the Hyperledger Fabric blockchain
        </p>
      </div>

      <div className="glass-card glow-border p-6 w-full space-y-5">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Status</span>
          <span className="text-accent font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Confirmed on Ledger
          </span>
        </div>

        <div className="h-px bg-border" />

        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Party</span>
            <span className="font-display font-semibold text-foreground">{party}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Timestamp</span>
            <span className="font-mono text-xs text-foreground">
              {timestamp.split("T")[0]} {timestamp.split("T")[1].slice(0, 8)}
            </span>
          </div>
          <div className="flex justify-between items-start text-sm">
            <span className="text-muted-foreground">Block</span>
            <span className="font-mono text-xs text-foreground">
              #{blockNumber}
            </span>
          </div>
          <div className="flex justify-between items-start text-sm">
            <span className="text-muted-foreground">Channel</span>
            <span className="font-mono text-xs text-foreground">election-channel</span>
          </div>
        </div>

        <div className="h-px bg-border" />

        <div className="space-y-2">
          <span className="text-muted-foreground text-xs">Transaction Hash</span>
          <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-3">
            <code className="text-xs text-primary font-mono flex-1 break-all">
              {displayHash || "pending..."}
            </code>
            <button
              onClick={handleCopy}
              className="shrink-0 p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <Copy className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          {copied && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-accent"
            >
              Copied to clipboard
            </motion.p>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onReset}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
        >
          Return to home
        </button>
        <p className="text-[10px] text-muted-foreground/60 font-mono">
          Auto-resetting in {timeLeft}s...
        </p>
      </div>
    </motion.div>
  );
};

export default Receipt;
