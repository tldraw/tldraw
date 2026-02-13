import { Footer } from '@/components/navigation/footer'
import { Header } from '@/components/navigation/header'
import { db } from '@/utils/ContentDatabase'
import { getNavigation } from '@/utils/collections'
import { ThemeProvider } from 'next-themes'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
	const nav = await getNavigation()

	// Build product mega menu from feature pages in the content DB
	const featurePages = await db.getPagesBySection('features')
	const productMenuGroups: {
		label: string
		slug: string
		items: { label: string; href: string }[]
	}[] = []
	let productMenuFeatured: { title: string; description: string; href: string } | undefined

	for (const page of featurePages) {
		const meta = page.metadata ? JSON.parse(page.metadata) : {}
		if (meta.category === 'group') {
			const slug = page.path.replace('/features/', '')
			productMenuGroups.push({
				label: meta.eyebrow || page.title,
				slug,
				items: (meta.children ?? []).map((c: { title: string; slug: string }) => ({
					label: c.title,
					href: `/features/${slug}/${c.slug}`,
				})),
			})
		} else if (meta.category === 'featured') {
			productMenuFeatured = {
				title: page.title,
				description: page.description ?? '',
				href: page.path,
			}
		}
	}

	return (
		<ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
			<Header
				navGroups={nav.navGroups}
				standaloneNavLinks={nav.standaloneNavLinks}
				productMenuGroups={productMenuGroups}
				productMenuFeatured={productMenuFeatured}
			/>
			<main>{children}</main>
			<Footer
				tagline={nav.footerTagline}
				columns={nav.footerColumns}
				socialLinks={nav.socialLinks}
			/>
		</ThemeProvider>
	)
}
