import { readFileSync } from 'fs'
import { createRequire } from 'module'
import { describe, expect, it } from 'vitest'

// pruneIfIdle/expireIfIdle in worker.ts lean on these agents-SDK internals.
// A bump that moves any of them must re-audit that code before shipping;
// this file turns that into a failing test instead of a silent prod regression.
const require = createRequire(import.meta.url)
const agentsDist = readFileSync(require.resolve('agents'), 'utf8')

function between(src: string, startMarker: string, endMarker: string): string {
	const start = src.indexOf(startMarker)
	if (start === -1) throw new Error(`marker not found: ${startMarker}`)
	const end = src.indexOf(endMarker, start)
	if (end === -1) throw new Error(`end marker not found after ${startMarker}: ${endMarker}`)
	return src.slice(start, end)
}

describe('agents SDK assumptions behind session pruning and expiry', () => {
	it('schedule() gates its callback+payload dedup query behind the idempotent option', () => {
		// schedule() itself delegates to _insertScheduleForOwner, which is where the
		// idempotent check and its dedup query actually live.
		const body = between(
			agentsDist,
			'async _insertScheduleForOwner(ownerPath, when, callback, payload, options) {',
			'async _cf_scheduleForFacet('
		)
		const idempotentAt = body.indexOf('options?.idempotent')
		const dedupAt = body.indexOf('payload IS ${')
		expect(idempotentAt).toBeGreaterThan(-1)
		expect(dedupAt).toBeGreaterThan(idempotentAt)
	})

	it('the alarm body runs a schedule callback BEFORE deleting its row (so expireIfIdle must not dedup its re-arm)', () => {
		const alarmBody = between(
			agentsDist,
			'async _cf_runAlarmBody(',
			'await this._scheduleNextAlarm();'
		)
		const callbackAt = alarmBody.indexOf('await this._executeScheduleCallback(row)')
		const deleteAt = alarmBody.indexOf('DELETE FROM cf_agents_schedules WHERE id = ${row.id}')
		expect(callbackAt).toBeGreaterThan(-1)
		expect(deleteAt).toBeGreaterThan(callbackAt)
	})

	it('_scheduleNextAlarmBody short-circuits to setAlarm(now) when the destroy marker is set (so the condemn setAlarm cannot be clobbered)', () => {
		const body = between(agentsDist, 'async _scheduleNextAlarmBody() {', 'const nowMs = Date.now()')
		expect(body).toContain('_hasPendingDestroy()')
		expect(body).toContain('setAlarm(Date.now())')
	})

	it('_destroyed short-circuits the alarm body before the post-callback row delete', () => {
		const alarmBody = between(
			agentsDist,
			'async _cf_runAlarmBody(',
			'await this._scheduleNextAlarm();'
		)
		const callbackAt = alarmBody.indexOf('await this._executeScheduleCallback(row)')
		const guardAt = alarmBody.indexOf('if (this._destroyed) return;', callbackAt)
		const deleteAt = alarmBody.indexOf('DELETE FROM cf_agents_schedules WHERE id = ${row.id}')
		expect(guardAt).toBeGreaterThan(callbackAt)
		expect(guardAt).toBeLessThan(deleteAt)
	})

	it('the destroy marker key is cf_agents_destroy_pending and Agent.alarm() checks it before anything else, without calling super.alarm()', () => {
		expect(agentsDist).toContain('DESTROY_PENDING_KEY = "cf_agents_destroy_pending"')
		const alarm = between(agentsDist, '\tasync alarm() {', '\tasync _cf_runAlarmBody(')
		// First statement is the marker check; partyserver's alarm() (which runs
		// onStart/init) must never be reached on the condemned path.
		expect(
			alarm.trimStart().startsWith('async alarm() {\n\t\tif (await this._hasPendingDestroy())')
		).toBe(true)
		expect(alarm).not.toContain('super.alarm(')
	})
})
