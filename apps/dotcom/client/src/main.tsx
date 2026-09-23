import { ClerkProvider } from '@clerk/clerk-react'
import { getFromSessionStorage, setInSessionStorage } from '@tldraw/utils'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import '../sentry.client.config'
import '../styles/globals.css'
import { RefreshErrorBoundary } from './components/ErrorPage/ErrorPage'
import { Head } from './components/Head/Head'
import { routes } from './routeDefs'
import { router } from './routes'
import { SESSION_STORAGE_KEYS } from './tla/utils/session-storage'
import { CLIENT_BUILD_TIMESTAMP } from './utils/config'
import { showConsoleBranding } from './utils/consoleBranding'
import { markFirstLoad } from './utils/firstLoad'

markFirstLoad('js-started')

// A tab opened before a deploy asks for chunk hashes the deploy removed. Reload once per build to pick
// up the new index.html; a second failure on the same build is real and should surface.
window.addEventListener('vite:preloadError', (event) => {
	if (!navigator.onLine) return
	const key = SESSION_STORAGE_KEYS.STALE_CHUNK_RELOAD
	if (getFromSessionStorage(key) === CLIENT_BUILD_TIMESTAMP) return
	setInSessionStorage(key, CLIENT_BUILD_TIMESTAMP)
	// Without storage the guard can't hold, and reloading would loop.
	if (getFromSessionStorage(key) !== CLIENT_BUILD_TIMESTAMP) return
	event.preventDefault()
	window.location.reload()
})

const TOP_LEVEL_ERROR_MESSAGES = {
	header: 'Unable to connect',
	para1:
		'Something went wrong while loading the page. This is usually temporary. Please try refreshing.',
	cta: 'Refresh',
}

const browserRouter = createBrowserRouter(router)

// @ts-ignore this is fine
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
	throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env.local')
}

createRoot(document.getElementById('root')!).render(
	<RefreshErrorBoundary messages={TOP_LEVEL_ERROR_MESSAGES}>
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
	</RefreshErrorBoundary>
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
