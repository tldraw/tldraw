import {
	DefaultFontStyle,
	DefaultStylePanel,
	StylePanelArrowheadPicker,
	StylePanelArrowKindPicker,
	StylePanelDashPicker,
	StylePanelFillPicker,
	StylePanelFontPicker,
	StylePanelGeoShapePicker,
	StylePanelLabelAlignPicker,
	StylePanelOpacityPicker,
	StylePanelSection,
	StylePanelSizePicker,
	StylePanelSplinePicker,
	StylePanelTextAlignPicker,
	TldrawUiIcon,
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
	useEditor,
	useRelevantStyles,
} from 'tldraw'

export function WhiteboardStyleMenus() {
	const editor = useEditor()
	const styles = useRelevantStyles()

	return (
		<TldrawUiPopover
			id="whiteboard styles"
			onOpenChange={(open) => {
				if (!open) editor.updateInstanceState({ isChangingStyle: false })
			}}
		>
			<TldrawUiPopoverTrigger>
				<button
					type="button"
					className="whiteboard-button whiteboard-style-trigger"
					aria-label="Shape styles"
					title="Shape styles"
					disabled={!styles}
				>
					<TldrawUiIcon icon="blob" label="" />
				</button>
			</TldrawUiPopoverTrigger>
			<TldrawUiPopoverContent side="top" align="end" collisionPadding={12}>
				<DefaultStylePanel isMobile styles={styles}>
					<StylePanelSection>
						<StylePanelOpacityPicker />
					</StylePanelSection>
					<StylePanelSection>
						<StylePanelFillPicker />
						<StylePanelDashPicker />
						{styles?.get(DefaultFontStyle) && <StylePanelSizePicker />}
					</StylePanelSection>
					<StylePanelSection>
						<StylePanelFontPicker />
						<StylePanelTextAlignPicker />
						<StylePanelLabelAlignPicker />
					</StylePanelSection>
					<StylePanelSection>
						<StylePanelGeoShapePicker />
						<StylePanelArrowKindPicker />
						<StylePanelArrowheadPicker />
						<StylePanelSplinePicker />
					</StylePanelSection>
				</DefaultStylePanel>
			</TldrawUiPopoverContent>
		</TldrawUiPopover>
	)
}
