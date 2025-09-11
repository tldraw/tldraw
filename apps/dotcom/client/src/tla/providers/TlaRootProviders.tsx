import { useAuth, useUser as useClerkUser } from '@clerk/clerk-react'
import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite'
import classNames from 'classnames'
import { Tooltip as _Tooltip } from 'radix-ui'
import { ReactNode, useCallback, useEffect, useState } from 'react'
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
	useToasts,
	useValue,
} from 'tldraw'
import translationsEnJson from '../../../public/tla/locales-compiled/en.json'
import { ErrorPage } from '../../components/ErrorPage/ErrorPage'
import { SignedInAnalytics, SignedOutAnalytics } from '../../utils/analytics'
import { globalEditor } from '../../utils/globalEditor'
import { MaybeForceUserRefresh } from '../components/MaybeForceUserRefresh/MaybeForceUserRefresh'
import { components } from '../components/TlaEditor/TlaEditor'
import { TlaCookieConsent } from '../components/dialogs/TlaCookieConsent'
import { AppStateProvider, useMaybeApp } from '../hooks/useAppState'
import { UserProvider } from '../hooks/useUser'
import '../styles/tla.css'
import { IntlProvider, defineMessages, setupCreateIntl, useIntl } from '../utils/i18n'
import {
	clearLocalSessionState,
	getLocalSessionState,
	updateLocalSessionState,
} from '../utils/local-session-state'
import { FileSidebarFocusContextProvider } from './FileInputFocusProvider'

const assetUrls = getAssetUrlsByImport()

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
	return (
		<div
			ref={setContainer}
			className={classNames(`tla tl-container tla-theme-container`, {
				'tla-theme__light tl-theme__light': theme === 'light',
				'tla-theme__dark tl-theme__dark': theme !== 'light',
				'tla-focus-mode': isFocusMode,
			})}
		>
			<IntlWrapper locale={locale}>
				<MaybeForceUserRefresh>
					<SignedInProvider onThemeChange={handleThemeChange} onLocaleChange={handleLocaleChange}>
						{container && (
							<ContainerProvider container={container}>
								<InsideOfContainerContext>
									<Outlet />
								</InsideOfContainerContext>
							</ContainerProvider>
						)}
					</SignedInProvider>
				</MaybeForceUserRefresh>
			</IntlWrapper>
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
			setMessages(messages)
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
				<SignedOutAnalytics />
				{children}
			</ThemeContainer>
		)
	}

	return (
		<FileSidebarFocusContextProvider>
			<AppStateProvider>
				<UserProvider>
					<ThemeContainer onThemeChange={onThemeChange}>
						<SignedInAnalytics />
						{children}
					</ThemeContainer>
				</UserProvider>
			</AppStateProvider>
		</FileSidebarFocusContextProvider>
	)
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
