import { FAIRY_VARIANTS, FairyVariantType } from '@tldraw/fairy-shared'
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
				<div
					className="fairy-config-dialog"
					style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
				>
					<label htmlFor="name">Name</label>
					<TldrawUiInput
						className="fairy-config-input"
						value={config.name}
						onValueChange={(value) => agent.updateFairyConfig({ name: value })}
						placeholder="Fairy's name"
					/>
					<label htmlFor="name">Personality</label>
					<TldrawUiInput
						className="fairy-config-input"
						value={config.personality}
						onValueChange={(value) => agent.updateFairyConfig({ personality: value })}
						placeholder="Fairy's personality"
					/>
					<label htmlFor="hat">Hat</label>
					<select
						id="hat"
						value={config.outfit.hat}
						onChange={(e) => {
							agent.updateFairyConfig({
								outfit: { ...config.outfit, hat: e.target.value as FairyVariantType<'hat'> },
							})
						}}
					>
						{Object.keys(FAIRY_VARIANTS.hat).map((hat) => (
							<option key={hat} value={hat}>
								{hat.charAt(0).toUpperCase() + hat.slice(1)}
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
