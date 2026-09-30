-- PostHog HogQL for the MCP `execute-sql` tool. Switch project first (see SKILL.md).
-- Set the multiIf cut points from scripts/deploys.sh; keep era names short and descriptive.
SELECT
  multiIf(
    timestamp < toDateTime('2026-09-23 13:10:00'), 'A_base',
    timestamp < toDateTime('2026-09-24 04:58:00'), 'B_clerk',
    timestamp < toDateTime('2026-09-24 13:03:00'), 'C_sdksplit+cmt1',
    'D_feeds') AS era,
  properties.route_kind AS rk,
  properties.is_signed_in AS si,
  count() AS n,
  uniq(person_id) AS u,
  round(avg(properties.srv_cold = true), 2) AS cold,
  round(quantile(0.5)(toFloat(properties.t_js_started))) AS js,
  round(quantile(0.5)(toFloat(properties.fcp))) AS fcp,
  round(quantile(0.5)(toFloat(properties.t_zero_preloaded))) AS zpre,
  round(quantile(0.9)(toFloat(properties.t_zero_preloaded))) AS zpre90,
  round(quantile(0.5)(toFloat(properties.t_sync_connected))) AS sync,
  round(quantile(0.5)(toFloat(properties.d_sync_connected))) AS dsync, -- token fetched -> socket connected
  round(quantile(0.5)(toFloat(properties.t_board_visible))) AS vis50,
  round(quantile(0.9)(toFloat(properties.t_board_visible))) AS vis90
FROM events
WHERE event = 'first_load' AND timestamp >= toDateTime('2026-09-23 00:00:00')
GROUP BY era, rk, si
HAVING n >= 10
ORDER BY rk, si, era
