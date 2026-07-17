/// <reference types="@cloudflare/workers-types" />

import { DurableObject } from 'cloudflare:workers'

/**
 * Widget↔server exec-result rendezvous.
 *
 * MCP hosts do not give us a stable session: Claude routes widget-initiated
 * calls over a different MCP session than model-initiated ones, so a widget's
 * `_exec_callback` can land on a different McpAgent DO than the one holding
 * the pending exec promise. The handoff rendezvouses here instead, addressed
 * by `idFromName('exec:<execKey>')` where execKey is a hash of the exec code —
 * the one value both the server (tool args) and the widget (the code it runs)
 * can derive independently.
 *
 * `putExecResult` resolves an in-memory waiter when one is registered and
 * stashes to storage otherwise, so the handoff also survives the callback
 * arriving before exec starts waiting.
 */

const EXEC_RESULT_TTL_MS = 10 * 60 * 1000

interface ExecWaiter {
	resolve(payload: string | null): void
	timer: ReturnType<typeof setTimeout>
}

export class CanvasStore extends DurableObject<unknown> {
	private waiters = new Map<string, ExecWaiter>()

	constructor(ctx: DurableObjectState, env: unknown) {
		super(ctx, env)
		this.ctx.storage.sql.exec(
			`CREATE TABLE IF NOT EXISTS exec_results (key TEXT PRIMARY KEY, payload TEXT, created_at INTEGER)`
		)
	}

	/** Deliver a result to a waiting exec call, or stash it if none is waiting yet. */
	putExecResult(key: string, payloadJson: string): { delivered: boolean } {
		const waiter = this.waiters.get(key)
		if (waiter) {
			clearTimeout(waiter.timer)
			this.waiters.delete(key)
			waiter.resolve(payloadJson)
			return { delivered: true }
		}
		this.ctx.storage.sql.exec(
			`INSERT INTO exec_results (key, payload, created_at) VALUES (?, ?, ?)
			 ON CONFLICT (key) DO UPDATE SET payload = excluded.payload, created_at = excluded.created_at`,
			key,
			payloadJson,
			Date.now()
		)
		void this.ctx.storage.setAlarm(Date.now() + EXEC_RESULT_TTL_MS)
		return { delivered: false }
	}

	/**
	 * Wait for a result: consume a stashed one immediately, else block up to timeoutMs.
	 *
	 * `notBefore` is the caller's start time. A stashed result produced before the
	 * caller started belongs to an earlier invocation that shared this execKey (a
	 * retry, or a late callback from a run that already timed out), so it is
	 * discarded rather than returned — otherwise this caller would report another
	 * run's success, failure, or return value as its own.
	 */
	async waitExecResult(key: string, timeoutMs: number, notBefore = 0): Promise<string | null> {
		const rows = this.ctx.storage.sql
			.exec(`SELECT payload, created_at FROM exec_results WHERE key = ?`, key)
			.toArray()
		if (rows.length > 0) {
			// Consume the stash either way (single-use); only return it if it's fresh.
			this.ctx.storage.sql.exec(`DELETE FROM exec_results WHERE key = ?`, key)
			if ((rows[0].created_at as number) >= notBefore) {
				return rows[0].payload as string
			}
		}

		// A superseded waiter (e.g. a retried exec) resolves empty so only the
		// newest caller receives the result.
		const existing = this.waiters.get(key)
		if (existing) {
			clearTimeout(existing.timer)
			this.waiters.delete(key)
			existing.resolve(null)
		}

		return new Promise<string | null>((resolve) => {
			const timer = setTimeout(() => {
				this.waiters.delete(key)
				resolve(null)
			}, timeoutMs)
			this.waiters.set(key, { resolve, timer })
		})
	}

	async alarm(): Promise<void> {
		this.ctx.storage.sql.exec(
			`DELETE FROM exec_results WHERE created_at < ?`,
			Date.now() - EXEC_RESULT_TTL_MS
		)
	}
}
