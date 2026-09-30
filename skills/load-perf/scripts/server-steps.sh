#!/bin/bash
# Daily p50/p90 of sync-worker connect-path steps from Analytics Engine, in one query.
# usage: server-steps.sh [production|staging] [since=YYYY-MM-DD, default 10 days ago] [event ...]
ENV="${1:-production}"; SINCE="${2:-$(date -u -v-10d +%F 2>/dev/null || date -u -d '10 days ago' +%F)}"
shift $(( $# < 2 ? $# : 2 ))
EVENTS=("$@")
[ ${#EVENTS[@]} -eq 0 ] && EVENTS=(on_request_total on_request_auth get_file_record on_request_group_check on_request_rate_limit on_request_get_room db_load_comments db_load_total postgres_client_connect_done)
IN=$(printf "'%s'," "${EVENTS[@]}"); IN=${IN%,}
set -o pipefail
# Grafana turns the string column into one series per event and metric ("<event>, p50"), each
# with its own day column, so rebuild rows from the series rather than transposing columns.
AE_RAW=1 "$(dirname "$0")/ae.sh" "SELECT blob1 AS event, toStartOfInterval(timestamp, INTERVAL '1' DAY) AS d, sum(_sample_interval) AS n, round(quantileWeighted(0.5, double1, _sample_interval)) AS p50, round(quantileWeighted(0.9, double1, _sample_interval)) AS p90 FROM MEASURE WHERE timestamp > toDateTime('$SINCE 00:00:00') AND blob2 = '$ENV-tldraw-multiplayer' AND blob1 IN ($IN) GROUP BY event, d ORDER BY event, d" now-90d \
| jq -r '
  [ .[] | (.schema.fields[1].name | capture("^(?<event>.+), (?<metric>[a-z0-9]+)$")) as $k
    | [.data.values[0], .data.values[1]] | transpose[]
    | {event: $k.event, metric: $k.metric, d: (.[0] / 1000 | todate[5:10]), v: .[1]} ]
  | group_by(.event)[] | .[0].event as $e
  | "== \($e)", "d\tn\tp50\tp90",
    (group_by(.d)[] | (map({(.metric): .v}) | add) as $m | "\(.[0].d)\t\($m.n)\t\($m.p50)\t\($m.p90)")'
