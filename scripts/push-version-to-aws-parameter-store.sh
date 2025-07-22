#!/bin/bash
set -e

# if GIT_REPO_ACCESS_TOKEN has not been set up yet do not push version to AWS 
if [ "x$GIT_REPO_ACCESS_TOKEN" == "x" ]; then
  echo "GIT_REPO_ACCESS_TOKEN veriable not configured, GIT_REPO_ACCESS_TOKEN needs to be configured to push the version number to the AWS Parameter Store. More info can be found here https://powerschoolgroup.atlassian.net/wiki/x/sQDkLA8"
else
  export AWS_PARAMETER_NAME="/$CI_PROJECT_NAME/$PS_ENVIRONMENT/LatestDeployedVersion"      
  export AWS_PARAMETER_VALUE="$VERSION_NUMBER"
  aws ssm put-parameter --name "$AWS_PARAMETER_NAME" --value "$AWS_PARAMETER_VALUE" --type String --overwrite
fi
