import {
	DefaultColorStyle,
	TLDefaultColorStyle,
	getColorValue,
	useEditor,
	useValue,
} from '@tldraw/editor'
import { TlButton } from '@tldraw/ui'
import { TlButtonIcon } from '@tldraw/ui'
import { useTlOrientation } from '@tldraw/ui'
import { TlPopover, TlPopoverContent, TlPopoverTrigger } from '@tldraw/ui'
import { useCallback } from 'react'
import { useTldrawUiComponents } from '../context/components'
import { useRelevantStyles } from '../hooks/useRelevantStyles'
import { useTranslation } from '../hooks/useTranslation/useTranslation'

/** @public @react */
export function MobileStylePanel() {
	const editor = useEditor()
	const msg = useTranslation()
	const { orientation } = useTlOrientation()
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
		<TlPopover id="mobile style menu" onOpenChange={handleStylesOpenChange}>
			<TlPopoverTrigger>
				<TlButton
					type="tool"
					data-testid="mobile-styles.button"
					style={{
						color: disableStylePanel ? 'var(--tl-color-muted-1)' : currentColor,
					}}
					title={msg('style-panel.title')}
					disabled={disableStylePanel}
				>
					<TlButtonIcon
						icon={disableStylePanel ? 'blob' : color?.type === 'mixed' ? 'mixed' : 'blob'}
					/>
				</TlButton>
			</TlPopoverTrigger>
			<TlPopoverContent side={orientation === 'horizontal' ? 'top' : 'right'} align="end">
				{StylePanel && <StylePanel isMobile />}
			</TlPopoverContent>
		</TlPopover>
	)
}
