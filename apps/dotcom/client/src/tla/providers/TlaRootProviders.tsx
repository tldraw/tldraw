import { useAuth, useUser as useClerkUser } from '@clerk/react'
import classNames from 'classnames'
import { Tooltip as _Tooltip } from 'radix-ui'
import { ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { IntlProvider, useIntl } from 'react-intl'
import { Outlet, useMatches } from 'react-router-dom'
import {
	ContainerProvider,
	DefaultA11yAnnouncer,
	DefaultDialogs,
	DefaultToasts,
	defaultUserPreferences,
	defineMessages,
	EditorContext,
	fetch,
	getUserPreferences,
	preloadTranslation,
	react,
	RTL_LANGUAGES,
	runtime,
	setRuntimeOverrides,
	TldrawUiA11yProvider,
	TldrawUiContextProvider,
	tlenvReactive,
	TLUiEventHandler,
	useDialogs,
	useTldrawI18n,
	useToasts,
	useValue,
} from 'tldraw'
import translationsEnJson from '../../../public/tla/locales-compiled/en.json'
import { ErrorPage, RefreshErrorBoundary } from '../../components/ErrorPage/ErrorPage'
import { TlaRouteHandle } from '../../routeDefs'
import { SignedInAnalytics, SignedOutAnalytics, trackEvent } from '../../utils/analytics'
import { assetUrls } from '../../utils/assetUrls'
import { reportError } from '../../utils/errorReporting'
import { markFirstLoad } from '../../utils/firstLoad'
import { globalEditor } from '../../utils/globalEditor'
import { TlaCookieConsent } from '../components/dialogs/TlaCookieConsent'
import { TlaLegalAcceptance } from '../components/dialogs/TlaLegalAcceptance'
import { MaybeForceUserRefresh } from '../components/MaybeForceUserRefresh/MaybeForceUserRefresh'
import { components } from '../components/TlaEditor/TlaEditor'
import { WorkspaceInviteHandler } from '../components/WorkspaceInviteHandler'
import { AppStateProvider, useIsAppLoading, useMaybeApp } from '../hooks/useAppState'
import '../styles/tla.css'
import { useUITheme } from '../hooks/useUITheme'
import { UserProvider } from '../hooks/useUser'
import { hasNotAcceptedLegal } from '../utils/auth'
import {
	getLocalSessionState,
	resetLocalSessionStateButKeepTheme,
	updateLocalSessionState,
} from '../utils/local-session-state'

markFirstLoad('root-chunk-loaded')

function getTextDirection(locale: string): 'ltr' | 'rtl' {
	const [language] = locale.toLowerCase().split('-')
	return RTL_LANGUAGES.has(language) ? 'rtl' : 'ltr'
}

// Override watermark URLs globally for all dotcom editors
function WatermarkOverride() {
	useEffect(() => {
		const originalOpenWindow = runtime.openWindow
		setRuntimeOverrides({
			openWindow(url: string, target: string, allowReferrer?: boolean) {
				if (url.includes('utm_campaign=watermark')) {
					url = url.replace('utm_source=sdk', 'utm_source=dotcom')
					trackEvent('click-watermark', { url })
				}
				originalOpenWindow(url, target, allowReferrer)
			},
		})
	}, [])
	return null
}

export const appMessages = defineMessages({
	oldBrowser: {
		defaultMessage: 'Old browser detected. Please update your browser to use this app.',
	},
	clerkUnavailable: {
		defaultMessage: 'Unable to connect',
	},
	clerkUnavailablePara: {
		defaultMessage:
			"We're having trouble connecting to our authentication service. This is usually temporary. Please try refreshing the page.",
	},
	refresh: {
		defaultMessage: 'Refresh',
	},
})

// @ts-ignore this is fine
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
	throw new Error('Missing Publishable Key')
}

const CLERK_LOAD_TIMEOUT_MS = 10_000

const CLERK_ERROR_MESSAGES = {
	header: 'Unable to connect',
	para1:
		"We're having trouble connecting to our authentication service. This is usually temporary. Please try refreshing the page.",
	cta: 'Refresh',
}

