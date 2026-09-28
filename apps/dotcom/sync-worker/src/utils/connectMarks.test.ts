import { describe, expect, it } from 'vitest'
import { ConnectMarks, buildConnectEcho } from './connectMarks'

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
		marks.mark('a', 10)
		marks.mark('b', 250)
		marks.mark('c', 400)
		const f = marks.fields()
		expect(f.d_a + f.d_b + f.d_c).toBe(f.t_c)
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
		expect(marks.last()).toBe(1234)
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
