import { RoomSnapshot } from '@tldraw/sync-core'
import { describe, expect, it } from 'vitest'
import { defaultWelcomeSnapshotJson } from './defaultWelcomeSnapshot'
import { WELCOME_COPY } from './localizeWelcomeSnapshot'
import { generateWelcomeVariants, welcomeVariantR2Key, WelcomeCatalog } from './welcomeVariants'

const source = () => JSON.parse(defaultWelcomeSnapshotJson) as RoomSnapshot

function readText(snapshot: RoomSnapshot, id: string): string {
	const richText = (
		snapshot.documents.find((d) => (d.state as { id?: string }).id === id)?.state as {
			props?: { richText?: { content?: any[] } }
		}
	)?.props?.richText
	const out: string[] = []
	const walk = (n: any) => {
		if (n?.type === 'text')
			out.push(n.marks?.some((m: any) => m.type === 'bold') ? `*${n.text}*` : n.text)
		n?.content?.forEach(walk)
	}
	richText?.content?.forEach(walk)
	return out.join('')
}

// A stand-in compiled catalog: keyed by the same message ids WELCOME_COPY references, the shape a
// real public/tla/locales-compiled/<locale>.json would have once these become dotcom messages.
const FR: WelcomeCatalog = {
	[WELCOME_COPY['shape:welcome-title'].id]: 'Bienvenue dans votre espace de travail',
	[WELCOME_COPY['shape:welcome-caption-1'].id]:
		'Un espace de travail est un <strong>espace partagé</strong> pour votre équipe.',
}

describe('generateWelcomeVariants', () => {
	it('stores one variant per locale, filled from the catalog with bold preserved', async () => {
		const stored = new Map<string, RoomSnapshot>()
		const catalogs: Record<string, WelcomeCatalog> = { fr: FR, de: {} }

		const generated = await generateWelcomeVariants({
			source: source(),
			locales: ['fr', 'de'],
			loadCatalog: async (locale) => catalogs[locale],
			putVariant: async (locale, variant) => {
				stored.set(welcomeVariantR2Key('src-slug', locale), variant)
			},
		})

		expect(generated).toEqual(['fr', 'de'])

		const fr = stored.get(welcomeVariantR2Key('src-slug', 'fr'))!
		expect(readText(fr, 'shape:welcome-title')).toBe('Bienvenue dans votre espace de travail')
		expect(readText(fr, 'shape:welcome-caption-1')).toBe(
			'Un espace de travail est un *espace partagé* pour votre équipe.'
		)

		// 'de' has an empty catalog → every shape falls back to the English default message.
		const de = stored.get(welcomeVariantR2Key('src-slug', 'de'))!
		expect(readText(de, 'shape:welcome-title')).toBe('Welcome to your workspace')
	})

	it('skips a locale with no catalog and keeps generating the rest', async () => {
		const stored: string[] = []
		const generated = await generateWelcomeVariants({
			source: source(),
			locales: ['fr', 'missing'],
			loadCatalog: async (locale) => (locale === 'fr' ? FR : undefined),
			putVariant: async (locale) => {
				stored.push(locale)
			},
		})
		expect(generated).toEqual(['fr'])
		expect(stored).toEqual(['fr'])
	})
})
