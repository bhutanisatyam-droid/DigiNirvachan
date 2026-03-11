# ============================================================
#  query-ledger.ps1
#  Query the Hyperledger Fabric ledger from the POV of the ECI Node
# ============================================================

Set-Location $PSScriptRoot

$NET      = "election_net"
$TOOLS    = "hyperledger/fabric-tools:2.5"
$CHANNEL  = "election-channel"
$CC_NAME  = "evoting"

$PBASE    = "organizations/peerOrganizations"
$ECI_TLS  = "$PBASE/eci.example.com/peers/peer0.eci.example.com/tls/ca.crt"
$ECI_MSP  = "$PBASE/eci.example.com/users/Admin@eci.example.com/msp"
$ECI_ADDR = "peer0.eci.example.com:7051"

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  Querying Ledger from POV of ECI Node (peer0.eci)     " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

$cmd = "peer chaincode query -C $CHANNEL -n $CC_NAME -c '{\`"Args\`":[\`"GetElectionResults\`"]}'"

docker run --rm `
    --network $NET `
    -v "${PWD}:/fabric" `
    -w /fabric `
    -e "CORE_PEER_LOCALMSPID=ECIOrgMSP" `
    -e CORE_PEER_TLS_ENABLED=true `
    -e "CORE_PEER_TLS_ROOTCERT_FILE=/fabric/$ECI_TLS" `
    -e "CORE_PEER_MSPCONFIGPATH=/fabric/$ECI_MSP" `
    -e "CORE_PEER_ADDRESS=$ECI_ADDR" `
    $TOOLS sh -c $cmd

Write-Host ""
Write-Host "Query completed." -ForegroundColor Green
