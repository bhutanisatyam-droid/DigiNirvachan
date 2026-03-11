// ============================================================
//  Register a Voting Kiosk with Fabric CA
//  Usage: KIOSK_ID=kiosk-001 HARDWARE_ID=ABC123 npm run register
// ============================================================

import FabricCAClient from "fabric-ca-client";
import * as path from "path";
import * as fs from "fs";
import "dotenv/config";

const caUrl = process.env.CA_URL!;
const caName = process.env.CA_NAME!;
const cryptoPath = path.resolve(__dirname, "../../..", process.env.CRYPTO_PATH!);

const kioskId = process.env.KIOSK_ID || "kiosk-001";
const hardwareId = process.env.HARDWARE_ID || "HW-UNKNOWN";

async function registerKiosk(): Promise<void> {
    const caClient = new FabricCAClient(caUrl, { trustedRoots: [], verify: false }, caName);

    // Load admin identity to act as registrar
    const certPath = path.join(
        cryptoPath, "users", "Admin@eci.example.com",
        "msp", "signcerts", "cert.pem"
    );
    const keyPath = path.join(
        cryptoPath, "users", "Admin@eci.example.com",
        "msp", "keystore", "priv_sk"
    );

    const cert = fs.readFileSync(certPath).toString();
    const key = fs.readFileSync(keyPath).toString();

    const adminUser = {
        getName: () => "admin",
        getSigningIdentity: () => ({ _signer: null }),
        _signingIdentity: { _signer: { _key: { toBytes: () => key } } },
    } as unknown as FabricCAClient.IUser;

    // Register the kiosk with hardware ID as an attribute
    const secret = await caClient.register(
        {
            enrollmentID: kioskId,
            enrollmentSecret: `${kioskId}-secret`,
            role: "client",
            attrs: [
                { name: "hardwareId", value: hardwareId, ecert: true },
                { name: "role", value: "kiosk", ecert: true },
            ],
            maxEnrollments: -1,
        },
        adminUser
    );

    // Enroll the kiosk immediately
    const enrollment = await caClient.enroll({
        enrollmentID: kioskId,
        enrollmentSecret: secret,
    });

    const kioskDir = path.join(cryptoPath, "kiosks", kioskId, "msp");
    fs.mkdirSync(path.join(kioskDir, "signcerts"), { recursive: true });
    fs.mkdirSync(path.join(kioskDir, "keystore"), { recursive: true });
    fs.writeFileSync(path.join(kioskDir, "signcerts", "cert.pem"), enrollment.certificate);
    fs.writeFileSync(path.join(kioskDir, "keystore", "priv_sk"), enrollment.key.toBytes());

    console.info(`[CA] ✓ Kiosk [${kioskId}] registered with HardwareID: ${hardwareId}`);
    console.info(`[CA] ✓ Certificates saved to: ${kioskDir}`);
}

registerKiosk().catch((err) => {
    console.error("[CA] Kiosk registration failed:", err);
    process.exit(1);
});
