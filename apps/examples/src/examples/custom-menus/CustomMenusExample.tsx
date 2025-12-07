import {
	DefaultActionsMenu,
	DefaultActionsMenuContent,
	DefaultColorStyle,
	DefaultContextMenu,
	DefaultContextMenuContent,
	DefaultDebugMenu,
	DefaultDebugMenuContent,
	DefaultHelpMenu,
	DefaultHelpMenuContent,
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	DefaultMainMenu,
	DefaultMainMenuContent,
	DefaultPageMenu,
	DefaultQuickActions,
	DefaultQuickActionsContent,
	DefaultStylePanel,
	DefaultStylePanelContent,
	DefaultToolbar,
	DefaultToolbarContent,
	DefaultZoomMenu,
	DefaultZoomMenuContent,
	TLComponents,
	Tldraw,
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TLUiContextMenuProps,
	TLUiKeyboardShortcutsDialogProps,
	TLUiStylePanelProps,
	useEditor,
	useIsToolSelected,
	useTools,
} from 'tldraw'
import 'tldraw/tldraw.css'

//[1]

function CustomActionsMenu() {
	return (
		<div style={{ backgroundColor: 'thistle' }}>
			<DefaultActionsMenu>
				<div style={{ backgroundColor: 'thistle' }}>
					<TldrawUiMenuItem
						id="like"
						label="Like my posts"
						icon="external-link"
						readonlyOk
						onSelect={() => {
							window.open('https://x.com/tldraw', '_blank')
						}}
					/>
				</div>
				<DefaultActionsMenuContent />
			</DefaultActionsMenu>
		</div>
	)
}
//[2]
function CustomContextMenu(props: TLUiContextMenuProps) {
	return (
		<DefaultContextMenu {...props}>
			<TldrawUiMenuGroup id="example">
				<div style={{ backgroundColor: 'thistle' }}>
					<TldrawUiMenuItem
						id="like"
						label="Like my posts"
						icon="external-link"
						readonlyOk
						onSelect={() => {
							window.open('https://x.com/tldraw', '_blank')
						}}
					/>
				</div>
			</TldrawUiMenuGroup>
			<DefaultContextMenuContent />
		</DefaultContextMenu>
	)
}
//[3]
function CustomDebugMenu() {
	return (
		<div style={{ backgroundColor: 'thistle' }}>
			<DefaultDebugMenu>
				<DefaultDebugMenuContent />
				<div style={{ backgroundColor: 'thistle' }}>
					<TldrawUiMenuGroup id="example">
						<TldrawUiMenuItem
							id="like"
							label="Like my posts"
							icon="external-link"
							readonlyOk
							onSelect={() => {
								window.open('https://x.com/tldraw', '_blank')
							}}
						/>
					</TldrawUiMenuGroup>
				</div>
			</DefaultDebugMenu>
		</div>
	)
}
//[4]
function CustomHelpMenu() {
	return (
		<DefaultHelpMenu>
			<div style={{ backgroundColor: 'thistle' }}>
				<TldrawUiMenuGroup id="example">
					<TldrawUiMenuItem
						id="like"
						label="Like my posts"
						icon="external-link"
						readonlyOk
						onSelect={() => {
							window.open('https://x.com/tldraw', '_blank')
						}}
					/>
				</TldrawUiMenuGroup>
			</div>
			<DefaultHelpMenuContent />
		</DefaultHelpMenu>
	)
}
//[5]
function CustomKeyboardShortcutsDialog(props: TLUiKeyboardShortcutsDialogProps) {
	return (
		<DefaultKeyboardShortcutsDialog {...props}>
			<div style={{ backgroundColor: 'thistle' }}>
				<TldrawUiMenuItem
					id="like-my-posts"
					label="Like my posts"
					icon="external-link"
					readonlyOk
					kbd=":)"
					onSelect={() => {
						window.open('https://x.com/tldraw', '_blank')
					}}
				/>
			</div>
			<DefaultKeyboardShortcutsDialogContent />
		</DefaultKeyboardShortcutsDialog>
	)
}
//[6]
function CustomMainMenu() {
	return (
		<DefaultMainMenu>
			<div style={{ backgroundColor: 'thistle' }}>
				<TldrawUiMenuGroup id="example">
					<TldrawUiMenuItem
						id="like"
						label="Like my posts"
						icon="external-link"
						readonlyOk
						onSelect={() => {
							window.open('https://x.com/tldraw', '_blank')
						}}
					/>
				</TldrawUiMenuGroup>
			</div>
			<DefaultMainMenuContent />
		</DefaultMainMenu>
	)
}
//[7]
function CustomNavigationPanel() {
	return <div style={{ backgroundColor: 'thistle', padding: '14px' }}>here you are</div>
}
//[8]
function CustomPageMenu() {
	return (
		<div style={{ transform: 'rotate(3.14rad)', backgroundColor: 'thistle' }}>
			<DefaultPageMenu />
		</div>
	)
}
//[9]
function CustomQuickActions() {
	return (
		<DefaultQuickActions>
			<DefaultQuickActionsContent />
			<div style={{ backgroundColor: 'thistle' }}>
				<TldrawUiMenuItem id="code" icon="code" onSelect={() => window.alert('code')} />
			</div>
		</DefaultQuickActions>
	)
}
//[10]
function CustomStylePanel(props: TLUiStylePanelProps) {
	const editor = useEditor()

	return (
		<DefaultStylePanel {...props}>
			<div style={{ backgroundColor: 'thistle' }}>
				<TldrawUiButton
					type="menu"
					onClick={() => {
						editor.setStyleForSelectedShapes(DefaultColorStyle, 'red')
					}}
				>
					<TldrawUiButtonLabel>Red</TldrawUiButtonLabel>
				</TldrawUiButton>
			</div>
			<div style={{ backgroundColor: 'thistle' }}>
				<TldrawUiButton
					type="menu"
					onClick={() => {
						editor.setStyleForSelectedShapes(DefaultColorStyle, 'green')
					}}
				>
					<TldrawUiButtonLabel>Green</TldrawUiButtonLabel>
				</TldrawUiButton>
			</div>
			<DefaultStylePanelContent />
		</DefaultStylePanel>
	)
}
//[11]
function CustomToolbar() {
	const editor = useEditor()
	const tools = useTools()
	const isScreenshotSelected = useIsToolSelected(tools['rhombus-2'])
	return (
		<div>
			<DefaultToolbar>
				<TldrawUiMenuItem {...tools['rhombus-2']} isSelected={isScreenshotSelected} />

				<DefaultToolbarContent />
				<button
					onClick={() => {
						editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
					}}
					title="delete all"
				>
					🧨
				</button>
			</DefaultToolbar>
		</div>
	)
}
//[12]
function CustomZoomMenu() {
	return (
		<DefaultZoomMenu>
			<div style={{ backgroundColor: 'thistle' }}>
				<TldrawUiMenuGroup id="example">
					<TldrawUiMenuItem
						id="like"
						label="Like my posts"
						icon="external-link"
						readonlyOk
						onSelect={() => {
							window.open('https://x.com/tldraw', '_blank')
						}}
					/>
				</TldrawUiMenuGroup>
			</div>
			<DefaultZoomMenuContent />
		</DefaultZoomMenu>
	)
}
const components: TLComponents = {
	ActionsMenu: CustomActionsMenu,
	ContextMenu: CustomContextMenu,
	DebugMenu: CustomDebugMenu,
	HelpMenu: CustomHelpMenu,
	KeyboardShortcutsDialog: CustomKeyboardShortcutsDialog,
	MainMenu: CustomMainMenu,
	NavigationPanel: CustomNavigationPanel,
	PageMenu: CustomPageMenu,
	QuickActions: CustomQuickActions,
	StylePanel: CustomStylePanel,
	Toolbar: CustomToolbar,
	ZoomMenu: CustomZoomMenu,
}

