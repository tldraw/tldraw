/**
 * Seed the homepage and site settings singletons into Sanity.
 * 
 * Usage:
 *   source .env.local && npx tsx scripts/seed-homepage.ts
 */

import { createClient } from '@sanity/client'
import {
	communityContent,
	finalCtaContent,
	footerData,
	heroContent,
	navGroups,
	showcaseContent,
	standaloneNavLinks,
	starterKitsContent,
	testimonialContent,
	whatsInsideContent,
	whiteboardKitContent,
	whyTldrawContent,
} from '../content/homepage'

const client = createClient({
	projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
	dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
	apiVersion: '2025-01-01',
	token: process.env.SANITY_API_TOKEN!,
	useCdn: false,
})

function key(i: number): string {
	return `item-${i}`
}

async function seedHomepage() {
	console.log('Seeding homepage...')
	await client.createOrReplace({
		_type: 'homepage' as const,
		_id: 'homepage',
		hero: {
			title: heroContent.title,
			subtitle: heroContent.subtitle,
			ctaPrimary: heroContent.ctaPrimary,
			ctaSecondary: heroContent.ctaSecondary,
		},
		whyTldraw: {
			title: whyTldrawContent.title,
			items: whyTldrawContent.items.map((item, i) => ({
				_type: 'object' as const, _key: key(i),
				title: item.title, description: item.description,
			})),
		},
		showcaseSection: {
			title: showcaseContent.title,
			subtitle: showcaseContent.subtitle,
			ctaLabel: showcaseContent.ctaLabel,
			ctaUrl: showcaseContent.ctaUrl,
			items: showcaseContent.items.map((item, i) => ({
				_type: 'object' as const, _key: key(i),
				company: item.company, category: item.category,
				description: item.description, url: item.url,
			})),
		},
		whatsInside: {
			title: whatsInsideContent.title,
			subtitle: whatsInsideContent.subtitle,
			items: whatsInsideContent.items.map((item, i) => ({
				_type: 'object' as const, _key: key(i),
				title: item.title, description: item.description, url: item.url,
			})),
		},
		community: {
			title: communityContent.title,
			stats: communityContent.stats.map((stat, i) => ({
				_type: 'object' as const, _key: key(i),
				value: stat.value, label: stat.label, linkText: stat.linkText, url: stat.url,
			})),
		},
		whiteboardKit: {
			eyebrow: whiteboardKitContent.eyebrow,
			title: whiteboardKitContent.title,
			description: whiteboardKitContent.description,
			ctaLabel: whiteboardKitContent.ctaLabel,
			ctaUrl: whiteboardKitContent.ctaUrl,
			features: whiteboardKitContent.features.map((f, i) => ({
				_type: 'object' as const, _key: key(i),
				title: f.title, description: f.description,
			})),
		},
		starterKits: {
			title: starterKitsContent.title,
			subtitle: starterKitsContent.subtitle,
			ctaLabel: starterKitsContent.ctaLabel,
			ctaUrl: starterKitsContent.ctaUrl,
			kits: starterKitsContent.kits.map((kit, i) => ({
				_type: 'object' as const, _key: key(i),
				title: kit.title, description: kit.description, url: kit.url,
			})),
		},
		testimonialSection: {
			featured: {
				quote: testimonialContent.featured.quote,
				author: testimonialContent.featured.author,
				role: testimonialContent.featured.role,
				company: testimonialContent.featured.company,
			},
			caseStudies: testimonialContent.caseStudies.map((cs, i) => ({
				_type: 'object' as const, _key: key(i),
				company: cs.company, description: cs.description, url: cs.url,
			})),
		},
		finalCta: {
			title: finalCtaContent.title,
			description: finalCtaContent.description,
			descriptionBold: finalCtaContent.descriptionBold,
			ctaPrimary: finalCtaContent.ctaPrimary,
			ctaSecondary: finalCtaContent.ctaSecondary,
		},
	})
	console.log('  + Homepage singleton created')
}

async function seedSiteSettings() {
	console.log('Seeding site settings...')
	await client.createOrReplace({
		_type: 'siteSettings' as const,
		_id: 'siteSettings',
		navGroups: navGroups.map((group, gi) => ({
			_type: 'object' as const, _key: `nav-${gi}`,
			label: group.label,
			items: group.items.map((item, ii) => ({
				_type: 'object' as const, _key: `nav-${gi}-${ii}`,
				label: item.label, href: item.href,
			})),
		})),
		standaloneNavLinks: standaloneNavLinks.map((link, i) => ({
			_type: 'object' as const, _key: `standalone-${i}`,
			label: link.label, href: link.href,
		})),
		footerTagline: footerData.tagline,
		footerColumns: footerData.columns.map((col, ci) => ({
			_type: 'object' as const, _key: `footer-${ci}`,
			heading: col.heading,
			links: col.links.map((link, li) => ({
				_type: 'object' as const, _key: `footer-${ci}-${li}`,
				label: link.label, href: link.href,
			})),
		})),
		socialLinks: footerData.socialLinks.map((link, i) => ({
			_type: 'object' as const, _key: `social-${i}`,
			label: link.label, href: link.href,
		})),
	})
	console.log('  + Site settings singleton created')
}

async function main() {
	console.log(`Project: ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}`)
	console.log(`Dataset: ${process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'}`)
	await seedHomepage()
	await seedSiteSettings()
	console.log('Done!')
}

main().catch((err) => {
	console.error('Failed:', err)
	process.exit(1)
})
