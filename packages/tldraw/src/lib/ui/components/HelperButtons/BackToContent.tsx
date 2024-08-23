import { useActions } from '../../context/actions'
import { useShowBackToContent } from '../../hooks/menu-hooks'
import { TldrawUiMenuActionItem } from '../primitives/menus/TldrawUiMenuActionItem'

export function BackToContent() {
	const actions = useActions()

	const [showBackToContent, setShowBackToContent] = useShowBackToContent()
	if (!showBackToContent) return null

	return (
		<TldrawUiMenuActionItem
			actionId="back-to-content"
			onSelect={() => {
				actions['back-to-content'].onSelect('helper-buttons')
				setShowBackToContent(false)
			}}
		/>
	)
}
