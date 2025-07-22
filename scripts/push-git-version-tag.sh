#!/bin/bash
set -e

# Check if the Tag already exists (incase the pipeline is being rerun)
if git rev-parse --verify --quiet "$VERSION_NUMBER"; then
  echo "Tag $VERSION_NUMBER already exists. Skipping the tag creation."
else
  echo "Creating Git tag with version number"
  git config --global user.name "$GITLAB_USER_NAME"
  git config --global user.email "$GITLAB_USER_EMAIL"

  echo Applying Git Tag "$VERSION_NUMBER"
  git tag "$VERSION_NUMBER"

  echo Pushing Git Tag "$VERSION_NUMBER"
  git push origin "$VERSION_NUMBER"

fi
