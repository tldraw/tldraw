import type { AppProps } from 'next/app'
import Head from 'next/head'

export default function MyApp({ Component, pageProps }: AppProps) {
	return (
		<>
			<Head>
				<script async src="https://cdn.tailwindcss.com"></script>
			</Head>
			<Component {...pageProps} />
		</>
	)
}
