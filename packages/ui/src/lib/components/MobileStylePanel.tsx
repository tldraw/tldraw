import { DefaultColorStyle, getDefaultColorTheme, useEditor } from '@tldraw/editor'
import { useValue } from '@tldraw/state'
import { useCallback } from 'react'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { StylePanel } from './StylePanel/StylePanel'
import { Button } from './primitives/Button'
import { Icon } from './primitives/Icon'
import { Popover, PopoverContent, PopoverTrigger } from './primitives/Popover'

export function MobileStylePanel() {
	const editor = useEditor()
	const msg = useTranslation()

	const currentColor = useValue(
		'current color',
		() => {
			const color = editor.sharedStyles.get(DefaultColorStyle)
			if (!color) return 'var(--color-muted-1)'
			if (color.type === 'mixed') return null
			const theme = getDefaultColorTheme(editor)
			return theme[color.value].solid
		},
		[editor]
	)

	const disableStylePanel = useValue(
		'isHandOrEraserToolActive',
		() => editor.isInAny('hand', 'zoom', 'eraser', 'laser'),
		[editor]
	)

	const handleStylesOpenChange = useCallback(
		(isOpen: boolean) => {
			if (!isOpen) {
				editor.isChangingStyle = false
			}
		},
		[editor]
	)

	return (
		<Popover id="style menu" onOpenChange={handleStylesOpenChange}>
			<PopoverTrigger disabled={disableStylePanel}>
				<Button
					className="tlui-toolbar__tools__button tlui-toolbar__styles__button"
					data-testid="mobile.styles"
					style={{ color: currentColor ?? 'var(--color-text)' }}
					title={msg('style-panel.title')}
				>
					<Icon icon={currentColor ? 'blob' : 'mixed'} />
				</Button>
			</PopoverTrigger>
			<PopoverContent side="top" align="end">
				<StylePanel isMobile />
			</PopoverContent>
		</Popover>
	)
}
