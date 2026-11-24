import type { ReactNode } from 'react'
import type { TLLibrary } from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import { CaretDownIcon } from '../ui/caret-down-icon'
import { RenameInput } from '../ui/rename-input'

/** @public */
export interface LibrarySectionHeaderProps {
	/** The panel's source. */
	source: LibrarySource
	library: TLLibrary
	/** Whether the library is folded shut, hiding its items. */
	collapsed: boolean
	onToggleCollapsed(): void
	/**
	 * The library's menu: the `LibraryMenu` slot, wired to rename, delete, copy and remove the
	 * library from the file as the source allows. It has no button of its own: it opens on a
	 * right-click, a long press on touch, or the context menu key or Shift+F10 on the header, over
	 * the header, so render it inside the header. It stays while renaming.
	 */
	menu: ReactNode
	/**
	 * Whether the library's name is being edited, after Rename in its menu or when it's new. Show
	 * an input in place of the name, and end the rename with `onRenameComplete` or `onRenameCancel`.
	 */
	isRenaming: boolean
	/** Renames the library, unless the name is blank or unchanged, and ends renaming. */
	onRenameComplete(name: string): void
	/** Ends renaming and keeps the name. */
	onRenameCancel(): void
}

/**
 * A library's name, which folds it shut, and its menu. While renaming, an input in place of the
 * name. The default for {@link LibrariesComponents.LibrarySectionHeader}.
 * @public @react
 */
export function LibrarySectionHeader({
	library,
	collapsed,
	onToggleCollapsed,
	menu,
	isRenaming,
	onRenameComplete,
	onRenameCancel,
}: LibrarySectionHeaderProps) {
	return (
		<header className="tlui-libraries-panel__header">
			{isRenaming ? (
				<RenameInput
					className="tlui-libraries-panel__rename"
					defaultValue={library.name}
					onComplete={onRenameComplete}
					onCancel={onRenameCancel}
				/>
			) : (
				<button
					type="button"
					className="tlui-libraries-panel__title tlui-libraries-panel__toggle"
					aria-expanded={!collapsed}
					onClick={onToggleCollapsed}
				>
					<span className="tlui-libraries-panel__name">{library.name}</span>
					<CaretDownIcon className="tlui-libraries-chevron" />
				</button>
			)}
			<div className="tlui-libraries-panel__header-actions">{menu}</div>
		</header>
	)
}
