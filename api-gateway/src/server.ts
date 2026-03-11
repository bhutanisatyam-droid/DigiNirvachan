// ============================================================
//  Express API Gateway  ·  Main Server Entry Point
//  Fabric E-Voting System
// ============================================================

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import "dotenv/config";
import { connectToFabric, disconnectFabric } from "./fabric";
import { createVoteRouter } from "./routes/voteRoutes";

const app = express();
const PORT = parseInt(process.env.PORT || "4000", 10);

// ── Middleware ────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
    origin: process.env.NODE_ENV === "production"
        ? ["https://your-evoting-domain.com"]
        : true, // Reflects the incoming origin, fixing CORS preflight with credentials
    credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("combined"));

// ── Root ──────────────────────────────────────────────────────
app.get("/", (_req, res) => {
    res.json({
        service: "Secure E-Voting API Gateway",
        version: "1.0.0",
        network: "Hyperledger Fabric 2.5 · Election Channel",
        endpoints: [
            "POST /api/vote",
            "POST /api/init",
            "POST /api/close",
            "GET  /api/has-voted/:voterId",
            "GET  /api/results",
            "GET  /api/health",
        ],
    });
});

// ── Bootstrap ──────────────────────────────────────────────────
async function startServer(): Promise<void> {
    try {
        console.info("[Gateway] Connecting to Hyperledger Fabric...");
        const contract = await connectToFabric();
        console.info("[Gateway] ✓ Fabric connection established.");

        // Mount routes after Fabric is connected
        app.use("/api", createVoteRouter(contract));

        // 404 fallback
        app.use((_req, res) => {
            res.status(404).json({ error: "Route not found." });
        });

        const server = app.listen(PORT, () => {
            console.info(`[Gateway] ✓ API server listening on http://localhost:${PORT}`);
        });

        // Graceful shutdown
        const shutdown = () => {
            console.info("[Gateway] Shutting down...");
            server.close(() => {
                disconnectFabric();
                process.exit(0);
            });
        };
        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);
    } catch (error) {
        console.error("[Gateway] Failed to start:", error);
        process.exit(1);
    }
}

startServer();
