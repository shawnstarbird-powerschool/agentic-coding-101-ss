#!/bin/bash
# Usage:
#  some_other_command | comment-mr.sh
#
# You need environment variables $CI_PROJECT_ID, $CI_MERGE_REQUEST_IID, and $CI_PROJECT_TOKEN set up to send
# the comment to the Merge Request.
#
export TEMPFILE='./.tempfile.txt'

# Check for the ids and token defined. If they're not defined, it's not actually an error - we just can't
# save the output as a Merge Request comment.
if [ -z $CI_PROJECT_ID ] || [ -z $CI_MERGE_REQUEST_IID ] || [ -z $CI_PROJECT_TOKEN ] 
then
	echo '$CI_PROJECT_ID, $CI_MERGE_REQUEST_IID, and $CI_PROJECT_TOKEN not defined: skipping MR comment'
  cat
	exit 0
fi

cat >$TEMPFILE

if [ "$1" == "--cdkwrap" ]; then
  export PAYLOAD=`cat $TEMPFILE | sed -e 's/$/<br>/' | tr -d '\n' | sed -e 's/\(.*\)/<details><summary><code style="background-color: #eee">cdk diff<\/code> output<\/summary><p>The follow changes will be made to your dev environment when you accept this Merge Request.<\/p><pre>\1<\/pre><\/details>/'`
else
  export PAYLOAD=`cat $TEMPFILE | sed -e 's/$/<br>/' | tr -d '\n' | sed -e 's/\(.*\)/\1/'`
fi

curl https://gitlab.powerschool.com/api/v4/projects/$CI_PROJECT_ID/merge_requests/$CI_MERGE_REQUEST_IID/notes -H "PRIVATE-TOKEN: $CI_PROJECT_TOKEN" --data-urlencode "body=$PAYLOAD"

rm $TEMPFILE