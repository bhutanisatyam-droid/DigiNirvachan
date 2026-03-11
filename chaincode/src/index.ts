// ============================================================
//  Chaincode Entry Point
// ============================================================
import { EVotingContract } from "./evoting";

export { EVotingContract };

export const contracts: any[] = [EVotingContract];

console.log(">>>> [CHAINCODE INIT] EVotingContract type:", typeof EVotingContract);
if (!EVotingContract) {
    throw new Error("CRITICAL FATAL: EVotingContract is undefined at module load!");
}
