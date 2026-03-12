import { useState } from 'react'
import {
	iconTypes,
	Tldraw,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiButtonLabel,
	TldrawUiDropdownMenuCheckboxItem,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuGroup,
	TldrawUiDropdownMenuItem,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuSub,
	TldrawUiDropdownMenuSubContent,
	TldrawUiDropdownMenuSubTrigger,
	TldrawUiDropdownMenuTrigger,
	TldrawUiIcon,
	TldrawUiInput,
	TldrawUiKbd,
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
	TldrawUiSelect,
	TldrawUiSelectContent,
	TldrawUiSelectItem,
	TldrawUiSelectTrigger,
	TldrawUiSelectValue,
	TldrawUiSlider,
	TldrawUiTooltip,
	TLEditorComponents,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './ui-primitives.css'

// [1]
function UiShowcase() {
	const editor = useEditor()
	const [checkboxValue, setCheckboxValue] = useState(false)
	const [inputValue, setInputValue] = useState('')
	const [sliderValue, setSliderValue] = useState(50)
	const [selectValue, setSelectValue] = useState('medium')

	return (
		<div className="ui-showcase" onPointerDown={editor.markEventAsHandled}>
			<h2>UI primitives</h2>

			{/* Buttons */}
			<section>
				<h3>Buttons</h3>
				<div className="ui-row">
					<TldrawUiButton type="normal" onClick={() => {}}>
						<TldrawUiButtonLabel>Normal</TldrawUiButtonLabel>
					</TldrawUiButton>
					<TldrawUiButton type="primary" onClick={() => {}}>
						<TldrawUiButtonLabel>Primary</TldrawUiButtonLabel>
					</TldrawUiButton>
					<TldrawUiButton type="danger" onClick={() => {}}>
						<TldrawUiButtonLabel>Danger</TldrawUiButtonLabel>
					</TldrawUiButton>
					<TldrawUiButton type="normal" disabled>
						<TldrawUiButtonLabel>Disabled</TldrawUiButtonLabel>
					</TldrawUiButton>
				</div>
				<div className="ui-row">
					<TldrawUiButton type="icon" title="Draw tool">
						<TldrawUiButtonIcon icon="tool-pencil" />
					</TldrawUiButton>
					<TldrawUiButton type="icon" title="Eraser tool">
						<TldrawUiButtonIcon icon="tool-eraser" />
					</TldrawUiButton>
					<TldrawUiButton type="icon" title="Select tool">
						<TldrawUiButtonIcon icon="tool-pointer" />
					</TldrawUiButton>
					<TldrawUiButton type="normal">
						<TldrawUiButtonIcon icon="external-link" />
						<TldrawUiButtonLabel>With icon</TldrawUiButtonLabel>
					</TldrawUiButton>
				</div>
			</section>

			{/* Dropdown Menu */}
			<section>
				<h3>Dropdown menu</h3>
				<div className="ui-row">
					<TldrawUiDropdownMenuRoot id="example-dropdown">
						<TldrawUiDropdownMenuTrigger>
							<TldrawUiButton type="normal">
								<TldrawUiButtonLabel>Open menu</TldrawUiButtonLabel>
							</TldrawUiButton>
						</TldrawUiDropdownMenuTrigger>
						<TldrawUiDropdownMenuContent side="bottom" align="start">
							<TldrawUiDropdownMenuGroup>
								<TldrawUiDropdownMenuItem>
									<TldrawUiButton type="menu">
										<TldrawUiButtonLabel>Cut</TldrawUiButtonLabel>
										<TldrawUiKbd>⌘X</TldrawUiKbd>
									</TldrawUiButton>
								</TldrawUiDropdownMenuItem>
								<TldrawUiDropdownMenuItem>
									<TldrawUiButton type="menu">
										<TldrawUiButtonLabel>Copy</TldrawUiButtonLabel>
										<TldrawUiKbd>⌘C</TldrawUiKbd>
									</TldrawUiButton>
								</TldrawUiDropdownMenuItem>
								<TldrawUiDropdownMenuItem>
									<TldrawUiButton type="menu">
										<TldrawUiButtonLabel>Paste</TldrawUiButtonLabel>
										<TldrawUiKbd>⌘V</TldrawUiKbd>
									</TldrawUiButton>
								</TldrawUiDropdownMenuItem>
							</TldrawUiDropdownMenuGroup>
							<TldrawUiDropdownMenuGroup>
								<TldrawUiDropdownMenuCheckboxItem
									checked={checkboxValue}
									title="Toggle option"
									onSelect={() => setCheckboxValue(!checkboxValue)}
								>
									<TldrawUiButtonLabel>Checkbox item</TldrawUiButtonLabel>
								</TldrawUiDropdownMenuCheckboxItem>
							</TldrawUiDropdownMenuGroup>
							<TldrawUiDropdownMenuGroup>
								<TldrawUiDropdownMenuSub id="example-submenu">
									<TldrawUiDropdownMenuSubTrigger label="More options..." />
									<TldrawUiDropdownMenuSubContent>
										<TldrawUiDropdownMenuItem>
											<TldrawUiButton type="menu">
												<TldrawUiButtonLabel>Option A</TldrawUiButtonLabel>
											</TldrawUiButton>
										</TldrawUiDropdownMenuItem>
										<TldrawUiDropdownMenuItem>
											<TldrawUiButton type="menu">
												<TldrawUiButtonLabel>Option B</TldrawUiButtonLabel>
											</TldrawUiButton>
										</TldrawUiDropdownMenuItem>
									</TldrawUiDropdownMenuSubContent>
								</TldrawUiDropdownMenuSub>
							</TldrawUiDropdownMenuGroup>
						</TldrawUiDropdownMenuContent>
					</TldrawUiDropdownMenuRoot>
				</div>
			</section>

			{/* Select */}
			<section>
				<h3>Select</h3>
				<div className="ui-row">
					<TldrawUiSelect id="size-select-icons" value={selectValue} onValueChange={setSelectValue}>
						<TldrawUiSelectTrigger>
							<TldrawUiSelectValue placeholder="Select size...">{selectValue}</TldrawUiSelectValue>
						</TldrawUiSelectTrigger>
						<TldrawUiSelectContent>
							<TldrawUiSelectItem value="small" label="Small" icon="size-small" />
							<TldrawUiSelectItem value="medium" label="Medium" icon="size-medium" />
							<TldrawUiSelectItem value="large" label="Large" icon="size-large" />
						</TldrawUiSelectContent>
					</TldrawUiSelect>
					<TldrawUiSelect id="size-select" value={selectValue} onValueChange={setSelectValue}>
						<TldrawUiSelectTrigger>
							<TldrawUiSelectValue placeholder="Select...">{selectValue}</TldrawUiSelectValue>
						</TldrawUiSelectTrigger>
						<TldrawUiSelectContent>
							<TldrawUiSelectItem value="small" label="Small" />
							<TldrawUiSelectItem value="medium" label="Medium" />
							<TldrawUiSelectItem value="large" label="Large" />
						</TldrawUiSelectContent>
					</TldrawUiSelect>
					<TldrawUiSelect
						id="size-select-disabled"
						value={selectValue}
						onValueChange={setSelectValue}
						disabled
					>
						<TldrawUiSelectTrigger>
							<TldrawUiSelectValue placeholder="Select...">{selectValue}</TldrawUiSelectValue>
						</TldrawUiSelectTrigger>
						<TldrawUiSelectContent>
							<TldrawUiSelectItem value="small" label="Small" />
							<TldrawUiSelectItem value="medium" label="Medium" />
							<TldrawUiSelectItem value="large" label="Large" />
						</TldrawUiSelectContent>
					</TldrawUiSelect>
				</div>
			</section>

			{/* Input */}
			<section>
				<h3>Input</h3>
				<div className="ui-row">
					<TldrawUiInput
						placeholder="Enter text..."
						value={inputValue}
						onValueChange={setInputValue}
					/>
				</div>
			</section>

			{/* Slider */}
			<section>
				<h3>Slider</h3>
				<div className="ui-row ui-row-wide">
					<TldrawUiSlider
						label="opacity"
						title="Opacity"
						value={sliderValue}
						steps={100}
						onValueChange={setSliderValue}
					/>
					<span className="ui-value">{sliderValue}%</span>
				</div>
			</section>

			{/* Popover */}
			<section>
				<h3>Popover</h3>
				<div className="ui-row">
					<TldrawUiPopover id="example-popover">
						<TldrawUiPopoverTrigger>
							<TldrawUiButton type="normal">
								<TldrawUiButtonLabel>Open popover</TldrawUiButtonLabel>
							</TldrawUiButton>
						</TldrawUiPopoverTrigger>
						<TldrawUiPopoverContent side="bottom" align="start">
							<div className="ui-popover-content">
								<p>This is popover content!</p>
								<p>It can contain any elements.</p>
							</div>
						</TldrawUiPopoverContent>
					</TldrawUiPopover>
				</div>
			</section>

			{/* Icons */}
			<section>
				<h3>Icons ({iconTypes.length})</h3>
				<div className="ui-icon-grid">
					{iconTypes.map((icon: (typeof iconTypes)[number]) => (
						<TldrawUiTooltip key={icon} content={icon}>
							<div className="ui-icon-cell">
								<TldrawUiIcon icon={icon} label={icon} />
							</div>
						</TldrawUiTooltip>
					))}
				</div>
			</section>

			{/* Tooltip */}
			<section>
				<h3>Tooltip</h3>
				<div className="ui-row">
					<TldrawUiTooltip content="This is a tooltip!">
						<TldrawUiButton type="normal">
							<TldrawUiButtonLabel>Hover me</TldrawUiButtonLabel>
						</TldrawUiButton>
					</TldrawUiTooltip>
					{/* Note: TldrawUiKbd inside tooltips crashes outside TldrawUiContextProvider (see bug) */}
					<TldrawUiTooltip content="Info tooltip">
						<TldrawUiButton type="icon" title="Info">
							<TldrawUiButtonIcon icon="question-mark" />
						</TldrawUiButton>
					</TldrawUiTooltip>
				</div>
			</section>

			{/* Keyboard shortcuts */}
			<section>
				<h3>Keyboard shortcuts</h3>
				<div className="ui-row">
					<TldrawUiKbd>⌘</TldrawUiKbd>
					<TldrawUiKbd>⇧</TldrawUiKbd>
					<TldrawUiKbd>⌥</TldrawUiKbd>
					<TldrawUiKbd>⌃</TldrawUiKbd>
					<TldrawUiKbd>⌘S</TldrawUiKbd>
					<TldrawUiKbd>⌘⇧Z</TldrawUiKbd>
				</div>
			</section>
		</div>
	)
}

// [2]
const components: TLEditorComponents = {
	OnTheCanvas: UiShowcase,
}

export default function UiPrimitivesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="ui-primitives-example" components={components} />
		</div>
	)
}

/*
[1]
This component demonstrates all the UI primitives available in tldraw. We use
editor.markEventAsHandled on pointer down to prevent the canvas from receiving
pointer events when interacting with the UI components.

[2]
We use OnTheCanvas to render our UI showcase directly on the canvas. This lets
you zoom in and inspect the components at different scales - useful for pixel
peeping! We also hide the default UI with hideUi since we're showcasing the
primitives themselves.
*/
