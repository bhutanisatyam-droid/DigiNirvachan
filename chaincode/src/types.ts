// ============================================================
//  Shared TypeScript types for the E-Voting Chaincode
// ============================================================

export interface VoteRecord {
    anonymousToken: string;
    partyId: string;
    timestamp: string;
    txId: string;
}

export interface BiometricData {
    anonymousToken: string;
    biometricHash: string;
    timestamp: string;
}

export interface ElectionResult {
    electionId: string;
    parties: Record<string, number>;
    totalVotes: number;
    isOpen: boolean;
    initializedAt: string;
    closedAt?: string;
}

export interface ZKPProof {
    commitment: string;     // Pedersen commitment hash
    challenge: string;      // Fiat-Shamir challenge
    response: string;       // Prover response scalar
    publicInput: string;    // Hash of public voter registration data
}
