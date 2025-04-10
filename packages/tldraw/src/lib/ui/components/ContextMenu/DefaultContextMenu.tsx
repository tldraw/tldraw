import * as _ContextMenu from '@radix-ui/react-context-menu'
import { preventDefault, useContainer, useEditor, useEditorComponents } from '@tldraw/editor'
import { ReactNode, memo, useCallback, useEffect, useRef } from 'react'
import { useUiEvents } from '../../context/events'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiMenuContextProvider } from '../primitives/menus/TldrawUiMenuContext'
import { DefaultContextMenuContent } from './DefaultContextMenuContent'

/** @public */
export interface TLUiContextMenuProps {
	children?: ReactNode
	disabled?: boolean
}

/** @public @react */
export const DefaultContextMenu = memo(function DefaultContextMenu({
	children,
	disabled = false,
}: TLUiContextMenuProps) {
	const editor = useEditor()
	const trackEvent = useUiEvents()
	const isOpenRef = useRef(false)
	const msg = useTranslation()

	const { Canvas } = useEditorComponents()

	useEffect(() => {
		// When hitting `Escape` while the context menu is open, we want to prevent
		// the default behavior of losing focus on the shape. Otherwise,
		// it's pretty annoying from an accessibility perspective.
		const preventEscapeFromLosingShapeFocus = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.stopPropagation()
			}
		}

		// N.B. We need the `capture: true` to make sure the useDocumentEvents doesn't run first
		// which does `editor.cancel()`
		document.body.addEventListener('keydown', preventEscapeFromLosingShapeFocus, {
			capture: true,
		})
		return () => {
			document.body.removeEventListener('keydown', preventEscapeFromLosingShapeFocus, {
				capture: true,
			})
		}
	}, [])

	const cb = useCallback(
		(isOpen: boolean) => {
			isOpenRef.current = isOpen

			if (!isOpen) {
				const onlySelectedShape = editor.getOnlySelectedShape()

				if (onlySelectedShape && editor.isShapeOrAncestorLocked(onlySelectedShape)) {
					editor.setSelectedShapes([])
				}
			} else {
				// Weird route: selecting locked shapes on long press
				if (editor.getInstanceState().isCoarsePointer) {
					const selectedShapes = editor.getSelectedShapes()
					const {
						inputs: { currentPagePoint },
					} = editor

					// get all of the shapes under the current pointer
					const shapesAtPoint = editor.getShapesAtPoint(currentPagePoint)

					if (
						// if there are no selected shapes
						!editor.getSelectedShapes().length ||
						// OR if none of the shapes at the point include the selected shape
						!shapesAtPoint.some((s) => selectedShapes.includes(s))
					) {
						// then are there any locked shapes under the current pointer?
						const lockedShapes = shapesAtPoint.filter((s) => editor.isShapeOrAncestorLocked(s))

						if (lockedShapes.length) {
							// nice, let's select them
							editor.select(...lockedShapes.map((s) => s.id))
						}
					}
				}

				trackEvent('open-context-menu', { source: 'unknown' })
			}
		},
		[editor, trackEvent]
	)

	const container = useContainer()
	const [isOpen, handleOpenChange] = useMenuIsOpen('context menu', cb)

	// Get the context menu content, either the default component or the user's
	// override. If there's no menu content, then the user has set it to null,
	// so skip rendering the menu.
	const content = children ?? <DefaultContextMenuContent />

	return (
		<_ContextMenu.Root dir="ltr" onOpenChange={handleOpenChange} modal={false}>
			<_ContextMenu.Trigger onContextMenu={undefined} dir="ltr" disabled={disabled}>
				{Canvas ? <Canvas /> : null}
			</_ContextMenu.Trigger>
			{isOpen && (
				<_ContextMenu.Portal container={container}>
					<_ContextMenu.Content
						className="tlui-menu scrollable"
						data-testid="context-menu"
						aria-label={msg('context-menu.title')}
						alignOffset={-4}
						collisionPadding={4}
						onContextMenu={preventDefault}
					>
						<TldrawUiMenuContextProvider type="context-menu" sourceId="context-menu">
							{content}
						</TldrawUiMenuContextProvider>
					</_ContextMenu.Content>
				</_ContextMenu.Portal>
			)}
		</_ContextMenu.Root>
	)
})
