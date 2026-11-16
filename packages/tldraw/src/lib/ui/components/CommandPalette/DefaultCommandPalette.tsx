import { useEditor, useValue } from '@tldraw/editor'
import { ComponentType, ReactNode, memo, useCallback, useEffect } from 'react'
import { commandPaletteOpen } from './commandPaletteOpen'
import { CommandPaletteShell, TLUiCommandPaletteShellProps } from './CommandPaletteShell'
import { DefaultCommandPaletteContent } from './DefaultCommandPaletteContent'

/** @public */
export interface TLUiCommandPaletteProps extends Pick<
	TLUiCommandPaletteShellProps,
	'position' | 'suggestions'
> {
	/** Closes the palette. The `CommandPalette` slot is mounted only while the palette is open. */
	onClose?(): void
	/** Replaces {@link DefaultCommandPaletteContent}. */
	children?: ReactNode
}

function useCloseCommandPalette() {
	const editor = useEditor()
	return useCallback(() => {
		commandPaletteOpen.set(editor, false)
	}, [editor])
}

/**
 * A {@link CommandPaletteShell} with {@link DefaultCommandPaletteContent}, or `children` instead.
 *
 * @public @react
 */
export const DefaultCommandPalette = memo(function DefaultCommandPalette({
	position,
	suggestions,
	onClose,
	children,
}: TLUiCommandPaletteProps) {
	// Wrappers that don't forward props still need a way to close.
	const close = useCloseCommandPalette()
	return (
		<CommandPaletteShell position={position} suggestions={suggestions} onClose={onClose ?? close}>
			{children ?? <DefaultCommandPaletteContent />}
		</CommandPaletteShell>
	)
})

/**
 * Mounts the `CommandPalette` slot while the palette is open. Closes it if this unmounts while
 * open, so hiding the UI doesn't reopen the palette when it's shown again.
 *
 * @internal
 */
export function CommandPaletteSlot({
	component: CommandPalette,
}: {
	/** The `CommandPalette` slot's component. */
	component: ComponentType<TLUiCommandPaletteProps>
}) {
	const editor = useEditor()
	const isOpen = useValue('command palette open', () => commandPaletteOpen.get(editor), [editor])
	const close = useCloseCommandPalette()
	useEffect(() => close, [close])
	if (!isOpen) return null
	return <CommandPalette onClose={close} />
}
