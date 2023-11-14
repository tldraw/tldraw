import {
	DefaultColorStyle,
	TLDefaultColorStyle,
	getDefaultColorTheme,
	useEditor,
	useValue,
} from '@tldraw/editor'
import { useCallback } from 'react'
import { useRelevantStyles } from '../hooks/useRevelantStyles'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { StylePanel } from './StylePanel/StylePanel'
import { Button } from './primitives/Button'
import { Icon } from './primitives/Icon'
import { Popover, PopoverContent, PopoverTrigger } from './primitives/Popover'

export function MobileStylePanel() {
	const editor = useEditor()
	const msg = useTranslation()

	const relevantStyles = useRelevantStyles()
	const color = relevantStyles?.styles.get(DefaultColorStyle)
	const theme = getDefaultColorTheme({ isDarkMode: editor.user.getIsDarkMode() })
	const currentColor = (
		color?.type === 'shared' ? theme[color.value as TLDefaultColorStyle] : theme.black
	).solid

	const disableStylePanel = useValue(
		'isHandOrEraserToolActive',
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

	return (
		<Popover id="style menu" onOpenChange={handleStylesOpenChange}>
			<PopoverTrigger disabled={disableStylePanel}>
				<Button
					type="tool"
					data-testid="mobile.styles"
					style={{
						color: disableStylePanel ? 'var(--color-muted-1)' : currentColor,
					}}
					title={msg('style-panel.title')}
				>
					<Icon icon={disableStylePanel ? 'blob' : color?.type === 'mixed' ? 'mixed' : 'blob'} />
				</Button>
			</PopoverTrigger>
			<PopoverContent side="top" align="end">
				<StylePanel isMobile />
			</PopoverContent>
		</Popover>
	)
}
