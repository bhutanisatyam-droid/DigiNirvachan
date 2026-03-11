// ============================================================
//  useFabricVote  ·  React hook for the E-Voting API Gateway
//  Connects all four voting steps to the Fabric backend
// ============================================================

import { useState, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";


// ── Types ─────────────────────────────────────────────────────

export interface BiometricPayload {
    faceHash: string;
    irisHash: string;
    fingerprintHash: string;
}

export interface VoteReceipt {
    transactionId: string;
    party: string;
    timestamp: string;
    block?: string;
}

export type VoteStatus =
    | "idle"
    | "verifying"
    | "submitting"
    | "confirmed"
    | "error";

// ── Utility helpers ───────────────────────────────────────────

/** SHA-256 a string in the browser using SubtleCrypto */
export async function sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Simulate a biometric capture → return a SHA-256 hash */
export async function simulateBiometricHash(
    biometricType: "face" | "iris" | "fingerprint",
    voterId: string
): Promise<string> {
    // In production, this would be replaced with real biometric sensor output
    const raw = `${biometricType}:${voterId}:${Date.now()}:${Math.random()}`;
    return sha256(raw);
}

// ── Main Hook ─────────────────────────────────────────────────

export function useFabricVote() {
    const [status, setStatus] = useState<VoteStatus>("idle");
    const [error, setError] = useState<string | null>(null);
    const [receipt, setReceipt] = useState<VoteReceipt | null>(null);

    /** Step 1: Check if this voter has already voted */
    const checkHasVoted = useCallback(async (anonymousToken: string): Promise<boolean> => {
        try {
            const res = await fetch(`${API_BASE}/has-voted/${encodeURIComponent(anonymousToken)}`);
            const json = await res.json();
            return json.hasVoted as boolean;
        } catch {
            return false;
        }
    }, []);

    /** Step 2 + 3: Submit the vote with biometric payload */
    const castVote = useCallback(
        async (anonymousToken: string, partyId: string, biometrics: BiometricPayload): Promise<VoteReceipt> => {
            setError(null);
            setStatus("submitting");

            const payload = {
                anonymousToken,
                partyId,
                faceHash: biometrics.faceHash,
                irisHash: biometrics.irisHash,
                fingerprintHash: biometrics.fingerprintHash,
            };

            const res = await fetch(`${API_BASE}/vote`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const json = await res.json();

            if (!res.ok) {
                const msg =
                    json.code === "DOUBLE_VOTE"
                        ? "You have already voted in this election."
                        : json.code === "ZKP_FAILED"
                            ? "Biometric verification failed. Please retry."
                            : json.code === "ELECTION_CLOSED"
                                ? "The election has been closed."
                                : json.error || "An unexpected error occurred.";
                throw new Error(msg);
            }

            return {
                transactionId: json.transactionId,
                party: json.party,
                timestamp: json.timestamp,
            };
        },
        []
    );

    /** Full e2e vote flow — call this from the UI */
    const submitVote = useCallback(
        async (anonymousToken: string, partyId: string, biometrics: BiometricPayload): Promise<void> => {
            try {
                setStatus("verifying");

                // Double-vote pre-check
                const hasVoted = await checkHasVoted(anonymousToken);
                if (hasVoted) {
                    throw new Error("You have already voted in this election.");
                }

                const voteReceipt = await castVote(anonymousToken, partyId, biometrics);
                setReceipt(voteReceipt);
                setStatus("confirmed");
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                setError(msg);
                setStatus("error");
            }
        },
        [checkHasVoted, castVote]
    );

    return { status, error, receipt, submitVote, checkHasVoted, simulateBiometricHash };
}

/** Fetch live election results */
export async function fetchElectionResults() {
    const res = await fetch(`${API_BASE}/results`);
    if (!res.ok) throw new Error("Failed to fetch results.");
    return res.json();
}
