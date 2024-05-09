import {
	DefaultToolbar,
	DefaultToolbarContent,
	TLComponents,
	TLUiOverrides,
	Tldraw,
	TldrawUiMenuItem,
	useIsToolSelected,
	useTools,
} from 'tldraw'
import { InFrontOfTheCanvas } from './InFrontOfCanvas'
import { OrgArrowBindingUtil } from './OrgArrowBinding'
import { OrgArrowtool } from './OrgArrowTool'
import { OrgArrowUtil } from './OrgChartArrowUtil'

const overrides: TLUiOverrides = {
	tools(editor, schema) {
		schema['org-arrow'] = {
			id: 'org-arrow',
			label: 'Org arrow',
			icon: 'tool-arrow',
			kbd: 'o',
			onSelect: () => {
				editor.setCurrentTool('org-arrow')
			},
		}
		return schema
	},
}

const components: TLComponents = {
	Toolbar: (...props) => {
		const orgArrow = useTools()['org-arrow']
		const isOrgArrowSelected = useIsToolSelected(orgArrow)
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...orgArrow} isSelected={isOrgArrowSelected} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
	InFrontOfTheCanvas: InFrontOfTheCanvas,
}

export default function OrgArrowExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					;(window as any).editor = editor
				}}
				shapeUtils={[OrgArrowUtil]}
				bindingUtils={[OrgArrowBindingUtil]}
				tools={[OrgArrowtool]}
				overrides={overrides}
				components={components}
				persistenceKey="org-arrow"
			/>
		</div>
	)
}
