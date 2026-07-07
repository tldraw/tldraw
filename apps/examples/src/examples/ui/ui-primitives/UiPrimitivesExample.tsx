import {
	TlButton,
	TlButtonIcon,
	TlButtonLabel,
	TlDropdownMenuCheckboxItem,
	TlDropdownMenuContent,
	TlDropdownMenuGroup,
	TlDropdownMenuItem,
	TlDropdownMenuRoot,
	TlDropdownMenuSub,
	TlDropdownMenuSubContent,
	TlDropdownMenuSubTrigger,
	TlDropdownMenuTrigger,
	TlIcon,
	TlInput,
	TlKbd,
	TlPopover,
	TlPopoverContent,
	TlPopoverTrigger,
	TlSelect,
	TlSelectContent,
	TlSelectItem,
	TlSelectTrigger,
	TlSelectValue,
	TlSlider,
	TlTooltip,
} from '@tldraw/ui'
import { useState } from 'react'
import { iconTypes, Tldraw, TLEditorComponents, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import { ExampleTlUiProvider } from '../../../misc/ExampleTlUiProvider'
import './ui-primitives.css'

// [1]
function UiShowcase() {
	const editor = useEditor()
	const [checkboxValue, setCheckboxValue] = useState(false)
	const [inputValue, setInputValue] = useState('')
	const [sliderValue, setSliderValue] = useState(50)
	const [selectValue, setSelectValue] = useState('medium')

	return (
		<ExampleTlUiProvider>
			<div className="ui-showcase" onPointerDown={editor.markEventAsHandled}>
				<h2>UI primitives</h2>

				{/* Buttons */}
				<section>
					<h3>Buttons</h3>
					<div className="ui-row">
						<TlButton type="normal" onClick={() => {}}>
							<TlButtonLabel>Normal</TlButtonLabel>
						</TlButton>
						<TlButton type="primary" onClick={() => {}}>
							<TlButtonLabel>Primary</TlButtonLabel>
						</TlButton>
						<TlButton type="danger" onClick={() => {}}>
							<TlButtonLabel>Danger</TlButtonLabel>
						</TlButton>
						<TlButton type="normal" disabled>
							<TlButtonLabel>Disabled</TlButtonLabel>
						</TlButton>
					</div>
					<div className="ui-row">
						<TlButton type="icon" title="Draw tool">
							<TlButtonIcon icon="tool-pencil" />
						</TlButton>
						<TlButton type="icon" title="Eraser tool">
							<TlButtonIcon icon="tool-eraser" />
						</TlButton>
						<TlButton type="icon" title="Select tool">
							<TlButtonIcon icon="tool-pointer" />
						</TlButton>
						<TlButton type="normal">
							<TlButtonIcon icon="external-link" />
							<TlButtonLabel>With icon</TlButtonLabel>
						</TlButton>
					</div>
				</section>

				{/* Dropdown Menu */}
				<section>
					<h3>Dropdown menu</h3>
					<div className="ui-row">
						<TlDropdownMenuRoot id="example-dropdown">
							<TlDropdownMenuTrigger>
								<TlButton type="normal">
									<TlButtonLabel>Open menu</TlButtonLabel>
								</TlButton>
							</TlDropdownMenuTrigger>
							<TlDropdownMenuContent side="bottom" align="start">
								<TlDropdownMenuGroup>
									<TlDropdownMenuItem>
										<TlButton type="menu">
											<TlButtonLabel>Cut</TlButtonLabel>
											<TlKbd>⌘X</TlKbd>
										</TlButton>
									</TlDropdownMenuItem>
									<TlDropdownMenuItem>
										<TlButton type="menu">
											<TlButtonLabel>Copy</TlButtonLabel>
											<TlKbd>⌘C</TlKbd>
										</TlButton>
									</TlDropdownMenuItem>
									<TlDropdownMenuItem>
										<TlButton type="menu">
											<TlButtonLabel>Paste</TlButtonLabel>
											<TlKbd>⌘V</TlKbd>
										</TlButton>
									</TlDropdownMenuItem>
								</TlDropdownMenuGroup>
								<TlDropdownMenuGroup>
									<TlDropdownMenuCheckboxItem
										checked={checkboxValue}
										title="Toggle option"
										onSelect={() => setCheckboxValue(!checkboxValue)}
									>
										<TlButtonLabel>Checkbox item</TlButtonLabel>
									</TlDropdownMenuCheckboxItem>
								</TlDropdownMenuGroup>
								<TlDropdownMenuGroup>
									<TlDropdownMenuSub id="example-submenu">
										<TlDropdownMenuSubTrigger label="More options..." />
										<TlDropdownMenuSubContent>
											<TlDropdownMenuItem>
												<TlButton type="menu">
													<TlButtonLabel>Option A</TlButtonLabel>
												</TlButton>
											</TlDropdownMenuItem>
											<TlDropdownMenuItem>
												<TlButton type="menu">
													<TlButtonLabel>Option B</TlButtonLabel>
												</TlButton>
											</TlDropdownMenuItem>
										</TlDropdownMenuSubContent>
									</TlDropdownMenuSub>
								</TlDropdownMenuGroup>
							</TlDropdownMenuContent>
						</TlDropdownMenuRoot>
					</div>
				</section>

				{/* Select */}
				<section>
					<h3>Select</h3>
					<div className="ui-row">
						<TlSelect id="size-select-icons" value={selectValue} onValueChange={setSelectValue}>
							<TlSelectTrigger>
								<TlSelectValue placeholder="Select size...">{selectValue}</TlSelectValue>
							</TlSelectTrigger>
							<TlSelectContent>
								<TlSelectItem value="small" label="Small" icon="size-small" />
								<TlSelectItem value="medium" label="Medium" icon="size-medium" />
								<TlSelectItem value="large" label="Large" icon="size-large" />
							</TlSelectContent>
						</TlSelect>
						<TlSelect id="size-select" value={selectValue} onValueChange={setSelectValue}>
							<TlSelectTrigger>
								<TlSelectValue placeholder="Select...">{selectValue}</TlSelectValue>
							</TlSelectTrigger>
							<TlSelectContent>
								<TlSelectItem value="small" label="Small" />
								<TlSelectItem value="medium" label="Medium" />
								<TlSelectItem value="large" label="Large" />
							</TlSelectContent>
						</TlSelect>
						<TlSelect
							id="size-select-disabled"
							value={selectValue}
							onValueChange={setSelectValue}
							disabled
						>
							<TlSelectTrigger>
								<TlSelectValue placeholder="Select...">{selectValue}</TlSelectValue>
							</TlSelectTrigger>
							<TlSelectContent>
								<TlSelectItem value="small" label="Small" />
								<TlSelectItem value="medium" label="Medium" />
								<TlSelectItem value="large" label="Large" />
							</TlSelectContent>
						</TlSelect>
					</div>
				</section>

				{/* Input */}
				<section>
					<h3>Input</h3>
					<div className="ui-row">
						<TlInput placeholder="Enter text..." value={inputValue} onValueChange={setInputValue} />
					</div>
				</section>

				{/* Slider */}
				<section>
					<h3>Slider</h3>
					<div className="ui-row ui-row-wide">
						<TlSlider
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
						<TlPopover id="example-popover">
							<TlPopoverTrigger>
								<TlButton type="normal">
									<TlButtonLabel>Open popover</TlButtonLabel>
								</TlButton>
							</TlPopoverTrigger>
							<TlPopoverContent side="bottom" align="start">
								<div className="ui-popover-content">
									<p>This is popover content!</p>
									<p>It can contain any elements.</p>
								</div>
							</TlPopoverContent>
						</TlPopover>
					</div>
				</section>

				{/* Icons */}
				<section>
					<h3>Icons ({iconTypes.length})</h3>
					<div className="ui-icon-grid">
						{iconTypes.map((icon: (typeof iconTypes)[number]) => (
							<TlTooltip key={icon} content={icon}>
								<div className="ui-icon-cell">
									<TlIcon icon={icon} label={icon} />
								</div>
							</TlTooltip>
						))}
					</div>
				</section>

				{/* Tooltip */}
				<section>
					<h3>Tooltip</h3>
					<div className="ui-row">
						<TlTooltip content="This is a tooltip!">
							<TlButton type="normal">
								<TlButtonLabel>Hover me</TlButtonLabel>
							</TlButton>
						</TlTooltip>
						<TlTooltip content="Info tooltip">
							<TlButton type="icon" title="Info">
								<TlButtonIcon icon="question-mark" />
							</TlButton>
						</TlTooltip>
					</div>
				</section>

				{/* Keyboard shortcuts */}
				<section>
					<h3>Keyboard shortcuts</h3>
					<div className="ui-row">
						<TlKbd>⌘</TlKbd>
						<TlKbd>⇧</TlKbd>
						<TlKbd>⌥</TlKbd>
						<TlKbd>⌃</TlKbd>
						<TlKbd>⌘S</TlKbd>
						<TlKbd>⌘⇧Z</TlKbd>
					</div>
				</section>
			</div>
		</ExampleTlUiProvider>
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
