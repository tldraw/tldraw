import { describe, expect, it } from 'vitest'
import {
	EDGE_COLO_HEADER,
	parseTraceColo,
	readEdgeColo,
	readReceivedAt,
	RECEIVED_AT_HEADER,
	stampRoomRequest,
} from './connectRouting'

function upgrade(headers: Record<string, string> = {}, cf?: { colo?: string }) {
	const req = new Request('https://sync.tldraw.xyz/app/file/abc?loadId=V1StGXR8_Z5jdHi6B-myT', {
		headers: { upgrade: 'websocket', ...headers },
	})
	if (cf) Object.defineProperty(req, 'cf', { value: cf })
	return req
}

describe('stampRoomRequest', () => {
	it('stamps a websocket upgrade with the receive time and edge colo', () => {
		const out = stampRoomRequest(upgrade({}, { colo: 'FRA' }), 1234)
		expect(out.headers.get(RECEIVED_AT_HEADER)).toBe('1234')
		expect(out.headers.get(EDGE_COLO_HEADER)).toBe('FRA')
	})

	it('overwrites values a client sent itself', () => {
		const out = stampRoomRequest(
			upgrade({ [RECEIVED_AT_HEADER]: '1', [EDGE_COLO_HEADER]: 'XXX' }, { colo: 'SJC' }),
			5000
		)
		expect(out.headers.get(RECEIVED_AT_HEADER)).toBe('5000')
		expect(out.headers.get(EDGE_COLO_HEADER)).toBe('SJC')
	})

	it('drops a client-sent colo when the runtime has none', () => {
		const out = stampRoomRequest(upgrade({ [EDGE_COLO_HEADER]: 'XXX' }), 5000)
		expect(out.headers.get(EDGE_COLO_HEADER)).toBeNull()
	})

	it('leaves non-websocket requests alone', () => {
		const req = new Request('https://sync.tldraw.xyz/app/file/abc/download')
		expect(stampRoomRequest(req, 1)).toBe(req)
	})
})

describe('readReceivedAt', () => {
	const now = 1_000_000
	const h = (v: string) => new Headers({ [RECEIVED_AT_HEADER]: v })
	it('accepts a time up to 60s in the past or 5s in the future', () => {
		expect(readReceivedAt(h(String(now - 60_000)), now)).toBe(now - 60_000)
		expect(readReceivedAt(h(String(now + 5_000)), now)).toBe(now + 5_000)
	})
	it('rejects missing, non-numeric, and out-of-window values', () => {
		expect(readReceivedAt(new Headers(), now)).toBeUndefined()
		expect(readReceivedAt(h('soon'), now)).toBeUndefined()
		expect(readReceivedAt(h('12.5e3'), now)).toBeUndefined()
		expect(readReceivedAt(h(String(now - 60_001)), now)).toBeUndefined()
		expect(readReceivedAt(h(String(now + 5_001)), now)).toBeUndefined()
	})
})

describe('readEdgeColo', () => {
	it('accepts a three-letter colo code only', () => {
		expect(readEdgeColo(new Headers({ [EDGE_COLO_HEADER]: 'FRA' }))).toBe('FRA')
		expect(readEdgeColo(new Headers({ [EDGE_COLO_HEADER]: 'fra' }))).toBeUndefined()
		expect(readEdgeColo(new Headers({ [EDGE_COLO_HEADER]: '<b>' }))).toBeUndefined()
		expect(readEdgeColo(new Headers())).toBeUndefined()
	})
})

describe('parseTraceColo', () => {
	it('reads the colo line from a cdn-cgi/trace body', () => {
		expect(parseTraceColo('fl=1\nh=www.cloudflare.com\ncolo=AMS\nhttp=http/1.1\n')).toBe('AMS')
		expect(parseTraceColo('fl=1\n')).toBeUndefined()
	})
})
