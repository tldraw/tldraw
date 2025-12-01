import { PersistedFairyConfigs } from '@tldraw/fairy-shared'
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import { useEditor, useToasts, useValue } from 'tldraw'
import { useApp } from '../../tla/hooks/useAppState'
import { useTldrawUser } from '../../tla/hooks/useUser'
import { FairyThrowTool } from '../FairyThrowTool'
import { FairyApp } from './FairyApp'

const FairyAppContext = createContext<FairyApp | null>(null)

export interface FairyAppProviderProps {
	fileId: string
	children?: ReactNode
	onMount(fairyApp: FairyApp): void
	onUnmount(): void
}

/**
 * Provider component that creates and manages a FairyApp instance for the current editor.
 *
 * This component should be rendered inside a `<Tldraw>` component to have access to the editor context.
 * It creates a FairyApp instance, provides it via context, and cleans up on unmount.
 *
 * @example
 * ```tsx
 * <Tldraw>
 *   <FairyAppProvider fileId={fileId}>
 *     <FairyHUD />
 *   </FairyAppProvider>
 * </Tldraw>
 * ```
 */
export function FairyAppProvider({ fileId, children, onMount, onUnmount }: FairyAppProviderProps) {
	const editor = useEditor()
	const app = useApp()
	const user = useTldrawUser()
	const toasts = useToasts()
	const isReadOnly = useValue('isReadOnly', () => editor.getIsReadonly(), [editor])
	const [fairyApp, setFairyApp] = useState<FairyApp | null>(null)

	// Get fairy configs from app
	const fairyConfigs = useValue(
		'fairyConfigs',
		() => JSON.parse(app?.getUser().fairies || '{}') as PersistedFairyConfigs,
		[app]
	)

	// Token getter for fairy API requests
	const getToken = useCallback(async () => {
		if (!user) return undefined
		try {
			return await user.getToken()
		} catch (error) {
			console.error('Failed to get token:', error)
			return undefined
		}
	}, [user])

	// Error handler for fairy errors
	const handleError = useCallback(
		(e: any) => {
			const message = typeof e === 'string' ? e : e instanceof Error && e.message
			const isRateLimit = message && message.toLowerCase().includes('rate limit')

			toasts.addToast({
				title: isRateLimit
					? app.getIntl().formatMessage(app.getMessage('fairy_rate_limit_title'))
					: 'Error',
				description: isRateLimit
					? app.getIntl().formatMessage(app.getMessage('fairy_rate_limit_exceeded'))
					: message || 'An error occurred',
				severity: 'error',
			})
			// Only log non-rate-limit errors to avoid noise in console
			if (!isRateLimit) {
				console.error(e)
			}
		},
		[toasts, app]
	)

	// Create the FairyApp instance
	useEffect(() => {
		if (isReadOnly) return

		// Create the FairyApp instance
		const instance = new FairyApp(editor, app)
		setFairyApp(instance)

		// Register the FairyThrowTool
		const selectTool = editor.root.children!.select
		editor.removeTool(FairyThrowTool, selectTool)
		editor.setTool(FairyThrowTool, selectTool)

		return () => {
			// Dispose the FairyApp instance
			instance.dispose()
			setFairyApp(null)
		}
	}, [editor, app, isReadOnly])

	// Sync agents with fairy configs
	useEffect(() => {
		if (!fairyApp || isReadOnly) return

		fairyApp.agents.syncAgentsWithConfigs(fairyConfigs, {
			onError: handleError,
			getToken,
		})
	}, [fairyApp, fairyConfigs, handleError, getToken, isReadOnly])

	// Load persisted state
	useEffect(() => {
		if (!fairyApp || !fileId) return

		const fileState = app.getFileState(fileId)
		if (fileState?.fairyState) {
			try {
				const fairyState = JSON.parse(fileState.fairyState)
				fairyApp.persistence.loadState(fairyState)
			} catch (e) {
				console.error('Failed to parse fairy state:', e)
			}
		}

		// Start auto-saving state changes
		fairyApp.persistence.startAutoSave(fileId)

		onMount(fairyApp)

		return () => {
			fairyApp.persistence.stopAutoSave()
			fairyApp.persistence.resetLoadingFlags()
			onUnmount()
		}
	}, [fairyApp, app, fileId, onMount, onUnmount])

	return <FairyAppContext.Provider value={fairyApp}>{children}</FairyAppContext.Provider>
}

/**
 * Hook to get the FairyApp instance from context.
 *
 * @returns The FairyApp instance, or null if not yet initialized or not within a FairyAppProvider.
 *
 * @example
 * ```tsx
 * const fairyApp = useFairyApp()
 * if (fairyApp) {
 *   fairyApp.agentsManager.getAgents()
 * }
 * ```
 */
export function useFairyApp(): FairyApp | null {
	return useContext(FairyAppContext)
}
