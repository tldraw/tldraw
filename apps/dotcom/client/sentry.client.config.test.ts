const sentryStart = vi.hoisted(() => ({ hash: undefined as string | undefined }))

vi.mock('@sentry/react', () => ({
	init: vi.fn(() => {
		sentryStart.hash = window.location.hash
	}),
	captureException: vi.fn(),
}))
vi.mock('@sentry/integrations', () => ({ ExtraErrorData: class {} }))
vi.mock('./src/utils/env', () => ({ env: 'development' }))

afterEach(() => {
	window.history.replaceState(null, '', '/')
})

test("clears tldraw.dev's PostHog hash, which can carry an email, before Sentry starts", async () => {
	window.history.replaceState(null, '', `/#session_id=s1&distinct_id=a%40b.com&ts=${Date.now()}`)

	await import('./sentry.client.config')
	const { posthogHashBootstrap } = await import('./src/utils/posthogHashBootstrap')

	expect(sentryStart.hash).toBe('')
	expect(posthogHashBootstrap).toEqual({ sessionID: 's1', distinctID: 'a@b.com' })
})
