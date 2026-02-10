import { Footer } from '@/components/navigation/footer'
import { Header } from '@/components/navigation/header'
import { getFeaturePagesByCategory, getSiteSettings } from '@/sanity/queries'
import { ThemeProvider } from 'next-themes'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
	const [settings, featurePages] = await Promise.all([
		getSiteSettings(),
		getFeaturePagesByCategory(),
	])

	const navGroups = settings?.navGroups ?? []
	const standaloneNavLinks = settings?.standaloneNavLinks ?? []
	const footerData = {
		tagline: settings?.footerTagline ?? '',
		columns: settings?.footerColumns ?? [],
		socialLinks: settings?.socialLinks ?? [],
	}

	// Build product mega menu data from feature pages
	const groups = featurePages.filter((f) => f.category === 'group')
	const featured = featurePages.find((f) => f.category === 'featured')

	const productMenuGroups = groups.map((g) => ({
		label: g.eyebrow || g.title,
		slug: g.slug.current,
		items: (g.children ?? []).map((c) => ({
			label: c.title,
			href: `/features/${g.slug.current}/${c.slug}`,
		})),
	}))

	const productMenuFeatured = featured
		? {
				title: featured.title,
				description: featured.description,
				href: `/features/${featured.slug.current}`,
			}
		: undefined

	return (
		<ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
			<Header
				navGroups={navGroups}
				standaloneNavLinks={standaloneNavLinks}
				productMenuGroups={productMenuGroups}
				productMenuFeatured={productMenuFeatured}
			/>
			<main>{children}</main>
			<Footer
				tagline={footerData.tagline}
				columns={footerData.columns}
				socialLinks={footerData.socialLinks}
			/>
		</ThemeProvider>
	)
}
