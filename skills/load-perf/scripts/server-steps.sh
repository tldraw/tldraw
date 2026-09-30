#!/bin/bash
# Daily p50/p90 of sync-worker connect-path steps from Analytics Engine.
# usage: server-steps.sh [production|staging] [since=YYYY-MM-DD, default 10 days ago] [event ...]
ENV="${1:-production}"; SINCE="${2:-$(date -u -v-10d +%F 2>/dev/null || date -u -d '10 days ago' +%F)}"
shift 2 2>/dev/null
EVENTS=("$@")
[ ${#EVENTS[@]} -eq 0 ] && EVENTS=(on_request_total on_request_group_check get_file_record on_request_auth db_load_comments db_load_total postgres_client_connect_done)
DIR="$(cd "$(dirname "$0")" && pwd)"
for ev in "${EVENTS[@]}"; do
  echo "== $ev"
  "$DIR/ae.sh" "SELECT toStartOfInterval(timestamp, INTERVAL '1' DAY) AS d, sum(_sample_interval) AS n, round(quantileWeighted(0.5, double1, _sample_interval)) AS p50, round(quantileWeighted(0.9, double1, _sample_interval)) AS p90 FROM MEASURE WHERE timestamp > toDateTime('$SINCE 00:00:00') AND blob2 = '$ENV-tldraw-multiplayer' AND blob1 = '$ev' GROUP BY d ORDER BY d" now-90d \
  | awk -F'\t' 'NR==1{for(i=1;i<=NF;i++) if(!($i in c)) c[$i]=i; print "d\tn\tp50\tp90"; next} {print $(c["d"]) "\t" $(c["n"]) "\t" $(c["p50"]) "\t" $(c["p90"])}'
done