type AppMessages = typeof translationsEnJson

// One request per locale for both catalogs, the app's and the SDK's, shared by the boot preload
// below and `IntlWrapper`. A failed one is forgotten so that the next attempt retries it.
const localeLoads = new Map<string, Promise<AppMessages>>()
function loadLocale(locale: string): Promise<AppMessages> {
	if (locale === 'en') return Promise.resolve(translationsEnJson)
	let load = localeLoads.get(locale)
	if (!load) {
		load = Promise.all([fetchAppMessages(locale), preloadTranslation(locale, assetUrls)]).then(
			([messages]) => messages
		)
		load.catch(() => localeLoads.delete(locale))
		localeLoads.set(locale, load)
	}
	return load
}

async function fetchAppMessages(locale: string): Promise<AppMessages> {
	const res = await fetch(`/tla/locales-compiled/${locale}.json`)
	if (!res.ok) throw new Error(`Failed to load locale ${locale}: ${res.status}`)
	return { ...translationsEnJson, ...(await res.json()) }
}

// A signed-in user's locale is in Zero, which isn't loaded until well after the first render.
// Until then, use what this browser showed last, then a signed-out user's preference.
const initialLocale =
	getLocalSessionState().locale ?? getUserPreferences().locale ?? defaultUserPreferences.locale

// Started here rather than on mount, so the catalogs download alongside Clerk and Zero instead of
// after them. `IntlWrapper` reports a failure.
loadLocale(initialLocale).catch(() => {})

// Past this, show English rather than keep the page blank waiting for a catalog.
const LOCALE_LOAD_TIMEOUT_MS = 3_000

export function Component() {
	const [container, setContainer] = useState<HTMLElement | null>(null)
	const [locale, setLocale] = useState(initialLocale)
	const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(
		() => getLocalSessionState().theme
	)
	const dir = getTextDirection(locale)
	useLayoutEffect(() => {
		document.documentElement.lang = locale
		document.documentElement.dir = dir
		updateLocalSessionState(() => ({ locale }))
	}, [locale, dir])
	const isFocusMode = useValue(
		'isFocusMode',
		() => !!globalEditor.get()?.getInstanceState().isFocusMode,
		[]
	)

	// Set the data-coarse attribute on the container based on the pointer type
	// we use a layout effect because we don't want there to be any perceptible delay between the
	// container mounting and this attribute being applied, because styles may depend on it:
	useLayoutEffect(() => {
		if (!container) return
		return react('coarsePointer', () => {
			container.setAttribute('data-coarse', String(tlenvReactive.get().isCoarsePointer))
		})
	}, [container])

	return (
		<div
			ref={setContainer}
			dir={dir}
			className={classNames(`tla tl-container tla-theme-container`, {
				'tla-theme__light tl-theme__light': theme === 'light',
				'tla-theme__dark tl-theme__dark': theme !== 'light',
				'tla-focus-mode': isFocusMode,
			})}
		>
			<RefreshErrorBoundary messages={CLERK_ERROR_MESSAGES}>
				<IntlWrapper locale={locale}>
					<MaybeForceUserRefresh>
						<SignedInProvider onThemeChange={setTheme} onLocaleChange={setLocale}>
							{container && (
								<ContainerProvider container={container}>
									<InsideOfContainerContext locale={locale}>
										<AppGate>
											<Outlet />
										</AppGate>
										<LegalTermsAcceptance />
									</InsideOfContainerContext>
								</ContainerProvider>
							)}
						</SignedInProvider>
					</MaybeForceUserRefresh>
				</IntlWrapper>
			</RefreshErrorBoundary>
			<WatermarkOverride />
		</div>
	)
}

