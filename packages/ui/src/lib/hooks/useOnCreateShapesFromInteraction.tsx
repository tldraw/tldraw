import { Editor } from '@tldraw/editor'
import { VecLike } from '@tldraw/primitives'
import { TLUnknownShape } from '@tldraw/tlschema'
import { createContext, useContext, useMemo } from 'react'

/** @public */
export type CreateShapeFromInteractionHandler = (
	editor: Editor,
	info:
		| {
				type: 'text'
				point?: VecLike
				text: string
		  }
		| {
				type: 'files'
				files: File[]
				point?: VecLike
				ignoreParent: boolean
		  }
) => Promise<TLUnknownShape | undefined>

/** @public */
export type UiCallbacksContextType = {
	onCreateShapeFromInteraction: CreateShapeFromInteractionHandler
}

const UiCallbacksContext = createContext<UiCallbacksContextType>({
	onCreateShapeFromInteraction: async () => void null,
})

/** @internal */
export function UiCallbacksProvider({
	onCreateShapeFromInteraction,
	children,
}: {
	onCreateShapeFromInteraction: CreateShapeFromInteractionHandler
	children: React.ReactNode
}) {
	const callbacks = useMemo<UiCallbacksContextType>(
		() => ({ onCreateShapeFromInteraction }),
		[onCreateShapeFromInteraction]
	)

	return <UiCallbacksContext.Provider value={callbacks}>{children}</UiCallbacksContext.Provider>
}

/** @internal */
export function useUiCallbacks() {
	return useContext(UiCallbacksContext)
}
