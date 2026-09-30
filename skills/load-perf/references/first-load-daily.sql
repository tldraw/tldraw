-- Daily trend for board opens. Use it to check an era shift is not a mix or day-of-week artifact.
SELECT
  toDate(timestamp) AS d,
  count() AS n,
  round(avg(properties.srv_cold = true), 2) AS cold,
  round(quantile(0.5)(toFloat(properties.t_zero_preloaded))) AS zpre,
  round(quantile(0.9)(toFloat(properties.t_zero_preloaded))) AS zpre90,
  round(quantile(0.5)(toFloat(properties.t_sync_connected))) AS sync,
  round(quantile(0.5)(toFloat(properties.t_sync_connected) - toFloat(properties.t_sync_token_fetched))) AS tok_to_sync, -- d_sync_connected is the gap to the previous step, not the token
  round(quantile(0.5)(toFloat(properties.t_board_visible))) AS vis50,
  round(quantile(0.9)(toFloat(properties.t_board_visible))) AS vis90
FROM events
WHERE event = 'first_load' AND timestamp >= now() - INTERVAL 14 DAY AND properties.route_kind = 'file'
GROUP BY d
ORDER BY d
