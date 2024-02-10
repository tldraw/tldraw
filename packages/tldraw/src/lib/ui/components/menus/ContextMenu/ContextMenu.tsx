import * as _ContextMenu from '@radix-ui/react-context-menu'
import { preventDefault, useContainer, useEditor } from '@tldraw/editor'
import { memo, useCallback } from 'react'
import { useMenuIsOpen } from '../../../hooks/useMenuIsOpen'
import tunnel from '../../../tunnel'
import { TldrawUiMenuContextProvider } from '../MenuItems/TldrawUiMenuContext'
import { DefaultContextMenu } from './DefaultContextMenu'

const _ContextMenuContent = tunnel(<DefaultContextMenu />)

/** @public */
export const CustomContextMenu = _ContextMenuContent.In

/** @public */
export interface TLUiContextMenuProps {
	children: any
}

/** @public */
export const ContextMenu = memo(function ContextMenu({ children }: { children: any }) {
	const editor = useEditor()

	const cb = useCallback(
		(isOpen: boolean) => {
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
			}
		},
		[editor]
	)

	// We must have a context menu component and the select tool must be active

	const container = useContainer()
	const [isOpen, handleOpenChange] = useMenuIsOpen('context menu', cb)

	const out = <_ContextMenuContent.Out />

	if (!out) return null

	return (
		<_ContextMenu.Root dir="ltr" onOpenChange={handleOpenChange} modal={false}>
			<_ContextMenu.Trigger onContextMenu={undefined} dir="ltr">
				{children}
			</_ContextMenu.Trigger>
			{isOpen && (
				<_ContextMenu.Portal container={container}>
					<_ContextMenu.Content
						className="tlui-menu scrollable"
						data-testid="context-menu"
						alignOffset={-4}
						collisionPadding={4}
						onContextMenu={preventDefault}
					>
						<TldrawUiMenuContextProvider type="context-menu" sourceId="context-menu">
							<_ContextMenuContent.Out />
						</TldrawUiMenuContextProvider>
					</_ContextMenu.Content>
				</_ContextMenu.Portal>
			)}
		</_ContextMenu.Root>
	)
})
