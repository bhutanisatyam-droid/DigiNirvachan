#!/bin/sh
peer chaincode query -C election-channel -n evoting -c '{"function":"GetElectionResults","Args":[]}'
