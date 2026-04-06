import { ReactNode, useMemo } from 'react'
import { DefaultBackground } from '../components/default-components/DefaultBackground'
import { DefaultCanvas } from '../components/default-components/DefaultCanvas'
import { DefaultErrorFallback } from '../components/default-components/DefaultErrorFallback'
import { DefaultGrid } from '../components/default-components/DefaultGrid'
import { DefaultLoadingScreen } from '../components/default-components/DefaultLoadingScreen'
import { DefaultShapeErrorFallback } from '../components/default-components/DefaultShapeErrorFallback'
import { DefaultShapeWrapper } from '../components/default-components/DefaultShapeWrapper'
import { DefaultSpinner } from '../components/default-components/DefaultSpinner'
import { DefaultSvgDefs } from '../components/default-components/DefaultSvgDefs'
import { EditorComponentsContext } from './EditorComponentsContext'
import type { TLEditorComponents } from './EditorComponentsContext'
import { useShallowObjectIdentity } from './useIdentity'

export { useEditorComponents } from './EditorComponentsContext'
export type { TLEditorComponents } from './EditorComponentsContext'

interface ComponentsContextProviderProps {
	overrides?: TLEditorComponents
	children: ReactNode
}

export function EditorComponentsProvider({
	overrides = {},
	children,
}: ComponentsContextProviderProps) {
	const _overrides = useShallowObjectIdentity(overrides)
	const value = useMemo(
		(): Required<TLEditorComponents> => ({
			Background: DefaultBackground,
			Canvas: DefaultCanvas,
			Grid: DefaultGrid,
			InFrontOfTheCanvas: null,
			LoadingScreen: DefaultLoadingScreen,
			OnTheCanvas: null,
			SelectionBackground: null,
			ShapeWrapper: DefaultShapeWrapper,
			Spinner: DefaultSpinner,
			SvgDefs: DefaultSvgDefs,

			ErrorFallback: DefaultErrorFallback,
			ShapeErrorFallback: DefaultShapeErrorFallback,

			..._overrides,
		}),
		[_overrides]
	)

	return (
		<EditorComponentsContext.Provider value={value}>{children}</EditorComponentsContext.Provider>
	)
}
