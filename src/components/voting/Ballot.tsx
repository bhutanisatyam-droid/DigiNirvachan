import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Check, X } from "lucide-react";

interface BallotProps {
  onComplete: (party: string) => void;
}

const parties = [
  { id: "unity", name: "Unity Alliance", color: "#3B82F6", abbr: "UA" },
  { id: "progress", name: "Progressive Front", color: "#10B981", abbr: "PF" },
  { id: "peoples", name: "People's Democratic Party", color: "#F59E0B", abbr: "PDP" },
  { id: "liberty", name: "Liberty Movement", color: "#EF4444", abbr: "LM" },
  { id: "national", name: "National Coalition", color: "#8B5CF6", abbr: "NC" },
  { id: "green", name: "Green Future Party", color: "#22C55E", abbr: "GFP" },
];

const Ballot = ({ onComplete }: BallotProps) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSelect = (id: string) => {
    setSelected(id);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    const party = parties.find((p) => p.id === selected);
    if (party) onComplete(party.name);
  };

  const selectedParty = parties.find((p) => p.id === selected);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
          Cast Your Vote
        </h2>
        <p className="text-muted-foreground text-sm">
          Select your preferred political party
        </p>
      </div>

      <div className="grid gap-3 w-full">
        {parties.map((party, i) => (
          <motion.button
            key={party.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            onClick={() => handleSelect(party.id)}
            className={`party-card flex items-center gap-4 ${
              selected === party.id ? "selected" : ""
            }`}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center font-display font-bold text-sm shrink-0"
              style={{
                background: `${party.color}22`,
                color: party.color,
                border: `1px solid ${party.color}44`,
              }}
            >
              {party.abbr}
            </div>
            <span className="font-display font-semibold text-foreground text-left flex-1">
              {party.name}
            </span>
            {selected === party.id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center"
              >
                <Check className="w-4 h-4 text-primary" />
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>

      {/* Confirm Modal */}
      <AnimatePresence>
        {showConfirm && selectedParty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "hsla(215, 28%, 5%, 0.8)" }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card glow-border p-8 max-w-sm w-full text-center space-y-6"
            >
              <h3 className="font-display font-bold text-xl text-foreground">
                Confirm Your Vote
              </h3>
              <div className="space-y-3">
                <div
                  className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center font-display font-bold text-lg"
                  style={{
                    background: `${selectedParty.color}22`,
                    color: selectedParty.color,
                    border: `1px solid ${selectedParty.color}44`,
                  }}
                >
                  {selectedParty.abbr}
                </div>
                <p className="font-display font-semibold text-lg text-foreground">
                  {selectedParty.name}
                </p>
                <p className="text-muted-foreground text-sm">
                  This action is final and cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowConfirm(false);
                    setSelected(null);
                  }}
                  className="flex-1 glass-card p-3 font-display font-semibold text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 rounded-2xl p-3 font-display font-semibold text-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Ballot;
