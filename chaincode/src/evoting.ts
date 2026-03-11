// ============================================================
//  E-Voting Smart Contract  ·  Hyperledger Fabric 2.x
//  Author: Secure Vote Ritual
// ============================================================

import {
    Context,
    Contract,
    Info,
    Returns,
    Transaction,
} from "fabric-contract-api";
import { VoteRecord, BiometricData, ElectionResult } from "./types";
import { verifyZKP } from "./zkp";

const VOTED_PREFIX = "VOTED~";
const RESULT_KEY = "ELECTION_RESULT";
const BIOMETRIC_COLLECTION = "BiometricDataCollection";

@Info({ title: "EVotingContract", description: "E-Voting Smart Contract" })
export class EVotingContract extends Contract {
    // ──────────────────────────────────────────────────────────
    //  Initialize the ledger with election metadata
    // ──────────────────────────────────────────────────────────
    @Transaction()
    public async InitLedger(ctx: Context, electionId: string): Promise<void> {
        const existingResult = await ctx.stub.getState(RESULT_KEY);
        if (existingResult && existingResult.length > 0) {
            throw new Error("Ledger has already been initialized.");
        }

        const result: ElectionResult = {
            electionId,
            parties: {
                unity: 0,
                progress: 0,
                peoples: 0,
                liberty: 0,
                national: 0,
                green: 0,
            },
            totalVotes: 0,
            isOpen: true,
            initializedAt: ctx.stub.getDateTimestamp().toISOString(),
        };

        await ctx.stub.putState(RESULT_KEY, Buffer.from(JSON.stringify(result)));
        console.info(`Election [${electionId}] initialized on ledger.`);
    }

    // ──────────────────────────────────────────────────────────
    //  Cast a Vote
    //  1. Verify the Zero-Knowledge Proof for the voter
    //  2. Check the voter hasn't voted yet (double-vote guard)
    //  3. Store biometric hash in Private Data Collection
    //  4. Increment the party tally on the common ledger
    // ──────────────────────────────────────────────────────────
    @Transaction()
    @Returns("string")
    public async CastVote(
        ctx: Context,
        anonymousToken: string,
        partyId: string,
        zkpProof: string,
        biometricHash: string
    ): Promise<string> {
        // ── 1. Validate ZKP proof ────────────────────────────────
        const zkpData = JSON.parse(zkpProof);
        const isValidZKP = verifyZKP(zkpData, anonymousToken);
        if (!isValidZKP) {
            throw new Error("ZKP verification failed: Unauthorized biometric identity.");
        }

        // ── 2. Double-vote guard ────────────────────────────────
        const voterKey = VOTED_PREFIX + anonymousToken;
        const existingVote = await ctx.stub.getState(voterKey);
        if (existingVote && existingVote.length > 0) {
            throw new Error(`Token [${anonymousToken.substring(0, 8)}...] has already cast a vote.`);
        }

        // ── 3. Validate election state ─────────────────────────
        const resultBytes = await ctx.stub.getState(RESULT_KEY);
        if (!resultBytes || resultBytes.length === 0) {
            throw new Error("Election has not been initialized.");
        }
        const result: ElectionResult = JSON.parse(resultBytes.toString());
        if (!result.isOpen) {
            throw new Error("Election has been closed. No more votes accepted.");
        }
        if (!(partyId in result.parties)) {
            throw new Error(
                `Invalid party ID: [${partyId}]. Valid options: ${Object.keys(result.parties).join(", ")}`
            );
        }

        // ── 4. Store biometric hash in PDC (private, ECI only) ──
        const biometricData: BiometricData = {
            anonymousToken,
            biometricHash,
            timestamp: ctx.stub.getDateTimestamp().toISOString(),
        };
        await ctx.stub.putPrivateData(
            BIOMETRIC_COLLECTION,
            voterKey,
            Buffer.from(JSON.stringify(biometricData))
        );

        // ── 5. Mark voter as voted on common ledger ──────────────
        const voteRecord: VoteRecord = {
            anonymousToken,
            partyId,
            timestamp: ctx.stub.getDateTimestamp().toISOString(),
            txId: ctx.stub.getTxID(),
        };
        await ctx.stub.putState(voterKey, Buffer.from(JSON.stringify(voteRecord)));

        // ── 6. Tally the vote ────────────────────────────────────
        result.parties[partyId] = (result.parties[partyId] || 0) + 1;
        result.totalVotes += 1;
        await ctx.stub.putState(RESULT_KEY, Buffer.from(JSON.stringify(result)));

        // ── 7. Emit vote event ───────────────────────────────────
        const eventPayload = { txId: ctx.stub.getTxID(), partyId };
        await ctx.stub.setEvent("VoteCast", Buffer.from(JSON.stringify(eventPayload)));

        console.info(`Vote recorded. TxID: ${ctx.stub.getTxID()}`);
        return ctx.stub.getTxID();
    }

