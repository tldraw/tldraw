import { describe, expect, it, vi } from 'vitest'

vi.mock('cloudflare:workers', () => ({
	WorkerEntrypoint: class {},
	DurableObject: class {},
}))

// staging/prod durable object migration history references these classes, so the exports
// must stay even though nothing binds them (see the stubs in worker.ts). Losing one breaks
// those deploys; this turns that deploy-breaker into a test failure.
describe('legacy durable object stub exports', () => {
	it('worker.ts keeps exporting the classes named in applied migrations', async () => {
		const worker = await import('./worker')
		expect(worker.TLDrawDurableObject).toBeTypeOf('function')
		expect(worker.TLPostgresReplicator).toBeTypeOf('function')
		expect(worker.TLUserDurableObject).toBeTypeOf('function')
		expect(worker.TLStatsDurableObject).toBeTypeOf('function')
	})
})