export default function CustomActionsMenuExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}

/*
You can use the `components` prop to override tldraw's default menus. 
You can provide a React component of your own, import our default 
component and edit it, or return null to hide it completely. This 
example demonstrates how to do this with every menu in tldraw.

[1]
	The actions menu is a dropdown menu that can be found in the 
	top-left of the tldraw component, or just above the toolbar on 
	smaller screens. It contains actions related to editing shapes 
	such as grouping, rotating or changing shape order. 

[2]
	Create some shapes, select them and right click the selection to 
	see the custom context menu.

[3]
	The debug menu contains helpful menu items for debugging the tldraw 
	component. To show the debug menu, turn on debug mode in the 
	preferences.
[4]
	The help menu contains menu items to change the language of the
	application, and to open the keyboard shortcuts dialog.


[5]
	The keyboard shortcuts dialog is a modal that shows all the 
	keyboard shortcuts available in tldraw. You can open it via the help
	menu.

[6]
	The main menu contains important submenus: Edit, Shape, Preferences etc. 
	To open the main menu, click the hamburger icon in the top left corner 
	of the tldraw component.

[7]
	The navigation panel is in the bottom left of the tldraw component at 
	larger breakpoints. It contains zoom controls and a mini map.

[8]
	The page menu contains options for creating and editing pages. To open 
	the page menu, click the page name in the top left of the tldraw component.

[9]
	The quick actions menu is a dropdown menu that appears in the Main Menu,
	or above the toolbar on smaller screens.

[10]
	The style panel is a panel that appears on the right side of the tldraw
	component. It contains options to change the style of shapes, such as
	color, stroke width, and opacity.

[11]
	The toolbar contains tools to create shapes, select shapes, and more.

[12]
	The zoom menu is in the bottom left of the tldraw component, the button 
	to open it is labeled with a percentage indicating the editor's current 
	zoom level.

 */
