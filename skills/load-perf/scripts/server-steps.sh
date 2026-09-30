#!/bin/bash
# Daily p50/p90 of sync-worker connect-path steps from Analytics Engine.
# usage: server-steps.sh [production|staging] [since=YYYY-MM-DD, default 10 days ago] [event ...]
ENV="${1:-production}"; SINCE="${2:-$(date -u -v-10d +%F 2>/dev/null || date -u -d '10 days ago' +%F)}"
shift $(( $# < 2 ? $# : 2 ))
EVENTS=("$@")
[ ${#EVENTS[@]} -eq 0 ] && EVENTS=(on_request_total on_request_auth get_file_record on_request_group_check on_request_rate_limit on_request_get_room db_load_comments db_load_total postgres_client_connect_done)
DIR="$(dirname "$0")"
set -o pipefail

# $1 = SQL grouping by (event, d), $2 = label prefix. Grafana turns the string column into one
# series per event and metric ("<event>, p50"), each with its own day column, so rebuild rows from
# the series rather than transposing columns.
steps() {
  AE_RAW=1 "$DIR/ae.sh" "$1" now-90d | jq -r --arg prefix "$2" '
    [ .[] | (.schema.fields[1].name | capture("^(?<event>.*), (?<metric>[a-z0-9]+)$")) as $k
      | [.data.values[0], .data.values[1]] | transpose[]
      | {event: ($prefix + (if $k.event == "" then "(unlabelled)" else $k.event end)), metric: $k.metric, d: (.[0] / 1000 | todate[5:10]), v: .[1]} ]
    | group_by(.event)[] | .[0].event as $e
    | "== \($e)", "d\tn\tp50\tp90",
      (group_by(.d)[] | (map({(.metric): .v}) | add) as $m | "\(.[0].d)\t\($m.n)\t\($m.p50)\t\($m.p90)")'
}
STATS="sum(_sample_interval) AS n, round(quantileWeighted(0.5, double1, _sample_interval)) AS p50, round(quantileWeighted(0.9, double1, _sample_interval)) AS p90"
WHERE="timestamp > toDateTime('$SINCE 00:00:00') AND blob2 = '$ENV-tldraw-multiplayer'"

STEPS=(); PG=0
for e in "${EVENTS[@]}"; do [ "$e" = postgres_client_connect_done ] && PG=1 || STEPS+=("$e"); done
if [ ${#STEPS[@]} -gt 0 ]; then
  IN=$(printf "'%s'," "${STEPS[@]}"); IN=${IN%,}
  steps "SELECT blob1 AS event, toStartOfInterval(timestamp, INTERVAL '1' DAY) AS d, $STATS FROM MEASURE WHERE $WHERE AND blob1 IN ($IN) GROUP BY event, d ORDER BY event, d" "" || exit 1
fi
# Every pool in the worker dials Postgres, and failed dials report too: keep successful dials and
# split by route (blob5: hyperdrive or pooler).
if [ $PG = 1 ]; then
  steps "SELECT blob5 AS event, toStartOfInterval(timestamp, INTERVAL '1' DAY) AS d, $STATS FROM MEASURE WHERE $WHERE AND blob1 = 'postgres_client_connect_done' AND blob4 = 'ok' GROUP BY event, d ORDER BY event, d" "postgres_client_connect_done ok via " || exit 1
fi
