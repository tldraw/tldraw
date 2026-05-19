// Shared worker-based JSON parser. Single worker handles all `/grid` tile
// parses, off the main thread, so concurrent fetches don't fight for the parse
// step (which was the dominant per-tile cost after the bounds filter).

let workerInstance: Worker | null = null
let nextId = 0
const pending = new Map<number, { resolve(value: unknown): void; reject(error: Error): void }>()

function getWorker(): Worker {
	if (workerInstance) return workerInstance
	workerInstance = new Worker(new URL('./grid-parse-worker.ts', import.meta.url), {
		type: 'module',
	})
	workerInstance.onmessage = (
		e: MessageEvent<{ id: number; ok: boolean; data?: unknown; error?: string }>
	) => {
		const handler = pending.get(e.data.id)
		if (!handler) return
		pending.delete(e.data.id)
		if (e.data.ok) handler.resolve(e.data.data)
		else handler.reject(new Error(e.data.error ?? 'parse failed'))
	}
	workerInstance.onerror = (e) => {
		// Fail every pending request if the worker itself errors.
		for (const { reject } of pending.values()) {
			reject(new Error(e.message))
		}
		pending.clear()
	}
	return workerInstance
}

export function parseJsonInWorker<T = unknown>(text: string): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const id = nextId++
		pending.set(id, { resolve: resolve as (v: unknown) => void, reject })
		getWorker().postMessage({ id, text })
	})
}
