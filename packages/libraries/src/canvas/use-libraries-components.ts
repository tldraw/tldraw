import { useMemo } from 'react'
import { ItemMenu } from '../ui/item-menu'
import { ItemTile } from '../ui/item-tile'
import { LibraryMenu } from '../ui/library-menu'
import { AddSelectionTile } from './add-selection-tile'
import { EmptyLibrary } from './empty-library'
import { type LibrariesComponents, useLibrariesComponentOverrides } from './libraries-components'
import { LibrariesPanelHeader } from './libraries-panel-header'
import { LibrarySectionHeader } from './library-section-header'
import { LibraryTabLabel } from './library-tab-label'
import { NoLibraries } from './no-libraries'

/**
 * The libraries UI's components: the defaults, with the overrides from the nearest
 * {@link LibrariesComponentsProvider} in their place. A hidden slot is `null`.
 * @public
 */
export function useLibrariesComponents(): Required<LibrariesComponents> {
	const overrides = useLibrariesComponentOverrides()
	return useMemo(
		() => ({
			LibrariesPanelHeader,
			LibraryTabLabel,
			NoLibraries,
			LibrarySectionHeader,
			LibraryMenu,
			EmptyLibrary,
			ItemTile,
			ItemMenu,
			AddSelectionTile,
			...overrides,
		}),
		[overrides]
	)
}
