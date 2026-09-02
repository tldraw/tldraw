#!/bin/bash
# Batch fetch PR details for changelog categorization
#
# Usage: ./fetch-pr-batch.sh <pr1> <pr2> ...
#    or: echo "1234 5678" | ./fetch-pr-batch.sh
# Output: JSON array of PR details

set -e

# Collect PR numbers from arguments or stdin
prs=()
if [ $# -gt 0 ]; then
  prs=("$@")
else
  while read -r line; do
    for pr in $line; do
      prs+=("$pr")
    done
  done
fi

if [ ${#prs[@]} -eq 0 ]; then
  echo "Usage: $0 <pr1> <pr2> ..." >&2
  echo "   or: echo '1234 5678' | $0" >&2
  exit 1
fi

# Build GraphQL query for batch fetching
# This is much faster than individual gh pr view calls
query='query($owner: String!, $repo: String!) {'
for i in "${!prs[@]}"; do
  pr="${prs[$i]}"
  query+="
  pr$i: repository(owner: \$owner, name: \$repo) {
    pullRequest(number: $pr) {
      number
      title
      author { login }
      mergedAt
      labels(first: 10) { nodes { name } }
      body
    }
  }"
done
query+='}'

# Execute query
result=$(gh api graphql -f query="$query" -f owner="tldraw" -f repo="tldraw" 2>/dev/null)

# Transform into cleaner JSON array
echo "$result" | jq '[.data | to_entries[] | .value.pullRequest | select(. != null) | {
  number: .number,
  title: .title,
  author: .author.login,
  merged_at: .mergedAt,
  labels: [.labels.nodes[].name],
  body: .body
}] | sort_by(.number) | reverse'
