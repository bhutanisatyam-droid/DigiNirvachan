#!/bin/bash
# ============================================================
#  deploy.sh  —  One-shot Hyperledger Fabric E-Voting Network
#  Requires: Docker, docker-compose, fabric-samples binaries
# ============================================================

set -euo pipefail

FABRIC_BIN="$HOME/fabric-samples/bin"
FABRIC_CFG_PATH="$(pwd)"
CHANNEL_NAME="election-channel"
CC_NAME="evoting"
CC_VERSION="1.0"
CC_PATH="../chaincode"
CC_LABEL="${CC_NAME}_${CC_VERSION}"
ORDERER="localhost:7050"
ORDERER_TLS="organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt"

export PATH="$FABRIC_BIN:$PATH"
export FABRIC_CFG_PATH

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   Secure E-Vote — Hyperledger Fabric Deploy Script   ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Generate crypto material ─────────────────────────
echo "→ [1/8] Generating crypto material..."
cryptogen generate --config=./crypto-config.yaml --output=organizations

# ── Step 2: Create Genesis Block ─────────────────────────────
echo "→ [2/8] Creating genesis block..."
configtxgen -profile ElectionGenesis -channelID system-channel -outputBlock ./system-genesis-block/genesis.block

# ── Step 3: Create channel TX ────────────────────────────────
echo "→ [3/8] Creating channel transaction..."
configtxgen -profile ElectionGenesis -outputCreateChannelTx ./channel-artifacts/${CHANNEL_NAME}.tx -channelID ${CHANNEL_NAME}

# ── Step 4: Start the network ────────────────────────────────
echo "→ [4/8] Starting Docker containers..."
docker-compose -f docker-compose.yml up -d
sleep 5

# ── Step 5: Create and join channel ──────────────────────────
echo "→ [5/8] Creating and joining election-channel..."
export CORE_PEER_LOCALMSPID="ECIOrgMSP"
export CORE_PEER_TLS_ROOTCERT_FILE="organizations/peerOrganizations/eci.example.com/peers/peer0.eci.example.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="organizations/peerOrganizations/eci.example.com/users/Admin@eci.example.com/msp"
export CORE_PEER_ADDRESS="localhost:7051"
export CORE_PEER_TLS_ENABLED=true

peer channel create -o ${ORDERER} -c ${CHANNEL_NAME} -f ./channel-artifacts/${CHANNEL_NAME}.tx \
  --outputBlock ./channel-artifacts/${CHANNEL_NAME}.block \
  --tls --cafile ${ORDERER_TLS}

peer channel join -b ./channel-artifacts/${CHANNEL_NAME}.block

# ── Step 6: Install & approve chaincode ──────────────────────
echo "→ [6/8] Installing and approving chaincode..."
(cd "$CC_PATH" && npm install && npm run build)

peer lifecycle chaincode package ${CC_NAME}.tar.gz \
  --path "$CC_PATH" --lang node \
  --label "${CC_LABEL}"

peer lifecycle chaincode install ${CC_NAME}.tar.gz

CC_PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | grep "${CC_LABEL}" | awk '{print $3}' | tr -d ',')

peer lifecycle chaincode approveformyorg -o ${ORDERER} \
  --channelID ${CHANNEL_NAME} --name ${CC_NAME} --version ${CC_VERSION} \
  --package-id "${CC_PACKAGE_ID}" --sequence 1 \
  --collections-config ./collections_config.json \
  --tls --cafile ${ORDERER_TLS}

# ── Step 7: Commit chaincode ──────────────────────────────────
echo "→ [7/8] Committing chaincode to channel..."
peer lifecycle chaincode commit -o ${ORDERER} \
  --channelID ${CHANNEL_NAME} --name ${CC_NAME} --version ${CC_VERSION} \
  --sequence 1 \
  --collections-config ./collections_config.json \
  --tls --cafile ${ORDERER_TLS} \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles organizations/peerOrganizations/eci.example.com/peers/peer0.eci.example.com/tls/ca.crt

# ── Step 8: Initialize election ledger ───────────────────────
echo "→ [8/8] Initializing election ledger..."
peer chaincode invoke -o ${ORDERER} \
  --channelID ${CHANNEL_NAME} --name ${CC_NAME} \
  --tls --cafile ${ORDERER_TLS} \
  -c '{"function":"InitLedger","Args":["ELECTION-2026-GENERAL"]}' \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles organizations/peerOrganizations/eci.example.com/peers/peer0.eci.example.com/tls/ca.crt

echo ""
echo "✅ E-Voting Fabric Network is LIVE!"
echo "   Channel  : ${CHANNEL_NAME}"
echo "   Chaincode: ${CC_NAME} v${CC_VERSION}"
echo ""
echo "   Next: cd ../api-gateway && npm install && npm run enroll && npm run dev"
echo ""
