import { ClerkProvider } from '@clerk/clerk-react'
import { Component, ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import '../sentry.client.config'
import '../styles/globals.css'
import { ErrorPage } from './components/ErrorPage/ErrorPage'
import { Head } from './components/Head/Head'
import { routes } from './routeDefs'
import { router } from './routes'
import { showConsoleBranding } from './utils/consoleBranding'

class TopLevelErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
	state = { hasError: false }

	static getDerivedStateFromError() {
		return { hasError: true }
	}

	render() {
		if (this.state.hasError) {
			return (
				<ErrorPage
					messages={{
						header: 'Unable to connect',
						para1:
							'Something went wrong while loading the page. This is usually temporary. Please try refreshing.',
					}}
					cta={
						<a href="#" onClick={() => window.location.reload()}>
							Refresh
						</a>
					}
				/>
			)
		}
		return this.props.children
	}
}

const browserRouter = createBrowserRouter(router)

// @ts-ignore this is fine
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
	throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env.local')
}

createRoot(document.getElementById('root')!).render(
	<TopLevelErrorBoundary>
		<ClerkProvider
			publishableKey={PUBLISHABLE_KEY}
			afterSignOutUrl={routes.tlaRoot()}
			signInUrl="/"
			signInFallbackRedirectUrl={routes.tlaRoot()}
			signUpFallbackRedirectUrl={routes.tlaRoot()}
		>
			<HelmetProvider>
				<Head />
				<RouterProvider router={browserRouter} />
			</HelmetProvider>
		</ClerkProvider>
	</TopLevelErrorBoundary>
)

showConsoleBranding()

try {
	// we have a dummy service worker that unregisters itself immediately
	// this was needed to remove the service worker we used to have from the cache
	// we can remove this if we ever need a service worker again, or if enough time passes that
	// anybody returning to tldraw.com should not have a service worker running
	navigator.serviceWorker.register('/sw.js', {
		scope: '/',
	})
} catch {
	// ignore
}
