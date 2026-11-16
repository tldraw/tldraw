import { describe, expect, it } from 'vitest'
import { isLocalWorkerRequest, ownOrigin, parseRequest } from './vite-thumbnail-screenshot-plugin'

const worker = { socket: { remoteAddress: '127.0.0.1' }, headers: { host: 'localhost:3000' } }

const body = {
	url: 'https://anywhere.example/__thumbnail-render?token=t',
	waitForSelector: { selector: '[data-thumbnail-ready]' },
	selector: 'body',
	gotoOptions: { timeout: 1000 },
	viewport: { width: 100, height: 100 },
	addScriptTag: [{ content: 'window.x = 1' }],
}

describe('isLocalWorkerRequest', () => {
	it("accepts the worker's request over loopback, IPv4 or IPv6", () => {
		expect(isLocalWorkerRequest(worker)).toBe(true)
		expect(isLocalWorkerRequest({ ...worker, socket: { remoteAddress: '::1' } })).toBe(true)
		expect(isLocalWorkerRequest({ ...worker, socket: { remoteAddress: '::ffff:127.0.0.1' } })).toBe(
			true
		)
	})

	it('refuses a caller on another interface', () => {
		expect(isLocalWorkerRequest({ ...worker, socket: { remoteAddress: '192.168.1.20' } })).toBe(
			false
		)
		expect(isLocalWorkerRequest({ ...worker, socket: {} })).toBe(false)
	})

	it.each(['origin', 'sec-fetch-site', 'x-forwarded-for', 'forwarded', 'cf-connecting-ip'])(
		'refuses a loopback request carrying %s, as a browser or tunnel would send',
		(header) => {
			expect(
				isLocalWorkerRequest({ ...worker, headers: { ...worker.headers, [header]: 'x' } })
			).toBe(false)
		}
	)
})

describe('parseRequest', () => {
	it("opens the render page on the dev server's own origin, whatever host the body names", () => {
		const request = parseRequest(body, ownOrigin({ port: 3000 }), 'screenshot')
		expect(request.url).toBe('http://localhost:3000/__thumbnail-render?token=t')
		expect(request.injectedScripts).toEqual(['window.x = 1'])
	})

	it('refuses any page but the render page', () => {
		expect(() =>
			parseRequest(
				{ ...body, url: 'http://localhost:5432/' },
				'http://localhost:3000',
				'screenshot'
			)
		).toThrow('Only /__thumbnail-render can be captured')
	})

	it('needs a TCP address to derive the origin from', () => {
		expect(() => ownOrigin(null)).toThrow()
		expect(() => ownOrigin('/tmp/vite.sock')).toThrow()
	})
})
