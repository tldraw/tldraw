import { createContext, ReactNode, useContext, useMemo } from 'react'
import { Editor, useEditor } from 'tldraw'
import { CommentsPluginOptions, CommentsPluginUser, TLCommentsComponents } from './types'

/**
 * The resolved comments context value: the current user for authoring comments, and any
 * component overrides passed to `commentsPlugin`.
 *
 * @public
 */
export interface CommentsContextValue {
	user: CommentsPluginUser | null
	components: Partial<TLCommentsComponents>
}

const CommentsContext = createContext<CommentsContextValue | null>(null)

function defaultUser(editor: Editor): CommentsPluginUser | null {
	const id = editor.user.getExternalId()
	return id ? { id, name: editor.user.getName() } : null
}

/** @internal @react */
export function CommentsProvider({
	options,
	children,
}: {
	options: CommentsPluginOptions
	children: ReactNode
}) {
	const editor = useEditor()
	const value = useMemo<CommentsContextValue>(
		() => ({
			user: options.user ? options.user(editor) : defaultUser(editor),
			components: options.components ?? {},
		}),
		[editor, options]
	)
	return <CommentsContext.Provider value={value}>{children}</CommentsContext.Provider>
}

/** @public */
export function useComments(): CommentsContextValue {
	const value = useContext(CommentsContext)
	if (!value) throw new Error('useComments must be used inside the comments plugin')
	return value
}
