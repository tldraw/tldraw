const CRON_INTERVAL_MS = 10_000

setInterval(async () => {
	try {
		await fetch('http://127.0.0.1:8787/__scheduled')
	} catch (err) {
		// eslint-disable-next-line no-console
		console.log('Error triggering cron:', err)
	}
}, CRON_INTERVAL_MS)
