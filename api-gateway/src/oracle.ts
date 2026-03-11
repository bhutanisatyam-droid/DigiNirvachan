// ============================================================
//  API Gateway Mock Oracle Service
//  Simulates a third-party biometric & eligibility provider
// ============================================================

import * as crypto from "crypto";

interface OracleResult {
    success: boolean;
    anonymousToken?: string;
    reason?: string;
}

export class OracleStore {
    // In memory store for mock verified identities
    private registeredBiometrics: Set<string>;

    constructor() {
        this.registeredBiometrics = new Set();
        // Pre-register some known hashes for development
        this.registeredBiometrics.add("test-hash-1");
    }

    /**
     * Verifies if the person represented by the biometric hash is eligible
     * to vote at the provided kiosk location.
     */
    verifyEligibility(biometricHash: string, kioskLocation: string): OracleResult {
        // Simulation: Accept any non-empty biometricHash if location matches "DELHI-01"
        // In reality, this would query a national database
        if (kioskLocation !== "DELHI-01") {
            return {
                success: false,
                reason: `Biometric identity not registered for kiosk location: ${kioskLocation}`
            };
        }

        if (!biometricHash) {
            return {
                success: false,
                reason: "Invalid or empty biometric signature."
            };
        }

        // Auto-register it for the demo
        this.registeredBiometrics.add(biometricHash);

        // Generate the anonymous token
        const anonymousToken = crypto
            .createHash("sha256")
            .update(`ANON_TOKEN:${biometricHash}:SALT_12345`)
            .digest("hex");

        return {
            success: true,
            anonymousToken
        };
    }
}
