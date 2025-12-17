import { useAuth, useUser as useClerkUser } from '@clerk/clerk-react'
import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite'
import classNames from 'classnames'
import { Tooltip as _Tooltip } from 'radix-ui'
import { ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import {
	ContainerProvider,
	DefaultA11yAnnouncer,
	DefaultDialogs,
	DefaultToasts,
	EditorContext,
	TLUiEventHandler,
	TldrawUiA11yProvider,
	TldrawUiContextProvider,
	fetch,
	react,
	runtime,
	setRuntimeOverrides,
	tlenvReactive,
	useDialogs,
	useToasts,
	useValue,
} from 'tldraw'
import translationsEnJson from '../../../public/tla/locales-compiled/en.json'
import { ErrorPage } from '../../components/ErrorPage/ErrorPage'
import { SignedInAnalytics, SignedOutAnalytics, trackEvent } from '../../utils/analytics'
import { globalEditor } from '../../utils/globalEditor'
import { TlaCookieConsent } from '../components/dialogs/TlaCookieConsent'
import { TlaLegalAcceptance } from '../components/dialogs/TlaLegalAcceptance'
import { FairyInviteHandler } from '../components/FairyInviteHandler'
import { GroupInviteHandler } from '../components/GroupInviteHandler'
import { MaybeForceUserRefresh } from '../components/MaybeForceUserRefresh/MaybeForceUserRefresh'
import { components } from '../components/TlaEditor/TlaEditor'
import { AppStateProvider, useMaybeApp } from '../hooks/useAppState'
import { UserProvider } from '../hooks/useUser'
import '../styles/tla.css'
import { hasNotAcceptedLegal } from '../utils/auth'
import { FeatureFlagsFetcher } from '../utils/FeatureFlagsFetcher'
import { IntlProvider, defineMessages, setupCreateIntl, useIntl } from '../utils/i18n'
import {
	clearLocalSessionState,
	getLocalSessionState,
	updateLocalSessionState,
	useAreFairiesEnabled,
} from '../utils/local-session-state'

const assetUrls = getAssetUrlsByImport()

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
})

// @ts-ignore this is fine
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
	throw new Error('Missing Publishable Key')
}

export function Component() {
	const [container, setContainer] = useState<HTMLElement | null>(null)
	// TODO: this needs to default to the global setting of whatever the last chosen locale was, not 'en'
	const [locale, setLocale] = useState<string>('en')
	const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light')
	const handleThemeChange = (theme: 'light' | 'dark' | 'system') => setTheme(theme)
	const handleLocaleChange = (locale: string) => {
		setLocale(locale)
		document.documentElement.lang = locale
	}
	const isFocusMode = useValue(
		'isFocusMode',
		() => !!globalEditor.get()?.getInstanceState().isFocusMode,
		[]
	)
	const areFairiesEnabled = useAreFairiesEnabled()

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
			className={classNames(`tla tl-container tla-theme-container`, {
				'tla-theme__light tl-theme__light': theme === 'light',
				'tla-theme__dark tl-theme__dark': theme !== 'light',
				'tla-focus-mode': isFocusMode,
				'tla-fairies-enabled': areFairiesEnabled,
			})}
		>
			<IntlWrapper locale={locale}>
				<MaybeForceUserRefresh>
					<SignedInProvider onThemeChange={handleThemeChange} onLocaleChange={handleLocaleChange}>
						{container && (
							<ContainerProvider container={container}>
								<InsideOfContainerContext>
									<Outlet />
									<LegalTermsAcceptance />
								</InsideOfContainerContext>
							</ContainerProvider>
						)}
					</SignedInProvider>
				</MaybeForceUserRefresh>
			</IntlWrapper>
			<WatermarkOverride />
		</div>
	)
}

function IntlWrapper({ children, locale }: { children: ReactNode; locale: string }) {
	const [messages, setMessages] = useState(translationsEnJson)

	useEffect(() => {
		async function fetchMessages() {
			if (locale === 'en') {
				setMessages(translationsEnJson)
				return
			}

			const res = await fetch(`/tla/locales-compiled/${locale}.json`)
			const messages = await res.json()
			setMessages({
				...translationsEnJson,
				...messages,
			})
		}
		fetchMessages()
	}, [locale])

	const defaultLocale = 'en'
	// createIntl is used in non-React locations.
	setupCreateIntl({ defaultLocale, locale, messages })

	return (
		<IntlProvider defaultLocale={locale} locale={locale} messages={messages}>
			{children}
		</IntlProvider>
	)
}

function InsideOfContainerContext({ children }: { children: ReactNode }) {
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
				>
					<_Tooltip.Provider>{children}</_Tooltip.Provider>
					<DefaultDialogs />
					<DefaultToasts />
					<DefaultA11yAnnouncer />
					<PutToastsInApp />
					<FairyInviteHandler />
					<GroupInviteHandler />
					{currentEditor && <TlaCookieConsent />}
				</TldrawUiContextProvider>
			</TldrawUiA11yProvider>
		</EditorContext.Provider>
	)
}

function PutToastsInApp() {
	const toasts = useToasts()
	const app = useMaybeApp()
	if (app) app.toasts = toasts
	return null
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
	const [currentLocale, setCurrentLocale] = useState<string>(
		globalEditor.get()?.user.getUserPreferences().locale ?? 'en'
	)
	const locale = useValue(
		'locale',
		() => globalEditor.get()?.user.getUserPreferences().locale ?? 'en',
		[]
	)
	useEffect(() => {
		if (locale === currentLocale) return
		onLocaleChange(locale)
		setCurrentLocale(locale)
	}, [currentLocale, locale, onLocaleChange])

	useEffect(() => {
		if (auth.isSignedIn && auth.userId) {
			updateLocalSessionState(() => ({
				auth: { userId: auth.userId },
			}))
		} else {
			clearLocalSessionState()
		}
	}, [auth.userId, auth.isSignedIn])

	if (!auth.isLoaded) return null

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
				<FeatureFlagsFetcher />
				<SignedOutAnalytics />
				{children}
			</ThemeContainer>
		)
	}

	return (
		<AppStateProvider>
			<UserProvider>
				<ThemeContainer onThemeChange={onThemeChange}>
					<FeatureFlagsFetcher />
					<SignedInAnalytics />
					{children}
				</ThemeContainer>
			</UserProvider>
		</AppStateProvider>
	)
}

function LegalTermsAcceptance() {
	const { user } = useClerkUser()
	const { addDialog } = useDialogs()
	const userRef = useRef(user)

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
					onClose: () => {
						// If the user closes the dialog and it's not accepted, show it again
						maybeShowDialog()
					},
				})
			}
		}

		maybeShowDialog()
	}, [addDialog, user?.id])

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

	useEffect(() => {
		onThemeChange(theme)
	}, [theme, onThemeChange])

	return children
}
