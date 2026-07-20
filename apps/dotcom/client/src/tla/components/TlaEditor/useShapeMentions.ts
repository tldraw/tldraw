import {
	createMentionExtension,
	createMentionSuggestion,
	MentionMember,
	MentionSuggestionOptions,
} from '@tldraw/mentions'
import { useCallback, useMemo, useRef } from 'react'
import { defaultAddFontsFromNode, Editor, TLTextOptions, tipTapDefaultExtensions } from 'tldraw'

/**
 * Lets a component inside `<Tldraw>` (which knows the workspace roster) feed the live mention
 * resolver and roster into the shape rich-text mention extension, which is built once — above the
 * editor — for `options.text`. The extension reads both through refs, so it can be constructed
 * before the editor and roster exist and pick them up once they do.
 */
export interface ShapeMentionBridge {
	/** Set the id→name resolver used to render mention pills in shape text. */
	setResolveName(fn: ((id: string) => string | undefined) | undefined): void
	/** Set the roster resolver the `@` picker queries. */
	setGetSuggestions(fn: ((query: string) => MentionMember[]) | undefined): void
}

/**
 * Wires @-mentions into shape rich text. Returns the `text` options to pass to `<Tldraw>`, a bridge
 * for a child component to supply the live roster/resolver, and an `onEditorMount` to hand the
 * editor to the picker (so its popup tracks the camera).
 *
 * Text options are fixed at editor construction (see `TldrawOptions.text`), so the mention extension
 * is built once here and reads its roster, resolver, and editor lazily through refs rather than being
 * rebuilt when any of them change.
 */
export function useShapeMentions(): {
	textOptions: TLTextOptions
	bridge: ShapeMentionBridge
	onEditorMount(editor: Editor): void
} {
	const resolveNameRef = useRef<((id: string) => string | undefined) | undefined>(undefined)
	const getSuggestionsRef = useRef<((query: string) => MentionMember[]) | undefined>(undefined)
	// A stable options object the suggestion plugin reads lazily when the picker opens (always after
	// mount), so setting `.editor` in onEditorMount is enough to give the popup camera tracking.
	const suggestionOptionsRef = useRef<MentionSuggestionOptions>({ editor: null })

	const textOptions = useMemo<TLTextOptions>(() => {
		const mention = createMentionExtension({
			resolveName: (id) => resolveNameRef.current?.(id),
			suggestion: createMentionSuggestion(
				(query) => getSuggestionsRef.current?.(query) ?? [],
				suggestionOptionsRef.current
			),
		})
		return {
			addFontsFromNode: defaultAddFontsFromNode,
			// Providing `extensions` replaces tldraw's default set, so spread the defaults back in and
			// append the mention node.
			tipTapConfig: { extensions: [...tipTapDefaultExtensions, mention] },
		}
	}, [])

	const bridge = useMemo<ShapeMentionBridge>(
		() => ({
			setResolveName: (fn) => {
				resolveNameRef.current = fn
			},
			setGetSuggestions: (fn) => {
				getSuggestionsRef.current = fn
			},
		}),
		[]
	)

	const onEditorMount = useCallback((editor: Editor) => {
		suggestionOptionsRef.current.editor = editor
	}, [])

	return { textOptions, bridge, onEditorMount }
}
