import { GeoShapeGeoStyle, useEditor, useValue } from '@tldraw/editor'
import { TLUiActionItem, useActions } from '../context/actions'
import { TLUiToolItem, useTools } from './useTools'

/**
 * Props for a react component that accepts a tool or action. You can pass the props of a tool or a
 * action directly to this component, or you can pass the id of the tool or action e.g.
 * `<Component action="copy" />` or `<Component tool="select" />`.
 *
 * @public
 */
export type TLUiActionProps<
	TranslationKey extends string = string,
	IconType extends string = string,
> =
	| TLUiActionItem<TranslationKey, IconType>
	| TLUiToolItem<TranslationKey, IconType>
	| { action: string | TLUiActionItem<TranslationKey, IconType> | undefined }
	| { tool: string | TLUiToolItem<TranslationKey, IconType> | undefined }

export function useActionProps<Props extends TLUiActionProps>(
	props: Props & { isSelected?: boolean }
): (TLUiActionItem & { isSelected?: boolean }) | undefined {
	const editor = useEditor()
	const actions = useActions()
	const tools = useTools()

	let tool: TLUiToolItem | undefined
	if ('tool' in props) {
		if (typeof props.tool === 'string') {
			tool = tools[props.tool]
		} else {
			tool = props.tool
		}
	}

	const isSelected = useValue(
		'is selected',
		() => {
			if (props.isSelected !== undefined) return props.isSelected
			if (!tool) return false
			const activeToolId = editor.getCurrentToolId()
			const geoState = editor.getSharedStyles().getAsKnownValue(GeoShapeGeoStyle)
			const geo = tool.meta?.geo
			return geo ? activeToolId === 'geo' && geoState === geo : activeToolId === tool.id
		},
		[editor, tool, props.isSelected]
	)

	if ('tool' in props) {
		if (tool) return { ...tool, isSelected }
		return undefined
	}

	if ('action' in props) {
		if (typeof props.action === 'string') return actions[props.action]
		return props.action
	}

	return props
}
