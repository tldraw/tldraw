// Tiny local webhook receiver for tldraw.com per-file webhooks.
// Verifies the `X-Tldraw-Signature: sha256=<hex>` header against your webhook
// secret (returned once at registration time) and prints each delivery.
//
// Usage:
//   WEBHOOK_SECRET=whsec_... npx tsx webhook-listener.ts
//   (Optional: PORT=9090)
import { createHmac, timingSafeEqual } from 'node:crypto'
import { createServer } from 'node:http'

const PORT = Number(process.env.PORT ?? 9090)
const SECRET = process.env.WEBHOOK_SECRET

if (!SECRET) {
	// eslint-disable-next-line no-console
	console.error(
		'Set WEBHOOK_SECRET to the `secret` value returned when you registered the webhook.'
	)
	process.exit(1)
}

function verifySignature(body: string, header: string | undefined): boolean {
	if (!header) return false
	const expected = createHmac('sha256', SECRET!).update(body).digest('hex')
	const received = header.replace(/^sha256=/, '')
	if (expected.length !== received.length) return false
	return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'))
}

createServer((req, res) => {
	let body = ''
	req.on('data', (chunk) => (body += chunk))
	req.on('end', () => {
		const valid = verifySignature(body, req.headers['x-tldraw-signature'] as string | undefined)
		// eslint-disable-next-line no-console
		console.log('\n--- incoming ---')
		// eslint-disable-next-line no-console
		console.log(req.method, req.url, 'signature:', valid ? 'OK' : 'INVALID')
		// eslint-disable-next-line no-console
		console.log(req.headers)
		try {
			// eslint-disable-next-line no-console
			console.log(JSON.stringify(JSON.parse(body), null, 2))
		} catch {
			// eslint-disable-next-line no-console
			console.log(body)
		}
		res.writeHead(200, { 'Content-Type': 'text/plain' })
		res.end('ok')
	})
}).listen(PORT, () => {
	// eslint-disable-next-line no-console
	console.log(`listening on http://localhost:${PORT}`)
})
