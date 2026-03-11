# ============================================================
#  setup.ps1 -- One-shot Hyperledger Fabric E-Voting Network
#  Run as: powershell -ExecutionPolicy Bypass -File setup.ps1
#  Prerequisites: Docker Desktop running
# ============================================================

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$CHANNEL  = "election-channel"
$CC_NAME  = "evoting"
$CC_VER   = "1.0"
$CC_LABEL = "${CC_NAME}_${CC_VER}"
$NET      = "election_net"
$TOOLS    = "hyperledger/fabric-tools:2.5"

function Log($msg)  { Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "   [OK] $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "   [ERR] $msg" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "====================================================" -ForegroundColor Magenta
Write-Host "  Secure E-Vote -- Hyperledger Fabric Deployment   " -ForegroundColor Magenta
Write-Host "====================================================" -ForegroundColor Magenta
Write-Host ""

# ── 0. Teardown ───────────────────────────────────────────────
Log "0. Tearing down previous network..."
$ErrorActionPreference = "Continue"
docker stop $(docker ps -aq) 2>&1 | Out-Null
docker-compose -f docker-compose.yml down -v --remove-orphans 2>&1 | Out-Null
$ErrorActionPreference = "Stop"
Start-Sleep -Seconds 5
if (Test-Path "organizations")        { cmd /c "rmdir /s /q organizations" }
if (Test-Path "system-genesis-block") { cmd /c "rmdir /s /q system-genesis-block" }
if (Test-Path "channel-artifacts")    { cmd /c "rmdir /s /q channel-artifacts" }
New-Item -ItemType Directory -Force -Path system-genesis-block | Out-Null
New-Item -ItemType Directory -Force -Path channel-artifacts    | Out-Null
Ok "Clean slate ready"

# ── 1. Crypto material ────────────────────────────────────────
Log "1/7  Generating X.509 certificates..."
docker run --rm -v "${PWD}:/fabric" -w /fabric $TOOLS `
    cryptogen generate --config=./crypto-config.yaml --output=organizations
$ordererCert = ".\organizations\ordererOrganizations\example.com\orderers\orderer.example.com\tls\server.crt"
if (-not (Test-Path $ordererCert)) { Fail "Orderer TLS cert missing after cryptogen!" }
Ok "Crypto material generated"

# ── 2. Genesis block ──────────────────────────────────────────
Log "2/7  Generating application genesis block..."
docker run --rm -v "${PWD}:/fabric" -w /fabric -e FABRIC_CFG_PATH=/fabric $TOOLS `
    sh -c "configtxgen -profile ElectionGenesis -outputBlock ./channel-artifacts/genesis.block -channelID $CHANNEL 2>&1"
if (-not (Test-Path ".\channel-artifacts\genesis.block")) { Fail "Genesis block not created!" }
Ok "genesis.block written to channel-artifacts"

# ── 3. Start network ──────────────────────────────────────────
Log "3/7  Starting Docker containers..."
$ErrorActionPreference = "Continue"
docker-compose -f docker-compose.yml up -d 2>&1 | Out-Null
$ErrorActionPreference = "Stop"
Log "     Waiting 15s for all containers to boot..."
Start-Sleep -Seconds 15
Ok "Network started"

# ── Helper: docker run peer command against the live network ──
# Uses docker run --rm on election_net so no CLI container needed
function PeerExec($mspid, $tlsCert, $mspPath, $addr, $cmd) {
    # Remap absolute container paths to relative host paths
    $hostTls  = $tlsCert  -replace "^/fabric/", ""
    $hostMsp  = $mspPath  -replace "^/fabric/", ""
    docker run --rm `
        --network $NET `
        -v "${PWD}:/fabric" `
        -w /fabric `
        -e "CORE_PEER_LOCALMSPID=$mspid" `
        -e CORE_PEER_TLS_ENABLED=true `
        -e "CORE_PEER_TLS_ROOTCERT_FILE=/fabric/$hostTls" `
        -e "CORE_PEER_MSPCONFIGPATH=/fabric/$hostMsp" `
        -e "CORE_PEER_ADDRESS=$addr" `
        $TOOLS sh -c "$cmd 2>&1"
}

$PBASE = "organizations/peerOrganizations"
$OBASE = "organizations/ordererOrganizations/example.com/orderers/orderer.example.com"

$ECI_TLS  = "$PBASE/eci.example.com/peers/peer0.eci.example.com/tls/ca.crt"
$ECI_MSP  = "$PBASE/eci.example.com/users/Admin@eci.example.com/msp"
$ECI_ADDR = "peer0.eci.example.com:7051"

$SC_TLS   = "$PBASE/supremecourt.example.com/peers/peer0.supremecourt.example.com/tls/ca.crt"
$SC_MSP   = "$PBASE/supremecourt.example.com/users/Admin@supremecourt.example.com/msp"
$SC_ADDR  = "peer0.supremecourt.example.com:9051"

$OP_TLS   = "$PBASE/opposition.example.com/peers/peer0.opposition.example.com/tls/ca.crt"
$OP_MSP   = "$PBASE/opposition.example.com/users/Admin@opposition.example.com/msp"
$OP_ADDR  = "peer0.opposition.example.com:11051"

$ORD_CA   = "/fabric/$OBASE/tls/ca.crt"
$ORD_HOST = "orderer.example.com:7050"

# ── 4. Join Orderer & Peers to Channel ────────────────────────
Log "4/7  Joining orderer and peers to $CHANNEL via osnadmin..."

# Copy genesis block to orderer volume by just mounting the folder in docker run
# Join orderer using osnadmin from tools container
$osnCmd = "osnadmin channel join --channelID $CHANNEL " +
    "--config-block /fabric/channel-artifacts/genesis.block " +
    "-o orderer.example.com:7053 " +
    "--ca-file /fabric/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt " +
    "--client-cert /fabric/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.crt " +
    "--client-key /fabric/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.key 2>&1"

$osnOut = docker run --rm -v "${PWD}:/fabric" -w /fabric --network $NET $TOOLS sh -c $osnCmd
if ($osnOut -match "Error") { Fail "osnadmin failed: $osnOut" }
Start-Sleep -Seconds 3

# Join peers using the exact same genesis block
PeerExec "ECIOrgMSP"          $ECI_TLS $ECI_MSP $ECI_ADDR "peer channel join -b /fabric/channel-artifacts/genesis.block"
PeerExec "SupremeCourtOrgMSP" $SC_TLS  $SC_MSP  $SC_ADDR  "peer channel join -b /fabric/channel-artifacts/genesis.block"
PeerExec "OppositionOrgMSP"   $OP_TLS  $OP_MSP  $OP_ADDR  "peer channel join -b /fabric/channel-artifacts/genesis.block"
Ok "Orderer and all 3 peers joined election-channel"

# ── 5. Package + install chaincode ───────────────────────────
Log "5/7  Installing chaincode on all peers..."

# Package from host chaincode directory
docker run --rm -v "${PWD}:/fabric" -v "${PWD}/../chaincode:/chaincode" `
    -w /fabric $TOOLS `
    sh -c "peer lifecycle chaincode package /fabric/evoting.tar.gz --path /chaincode --lang node --label $CC_LABEL 2>&1"

PeerExec "ECIOrgMSP"          $ECI_TLS $ECI_MSP $ECI_ADDR `
    "peer lifecycle chaincode install /fabric/evoting.tar.gz"
PeerExec "SupremeCourtOrgMSP" $SC_TLS  $SC_MSP  $SC_ADDR  `
    "peer lifecycle chaincode install /fabric/evoting.tar.gz"
PeerExec "OppositionOrgMSP"   $OP_TLS  $OP_MSP  $OP_ADDR  `
    "peer lifecycle chaincode install /fabric/evoting.tar.gz"
Ok "Chaincode installed on all peers"

# Get Package ID
$ErrorActionPreference = "Continue"
$installed = docker run --rm --network $NET `
    -v "${PWD}:/fabric" -w /fabric `
    -e "CORE_PEER_LOCALMSPID=ECIOrgMSP" `
    -e CORE_PEER_TLS_ENABLED=true `
    -e "CORE_PEER_TLS_ROOTCERT_FILE=/fabric/$ECI_TLS" `
    -e "CORE_PEER_MSPCONFIGPATH=/fabric/$ECI_MSP" `
    -e "CORE_PEER_ADDRESS=$ECI_ADDR" `
    $TOOLS peer lifecycle chaincode queryinstalled 2>&1
$ErrorActionPreference = "Stop"
$PKGID = ""
foreach ($line in $installed) {
    if ($line -match "Package ID:\s*([^,]+),") { $PKGID = $Matches[1].Trim(); break }
}
if (-not $PKGID) { Fail "Could not extract Package ID. Output: $($installed -join ' | ')" }
Ok "Package ID: $PKGID"

# ── 6. Approve + Commit ───────────────────────────────────────
Log "6/7  Approving chaincode for all 3 organisations..."
$approve = "peer lifecycle chaincode approveformyorg -o $ORD_HOST --channelID $CHANNEL --name $CC_NAME --version $CC_VER --package-id $PKGID --sequence 1 --tls --cafile $ORD_CA"

PeerExec "ECIOrgMSP"          $ECI_TLS $ECI_MSP $ECI_ADDR $approve
PeerExec "SupremeCourtOrgMSP" $SC_TLS  $SC_MSP  $SC_ADDR  $approve
PeerExec "OppositionOrgMSP"   $OP_TLS  $OP_MSP  $OP_ADDR  $approve
Ok "Approved by all orgs"

Log "7/7  Committing chaincode..."
$commit = "peer lifecycle chaincode commit -o $ORD_HOST --channelID $CHANNEL --name $CC_NAME --version $CC_VER --sequence 1 --tls --cafile $ORD_CA" +
    " --peerAddresses $ECI_ADDR --tlsRootCertFiles /fabric/$ECI_TLS" +
    " --peerAddresses $SC_ADDR  --tlsRootCertFiles /fabric/$SC_TLS" +
    " --peerAddresses $OP_ADDR  --tlsRootCertFiles /fabric/$OP_TLS"
PeerExec "ECIOrgMSP" $ECI_TLS $ECI_MSP $ECI_ADDR $commit
Ok "Chaincode committed!"

# ── Initialize ledger ─────────────────────────────────────────
Log "Initializing election ledger..."

# Build init.sh content as LF-only string (PowerShell here-strings use CRLF so we build manually)
$line1 = "#!/bin/sh"
$line2 = "peer chaincode invoke -o orderer.example.com:7050 --channelID election-channel --name evoting --tls --cafile /fabric/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt --peerAddresses peer0.eci.example.com:7051 --tlsRootCertFiles /fabric/organizations/peerOrganizations/eci.example.com/peers/peer0.eci.example.com/tls/ca.crt --peerAddresses peer0.supremecourt.example.com:9051 --tlsRootCertFiles /fabric/organizations/peerOrganizations/supremecourt.example.com/peers/peer0.supremecourt.example.com/tls/ca.crt --peerAddresses peer0.opposition.example.com:11051 --tlsRootCertFiles /fabric/organizations/peerOrganizations/opposition.example.com/peers/peer0.opposition.example.com/tls/ca.crt -c '{""function"":""InitLedger"",""Args"":[""ELECTION-2026-GENERAL""]}'"
$initContent = "$line1`n$line2`n"
[System.IO.File]::WriteAllBytes("$PSScriptRoot\init.sh", [System.Text.Encoding]::UTF8.GetBytes($initContent))

docker run --rm `
    --network $NET `
    -v "${PWD}:/fabric" `
    -w /fabric `
    -e "CORE_PEER_LOCALMSPID=ECIOrgMSP" `
    -e CORE_PEER_TLS_ENABLED=true `
    -e "CORE_PEER_TLS_ROOTCERT_FILE=/fabric/$ECI_TLS" `
    -e "CORE_PEER_MSPCONFIGPATH=/fabric/$ECI_MSP" `
    -e "CORE_PEER_ADDRESS=$ECI_ADDR" `
    $TOOLS sh init.sh

Start-Sleep -Seconds 3
Ok "Election ledger initialized!"

Write-Host ""
Write-Host "====================================================" -ForegroundColor Green
Write-Host "  [SUCCESS] BLOCKCHAIN IS LIVE!                    " -ForegroundColor Green
Write-Host "  Channel  : $CHANNEL                              " -ForegroundColor Green
Write-Host "  Chaincode: $CC_NAME v$CC_VER                     " -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next: cd ..\api-gateway && npm run dev" -ForegroundColor Yellow