    // ──────────────────────────────────────────────────────────
    //  Check if a specific voter has already voted
    // ──────────────────────────────────────────────────────────
    @Transaction(false)
    @Returns("boolean")
    public async HasVoted(ctx: Context, anonymousToken: string): Promise<boolean> {
        const voterKey = VOTED_PREFIX + anonymousToken;
        const voteData = await ctx.stub.getState(voterKey);
        return !!(voteData && voteData.length > 0);
    }

    // ──────────────────────────────────────────────────────────
    //  Query current election results
    // ──────────────────────────────────────────────────────────
    @Transaction(false)
    @Returns("string")
    public async GetElectionResults(ctx: Context): Promise<string> {
        const resultBytes = await ctx.stub.getState(RESULT_KEY);
        if (!resultBytes || resultBytes.length === 0) {
            throw new Error("Election has not been initialized.");
        }
        return resultBytes.toString();
    }

    // ──────────────────────────────────────────────────────────
    //  Close the election (ECI admin only)
    // ──────────────────────────────────────────────────────────
    @Transaction()
    public async CloseElection(ctx: Context): Promise<void> {
        this._assertECIAdmin(ctx);

        const resultBytes = await ctx.stub.getState(RESULT_KEY);
        if (!resultBytes || resultBytes.length === 0) {
            throw new Error("Election has not been initialized.");
        }
        const result: ElectionResult = JSON.parse(resultBytes.toString());
        result.isOpen = false;
        result.closedAt = ctx.stub.getDateTimestamp().toISOString();
        await ctx.stub.putState(RESULT_KEY, Buffer.from(JSON.stringify(result)));
        console.info("Election has been closed.");
    }

    // ──────────────────────────────────────────────────────────
    //  Get vote history for auditing (paginated)
    // ──────────────────────────────────────────────────────────
    @Transaction(false)
    @Returns("string")
    public async GetVoteHistory(
        ctx: Context,
        pageSize: string,
        bookmark: string
    ): Promise<string> {
        const { iterator, metadata } = await ctx.stub.getStateByRangeWithPagination(
            VOTED_PREFIX,
            VOTED_PREFIX + "\uFFFF",
            parseInt(pageSize, 10),
            bookmark
        );

        const records: VoteRecord[] = [];
        let result = await iterator.next();
        while (!result.done) {
            const vote: VoteRecord = JSON.parse(result.value.value.toString());
            records.push(vote);
            result = await iterator.next();
        }
        await iterator.close();

        return JSON.stringify({
            records,
            fetchedRecordsCount: metadata.fetchedRecordsCount,
            bookmark: metadata.bookmark,
        });
    }

    // ──────────────────────────────────────────────────────────
    //  Private helper – assert transactor is ECI MSP admin
    // ──────────────────────────────────────────────────────────
    private _assertECIAdmin(ctx: Context): void {
        const mspId = ctx.clientIdentity.getMSPID();
        if (mspId !== "ECIOrgMSP") {
            throw new Error(
                `Only ECI admin may perform this action. Got MSP: ${mspId}`
            );
        }
    }
}
