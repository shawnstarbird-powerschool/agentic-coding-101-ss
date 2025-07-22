#!/bin/bash
set -e
set -x

echo "Starting PS_ENVIRONMENT=$PS_ENVIRONMENT"

# In GitHub Actions, GITHUB_HEAD_REF is only set for pull request events
if [ -n "$GITHUB_HEAD_REF" ]; then
  # We're in a PR workflow, use the branch name as the environment
  export PS_ENVIRONMENT="$GITHUB_HEAD_REF"
fi

echo "Final PS_ENVIRONMENT=$PS_ENVIRONMENT"

# Set up the private key - either from file or from base64 encoded string
TEMP_KEY_FILE=""
if [ -n "$TEST_PRIVATE_KEY" ]; then
  echo "Using TEST_PRIVATE_KEY environment variable"
  TEMP_KEY_FILE=$(mktemp)
  echo "$TEST_PRIVATE_KEY" | base64 -d > "$TEMP_KEY_FILE"
  chmod 600 "$TEMP_KEY_FILE"
  export PRIVATE_KEY_FILE="$TEMP_KEY_FILE"
  ssh-keygen -y -f "$TEMP_KEY_FILE" > "$TEMP_KEY_FILE".pub
elif [ -n "$PRIVATE_KEY_FILE" ]; then
  echo "Using PRIVATE_KEY_FILE environment variable"
  # Check if the private key file exists
  if [ ! -f "$PRIVATE_KEY_FILE" ]; then
    echo "Error: Private key file $PRIVATE_KEY_FILE does not exist"
    exit 1
  fi
else
  echo "Error: Neither PRIVATE_KEY_FILE nor TEST_PRIVATE_KEY environment variable is set"
  echo "Please set either PRIVATE_KEY_FILE to the path of the SSH private key file"
  echo "or TEST_PRIVATE_KEY to the base64 encoded private key"
  exit 1
fi

export AWS_REGION="us-east-1"

# Make sure the test data is there
npm run test-init

# Run the integration tests
echo "Running integration tests..."
npx ts-node scripts/test-integration.ts

# Clean up temporary key file if it was created
if [ -n "$TEMP_KEY_FILE" ] && [ -f "$TEMP_KEY_FILE" ]; then
  rm -f "$TEMP_KEY_FILE"
fi

# Exit with success
exit 0
