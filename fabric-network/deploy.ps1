# ============================================================
#  deploy.ps1  —  One-shot Hyperledger Fabric E-Voting Network
#  Executes natively on Windows using Docker
# ============================================================

$ErrorActionPreference = "Stop"

$CHANNEL_NAME = "election-channel"
$CC_NAME = "evoting"
$CC_VERSION = "1.0"
$CC_LABEL = "${CC_NAME}_${CC_VERSION}"
$ORDERER = "orderer.example.com:7050"
$ORDERER_TLS = "/fabric-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "   Secure E-Vote — Hyperledger Fabric Deploy Script   " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# Ensure output directories exist
New-Item -ItemType Directory -Force -Path .\organizations | Out-Null
New-Item -ItemType Directory -Force -Path .\system-genesis-block | Out-Null
New-Item -ItemType Directory -Force -Path .\channel-artifacts | Out-Null

# ── Step 1: Generate crypto material ─────────────────────────
Write-Host "→ [1/8] Generating crypto material..." -ForegroundColor Green
docker run --rm -v "$PWD`:/fabric" -w /fabric hyperledger/fabric-tools:2.5 cryptogen generate --config=./crypto-config.yaml --output=organizations

# ── Step 2: Create Genesis Block ─────────────────────────────
Write-Host "→ [2/8] Creating genesis block..." -ForegroundColor Green
docker run --rm -v "$PWD`:/fabric" -w /fabric hyperledger/fabric-tools:2.5 configtxgen -profile ElectionGenesis -channelID system-channel -outputBlock ./system-genesis-block/genesis.block

# ── Step 3: Create channel TX ────────────────────────────────
Write-Host "→ [3/8] Creating channel transaction..." -ForegroundColor Green
docker run --rm -v "$PWD`:/fabric" -w /fabric hyperledger/fabric-tools:2.5 configtxgen -profile ElectionGenesis -outputCreateChannelTx ./channel-artifacts/${CHANNEL_NAME}.tx -channelID ${CHANNEL_NAME}

# ── Step 4: Start the network ────────────────────────────────
Write-Host "→ [4/8] Starting Docker containers..." -ForegroundColor Green
docker-compose -f docker-compose.yml up -d
Write-Host "Waiting 10 seconds for orderer and peers to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# ── Step 5: Create and join channel ──────────────────────────
Write-Host "→ [5/8] Creating and joining election-channel..." -ForegroundColor Green

# Create channel (run inside CLI container)
docker exec cli bash -c "export CORE_PEER_LOCALMSPID=ECIOrgMSP && \
export CORE_PEER_TLS_ROOTCERT_FILE=/fabric-network/organizations/peerOrganizations/eci.example.com/peers/peer0.eci.example.com/tls/ca.crt && \
export CORE_PEER_MSPCONFIGPATH=/fabric-network/organizations/peerOrganizations/eci.example.com/users/Admin@eci.example.com/msp && \
export CORE_PEER_ADDRESS=peer0.eci.example.com:7051 && \
export CORE_PEER_TLS_ENABLED=true && \
peer channel create -o orderer.example.com:7050 -c $CHANNEL_NAME -f /fabric-network/channel-artifacts/${CHANNEL_NAME}.tx --outputBlock /fabric-network/channel-artifacts/${CHANNEL_NAME}.block --tls --cafile $ORDERER_TLS"

# Join channel
docker exec cli bash -c "export CORE_PEER_LOCALMSPID=ECIOrgMSP && \
export CORE_PEER_TLS_ROOTCERT_FILE=/fabric-network/organizations/peerOrganizations/eci.example.com/peers/peer0.eci.example.com/tls/ca.crt && \
export CORE_PEER_MSPCONFIGPATH=/fabric-network/organizations/peerOrganizations/eci.example.com/users/Admin@eci.example.com/msp && \
export CORE_PEER_ADDRESS=peer0.eci.example.com:7051 && \
export CORE_PEER_TLS_ENABLED=true && \
peer channel join -b /fabric-network/channel-artifacts/${CHANNEL_NAME}.block"

# ── Step 6: Install & approve chaincode ──────────────────────
Write-Host "→ [6/8] Building and packaging chaincode..." -ForegroundColor Green

# Build the chaincode on Windows first so it's ready in the folder
Push-Location ../chaincode
npm install
npm run build
Pop-Location

# Package chaincode inside the CLI container
docker exec cli bash -c "peer lifecycle chaincode package /fabric-network/${CC_NAME}.tar.gz --path /chaincode --lang node --label ${CC_LABEL}"

Write-Host "        Installing chaincode on peer..." -ForegroundColor Yellow
docker exec cli bash -c "export CORE_PEER_LOCALMSPID=ECIOrgMSP && \
export CORE_PEER_TLS_ROOTCERT_FILE=/fabric-network/organizations/peerOrganizations/eci.example.com/peers/peer0.eci.example.com/tls/ca.crt && \
export CORE_PEER_MSPCONFIGPATH=/fabric-network/organizations/peerOrganizations/eci.example.com/users/Admin@eci.example.com/msp && \
export CORE_PEER_ADDRESS=peer0.eci.example.com:7051 && \
export CORE_PEER_TLS_ENABLED=true && \
peer lifecycle chaincode install /fabric-network/${CC_NAME}.tar.gz"

