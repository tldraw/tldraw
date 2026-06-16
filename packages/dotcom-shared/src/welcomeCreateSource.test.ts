import { describe, expect, it } from 'vitest'
import { parseWelcomeCreateSource, WELCOME_CREATE_SOURCE, welcomeCreateSource } from './constants'

describe('welcomeCreateSource', () => {
	it('builds the bare marker with no locale', () => {
		expect(welcomeCreateSource()).toBe(WELCOME_CREATE_SOURCE)
	})
	it('tags the locale when given one', () => {
		expect(welcomeCreateSource('fr')).toBe('welcome:fr')
		expect(welcomeCreateSource('pt-br')).toBe('welcome:pt-br')
	})
})

describe('parseWelcomeCreateSource', () => {
	it('parses the bare marker', () => {
		expect(parseWelcomeCreateSource('welcome')).toEqual({ locale: undefined })
	})
	it('parses a tagged locale', () => {
		expect(parseWelcomeCreateSource('welcome:fr')).toEqual({ locale: 'fr' })
		expect(parseWelcomeCreateSource('welcome:pt-br')).toEqual({ locale: 'pt-br' })
	})
	it('treats an empty tag as no locale', () => {
		expect(parseWelcomeCreateSource('welcome:')).toEqual({ locale: undefined })
	})
	it('returns null for non-welcome sources', () => {
		expect(parseWelcomeCreateSource('f/abc123')).toBeNull()
		expect(parseWelcomeCreateSource('welcomes')).toBeNull()
		expect(parseWelcomeCreateSource(null)).toBeNull()
		expect(parseWelcomeCreateSource(undefined)).toBeNull()
	})
	it('round-trips with welcomeCreateSource', () => {
		expect(parseWelcomeCreateSource(welcomeCreateSource('fr-FR'))?.locale).toBe('fr-FR')
		expect(parseWelcomeCreateSource(welcomeCreateSource())?.locale).toBeUndefined()
	})
})
