/// <reference lib="webworker" />

// JSON.parse off the main thread for snapshot fetches.
// Messages: { id: number, text: string } → { id: number, ok: boolean, data?: unknown, error?: string }

declare const self: DedicatedWorkerGlobalScope

self.onmessage = (e: MessageEvent<{ id: number; text: string }>) => {
	const { id, text } = e.data
	try {
		const data = JSON.parse(text)
		self.postMessage({ id, ok: true, data })
	} catch (err) {
		self.postMessage({ id, ok: false, error: String(err) })
	}
}

export {}
