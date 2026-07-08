import { useCallback, useEffect, useState } from 'react'
import {
	TlButton,
	TlButtonIcon,
	TlButtonLabel,
	TlPopover,
	TlPopoverContent,
	TlPopoverTrigger,
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
		<TlPopover id="template-picker" open={isOpen} onOpenChange={setIsOpen}>
			<TlPopoverTrigger>
				<TlButton type="icon" title="Templates">
					<TlButtonIcon icon={<TemplateIcon />} />
				</TlButton>
			</TlPopoverTrigger>
			<TlPopoverContent side="bottom" align="start" sideOffset={8}>
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
						<TlButton type="normal" onClick={onSave}>
							<TlButtonLabel>Save</TlButtonLabel>
						</TlButton>
					</div>
					<div className="TemplatePicker-list">
						{templates.length === 0 ? (
							<div className="TemplatePicker-empty">Select 2+ nodes and save as a template</div>
						) : (
							templates.map((t) => (
								<div key={t.id} className="TemplatePicker-item">
									<TlButton
										type="menu"
										className="TemplatePicker-item-button"
										onClick={() => onStamp(t)}
									>
										<TlButtonIcon icon={<TemplateIcon />} />
										<TlButtonLabel>
											{t.name} ({t.nodes.length} nodes)
										</TlButtonLabel>
									</TlButton>
									<TlButton type="icon" title="Delete template" onClick={() => onDelete(t.id)}>
										<TlButtonLabel>×</TlButtonLabel>
									</TlButton>
								</div>
							))
						)}
					</div>
				</div>
			</TlPopoverContent>
		</TlPopover>
	)
}
