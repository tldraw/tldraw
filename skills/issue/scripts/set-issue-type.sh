#!/usr/bin/env bash
# Set a GitHub issue's type (Bug, Feature, Example, Task, ...) via GraphQL.
# The `gh issue create --type` flag is not reliable across versions, so we
# resolve the issue and type node IDs and run the updateIssueIssueType mutation.
#
# Usage: set-issue-type.sh <issue-number> <type-name> [owner/repo]
#   set-issue-type.sh 1234 Bug
#   set-issue-type.sh 1234 Feature tldraw/tldraw
set -euo pipefail

issue_number="${1:?usage: set-issue-type.sh <issue-number> <type-name> [owner/repo]}"
type_name="${2:?usage: set-issue-type.sh <issue-number> <type-name> [owner/repo]}"
repo="${3:-tldraw/tldraw}"
owner="${repo%/*}"
name="${repo#*/}"

issue_id=$(gh issue view "$issue_number" --repo "$repo" --json id --jq '.id')

type_id=$(gh api graphql \
  -f owner="$owner" -f name="$name" \
  -f query='query($owner:String!,$name:String!){repository(owner:$owner,name:$name){issueTypes(first:20){nodes{id name}}}}' \
  --jq ".data.repository.issueTypes.nodes[] | select(.name == \"$type_name\") | .id")

if [ -z "$type_id" ]; then
  echo "error: no issue type named '$type_name' in $repo" >&2
  echo "available types:" >&2
  gh api graphql -f owner="$owner" -f name="$name" \
    -f query='query($owner:String!,$name:String!){repository(owner:$owner,name:$name){issueTypes(first:20){nodes{name}}}}' \
    --jq '.data.repository.issueTypes.nodes[].name' >&2
  exit 1
fi

gh api graphql \
  -f issueId="$issue_id" -f issueTypeId="$type_id" \
  -f query='mutation($issueId:ID!,$issueTypeId:ID!){updateIssueIssueType(input:{issueId:$issueId,issueTypeId:$issueTypeId}){issue{number issueType{name}}}}' \
  --jq '"set #\(.data.updateIssueIssueType.issue.number) type to \(.data.updateIssueIssueType.issue.issueType.name)"'
