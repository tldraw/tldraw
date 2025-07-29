import { useRef, useState } from 'react'
import {
	AssetToolbarItem,
	CheckBoxToolbarItem,
	CloudToolbarItem,
	DiamondToolbarItem,
	DrawToolbarItem,
	EllipseToolbarItem,
	HandToolbarItem,
	HeartToolbarItem,
	HexagonToolbarItem,
	HighlightToolbarItem,
	LaserToolbarItem,
	NoteToolbarItem,
	OvalToolbarItem,
	RectangleToolbarItem,
	RhombusToolbarItem,
	SelectToolbarItem,
	StarToolbarItem,
	TextToolbarItem,
	TldrawUiButtonIcon,
	TldrawUiMenuContextProvider,
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
	TldrawUiToolbar,
	TldrawUiToolbarButton,
	tlmenus,
	TriangleToolbarItem,
	useEditor,
	usePassThroughWheelEvents,
	useTranslation,
	useUniqueSafeId,
	XBoxToolbarItem,
} from 'tldraw'
import { DraggableToolbarItem } from './DraggableToolbarItem'
import { MathematicalToolbarItem } from './MathematicalToolbarItem'

export function WorkflowToolbar() {
	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref)
	const popoverId = 'toolbar overflow'
	const msg = useTranslation()
	const [isOpen, setIsOpen] = useState(false)
	const id = useUniqueSafeId()
	const editor = useEditor()

	return (
		<div ref={ref} className="WorkflowToolbar tlui-toolbar tlui-toolbar__vertical">
			<div className="tlui-toolbar__inner">
				<TldrawUiToolbar
					className="tlui-toolbar__tools"
					label={msg('tool-panel.title')}
					orientation="vertical"
				>
					<div id={`${id}_main`} className="tlui-toolbar__tools__list tlui-buttons__vertical">
						<TldrawUiMenuContextProvider type="toolbar" sourceId="toolbar">
							<SelectToolbarItem />
							<HandToolbarItem />
							<DrawToolbarItem />
							<DraggableToolbarItem toolId="note">
								<NoteToolbarItem />
							</DraggableToolbarItem>

							<div
								style={{
									width: '100%',
									height: 1,
									margin: '2px 0',
									backgroundColor: 'var(--color-muted-2)',
								}}
							/>

							<MathematicalToolbarItem />
						</TldrawUiMenuContextProvider>

						<TldrawUiPopover id={popoverId} open={isOpen} onOpenChange={setIsOpen}>
							<TldrawUiPopoverTrigger>
								<TldrawUiToolbarButton
									title={msg('tool-panel.more')}
									type="tool"
									data-testid="tools.more-button"
								>
									<TldrawUiButtonIcon icon="chevron-right" />
								</TldrawUiToolbarButton>
							</TldrawUiPopoverTrigger>
							<TldrawUiPopoverContent side="right" align="center">
								<TldrawUiToolbar
									className="tlui-buttons__grid"
									data-testid="tools.more-content"
									label={msg('tool-panel.more')}
									id={`${id}_more`}
									onClick={() => {
										tlmenus.deleteOpenMenu(popoverId, editor.contextId)
										setIsOpen(false)
									}}
								>
									<TldrawUiMenuContextProvider type="toolbar-overflow" sourceId="toolbar">
										<DraggableToolbarItem toolId="text">
											<TextToolbarItem />
										</DraggableToolbarItem>
										<AssetToolbarItem />
										<HighlightToolbarItem />
										<LaserToolbarItem />

										<DraggableToolbarItem toolId="rectangle">
											<RectangleToolbarItem />
										</DraggableToolbarItem>
										<DraggableToolbarItem toolId="ellipse">
											<EllipseToolbarItem />
										</DraggableToolbarItem>
										<DraggableToolbarItem toolId="triangle">
											<TriangleToolbarItem />
										</DraggableToolbarItem>
										<DraggableToolbarItem toolId="diamond">
											<DiamondToolbarItem />
										</DraggableToolbarItem>

										<DraggableToolbarItem toolId="hexagon">
											<HexagonToolbarItem />
										</DraggableToolbarItem>
										<DraggableToolbarItem toolId="oval">
											<OvalToolbarItem />
										</DraggableToolbarItem>
										<DraggableToolbarItem toolId="rhombus">
											<RhombusToolbarItem />
										</DraggableToolbarItem>
										<DraggableToolbarItem toolId="star">
											<StarToolbarItem />
										</DraggableToolbarItem>
										<DraggableToolbarItem toolId="cloud">
											<CloudToolbarItem />
										</DraggableToolbarItem>
										<DraggableToolbarItem toolId="heart">
											<HeartToolbarItem />
										</DraggableToolbarItem>
										<DraggableToolbarItem toolId="x-box">
											<XBoxToolbarItem />
										</DraggableToolbarItem>
										<DraggableToolbarItem toolId="check-box">
											<CheckBoxToolbarItem />
										</DraggableToolbarItem>
									</TldrawUiMenuContextProvider>
								</TldrawUiToolbar>
							</TldrawUiPopoverContent>
						</TldrawUiPopover>
					</div>
				</TldrawUiToolbar>
			</div>
		</div>
	)
}
