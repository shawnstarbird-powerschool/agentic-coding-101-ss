#!/bin/bash
set -e

echo "Starting PS_ENVIRONMENT=$PS_ENVIRONMENT"

# In GitHub Actions, GITHUB_HEAD_REF is only set for pull request events
if [ -n "$GITHUB_HEAD_REF" ]; then
  # We're in a PR workflow, use the branch name as the environment
  export PS_ENVIRONMENT="$GITHUB_HEAD_REF"
fi

echo "Final PS_ENVIRONMENT=$PS_ENVIRONMENT"

# Deploy if either:
# 1. The PS_ENVIRONMENT is a feature branch environment (starts with "dev/")
# 2. The PS_ENVIRONMENT is a copilot environment (starts with "copilot/")
# 3. The PS_ENVIRONMENT is listed in the DEPLOY_ENVIRONMENTS secret
if [[ "$PS_ENVIRONMENT" == dev/* ]]; then
  echo "Deploying in feature branch environment: $PS_ENVIRONMENT"
elif [[ "$PS_ENVIRONMENT" == copilot/* ]]; then
  echo "Deploying in copilot environment: $PS_ENVIRONMENT"
elif [[ -n "$DEPLOY_ENVIRONMENTS" ]]; then
  # Check if PS_ENVIRONMENT is in the comma-separated DEPLOY_ENVIRONMENTS list
  if [[ "$DEPLOY_ENVIRONMENTS" == *"$PS_ENVIRONMENT"* ]]; then
    echo "Deploying in allowed environment: $PS_ENVIRONMENT (listed in DEPLOY_ENVIRONMENTS)"
  else
    echo "Skipping deployment for environment not in DEPLOY_ENVIRONMENTS: $PS_ENVIRONMENT"
    exit 0
  fi
else
  echo "Skipping deployment for non-FB environment: $PS_ENVIRONMENT (DEPLOY_ENVIRONMENTS not set)"
  exit 0
fi

npm run deploy:cd

# Invalidate CloudFront cache
npm run cf-invalidate

if [ "$PS_ENVIRONMENT" == "dev" ]; then
echo Deploy the feature flags
node node_modules/@ps-refarch/feature-flag/dist/manage-main.js --apikey $LD_API_KEY
fi
