// ============================================================
//  Enroll Admin with Fabric CA
//  Run once: npm run enroll
// ============================================================

import FabricCAClient from "fabric-ca-client";
import * as path from "path";
import * as fs from "fs";
import "dotenv/config";

const caUrl = process.env.CA_URL!;
const caName = process.env.CA_NAME!;
const adminName = process.env.CA_ADMIN_NAME!;
const adminPassword = process.env.CA_ADMIN_PASSWORD!;
const cryptoPath = path.resolve(__dirname, "../../..", process.env.CRYPTO_PATH!);

async function enrollAdmin(): Promise<void> {
    const caClient = new FabricCAClient(caUrl, { trustedRoots: [], verify: false }, caName);

    const enrollment = await caClient.enroll({
        enrollmentID: adminName,
        enrollmentSecret: adminPassword,
    });

    const adminDir = path.join(
        cryptoPath,
        "users",
        `Admin@eci.example.com`,
        "msp"
    );

    // Write certificate
    const certDir = path.join(adminDir, "signcerts");
    fs.mkdirSync(certDir, { recursive: true });
    fs.writeFileSync(path.join(certDir, "cert.pem"), enrollment.certificate);

    // Write private key
    const keyDir = path.join(adminDir, "keystore");
    fs.mkdirSync(keyDir, { recursive: true });
    fs.writeFileSync(path.join(keyDir, "priv_sk"), enrollment.key.toBytes());

    console.info(`[CA] ✓ Admin [${adminName}] enrolled successfully.`);
}

enrollAdmin().catch((err) => {
    console.error("[CA] Admin enrollment failed:", err);
    process.exit(1);
});
