import {
	DefaultToolbar,
	TLComponents,
	Tldraw,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	useTranslation,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './VerticalToolbarExample.css'

const components: TLComponents = {
	BottomCenterPanel: null,
	CenterLeftPanel: DefaultToolbar,
	ToolbarOverflow: ({ children }) => {
		const msg = useTranslation()
		return (
			<TldrawUiDropdownMenuRoot id="toolbar overflow" modal={false}>
				<TldrawUiDropdownMenuTrigger>
					<TldrawUiButton
						title={msg('tool-panel.more')}
						type="tool"
						className="tlui-toolbar__overflow"
						data-testid="tools.more-button"
					>
						<TldrawUiButtonIcon icon="chevron-right" />
					</TldrawUiButton>
				</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent side="right" align="start">
					{children}
				</TldrawUiDropdownMenuContent>
			</TldrawUiDropdownMenuRoot>
		)
	},
}

export default function VerticalToolbarExample() {
	return (
		<>
			<div className="tldraw__editor vertical-toolbar-example">
				<Tldraw components={components} />
			</div>
		</>
	)
}
