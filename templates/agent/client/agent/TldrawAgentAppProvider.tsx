import { createContext, memo, ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import { useEditor, useToasts, useValue } from 'tldraw'
import { TldrawAgent } from './TldrawAgent'
import { TldrawAgentApp } from './TldrawAgentApp'

const TldrawAgentAppContext = createContext<TldrawAgentApp | null>(null)

export interface TldrawAgentAppProviderProps {
	children?: ReactNode
	/**
	 * Use this to pass the app to components outside the Tldraw component via
	 * TldrawAgentAppContextProvider.
	 */
	onMount?: (app: TldrawAgentApp) => void
	onUnmount?: () => void
}

/**
 * Creates a TldrawAgentApp for the current editor and provides it via context.
 * Must be rendered inside `<Tldraw>`. Children are not rendered until the app
 * exists, so `useAgent()` always returns a valid agent.
 *
 * For components defined in Tldraw's `components` prop, use `onMount` to get the app instance
 * and wrap them with `TldrawAgentAppContextProvider`.
 *
 * @example
 * ```tsx
 * function App() {
 *   const [app, setApp] = useState<TldrawAgentApp | null>(null)
 *
 *   const components = useMemo(() => ({
 *     InFrontOfTheCanvas: () => app && (
 *       <TldrawAgentAppContextProvider app={app}>
 *         <AgentHighlights />
 *       </TldrawAgentAppContextProvider>
 *     ),
 *   }), [app])
 *
 *   return (
 *     <Tldraw components={components}>
 *       <TldrawAgentAppProvider onMount={setApp} onUnmount={() => setApp(null)} />
 *     </Tldraw>
 *   )
 * }
 * ```
 */
export const TldrawAgentAppProvider = memo(function TldrawAgentAppProvider({
	children,
	onMount,
	onUnmount,
}: TldrawAgentAppProviderProps) {
	const editor = useEditor()
	const toasts = useToasts()
	const [app, setApp] = useState<TldrawAgentApp | null>(null)

	const handleError = useCallback(
		(e: any) => {
			const message = typeof e === 'string' ? e : e instanceof Error && e.message
			toasts.addToast({
				title: 'Error',
				description: message || 'An error occurred',
				severity: 'error',
			})
			console.error(e)
		},
		[toasts]
	)

	useEffect(() => {
		const instance = new TldrawAgentApp(editor, { onError: handleError })

		// loadState creates agents from persisted data; auto-save must start after it
		// so the load itself doesn't get saved back
		instance.persistence.loadState()
		const defaultAgent = instance.agents.ensureAtLeastOneAgent()
		instance.persistence.startAutoSave()

		setApp(instance)
		onMount?.(instance)

		// Expose to window for debugging
		;(window as any).agentApp = instance
		;(window as any).agent = defaultAgent
		;(window as any).editor = editor

		return () => {
			instance.dispose()
			setApp(null)
			onUnmount?.()
			delete (window as any).agentApp
			delete (window as any).agent
			delete (window as any).editor
		}
	}, [editor, handleError, onMount, onUnmount])

	if (!app) return null

	return <TldrawAgentAppContext.Provider value={app}>{children}</TldrawAgentAppContext.Provider>
})

/**
 * Provides an existing app to components defined in Tldraw's `components` prop.
 */
export function TldrawAgentAppContextProvider({
	app,
	children,
}: {
	app: TldrawAgentApp
	children: ReactNode
}) {
	return <TldrawAgentAppContext.Provider value={app}>{children}</TldrawAgentAppContext.Provider>
}

/** @throws if called outside a TldrawAgentAppProvider or TldrawAgentAppContextProvider. */
export function useTldrawAgentApp(): TldrawAgentApp {
	const app = useContext(TldrawAgentAppContext)
	if (!app) {
		throw new Error('useTldrawAgentApp must be used inside a TldrawAgentAppProvider')
	}
	return app
}

/** The default (first) agent. @throws if called outside a provider or no agent exists. */
export function useAgent(): TldrawAgent {
	const app = useTldrawAgentApp()
	const agent = useValue('agent', () => app.agents.getAgent(), [app])
	if (!agent) {
		throw new Error('No agent found. Make sure an agent has been created.')
	}
	return agent
}

export function useAgents(): TldrawAgent[] {
	const app = useTldrawAgentApp()
	return useValue('agents', () => app.agents.getAgents(), [app])
}
