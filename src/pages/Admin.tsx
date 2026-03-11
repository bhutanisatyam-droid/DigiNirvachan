import { useState, useEffect } from "react";
import { ShieldAlert, Database, Lock, Activity, Users, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";


const AdminDashboard = () => {
    const [initStatus, setInitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorObj, setErrorObj] = useState<any>(null);
    const [health, setHealth] = useState<any>(null);
    const [results, setResults] = useState<any>(null);

    const fetchResults = async () => {
        try {
            const res = await fetch(`${API_BASE}/results`);
            const data = await res.json();
            setResults(data);
        } catch (err) {
            console.error("Failed to fetch results:", err);
        }
    };


    useEffect(() => {
        // Poll API gateway health
        fetch(`${API_BASE}/health`)
            .then(res => res.json())
            .then(data => setHealth(data))
            .catch(() => setHealth({ status: "disconnected" }));
    }, []);

    const initializeElection = async () => {
        document.documentElement.classList.add("dark");
        setInitStatus("loading");
        try {
            const res = await fetch(`${API_BASE}/init`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ electionId: "IN-2026-GS" })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Initialization failed");

            setInitStatus("success");
            setTimeout(() => setInitStatus("idle"), 5000);
        } catch (err: any) {
            setErrorObj(err.message);
            setInitStatus("error");
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-8 flex flex-col items-center">
            <div className="w-full max-w-5xl space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-border pb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_15px_hsl(var(--primary)_/_0.2)]">
                            <ShieldAlert className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-display font-bold">Election Control Center</h1>
                            <p className="text-muted-foreground text-sm font-mono tracking-widest uppercase">Admin / ECI Override</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex flex-col items-end">
                            <span className="text-xs text-muted-foreground uppercase tracking-widest">Gateway Status</span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-mono font-bold text-primary">{health ? health.status : "Checking..."}</span>
                                <div className={`w-3 h-3 rounded-full ${health?.status === "ok" ? "bg-primary animate-pulse shadow-[0_0_10px_hsl(var(--primary))]" : "bg-destructive shadow-[0_0_10px_hsl(var(--destructive))]"}`} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Main Action Panel */}
                    <div className="md:col-span-2 glass-card p-8 border border-primary/20 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />

                        <div className="relative z-10 space-y-6">
                            <div className="space-y-2">
                                <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-3">
                                    <Database className="w-6 h-6 text-primary" />
                                    Hyperledger Initialization
                                </h2>
                                <p className="text-muted-foreground">
                                    Deploy the chaincode configuration for election `IN-2026-GS`. This will write the starting initialization parameters to the genesis block and prepare the biometric PDC collection across all 3 organization nodes.
                                </p>
                            </div>

                            <AnimatePresence mode="wait">
                                {initStatus === "idle" && (
                                    <motion.button
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        onClick={initializeElection}
                                        className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-4 rounded-xl flex items-center justify-center gap-3 transition-all cursor-pointer shadow-[0_0_20px_hsl(var(--primary)_/_0.3)] hover:shadow-[0_0_30px_hsl(var(--primary)_/_0.5)]"
                                    >
                                        <Lock className="w-5 h-5" />
                                        Initialize Election Chaincode
                                    </motion.button>
                                )}

                                {initStatus === "loading" && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex items-center gap-4 text-primary font-mono bg-primary/10 border border-primary/30 p-4 rounded-xl w-fit"
                                    >
                                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        Broadcasting config to orderer...
                                    </motion.div>
                                )}

                                {initStatus === "success" && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col gap-2 bg-accent/10 border border-accent/30 p-4 rounded-xl w-fit"
                                    >
                                        <div className="flex items-center gap-3 text-accent font-bold">
                                            <span className="text-xl">✓</span>
                                            Fabric Network Initialized
                                        </div>
                                        <p className="text-sm font-mono text-muted-foreground">Tx submitted successfully. Voting system is now open.</p>
                                    </motion.div>
                                )}

                                {initStatus === "error" && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col gap-2 bg-destructive/10 border border-destructive/30 p-4 rounded-xl"
                                    >
                                        <div className="flex items-center gap-3 text-destructive font-bold">
                                            <span className="text-xl">!</span>
                                            Chaincode Error
                                        </div>
                                        <p className="text-sm font-mono text-muted-foreground">{errorObj}</p>
                                        <button
                                            onClick={() => setInitStatus("idle")}
                                            className="text-xs underline text-muted-foreground hover:text-foreground mt-2 text-left"
                                        >
                                            Dismiss Error
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Stats Column */}
                    <div className="space-y-6">
                        <div className="glass-card p-6 border border-border">
                            <div className="flex items-center gap-3 text-muted-foreground mb-4">
                                <Activity className="w-5 h-5" />
                                <span className="uppercase text-xs tracking-widest font-bold">Network State</span>
                            </div>
                            <div className="text-3xl font-mono font-bold text-primary">
                                {health?.status === "ok" ? "LIVE" : "DISCONNECTED"}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                {health?.status === "ok"
                                    ? `Connected to Fabric (${health.network})`
                                    : "Failed to connect to API Gateway"}
                            </p>
                        </div>

                        <div className="glass-card p-6 border border-border">
                            <div className="flex items-center gap-3 text-muted-foreground mb-4">
                                <Users className="w-5 h-5" />
                                <span className="uppercase text-xs tracking-widest font-bold">Active Nodes</span>
                            </div>
                            <div className="space-y-2 font-mono text-sm">
                                <div className="flex justify-between"><span className="text-muted-foreground">Org1 (ECI)</span> <span className="text-primary">{health?.status === "ok" ? "Online" : "Offline"}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Org2 (Auditor)</span> <span className="text-primary">{health?.status === "ok" ? "Online" : "Offline"}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Org3 (Observer)</span> <span className="text-primary">{health?.status === "ok" ? "Online" : "Offline"}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Orderer (Raft)</span> <span className="text-primary">{health?.status === "ok" ? "Online" : "Offline"}</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Live Results Panel */}
                    <div className="md:col-span-3 glass-card p-8 border border-primary/20">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <Database className="w-6 h-6 text-primary" />
                                <h2 className="text-2xl font-display font-bold text-foreground">Live Blockchain Tally</h2>
                            </div>
                            <button
                                onClick={fetchResults}
                                className="text-xs uppercase tracking-widest bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded font-bold transition-colors"
                            >
                                Refresh Ledger
                            </button>
                        </div>

                        {results ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {results.map((r: any) => (
                                        <div key={r.partyId} className="bg-accent/5 border border-border rounded-xl p-4 flex flex-col justify-between">
                                            <span className="text-muted-foreground uppercase text-xs font-bold tracking-wider">{r.partyId}</span>
                                            <span className="text-3xl font-display font-bold mt-2">{r.count}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="text-right text-sm text-muted-foreground font-mono">
                                    Total Votes Cast: {results.reduce((acc: number, r: any) => acc + r.count, 0)}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
                                Click 'Refresh Ledger' to fetch the latest state from the Hyperledger Fabric nodes.
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
