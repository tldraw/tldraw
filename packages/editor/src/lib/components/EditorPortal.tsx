import { ReactNode, createContext, useContext } from 'react'
import { createPortal } from 'react-dom'

const EditorPortalContext = createContext<HTMLElement | null>(null)

/** @internal */
export function EditorPortalProvider({
	host,
	children,
}: {
	host: HTMLElement | null
	children: ReactNode
}) {
	return <EditorPortalContext.Provider value={host}>{children}</EditorPortalContext.Provider>
}

/**
 * The DOM node that {@link EditorPortal} renders into: an empty `display: contents` element the
 * editor renders last among its container's children, after the canvas and after the UI.
 *
 * Null until the container has mounted, so prefer {@link EditorPortal}, which handles that for you.
 *
 * @public
 */
export function useEditorPortalHost(): HTMLElement | null {
	return useContext(EditorPortalContext)
}

/** @public */
export interface EditorPortalProps {
	children: ReactNode
}

/**
 * Renders its children into the end of the editor's container, escaping the canvas layer.
 *
 * Use this for anything anchored to canvas coordinates that also has to draw over the UI — a
 * popover on a shape, a comment thread, an annotation panel. The `OnTheCanvas` and
 * `InFrontOfTheCanvas` component slots are fixed layers, and each is its own stacking context, so
 * content mounted there can't paint above whatever outranks its layer, no matter what z-index it
 * asks for. Mount your component in whichever slot suits your data flow, wrap the part that needs
 * its own layer in this, and give that part a z-index.
 *
 * Which z-index depends on what you're drawing over. This package's own layers stop at 250
 * (`--tl-layer-canvas-in-front`); everything above that belongs to whatever renders the UI. In
 * `tldraw`, that's `--tl-layer-panels` (300, the toolbar and style panel) and `--tl-layer-menus`
 * (400) — defined by `tldraw`'s stylesheet rather than this package's, so reach for those variables
 * only if you're building on `tldraw` and not the bare editor.
 *
 * Positioning still resolves against the editor's container, the same as the canvas layers, so a
 * `position: absolute` child uses ordinary container coordinates.
 *
 * Prefer this over `createPortal(children, useContainer())`. A portal picks its DOM position from
 * the commit that mounts it, so portaling straight into the container lands the node ahead of the
 * container's own shallower children — ahead of the UI, and ahead of the "skip to main content"
 * link that only works while nothing precedes it. The host this renders into is a real element in
 * the editor's tree, placed last, so ordering is fixed rather than dependent on mount timing.
 *
 * @example
 * ```tsx
 * // 400 clears tldraw's menus layer; the bare editor's own layers stop at 250.
 * function ShapeAnnotation({ point }: { point: VecLike }) {
 * 	return (
 * 		<EditorPortal>
 * 			<div style={{ position: 'absolute', left: point.x, top: point.y, zIndex: 400 }}>
 * 				Above the UI
 * 			</div>
 * 		</EditorPortal>
 * 	)
 * }
 * ```
 *
 * @public
 * @react
 */
export function EditorPortal({ children }: EditorPortalProps) {
	const host = useEditorPortalHost()
	if (!host) return null
	return createPortal(children, host)
}
