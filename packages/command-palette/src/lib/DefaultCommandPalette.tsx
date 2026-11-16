import { ReactNode, memo, useCallback, useMemo } from 'react'
import { useEditor } from 'tldraw'
import {
	CommandPaletteActionGroupsProvider,
	defaultCommandPaletteActionGroups,
	TLUiCommandPaletteActionGroups,
} from './commandPaletteActionGroups'
import { commandPaletteOpen } from './commandPaletteOpen'
import { CommandPaletteShell, TLUiCommandPaletteShellProps } from './CommandPaletteShell'
import { DefaultCommandPaletteContent } from './DefaultCommandPaletteContent'

/** @public */
export interface TLUiCommandPaletteProps extends Pick<
	TLUiCommandPaletteShellProps,
	'position' | 'suggestions'
> {
	/**
	 * Where {@link CommandPaletteActionGroup}s list actions, merged over
	 * {@link defaultCommandPaletteActionGroups}: an action id to the `group` that lists it, or
	 * `false` to leave the action out.
	 */
	actionGroups?: TLUiCommandPaletteActionGroups
	/** Replaces {@link DefaultCommandPaletteContent}. */
	children?: ReactNode
}

/** @public */
export interface TLUiDefaultCommandPaletteProps extends TLUiCommandPaletteProps {
	/** Closes the palette. Defaults to closing the palette that {@link CommandPalette} opens. */
	onClose?(): void
}

/** @internal */
export function useCloseCommandPalette() {
	const editor = useEditor()
	return useCallback(() => {
		commandPaletteOpen.set(editor, false)
	}, [editor])
}

/**
 * A {@link CommandPaletteShell} with {@link DefaultCommandPaletteContent}, or `children` instead.
 * {@link CommandPalette} renders it while the palette is open. Needs an editor.
 *
 * @public @react
 */
export const DefaultCommandPalette = memo(function DefaultCommandPalette({
	position,
	suggestions,
	actionGroups,
	onClose,
	children,
}: TLUiDefaultCommandPaletteProps) {
	const close = useCloseCommandPalette()
	const groups = useMemo(
		() => (actionGroups ? { ...defaultCommandPaletteActionGroups, ...actionGroups } : undefined),
		[actionGroups]
	)
	const content = children ?? <DefaultCommandPaletteContent />
	return (
		<CommandPaletteShell position={position} suggestions={suggestions} onClose={onClose ?? close}>
			{groups ? (
				<CommandPaletteActionGroupsProvider value={groups}>
					{content}
				</CommandPaletteActionGroupsProvider>
			) : (
				content
			)}
		</CommandPaletteShell>
	)
})
