import { TLSlot, useEditor, useValue } from '@tldraw/editor'
import { useActions } from '../context/actions'
import { TLUiMenuPlacement } from '../uiSlots'
import { TldrawUiMenuActionItem } from './primitives/menus/TldrawUiMenuActionItem'
import { TldrawUiMenuGroup } from './primitives/menus/TldrawUiMenuGroup'

/** @public */
export interface PluginMenuItemsProps {
	/** The menu slot to read placements from, for example {@link uiContextMenuSlot}. */
	slot: TLSlot<TLUiMenuPlacement>
}

/**
 * The menu items that plugins place in a menu slot, as one group. The default context menu and
 * main menu show it after their built-in items. A custom menu shows it where it wants them.
 *
 * @public @react
 */
export function PluginMenuItems({ slot }: PluginMenuItemsProps) {
	const editor = useEditor()
	const actions = useActions()
	const placements = useValue('menu placements', () => editor.plugins.list(slot), [editor, slot])
	const actionIds = [...new Set(placements.map((p) => p.action))].filter((id) => actions[id])
	if (actionIds.length === 0) return null
	return (
		<TldrawUiMenuGroup id="plugins">
			{actionIds.map((id) => (
				<TldrawUiMenuActionItem key={id} actionId={id} whenDisabled="hide" />
			))}
		</TldrawUiMenuGroup>
	)
}
