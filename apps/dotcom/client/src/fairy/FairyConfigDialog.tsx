import { Wand, WAND_DEFINITIONS } from '@tldraw/fairy-shared'
import {
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	TldrawUiInput,
	useValue,
} from 'tldraw'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'

export function FairyConfigDialog({ agent, onClose }: { agent: FairyAgent; onClose(): void }) {
	const config = useValue(agent.$fairyConfig)
	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>Fairy customization</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 400 }}>
				<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
					<label htmlFor="name">Name</label>
					<TldrawUiInput
						value={config.name}
						onValueChange={(value) => agent.$fairyConfig.set({ ...config, name: value })}
						placeholder="Fairy's name"
					/>
					<label htmlFor="wand">Different wands for debugging purposes</label>
					<select
						id="wand"
						value={config.wand}
						onChange={(e) => {
							agent.$fairyConfig.set({ ...config, wand: e.target.value as Wand['type'] })
						}}
					>
						{WAND_DEFINITIONS.map((wand) => (
							<option key={wand.type} value={wand.type}>
								{wand.name} — {wand.description}
							</option>
						))}
					</select>
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
