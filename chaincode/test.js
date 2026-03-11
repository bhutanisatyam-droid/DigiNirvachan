const fs = require('fs');
const out = [];

function log(msg) { out.push(String(msg)); }

try {
    const bootstrap = require('fabric-shim/lib/contract-spi/bootstrap.js');
    const C = require('fabric-shim/lib/contract-spi/chaincodefromcontract.js');
    const { EVotingContract, contracts } = require('./dist/index.js');

    log("EVotingContract type: " + typeof EVotingContract);
    log("contracts: " + (contracts ? contracts.length : "undefined"));
    if (contracts && contracts.length > 0) {
        log("contracts[0] type: " + typeof contracts[0]);
    }

    const cc = new C(contracts, {
        transaction: 'jsonSerializer',
        serializers: { jsonSerializer: require('fabric-contract-api').JSONSerializer }
    });
    log("SUCCESS. Chaincode instantiated.");
} catch (e) {
    log("FAILED.");
    log(e.stack);
}

fs.writeFileSync('test_out.txt', out.join('\n'));
