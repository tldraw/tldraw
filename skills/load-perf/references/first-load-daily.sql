/* Daily trend for board opens: use it to check an era shift isn't one bad day or a mix change.
   Same filters as compare-sql.mjs: signed in, loads over 5 min dropped (sleeping laptops).
   token_to_sync: d_sync_connected is the gap to the previous step, not the token. */
SELECT
  toDate(timestamp) AS d,
  count() AS n,
  round(avg(properties.srv_cold = true), 2) AS cold,
  round(quantile(0.5)(toFloat(properties.t_zero_preloaded))) AS zpre,
  round(quantile(0.9)(toFloat(properties.t_zero_preloaded))) AS zpre90,
  round(quantile(0.5)(toFloat(properties.t_sync_connected))) AS sync,
  round(quantile(0.5)(toFloat(properties.t_sync_connected) - toFloat(properties.t_sync_token_fetched))) AS token_to_sync,
  round(quantile(0.5)(toFloat(properties.t_board_visible))) AS vis50,
  round(quantile(0.9)(toFloat(properties.t_board_visible))) AS vis90
FROM events
WHERE event = 'first_load'
  AND timestamp >= now() - INTERVAL 14 DAY
  AND properties.route_kind = 'file'
  AND properties.is_signed_in = true
  AND toFloat(properties.t_board_visible) < 300000
GROUP BY d
ORDER BY d
