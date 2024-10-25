import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import { Provider as TooltipProvider } from '@radix-ui/react-tooltip'
import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite'
import { TldrawAppUserRecordType } from '@tldraw/dotcom-shared'
import { ReactNode, useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import {
	ContainerProvider,
	EditorContext,
	TLUiEventHandler,
	TldrawUiContextProvider,
	TldrawUiDialogs,
	TldrawUiToasts,
	fetch,
	useValue,
} from 'tldraw'
import { globalEditor } from '../../utils/globalEditor'
import { IntlProvider, setupCreateIntl } from '../app/i18n'
import { components } from '../components/TlaEditor/TlaEditor'
import { AppStateProvider } from '../hooks/useAppState'
import { UserProvider } from '../hooks/useUser'
import '../styles/tla.css'
import { getLocalSessionState, updateLocalSessionState } from '../utils/local-session-state'

const assetUrls = getAssetUrlsByImport()

// @ts-ignore this is fine
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
	throw new Error('Missing Publishable Key')
}

export function Component() {
	const [container, setContainer] = useState<HTMLElement | null>(null)
	const [locale, setLocale] = useState<string>('en')
	const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light')
	const handleThemeChange = (theme: 'light' | 'dark' | 'system') => setTheme(theme)
	const handleLocaleChange = (locale: string) => setLocale(locale)

	return (
		<IntlWrapper locale={locale}>
			<ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/q">
				<SignedInProvider onThemeChange={handleThemeChange} onLocaleChange={handleLocaleChange}>
					<div
						ref={setContainer}
						className={`tla tl-container tla-theme-container ${theme === 'light' ? 'tla-theme__light tl-theme__light' : 'tla-theme__dark tl-theme__dark'}`}
					>
						{container && (
							<ContainerProvider container={container}>
								<InsideOfContainerContext>
									<Outlet />
								</InsideOfContainerContext>
							</ContainerProvider>
						)}
					</div>
				</SignedInProvider>
			</ClerkProvider>
		</IntlWrapper>
	)
}

function IntlWrapper({ children, locale }: { children: ReactNode; locale: string }) {
	const [messages, setMessages] = useState({})

	useEffect(() => {
		async function fetchMessages() {
			if (locale === 'en') {
				setMessages({})
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
	const FakeProvider = ({ children }: { children: ReactNode }) => children
	const MaybeEditorProvider = currentEditor ? EditorContext.Provider : FakeProvider
	const MaybeUiContextProvider = currentEditor ? TldrawUiContextProvider : FakeProvider

	return (
		<MaybeEditorProvider value={currentEditor}>
			<MaybeUiContextProvider
				assetUrls={assetUrls}
				components={components}
				onUiEvent={handleAppLevelUiEvent}
			>
				<TooltipProvider>{children}</TooltipProvider>
				{currentEditor && <TldrawUiDialogs />}
				{currentEditor && <TldrawUiToasts />}
			</MaybeUiContextProvider>
		</MaybeEditorProvider>
	)
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
				auth: { userId: TldrawAppUserRecordType.createId(auth.userId) },
			}))
		} else {
			updateLocalSessionState(() => ({
				auth: undefined,
			}))
		}
	}, [auth.userId, auth.isSignedIn])

	if (!auth.isLoaded) return null

	if (!auth.isSignedIn) {
		return children
	}

	return (
		<AppStateProvider>
			<UserProvider>
				<ThemeContainer onThemeChange={onThemeChange}>{children}</ThemeContainer>
			</UserProvider>
		</AppStateProvider>
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
