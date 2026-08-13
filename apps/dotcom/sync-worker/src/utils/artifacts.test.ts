import { describe, expect, it } from 'vitest'
import { Environment } from '../types'
import { getArtifactsRepoName, isSlugInArtifactsRollout } from './artifacts'
import { hashSlugToBucket, isSlugInPierreRollout } from './createPierreClient'

function envWith(overrides: Partial<Environment>): Environment {
	return overrides as Environment
}

describe('getArtifactsRepoName', () => {
	it('prefixes so names starting with - stay valid', () => {
		expect(getArtifactsRepoName('-j2sf_Fz9BRw7t1yWFkc_')).toBe('files--j2sf_Fz9BRw7t1yWFkc_')
	})

	it('sanitizes characters outside the allowed set', () => {
		expect(getArtifactsRepoName('a/b:c d')).toBe('files-a_b_c_d')
	})
})

describe('isSlugInArtifactsRollout', () => {
	it('is always on outside production', () => {
		const env = envWith({ TLDRAW_ENV: 'staging', ARTIFACTS_ROLLOUT_PERCENT: undefined })
		expect(isSlugInArtifactsRollout(env, 'anything')).toBe(true)
	})

	it('is off in production when the percent is unset or garbage', () => {
		for (const percent of [undefined, '', 'ten', 'NaN']) {
			const env = envWith({ TLDRAW_ENV: 'production', ARTIFACTS_ROLLOUT_PERCENT: percent })
			expect(isSlugInArtifactsRollout(env, 'some-slug')).toBe(false)
		}
	})

	it('matches the Pierre cohort exactly at 10 percent', () => {
		const env = envWith({ TLDRAW_ENV: 'production', ARTIFACTS_ROLLOUT_PERCENT: '10' })
		const pierreEnv = envWith({ TLDRAW_ENV: 'production' })
		for (let i = 0; i < 500; i++) {
			const slug = `slug-${i}-${i * 7919}`
			expect(isSlugInArtifactsRollout(env, slug)).toBe(isSlugInPierreRollout(pierreEnv, slug))
		}
	})

	it('includes everything at 100 percent', () => {
		const env = envWith({ TLDRAW_ENV: 'production', ARTIFACTS_ROLLOUT_PERCENT: '100' })
		for (let i = 0; i < 100; i++) {
			expect(isSlugInArtifactsRollout(env, `slug-${i}`)).toBe(true)
		}
	})

	it('respects the hash bucket boundary', () => {
		const env = envWith({ TLDRAW_ENV: 'production', ARTIFACTS_ROLLOUT_PERCENT: '50' })
		for (let i = 0; i < 200; i++) {
			const slug = `slug-${i}`
			expect(isSlugInArtifactsRollout(env, slug)).toBe(hashSlugToBucket(slug) < 50)
		}
	})
})
