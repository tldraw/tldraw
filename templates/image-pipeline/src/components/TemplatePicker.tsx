import { useCallback, useEffect, useState } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiButtonLabel,
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
	useEditor,
} from 'tldraw'
import { saveSelectionAsTemplate, stampTemplate } from '../templates/templateActions'
import { deleteTemplate, loadTemplates, PipelineTemplate } from '../templates/templateState'
import { TemplateIcon } from './icons/TemplateIcon'

/**
 * A popover-style template picker shown in the toolbar area.
 */
export function TemplatePicker() {
	const editor = useEditor()
	const [isOpen, setIsOpen] = useState(false)
	const [templates, setTemplates] = useState<PipelineTemplate[]>([])
	const [saveName, setSaveName] = useState('')

	const refresh = useCallback(() => {
		setTemplates(loadTemplates())
	}, [])

	useEffect(() => {
		if (isOpen) refresh()
	}, [isOpen, refresh])

	const onSave = useCallback(() => {
		if (!saveName.trim()) return
		const result = saveSelectionAsTemplate(editor, saveName.trim(), '')
		if (result) {
			setSaveName('')
			refresh()
		}
	}, [editor, saveName, refresh])

	const onStamp = useCallback(
		(template: PipelineTemplate) => {
			const center = editor.getViewportPageBounds().center
			stampTemplate(editor, template, center)
			setIsOpen(false)
		},
		[editor]
	)

	const onDelete = useCallback(
		(id: string) => {
			deleteTemplate(id)
			refresh()
		},
		[refresh]
	)

	return (
		<TldrawUiPopover id="template-picker" open={isOpen} onOpenChange={setIsOpen}>
			<TldrawUiPopoverTrigger>
				<TldrawUiButton type="icon" title="Templates">
					<TldrawUiButtonIcon icon={<TemplateIcon />} />
				</TldrawUiButton>
			</TldrawUiPopoverTrigger>
			<TldrawUiPopoverContent side="bottom" align="start" sideOffset={8}>
				<div className="TemplatePicker-popover">
					<div className="TemplatePicker-header">Templates</div>
					<div className="TemplatePicker-save">
						<input
							type="text"
							placeholder="Name for selection..."
							value={saveName}
							onChange={(e) => setSaveName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') onSave()
							}}
						/>
						<TldrawUiButton type="normal" onClick={onSave}>
							<TldrawUiButtonLabel>Save</TldrawUiButtonLabel>
						</TldrawUiButton>
					</div>
					<div className="TemplatePicker-list">
						{templates.length === 0 ? (
							<div className="TemplatePicker-empty">Select 2+ nodes and save as a template</div>
						) : (
							templates.map((t) => (
								<div key={t.id} className="TemplatePicker-item">
									<TldrawUiButton
										type="menu"
										className="TemplatePicker-item-button"
										onClick={() => onStamp(t)}
									>
										<TldrawUiButtonIcon icon={<TemplateIcon />} />
										<TldrawUiButtonLabel>
											{t.name} ({t.nodes.length} nodes)
										</TldrawUiButtonLabel>
									</TldrawUiButton>
									<TldrawUiButton
										type="icon"
										title="Delete template"
										onClick={() => onDelete(t.id)}
									>
										<TldrawUiButtonLabel>×</TldrawUiButtonLabel>
									</TldrawUiButton>
								</div>
							))
						)}
					</div>
				</div>
			</TldrawUiPopoverContent>
		</TldrawUiPopover>
	)
}
