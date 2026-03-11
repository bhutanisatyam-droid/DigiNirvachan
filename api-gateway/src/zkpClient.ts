// ============================================================
//  ZKP Client-Side Generator  (runs in API Gateway / kiosk)
//  Mirrors the Fiat-Shamir scheme used in the chaincode verifier
// ============================================================

import * as crypto from "crypto";

export interface ZKPProof {
    commitment: string;
    challenge: string;
    response: string;
    publicInput: string;
}

/**
 * Generate a Zero-Knowledge Proof for a voter.
 * In a production setup this would run entirely on the client device (kiosk).
 * `secret` = biometric-derived secret (e.g., HMAC of biometric hash + PIN).
 */
export function generateZKP(anonymousToken: string, secret: string): ZKPProof {
    // publicInput = H("TOKEN:" || anonymousToken)  —  public, verifiable by chaincode
    const publicInput = crypto
        .createHash("sha256")
        .update("TOKEN:" + anonymousToken)
        .digest("hex");

    // nonce  (random, forgotten after proof generation)
    const nonce = crypto.randomBytes(32).toString("hex");

    // initial commitment = H(nonce || secret)
    const initialCommitment = crypto
        .createHash("sha256")
        .update(nonce + secret)
        .digest("hex");

    // challenge = H(initialCommitment || publicInput)  — Fiat-Shamir
    const challenge = crypto
        .createHash("sha256")
        .update(initialCommitment + publicInput)
        .digest("hex");

    // response = H(nonce || challenge || secret)
    const response = crypto
        .createHash("sha256")
        .update(nonce + challenge + secret)
        .digest("hex");

    // commitment = H(response || challenge || publicInput)  — what verifier checks
    const commitment = crypto
        .createHash("sha256")
        .update(response + challenge + publicInput)
        .digest("hex");

    return { commitment, challenge, response, publicInput };
}

/**
 * Produce the biometric secret from the three biometric hashes collected by
 * the IdentityGate step on the frontend.
 */
export function deriveBiometricSecret(
    faceHash: string,
    irisHash: string,
    fingerprintHash: string
): string {
    return crypto
        .createHash("sha256")
        .update([faceHash, irisHash, fingerprintHash].join("|"))
        .digest("hex");
}
