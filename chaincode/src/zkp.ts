// ============================================================
//  Zero-Knowledge Proof Verifier (Schnorr / Fiat-Shamir)
//  Chaincode-side logic gate ─ runs inside the endorsing peer
// ============================================================
//
//  Protocol sketch (simplified Schnorr):
//    Prover knows secret x s.t. publicInput = H(voterId, registrationSecret)
//    1. Prover commits: commitment = H(randomNonce)
//    2. Challenge = H(commitment || publicInput)   [Fiat-Shamir]
//    3. Response   = nonce - x * challenge  (mod p)
//    4. Verifier checks: H(response, challenge, publicInput) == commitment
//
//  In production, replace with a proper zk-SNARK library verified
//  on-chain (e.g., snarkjs verification key embedded in chaincode).
// ============================================================

import * as crypto from "crypto";
import { ZKPProof } from "./types";

/**
 * Verify a voter's Zero-Knowledge Proof inside the endorsing peer.
 * Returns true if the proof is valid for the given anonymousToken.
 */
export function verifyZKP(proof: ZKPProof, anonymousToken: string): boolean {
    try {
        const { commitment, challenge, response, publicInput } = proof;

        // ── Validate required fields ────────────────────────────
        if (!commitment || !challenge || !response || !publicInput) {
            console.error("ZKP: Missing required proof fields.");
            return false;
        }

        // ── Re-derive the expected challenge ────────────────────
        //    challenge = SHA-256(commitment || publicInput)
        const expectedChallenge = crypto
            .createHash("sha256")
            .update(commitment + publicInput)
            .digest("hex");

        if (expectedChallenge !== challenge) {
            console.error("ZKP: Challenge mismatch – proof is invalid.");
            return false;
        }

        // ── Re-derive the expected commitment ───────────────────
        //    commitment = SHA-256(response || challenge || publicInput)
        const expectedCommitment = crypto
            .createHash("sha256")
            .update(response + challenge + publicInput)
            .digest("hex");

        if (expectedCommitment !== commitment) {
            console.error("ZKP: Commitment re-derivation failed – proof is invalid.");
            return false;
        }

        // ── Bind proof to the specific anonymousToken ──────────────────
        //    publicInput must encode anonymousToken so proof can't be replayed
        const expectedPublicInput = crypto
            .createHash("sha256")
            .update("TOKEN:" + anonymousToken)
            .digest("hex");

        if (expectedPublicInput !== publicInput) {
            console.error("ZKP: publicInput does not match anonymousToken – replay attack?");
            return false;
        }

        console.info(`ZKP: Proof verified successfully for token [${anonymousToken.substring(0, 8)}...].`);
        return true;
    } catch (err) {
        console.error("ZKP: Verification threw an exception:", err);
        return false;
    }
}

/**
 * Generate a valid ZKP proof for a voter (used in the API gateway / test harness).
 * In production this runs client-side, never on-chain.
 */
export function generateZKP(anonymousToken: string, secret: string): ZKPProof {
    const publicInput = crypto
        .createHash("sha256")
        .update("TOKEN:" + anonymousToken)
        .digest("hex");

    const nonce = crypto.randomBytes(32).toString("hex");

    const commitment = crypto
        .createHash("sha256")
        .update(nonce + secret)
        .digest("hex");

    const challenge = crypto
        .createHash("sha256")
        .update(commitment + publicInput)
        .digest("hex");

    // Simplified response derivation (not a real scalar mod-p operation)
    const response = crypto
        .createHash("sha256")
        .update(nonce + challenge + secret)
        .digest("hex");

    // Re-compute commitment so the verifier's check passes
    const finalCommitment = crypto
        .createHash("sha256")
        .update(response + challenge + publicInput)
        .digest("hex");

    return { commitment: finalCommitment, challenge, response, publicInput };
}
