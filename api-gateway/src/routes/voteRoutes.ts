// ============================================================
//  Express API Route Handlers  ·  /api/vote, /api/status, etc.
// ============================================================

import { Router, Request, Response } from "express";
import { Contract } from "@hyperledger/fabric-gateway";
import { generateZKP, deriveBiometricSecret } from "../zkpClient";
import { OracleStore } from "../oracle";
import { z } from "zod";

// ── Validation schemas ────────────────────────────────────────
const castVoteSchema = z.object({
  anonymousToken: z.string().min(1),
  partyId: z.enum(["unity", "progress", "peoples", "liberty", "national", "green"]),
  faceHash: z.string().length(64),
  irisHash: z.string().length(64),
  fingerprintHash: z.string().length(64),
});

const initSchema = z.object({
  electionId: z.string().min(1),
});

export function createVoteRouter(contract: Contract): Router {
  const router = Router();

  // Create an Oracle store for testing Digiyatra flow
  const oracle = new OracleStore();

  // ────────────────────────────────────────────────────────────
  //  POST /api/verify — Oracle: Checks location and biometrics
  // ────────────────────────────────────────────────────────────
  router.post("/verify", (req: Request, res: Response) => {
    try {
      if (!oracle) {
        return res.status(501).json({ error: "Oracle service uninitialized." });
      }
      const { faceHash, irisHash, fingerprintHash } = req.body;
      if (!faceHash || !irisHash || !fingerprintHash) {
        return res.status(400).json({ error: "Missing biometric hashes." });
      }

      const combinedHash = deriveBiometricSecret(faceHash, irisHash, fingerprintHash);
      const kioskLocation = process.env.KIOSK_LOCATION || "DELHI-01"; // Fallback for dev mode

      const result = oracle.verifyEligibility(combinedHash, kioskLocation);

      if (result.success) {
        return res.status(200).json({ verified: true, anonymousToken: result.anonymousToken });
      } else {
        return res.status(403).json({ verified: false, error: result.reason });
      }
    } catch (err: any) {
      console.error("Oracle Verify Error:", err);
      return res.status(500).json({ error: "Internal oracle error." });
    }
  });

  // ────────────────────────────────────────────────────────────
  //  POST /api/vote   — Cast a vote with ZKP verification
  // ────────────────────────────────────────────────────────────
  router.post("/vote", async (req: Request, res: Response) => {
    try {
      const parsed = castVoteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid payload", details: parsed.error.errors });
      }

      const { anonymousToken, partyId, faceHash, irisHash, fingerprintHash } = parsed.data;

      // ── Derive biometric secret & generate ZKP ──────────────
      const biometricSecret = deriveBiometricSecret(faceHash, irisHash, fingerprintHash);

      // Combined biometric hash stored in PDC
      const biometricHash = biometricSecret;

      // Generate the Zero-Knowledge Proof
      const zkpProof = generateZKP(anonymousToken, biometricSecret);
      const zkpProofStr = JSON.stringify(zkpProof);

      // ── Submit transaction to Fabric ────────────────────────
      const resultBytes = await contract.submitTransaction(
        "CastVote",
        anonymousToken,
        partyId,
        zkpProofStr,
        biometricHash
      );

      const txId = Buffer.from(resultBytes).toString("utf8");

      return res.status(200).json({
        success: true,
        message: "Vote successfully recorded on the blockchain.",
        transactionId: txId,
        party: partyId,
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[POST /vote] Error:", msg);

      // Parse specific Fabric errors for cleaner responses
      if (msg.includes("already cast")) {
        return res.status(409).json({ error: "Voter has already voted.", code: "DOUBLE_VOTE" });
      }
      if (msg.includes("ZKP verification failed")) {
        return res.status(403).json({ error: "Biometric verification failed.", code: "ZKP_FAILED" });
      }
      if (msg.includes("Election has been closed")) {
        return res.status(423).json({ error: "Election is closed.", code: "ELECTION_CLOSED" });
      }

      return res.status(500).json({ error: "Internal server error.", details: msg });
    }
  });

  // ────────────────────────────────────────────────────────────
  //  GET /api/has-voted/:voterId   — Check double-vote status
  // ────────────────────────────────────────────────────────────
  router.get("/has-voted/:voterId", async (req: Request, res: Response) => {
    try {
      const { voterId } = req.params;
      const resultBytes = await contract.evaluateTransaction("HasVoted", voterId);
      const hasVoted = Buffer.from(resultBytes).toString("utf8") === "true";
      return res.json({ voterId, hasVoted });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: msg });
    }
  });

  // ────────────────────────────────────────────────────────────
  //  GET /api/results   — Query current election tally
  // ────────────────────────────────────────────────────────────
  router.get("/results", async (_req: Request, res: Response) => {
    try {
      const resultBytes = await contract.evaluateTransaction("GetElectionResults");
      const results = JSON.parse(Buffer.from(resultBytes).toString("utf8"));
      return res.json(results);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: msg });
    }
  });

  // ────────────────────────────────────────────────────────────
  //  POST /api/init   — Initialize election (ECI admin only)
  // ────────────────────────────────────────────────────────────
  router.post("/init", async (req: Request, res: Response) => {
    try {
      const parsed = initSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "electionId is required." });
      }
      await contract.submitTransaction("InitLedger", parsed.data.electionId);
      return res.json({ success: true, message: `Election[${parsed.data.electionId}]initialized.` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: msg });
    }
  });

  // ────────────────────────────────────────────────────────────
  //  POST /api/close   — Close election (ECI admin only)
  // ────────────────────────────────────────────────────────────
  router.post("/close", async (_req: Request, res: Response) => {
    try {
      await contract.submitTransaction("CloseElection");
      return res.json({ success: true, message: "Election has been closed." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: msg });
    }
  });

  // ────────────────────────────────────────────────────────────
  //  GET /api/health   — Health check
  // ────────────────────────────────────────────────────────────
  router.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString(), network: "election-channel" });
  });

  return router;
}
