#!/bin/bash
# Run a Cloudflare Analytics Engine SQL query through Grafana. Needs GRAFANA_TOKEN.
# usage: ae.sh "<sql>" [from=now-14d]
SQL="$1"; FROM="${2:-now-14d}"
jq -n --arg q "$SQL" --arg f "$FROM" '{queries:[{refId:"A",datasource:{uid:"bdgu7tk03irr4e"},rawQuery:true,query:$q,format:"table"}],from:$f,to:"now"}' \
| curl -s -X POST "${GRAFANA_SERVER:-https://tldraw.grafana.net}/api/ds/query" -H "Authorization: Bearer $GRAFANA_TOKEN" -H 'Content-Type: application/json' -d @- \
| jq -r '.results.A.frames as $f | if $f==null then . else ([$f[] | .schema.fields[] | .name] | join("\t")), ([$f[] | .data.values[]] | transpose[] | map(if type=="number" and . > 1e12 then (./1000|todate[5:16]) else tostring end) | join("\t")) end'
