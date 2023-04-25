import Head from 'next/head'

interface MetaHeadProps {
	title: string
	description?: string | null
	hero?: string | null
}

export function MetaHead({ title, description, hero }: MetaHeadProps) {
	const TITLE = `${title} - tldraw docs`

	return (
		<Head>
			<title>{TITLE}</title>
			{description && <meta name="description" content={description} />}

			<meta name="twitter:title" content={title} />
			{description && <meta name="twitter:description" content={description} />}
			{hero && <meta name="twitter:image" content={hero} />}

			<meta property="og:title" content={TITLE} key="title" />
			{description && <meta property="og:description" content={description} />}
			{hero && <meta property="og:image" content={hero} />}
		</Head>
	)
}
