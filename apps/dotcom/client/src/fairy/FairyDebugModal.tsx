import {
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	useValue,
} from 'tldraw'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'

export function FairyDebugModal({ agents, onClose }: { agents: FairyAgent[]; onClose(): void }) {
	// If all agents have personality mode enabled, the button shows "on" checked; otherwise, un-checked
	const personalityModeEnabled = useValue(
		'debug-personality-mode',
		() => agents.every((agent) => agent.$personalityModeEnabled.get()),
		[agents]
	)

	const handleTogglePersonalityMode = () => {
		const shouldEnable = !personalityModeEnabled
		agents.forEach((agent) => {
			// Only update if status does not match intent
			if (agent.$personalityModeEnabled.get() !== shouldEnable) {
				agent.togglePersonalityMode()
			}
		})

		agents.forEach((agent) =>
			// eslint-disable-next-line no-console
			console.log(
				`after toggling personality mode, agent with id ${agent.id} has personality mode enabled ${agent.$personalityModeEnabled.get()}`
			)
		)
	}

	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>Fairy debug</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 400 }}>
				<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
					<TldrawUiButton type="low" onClick={handleTogglePersonalityMode}>
						<TldrawUiButtonLabel>
							{personalityModeEnabled ? '✓ ' : ''}Custom personality mode
							<br />
							(defaults to helpful but mischievous)
						</TldrawUiButtonLabel>
					</TldrawUiButton>
				</div>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="normal" onClick={onClose}>
					<TldrawUiButtonLabel>Close</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}
