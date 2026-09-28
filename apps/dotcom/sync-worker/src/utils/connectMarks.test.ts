import { describe, expect, it } from 'vitest'
import { ConnectMarks, buildConnectEcho, connectStart, markRoute } from './connectMarks'

describe('ConnectMarks', () => {
	it('records each step as a delta from the previous mark and a time since start', () => {
		const marks = new ConnectMarks(1000, () => 2000)
		marks.mark('auth', 1020)
		marks.mark('file_record', 1170)
		expect(marks.fields()).toEqual({
			d_auth: 20,
			t_auth: 20,
			d_file_record: 150,
			t_file_record: 170,
		})
	})

	it('deltas sum to the last step time', () => {
		const marks = new ConnectMarks(0, () => 1000)
		marks.mark('auth', 10)
		marks.mark('file_record', 250)
		marks.mark('handshake', 400)
		const f = marks.fields()
		expect(f.d_auth! + f.d_file_record! + f.d_handshake!).toBe(f.t_handshake)
	})

	it('leaves out steps that never ran', () => {
		const marks = new ConnectMarks(0, () => 1000)
		marks.mark('auth', 5)
		expect(marks.fields()).not.toHaveProperty('d_group_check')
	})

	it('clamps a mark earlier than the previous one to a zero delta', () => {
		const marks = new ConnectMarks(1000, () => 2000)
		marks.mark('route', 1100)
		marks.mark('do_init', 1050)
		expect(marks.fields()).toMatchObject({ d_do_init: 0, t_do_init: 100 })
	})

	it('clamps a mark before start to zero', () => {
		const marks = new ConnectMarks(1000, () => 2000)
		marks.mark('route', 900)
		expect(marks.fields()).toMatchObject({ d_route: 0, t_route: 0 })
	})

	it('markAfter carves a known duration after the previous mark, never past now', () => {
		let now = 1500
		const marks = new ConnectMarks(1000, () => now)
		marks.mark('rate_limit', 1100)
		marks.markAfter('boot', 300)
		expect(marks.fields()).toMatchObject({ d_boot: 300, t_boot: 400 })
		now = 1450
		marks.markAfter('get_room', 999)
		expect(marks.fields()).toMatchObject({ d_get_room: 50, t_get_room: 450 })
	})

	it('defaults a mark to now', () => {
		const marks = new ConnectMarks(1000, () => 1234)
		marks.mark('auth')
		expect(marks.fields()).toMatchObject({ d_auth: 234 })
	})
})

describe('connectStart', () => {
	it('starts at receivedAt when it precedes requestStart', () => {
		expect(connectStart(1000, 1200)).toBe(1000)
	})

	it('starts at requestStart when the worker clock runs ahead, so room time is not clamped away', () => {
		const requestStart = 1000
		const marks = new ConnectMarks(connectStart(requestStart + 300, requestStart), () => 2000)
		marks.mark('auth', requestStart + 120)
		expect(marks.fields()).toMatchObject({ d_auth: 120, t_auth: 120 })
	})

	it('starts at requestStart without a receivedAt', () => {
		expect(connectStart(undefined, 1000)).toBe(1000)
	})
})

describe('buildConnectEcho', () => {
	it('flattens base fields, step marks and the connect size into one echo', () => {
		const marks = new ConnectMarks(0, () => 500)
		marks.mark('auth', 20)
		marks.mark('handshake', 180)
		expect(
			buildConnectEcho(
				{ loadId: 'V1StGXR8_Z5jdHi6B-myT', cold: false, pg_via: 'hyperdrive' },
				marks,
				4096
			)
		).toEqual({
			type: 'first_load_server',
			loadId: 'V1StGXR8_Z5jdHi6B-myT',
			cold: false,
			pg_via: 'hyperdrive',
			connect_bytes: 4096,
			d_auth: 20,
			t_auth: 20,
			d_handshake: 160,
			t_handshake: 180,
		})
	})

	it('omits undefined optional fields', () => {
		const echo = buildConnectEcho(
			{ loadId: 'V1StGXR8_Z5jdHi6B-myT', cold: true, do_colo: undefined },
			new ConnectMarks(0),
			1
		)
		expect(echo).not.toHaveProperty('do_colo')
	})
})

describe('markRoute', () => {
	it('marks nothing when the request carries no receivedAt', () => {
		const marks = new ConnectMarks(1000, () => 2000)
		markRoute(marks, undefined, 1000, 1000)
		expect(marks.fields()).toEqual({})
	})

	it('marks route to the constructor time and do_init to request start when the constructor ran after receipt', () => {
		const marks = new ConnectMarks(1000, () => 2000)
		markRoute(marks, 1000, 1300, 1500)
		expect(marks.fields()).toMatchObject({
			t_route: 300,
			t_do_init: 500,
		})
	})

	it('marks only route to request start when the constructor ran before receipt', () => {
		const marks = new ConnectMarks(1000, () => 2000)
		markRoute(marks, 1000, 900, 1500)
		expect(marks.fields()).toMatchObject({ t_route: 500 })
		expect(marks.fields()).not.toHaveProperty('t_do_init')
	})
})
