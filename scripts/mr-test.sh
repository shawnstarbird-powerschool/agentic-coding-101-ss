#!/bin/bash

set -e

npm run test

# We should have access to AWS account info here. But if we don't, don't do the diff.
if [ -z $AWS_ACCESS_KEY_ID ] || [ -z $AWS_DEFAULT_REGION ] || [ -z $AWS_SECRET_ACCESS_KEY ] 
then
  echo "AWS Account info not configured, can't do cdk diff." | bash ./scripts/comment-mr.sh
else
  # Do a cdk diff to determine what changes will be made.
  npm run diff |& bash ./scripts/comment-mr.sh --cdkwrap
fi
