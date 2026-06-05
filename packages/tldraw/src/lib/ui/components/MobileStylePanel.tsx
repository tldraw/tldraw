import {
	DefaultColorStyle,
	TLDefaultColorStyle,
	getColorValue,
	useEditor,
	useValue,
} from '@tldraw/editor'
import { useCallback } from 'react'
import { useTldrawUiComponents } from '../context/components'
import { useRelevantStyles } from '../hooks/useRelevantStyles'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from './primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from './primitives/Button/TldrawUiButtonIcon'
import { useTldrawUiOrientation } from './primitives/layout'
import {
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
} from './primitives/TldrawUiPopover'

/** @public @react */
export function MobileStylePanel() {
	const editor = useEditor()
	const msg = useTranslation()
	const { orientation } = useTldrawUiOrientation()
	const relevantStyles = useRelevantStyles()
	const color = relevantStyles?.get(DefaultColorStyle)
	const currentColor = useValue(
		'mobile style panel current color',
		() => {
			const colors = editor.getCurrentTheme().colors[editor.getColorMode()]
			return color?.type === 'shared'
				? getColorValue(colors, color.value as TLDefaultColorStyle, 'solid')
				: getColorValue(colors, 'black', 'solid')
		},
		[editor, color]
	)

	const disableStylePanel = useValue(
		'disable style panel',
		() => editor.isInAny('hand', 'zoom', 'eraser', 'laser'),
		[editor]
	)

	const handleStylesOpenChange = useCallback(
		(isOpen: boolean) => {
			if (!isOpen) {
				editor.updateInstanceState({ isChangingStyle: false })
			}
		},
		[editor]
	)

	const { StylePanel } = useTldrawUiComponents()
	if (!StylePanel) return null

	return (
		<TldrawUiPopover id="mobile style menu" onOpenChange={handleStylesOpenChange}>
			<TldrawUiPopoverTrigger>
				<TldrawUiButton
					type="tool"
					data-testid="mobile-styles.button"
					style={{
						color: disableStylePanel ? 'var(--tl-color-muted-1)' : currentColor,
					}}
					title={msg('style-panel.title')}
					disabled={disableStylePanel}
				>
					<TldrawUiButtonIcon
						icon={disableStylePanel ? 'blob' : color?.type === 'mixed' ? 'mixed' : 'blob'}
					/>
				</TldrawUiButton>
			</TldrawUiPopoverTrigger>
			<TldrawUiPopoverContent side={orientation === 'horizontal' ? 'top' : 'right'} align="end">
				{StylePanel && <StylePanel isMobile />}
			</TldrawUiPopoverContent>
		</TldrawUiPopover>
	)
}