// Renders nothing until the first catalog is in, rather than English that then changes language
// under the user. After that, a locale switch keeps the old language up until the new one lands.
function IntlWrapper({ children, locale }: { children: ReactNode; locale: string }) {
	const [messages, setMessages] = useState<AppMessages | null>(() =>
		locale === 'en' ? translationsEnJson : null
	)

	useEffect(() => {
		// Guard against a slower fetch for a previous locale landing after this one's and
		// overwriting it, and against a missing/invalid locale file becoming an unhandled rejection.
		let cancelled = false
		loadLocale(locale).then(
			(messages) => {
				if (!cancelled) setMessages(messages)
			},
			(e) => {
				reportError(e)
				if (!cancelled) setMessages(translationsEnJson)
			}
		)
		return () => {
			cancelled = true
		}
	}, [locale])

	useEffect(() => {
		if (messages) return
		const timeout = setTimeout(
			() => setMessages((current) => current ?? translationsEnJson),
			LOCALE_LOAD_TIMEOUT_MS
		)
		return () => clearTimeout(timeout)
	}, [messages])

	if (!messages) return null

	return (
		<IntlProvider defaultLocale={locale} locale={locale} messages={messages}>
			{children}
		</IntlProvider>
	)
}

function InsideOfContainerContext({ children, locale }: { children: ReactNode; locale: string }) {
	const handleAppLevelUiEvent = useCallback<TLUiEventHandler>(() => {
		// todo, implement handling ui events at the application layer
	}, [])
	const currentEditor = useValue('editor', () => globalEditor.get(), [])

	return (
		<EditorContext.Provider value={currentEditor}>
			<TldrawUiA11yProvider>
				<TldrawUiContextProvider
					assetUrls={assetUrls}
					components={components}
					onUiEvent={handleAppLevelUiEvent}
					locale={locale}
				>
					<PutI18nInApp />
					<_Tooltip.Provider>{children}</_Tooltip.Provider>
					<DefaultDialogs />
					<DefaultToasts />
					<DefaultA11yAnnouncer />
					<PutToastsInApp />
					<WorkspaceInviteHandler />
					{currentEditor && <TlaCookieConsent />}
				</TldrawUiContextProvider>
			</TldrawUiA11yProvider>
		</EditorContext.Provider>
	)
}

// The app outlives any render, so the adapter is handed to it rather than reached for. Ahead of
// `children`, so the adapter is there for their first render; the locale goes in a layout effect,
// since it's a signal they may be subscribed to, and lands before paint.
function PutI18nInApp() {
	const i18n = useTldrawI18n()
	const app = useMaybeApp()
	const locale = i18n().locale
	if (app) app.i18n = i18n
	useLayoutEffect(() => {
		app?.locale$.set(locale)
	}, [app, locale])
	return null
}

function PutToastsInApp() {
	const toasts = useToasts()
	const app = useMaybeApp()
	if (app) app.toasts = toasts
	return null
}

// Holds routes back until the app resolves unless the matched route opts in via its `handle`
// (the root and file routes: they open the sync socket while Zero is still preloading and cope
// with a null app). Anything else calling `useApp()` would otherwise throw.
function AppGate({ children }: { children: ReactNode }) {
	const isAppLoading = useIsAppLoading()
	const matches = useMatches()
	const rendersWhileAppLoads = matches.some(
		(m) => (m.handle as TlaRouteHandle | undefined)?.rendersWhileAppLoads
	)
	if (isAppLoading && !rendersWhileAppLoads) return null
	return children
}

function WhenAppReady({ children }: { children: ReactNode }) {
	return useMaybeApp() ? children : null
}

