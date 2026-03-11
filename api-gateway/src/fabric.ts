// ============================================================
//  Fabric Gateway Connection Module
//  Manages gRPC connection, identity, and Gateway lifecycle
// ============================================================

import * as grpc from "@grpc/grpc-js";
import {
    connect,
    Contract,
    Gateway,
    Identity,
    Network,
    Signer,
    signers,
} from "@hyperledger/fabric-gateway";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

const channelName = process.env.CHANNEL_NAME!;
const chaincodeName = process.env.CHAINCODE_NAME!;
const mspId = process.env.MSP_ID!;
const cryptoPath = path.resolve(__dirname, "../..", process.env.CRYPTO_PATH!);
const peerEndpoint = process.env.PEER_ENDPOINT!;
const peerHostAlias = process.env.PEER_HOST_ALIAS!;

// Identity paths
const keyDirPath = path.join(
    cryptoPath,
    "users",
    "Admin@eci.example.com",
    "msp",
    "keystore"
);
const certDirPath = path.join(
    cryptoPath,
    "users",
    "Admin@eci.example.com",
    "msp",
    "signcerts"
);
const tlsCertPath = path.join(
    cryptoPath,
    "peers",
    "peer0.eci.example.com",
    "tls",
    "ca.crt"
);

let gateway: Gateway | null = null;
let client: grpc.Client | null = null;
let network: Network | null = null;
let contract: Contract | null = null;

// ──────────────────────────────────────────────────────────────
//  Get or create the singleton gRPC client
// ──────────────────────────────────────────────────────────────
export async function getGrpcClient(): Promise<grpc.Client> {
    if (client) return client;

    const tlsCredentials = grpc.credentials.createSsl(
        fs.readFileSync(tlsCertPath)
    );
    client = new grpc.Client(peerEndpoint, tlsCredentials, {
        "grpc.ssl_target_name_override": peerHostAlias,
    });
    return client;
}

// ──────────────────────────────────────────────────────────────
//  Build Identity from filesystem certificates
// ──────────────────────────────────────────────────────────────
function getIdentity(): Identity {
    const certPath = path.join(certDirPath, fs.readdirSync(certDirPath)[0]);
    const credentials = fs.readFileSync(certPath);
    return { mspId, credentials };
}

// ──────────────────────────────────────────────────────────────
//  Build Signer from private key
// ──────────────────────────────────────────────────────────────
function getSigner(): Signer {
    const keyPath = path.join(keyDirPath, fs.readdirSync(keyDirPath)[0]);
    const privateKeyPem = fs.readFileSync(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}

// ──────────────────────────────────────────────────────────────
//  Connect to Fabric and return the voting contract
// ──────────────────────────────────────────────────────────────
export async function connectToFabric(): Promise<Contract> {
    if (contract) return contract;

    try {
        const grpcClient = await getGrpcClient();

        gateway = connect({
            client: grpcClient,
            identity: getIdentity(),
            signer: getSigner(),
            evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
            endorseOptions: () => ({ deadline: Date.now() + 15000 }),
            submitOptions: () => ({ deadline: Date.now() + 5000 }),
            commitStatusOptions: () => ({ deadline: Date.now() + 60000 }),
        });

        network = gateway.getNetwork(channelName);
        contract = network.getContract(chaincodeName);

        console.info(`[Fabric] Connected to channel [${channelName}] via peer [${peerEndpoint}]`);
        return contract;
    } catch (err: any) {
        if (process.env.NODE_ENV !== "production") {
            console.warn(`[Fabric] Connection failed (${err.code}). Using local MOCK contract for development.`);

            // Generate a simple in-memory mock contract
            const mockState: Record<string, string> = {};

            contract = {
                submitTransaction: async (name: string, ...args: string[]): Promise<Uint8Array> => {
                    if (name === "CastVote") {
                        const voterId = args[0];
                        mockState[voterId] = "true";
                        console.log(`[Mock Contract] CastVote(${voterId})`);
                        return Buffer.from(`MOCK_TX_${Date.now()}`);
                    }
                    if (name === "InitLedger") {
                        return Buffer.from("OK");
                    }
                    return Buffer.from("");
                },
                evaluateTransaction: async (name: string, ...args: string[]): Promise<Uint8Array> => {
                    if (name === "HasVoted") {
                        const hasVoted = mockState[args[0]] === "true" ? "true" : "false";
                        return Buffer.from(hasVoted);
                    }
                    if (name === "GetElectionResults") {
                        return Buffer.from(JSON.stringify([{ partyId: "progress", count: 1 }]));
                    }
                    return Buffer.from("");
                }
            } as unknown as Contract;

            return contract;
        } else {
            throw err;
        }
    }
}

// ──────────────────────────────────────────────────────────────
//  Gracefully close the gateway connection
// ──────────────────────────────────────────────────────────────
export function disconnectFabric(): void {
    gateway?.close();
    client?.close();
    gateway = null;
    client = null;
    network = null;
    contract = null;
    console.info("[Fabric] Connection closed.");
}
