import { createContext, useContext, useMemo } from 'react'
import { useShallowObjectIdentity } from './useIdentity'

/** @public */
export type TLTextTriggerHook = (
	inputEl: HTMLTextAreaElement | null,
	onComplete: (text: string) => void
) => {
	onKeyDown: (
		e: React.KeyboardEvent<HTMLTextAreaElement>,
		coords: {
			top: number
			left: number
		}
	) => boolean
}

export interface BaseEditorHooks {
	useTextTriggerCharacter: TLTextTriggerHook
}

/** @public */
export type TLEditorHooks = {
	[K in keyof BaseEditorHooks]: BaseEditorHooks[K]
}

const EditorHooksContext = createContext({} as TLEditorHooks)

type HooksContextProviderProps = {
	overrides?: TLEditorHooks
	children: any
}

const DefaultTextTriggerHook = () => ({ onKeyDown: () => false })

export function EditorHooksProvider({ overrides, children }: HooksContextProviderProps) {
	const _overrides = useShallowObjectIdentity(overrides || {})
	return (
		<EditorHooksContext.Provider
			value={useMemo(
				() => ({
					useTextTriggerCharacter: DefaultTextTriggerHook,
					..._overrides,
				}),
				[_overrides]
			)}
		>
			{children}
		</EditorHooksContext.Provider>
	)
}

/** @public */
export function useEditorHooks() {
	return useContext(EditorHooksContext)
}
