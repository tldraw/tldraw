import { useEditor, useValue } from '@tldraw/editor'
import { useActions } from '../context/actions'
import { useTldrawUiComponents } from '../context/components'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { FollowingIndicator } from './FollowingIndicator'
import { TldrawUiLayout } from './TldrawUiLayout/TldrawUiLayout'
import { TldrawUiButton } from './primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from './primitives/Button/TldrawUiButtonIcon'

export function DefaultLayout() {
	const editor = useEditor()
	const {
		CursorChatBubble,
		Toasts,
		Dialogs,
		TopLeftPanel,
		TopCenterPanel,
		TopRightPanel,
		BottomLeftPanel,
		BottomCenterPanel,
		BottomRightPanel,
	} = useTldrawUiComponents()
	const isFocusMode = useValue('focus', () => editor.getInstanceState().isFocusMode, [editor])
	const msg = useTranslation()
	const { 'toggle-focus-mode': toggleFocus } = useActions()

	return (
		<TldrawUiLayout
			topLeft={
				isFocusMode ? (
					<TldrawUiButton
						type="icon"
						className="tlui-focus-button"
						title={msg('focus-mode.toggle-focus-mode')}
						onClick={() => toggleFocus.onSelect('menu')}
					>
						<TldrawUiButtonIcon icon="dot" />
					</TldrawUiButton>
				) : (
					TopLeftPanel && <TopLeftPanel />
				)
			}
			topCenter={!isFocusMode && TopCenterPanel && <TopCenterPanel />}
			topRight={!isFocusMode && TopRightPanel && <TopRightPanel />}
			bottomLeft={!isFocusMode && BottomLeftPanel && <BottomLeftPanel />}
			bottomCenter={!isFocusMode && BottomCenterPanel && <BottomCenterPanel />}
			bottomRight={!isFocusMode && BottomRightPanel && <BottomRightPanel />}
		>
			{Toasts && <Toasts />}
			{Dialogs && <Dialogs />}
			<FollowingIndicator />
			{CursorChatBubble && <CursorChatBubble />}
		</TldrawUiLayout>
	)
}
