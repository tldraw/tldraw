import { TLAsset } from '@tldraw/tlschema'
import { createContext, useContext, useMemo } from 'react'
import { useShallowObjectIdentity } from './useIdentity'

/** @public */
export type AssetContextProps = {
	zoom: number
	dpr: number
	networkEffectiveType: string | null
}

/** @public */
export type TLAssetHandlerHook = () => {
	handleAsset: (asset: TLAsset | null | undefined, context: AssetContextProps) => string
}

export interface BaseEditorHooks {
	useAssetHandler: TLAssetHandlerHook
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

// Default handler is just a pass-through function.
const DefaultAssetHandlerHook = () => ({
	handleAsset: (asset: TLAsset | null | undefined) => asset?.props.src || '',
})

export function EditorHooksProvider({ overrides, children }: HooksContextProviderProps) {
	const _overrides = useShallowObjectIdentity(overrides || {})
	return (
		<EditorHooksContext.Provider
			value={useMemo(
				() => ({
					useAssetHandler: DefaultAssetHandlerHook,
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
