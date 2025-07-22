#!/bin/bash
set -e

# Optional step
if [ "x$PUSH_I18N_SSH_PRIVATE_KEY" == "x" ]; then
  echo "Message sync not configured, set PUSH_I18N_SSH_PRIVATE_KEY variable"
  exit 254
fi

# Set up private key for access to gitlab i18n repo
mkdir -p ~/.ssh/
echo "$PUSH_I18N_SSH_PRIVATE_KEY" | base64 --decode | tr -d '\r' > ~/.ssh/id_i18n_push
chmod 600 ~/.ssh/id_i18n_push
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_i18n_push
echo "StrictHostKeyChecking no" >> ~/.ssh/config

# Clone existing repo
rm -rf /tmp/i18n-translate
git clone git@gitlab.com:powerschoolgroup/unified-applications/unifiedhome/i18n-translate.git /tmp/i18n-translate

# Copy in messages
cp -r resources/messages/* /tmp/i18n-translate/resources/messages
cd /tmp/i18n-translate

# Check for changes and commit if there are any
git add -A

export CHANGE_CNT=$(git diff --cached --ignore-space-at-eol --ignore-cr-at-eol | wc -l)
if [ "x$CHANGE_CNT" != "x0" ]; then
  echo "There are message changes, committing!"

  # Probably need to set this uniquely per project
  if [ "x$PUSH_I18N_USER_EMAIL" == "x" ]; then
    export PUSH_I18N_USER_EMAIL="reference.architecture@powerschool.com"
  fi
  if [ "x$PUSH_I18N_USER_NAME" == "x" ]; then
    export PUSH_I18N_USER_NAME="Reference Architecture"
  fi
  git config --global user.email $PUSH_I18N_USER_EMAIL
  git config --global user.name $PUSH_I18N_USER_NAME

  git commit -m "Update from https://github.com/${GITHUB_REPOSITORY} (${GITHUB_SHA})" && git push
else
  echo "No message changes detected."
fi