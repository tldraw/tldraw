-- PostHog HogQL for the MCP `execute-sql` tool. Switch project first (see SKILL.md).
-- Set the multiIf cut points from scripts/deploys.sh; era names must sort chronologically (A_, B_, ...).
-- *_vs_first / *_vs_prev are % change against the first and the previous era; negative = faster.
WITH per_era AS (
  SELECT
    era, rk,
    tupleElement(mv, 1) AS metric,
    count() AS n,
    round(avg(cold), 2) AS cold,
    quantile(0.5)(tupleElement(mv, 2)) AS p50,
    quantile(0.9)(tupleElement(mv, 2)) AS p90
  FROM (
    SELECT
      multiIf(
        timestamp < toDateTime('2026-09-23 13:10:00'), 'A_base',
        timestamp < toDateTime('2026-09-24 04:58:00'), 'B_clerk',
        timestamp < toDateTime('2026-09-24 13:03:00'), 'C_sdksplit+cmt1',
        'D_feeds') AS era,
      properties.route_kind AS rk,
      properties.srv_cold = true AS cold,
      arrayJoin([
        ('1_board_visible', toFloat(properties.t_board_visible)),
        ('2_zero_preloaded', toFloat(properties.t_zero_preloaded)),
        ('3_sync_connected', toFloat(properties.t_sync_connected)),
        -- d_sync_connected is the gap to the previous step, not the token
        ('4_token_to_sync', toFloat(properties.t_sync_connected) - toFloat(properties.t_sync_token_fetched))
      ]) AS mv
    FROM events
    WHERE event = 'first_load'
      AND timestamp >= toDateTime('2026-09-20 00:00:00')
      AND properties.is_signed_in = true
  )
  GROUP BY era, rk, metric
  HAVING n >= 10
)
SELECT
  rk, metric, era, n, cold,
  round(p50) AS p50,
  round(100 * (p50 / first_value(p50) OVER w - 1)) AS p50_vs_first,
  round(100 * (p50 / lagInFrame(p50, 1, p50) OVER w - 1)) AS p50_vs_prev,
  round(p90) AS p90,
  round(100 * (p90 / first_value(p90) OVER w - 1)) AS p90_vs_first,
  round(100 * (p90 / lagInFrame(p90, 1, p90) OVER w - 1)) AS p90_vs_prev
FROM per_era
WINDOW w AS (PARTITION BY rk, metric ORDER BY era ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
ORDER BY rk, metric, era
