import { describe, expect, it } from 'vitest'
import type { FeatureFlags } from '../utils/FeatureFlagPoller'
import { shouldEnableCommenting } from './TldrawApp'

const FLAGS_OFF: FeatureFlags = {
	rum_enabled: { enabled: false },
	commenting_enabled: { enabled: false },
	mcp_server_access: { enabled: false },
}

const FLAGS_COMMENTING_ON: FeatureFlags = {
	...FLAGS_OFF,
	commenting_enabled: { enabled: true },
}

describe('shouldEnableCommenting', () => {
	it('is off with default flags and no email', () => {
		expect(shouldEnableCommenting(FLAGS_OFF)).toEqual({
			value: false,
			reason: 'server feature flag',
		})
	})

	it('is off for a non-tldraw email when the flag is off', () => {
		expect(shouldEnableCommenting(FLAGS_OFF, 'alice@example.com')).toEqual({
			value: false,
			reason: 'server feature flag',
		})
	})

	it('is on for a @tldraw.com email even when the flag is off', () => {
		expect(shouldEnableCommenting(FLAGS_OFF, 'dev@tldraw.com')).toEqual({
			value: true,
			reason: '@tldraw.com email',
		})
	})

	it('is on for anyone when the flag is on', () => {
		expect(shouldEnableCommenting(FLAGS_COMMENTING_ON, 'alice@example.com')).toEqual({
			value: true,
			reason: 'server feature flag',
		})
	})

	it('does not match a lookalike domain', () => {
		expect(shouldEnableCommenting(FLAGS_OFF, 'alice@nottldraw.com').value).toBe(false)
		expect(shouldEnableCommenting(FLAGS_OFF, 'alice@tldraw.com.example.com').value).toBe(false)
	})

	it('handles a null email', () => {
		expect(shouldEnableCommenting(FLAGS_OFF, null).value).toBe(false)
		expect(shouldEnableCommenting(FLAGS_COMMENTING_ON, null).value).toBe(true)
	})
})
