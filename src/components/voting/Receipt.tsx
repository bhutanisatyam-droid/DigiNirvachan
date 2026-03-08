import { motion } from "framer-motion";
import { Copy, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";

interface ReceiptProps {
  party: string;
  onReset: () => void;
}

const generateHash = () => {
  const chars = "0123456789abcdef";
  let hash = "0x";
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
};

const Receipt = ({ party }: ReceiptProps) => {
  const [copied, setCopied] = useState(false);
  const hash = useState(() => generateHash())[0];
  const timestamp = new Date().toISOString();
  const truncatedHash = `${hash.slice(0, 8)}...${hash.slice(-6)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(hash);
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
          Your vote has been securely stored on the blockchain
        </p>
      </div>

      <div className="glass-card glow-border p-6 w-full space-y-5">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Status</span>
          <span className="text-accent font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Confirmed
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
              #{Math.floor(Math.random() * 9000000 + 1000000)}
            </span>
          </div>
        </div>

        <div className="h-px bg-border" />

        <div className="space-y-2">
          <span className="text-muted-foreground text-xs">Transaction Hash</span>
          <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-3">
            <code className="text-xs text-primary font-mono flex-1 break-all">
              {truncatedHash}
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
    </motion.div>
  );
};

export default Receipt;
