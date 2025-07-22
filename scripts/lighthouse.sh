#!/bin/bash
set -e

# npx ts-node scripts/get-deploy-url.ts --harness true
# apt update
# apt install -y chromium

# Only run if there's a token configured
if [ -z $LHCI_TOKEN ]; then
	echo "---> ERROR: LHCI_TOKEN not set, aborting."
	exit 254;
fi

if [ -f './.lighthouserc.js' ]; then
  npm run cwv:ci
else
  # Don't fail the job on a failure here.
  set +e
  
  npm run cwv:ci

  exit 0
fi