Write-Host "        Approving chaincode for org..." -ForegroundColor Yellow
$INSTALL_TXT = docker exec cli bash -c "export CORE_PEER_LOCALMSPID=ECIOrgMSP && \
export CORE_PEER_TLS_ROOTCERT_FILE=/fabric-network/organizations/peerOrganizations/eci.example.com/peers/peer0.eci.example.com/tls/ca.crt && \
export CORE_PEER_MSPCONFIGPATH=/fabric-network/organizations/peerOrganizations/eci.example.com/users/Admin@eci.example.com/msp && \
export CORE_PEER_ADDRESS=peer0.eci.example.com:7051 && \
export CORE_PEER_TLS_ENABLED=true && \
peer lifecycle chaincode queryinstalled"
$CC_PACKAGE_ID = ($INSTALL_TXT | Select-String -Pattern "Package ID: (${CC_LABEL}[^,]+)").Matches.Groups[1].Value

docker exec cli bash -c "export CORE_PEER_LOCALMSPID=ECIOrgMSP && \
export CORE_PEER_TLS_ROOTCERT_FILE=/fabric-network/organizations/peerOrganizations/eci.example.com/peers/peer0.eci.example.com/tls/ca.crt && \
export CORE_PEER_MSPCONFIGPATH=/fabric-network/organizations/peerOrganizations/eci.example.com/users/Admin@eci.example.com/msp && \
export CORE_PEER_ADDRESS=peer0.eci.example.com:7051 && \
export CORE_PEER_TLS_ENABLED=true && \
peer lifecycle chaincode approveformyorg -o orderer.example.com:7050 --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION --package-id $CC_PACKAGE_ID --sequence 1 --collections-config /fabric-network/collections_config.json --tls --cafile $ORDERER_TLS"

# ── Step 7: Commit chaincode ──────────────────────────────────
Write-Host "→ [7/8] Committing chaincode to channel..." -ForegroundColor Green
docker exec cli bash -c "export CORE_PEER_LOCALMSPID=ECIOrgMSP && \
export CORE_PEER_TLS_ROOTCERT_FILE=/fabric-network/organizations/peerOrganizations/eci.example.com/peers/peer0.eci.example.com/tls/ca.crt && \
export CORE_PEER_MSPCONFIGPATH=/fabric-network/organizations/peerOrganizations/eci.example.com/users/Admin@eci.example.com/msp && \
export CORE_PEER_ADDRESS=peer0.eci.example.com:7051 && \
export CORE_PEER_TLS_ENABLED=true && \
peer lifecycle chaincode commit -o orderer.example.com:7050 --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION --sequence 1 --collections-config /fabric-network/collections_config.json --tls --cafile $ORDERER_TLS --peerAddresses peer0.eci.example.com:7051 --tlsRootCertFiles /fabric-network/organizations/peerOrganizations/eci.example.com/peers/peer0.eci.example.com/tls/ca.crt"

# ── Step 8: Initialize election ledger ───────────────────────
Write-Host "→ [8/8] Initializing election ledger..." -ForegroundColor Green
docker exec cli bash -c "export CORE_PEER_LOCALMSPID=ECIOrgMSP && \
export CORE_PEER_TLS_ROOTCERT_FILE=/fabric-network/organizations/peerOrganizations/eci.example.com/peers/peer0.eci.example.com/tls/ca.crt && \
export CORE_PEER_MSPCONFIGPATH=/fabric-network/organizations/peerOrganizations/eci.example.com/users/Admin@eci.example.com/msp && \
export CORE_PEER_ADDRESS=peer0.eci.example.com:7051 && \
export CORE_PEER_TLS_ENABLED=true && \
peer chaincode invoke -o orderer.example.com:7050 --channelID $CHANNEL_NAME --name $CC_NAME --tls --cafile $ORDERER_TLS -c '{\`"function\`":\`"InitLedger\`",\`"Args\`":[\`"ELECTION-2026-GENERAL\`"]}' --peerAddresses peer0.eci.example.com:7051 --tlsRootCertFiles /fabric-network/organizations/peerOrganizations/eci.example.com/peers/peer0.eci.example.com/tls/ca.crt"

Write-Host "`n✅ E-Voting Fabric Network is LIVE!" -ForegroundColor Cyan
Write-Host "   Channel  : $CHANNEL_NAME" -ForegroundColor Cyan
Write-Host "   Chaincode: $CC_NAME v$CC_VERSION`n" -ForegroundColor Cyan
Write-Host "   Next: Start the API gateway and use the web interface!" -ForegroundColor Cyan