function SignedInProvider({
	children,
	onThemeChange,
	onLocaleChange,
}: {
	children: ReactNode
	onThemeChange(theme: 'light' | 'dark' | 'system'): void
	onLocaleChange(locale: string): void
}) {
	const auth = useAuth()
	const intl = useIntl()
	const { user, isLoaded: isUserLoaded } = useClerkUser()

	useEffect(() => {
		if (auth.isLoaded) markFirstLoad('clerk-loaded')
	}, [auth.isLoaded])

	useEffect(() => {
		if (auth.isSignedIn && auth.userId) {
			updateLocalSessionState(() => ({
				auth: { userId: auth.userId },
			}))
		} else if (auth.isLoaded) {
			// auth.isSignedIn and auth.userId initialize as undefined, so we have to check if auth is loaded
			// otherwise the local session state gets cleared on signin erroneously
			resetLocalSessionStateButKeepTheme()
		}
	}, [auth.userId, auth.isSignedIn, auth.isLoaded])

	const [clerkTimedOut, setClerkTimedOut] = useState(false)

	useEffect(() => {
		if (auth.isLoaded) return
		const timeout = setTimeout(() => setClerkTimedOut(true), CLERK_LOAD_TIMEOUT_MS)
		return () => clearTimeout(timeout)
	}, [auth.isLoaded])

	if (!auth.isLoaded) {
		if (clerkTimedOut) {
			return (
				<ErrorPage
					messages={{
						header: intl.formatMessage(appMessages.clerkUnavailable),
						para1: intl.formatMessage(appMessages.clerkUnavailablePara),
					}}
					cta={
						<button type="button" onClick={() => window.location.reload()}>
							{intl.formatMessage(appMessages.refresh)}
						</button>
					}
				/>
			)
		}
		return null
	}

	// Old browsers check.
	if (!('findLastIndex' in Array.prototype)) {
		return (
			<ErrorPage
				messages={{
					header: intl.formatMessage(appMessages.oldBrowser),
					para1: '',
				}}
				cta={null}
			/>
		)
	}

	if (!auth.isSignedIn || !user || !isUserLoaded) {
		return (
			<ThemeContainer onThemeChange={onThemeChange}>
				<SignedOutAnalytics />
				<UserLocale onLocaleChange={onLocaleChange} />
				{children}
			</ThemeContainer>
		)
	}

	return (
		<>
			<AppStateProvider>
				<UserProvider>
					<ThemeContainer onThemeChange={onThemeChange}>
						<UserLocale onLocaleChange={onLocaleChange} />
						<WhenAppReady>
							<SignedInAnalytics />
						</WhenAppReady>
						{children}
					</ThemeContainer>
				</UserProvider>
			</AppStateProvider>
		</>
	)
}

// Reads the same user the editor does (`TlaEditor` passes `app?.tlUser`), but without waiting for
// an editor to mount, so pages without one follow the user's language too. While a signed-in
// user's app is still loading, that's the SDK's local user, not theirs, so it reports nothing and
// the saved locale stays up.
function UserLocale({ onLocaleChange }: { onLocaleChange(locale: string): void }) {
	const app = useMaybeApp()
	const isAppLoading = useIsAppLoading()
	const locale = useValue(
		'locale',
		() => {
			if (app) return app.tlUser.userPreferences.get().locale ?? defaultUserPreferences.locale
			if (isAppLoading) return null
			return getUserPreferences().locale ?? defaultUserPreferences.locale
		},
		[app, isAppLoading]
	)
	useLayoutEffect(() => {
		if (locale) onLocaleChange(locale)
	}, [locale, onLocaleChange])
	return null
}

function LegalTermsAcceptance() {
	const { user } = useClerkUser()
	const { addDialog } = useDialogs()
	const userRef = useRef(user)
	// Accepting calls user.update and user.reload, which change the Clerk user identity, a dep of
	// AppStateProvider's bootstrap effect. Shown during the preload, accepting would abort and
	// restart the preload, so the dialog waits for the app.
	const isAppLoading = useIsAppLoading()

	// Keep the ref updated with the latest user
	useEffect(() => {
		userRef.current = user
	}, [user])

	useEffect(() => {
		function maybeShowDialog() {
			const currentUser = userRef.current
			if (hasNotAcceptedLegal(currentUser)) {
				addDialog({
					component: TlaLegalAcceptance,
					// If the user closes the dialog and it's not accepted, show it again
					onClose: maybeShowDialog,
				})
			}
		}

		if (isAppLoading) return
		maybeShowDialog()
	}, [addDialog, user?.id, isAppLoading])

	return null
}

function ThemeContainer({
	children,
	onThemeChange,
}: {
	children: ReactNode
	onThemeChange(theme: 'light' | 'dark' | 'system'): void
}) {
	const theme = useValue('theme', () => getLocalSessionState().theme, [])
	useUITheme()

	useEffect(() => {
		onThemeChange(theme)
	}, [theme, onThemeChange])

	return children
}
