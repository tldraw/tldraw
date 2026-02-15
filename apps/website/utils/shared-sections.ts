import { db } from './ContentDatabase'

/** Get shared section data (finalCta, testimonialSection, starterKits) from the homepage metadata. */
export async function getSharedSections() {
	const page = await db.getPage('/')
	if (!page?.metadata) return null
	const meta = JSON.parse(page.metadata)
	return {
		finalCta: meta.finalCta ?? null,
		testimonialSection: meta.testimonialSection ?? null,
		starterKits: meta.starterKits ?? null,
		hero: meta.hero
			? { ctaPrimary: meta.hero.ctaPrimary, ctaSecondary: meta.hero.ctaSecondary }
			: null,
	}
}
