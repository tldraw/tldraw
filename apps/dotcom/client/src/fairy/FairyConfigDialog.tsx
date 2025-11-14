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
import { F, useMsg } from '../tla/utils/i18n'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { fairyMessages } from './fairy-messages'

export function FairyConfigDialog({ agent, onClose }: { agent: FairyAgent; onClose(): void }) {
	const config = useValue(agent.$fairyConfig)

	const fairyNamePlaceholder = useMsg(fairyMessages.fairyNamePlaceholder)
	const fairyPersonalityPlaceholder = useMsg(fairyMessages.fairyPersonalityPlaceholder)

	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F defaultMessage="Fairy customization" />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 400 }}>
				<div
					className="fairy-config-dialog"
					style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
				>
					<label htmlFor="name">
						<F defaultMessage="Name" />
					</label>
					<TldrawUiInput
						className="fairy-config-input"
						value={config.name}
						onValueChange={(value) => agent.updateFairyConfig({ name: value })}
						placeholder={fairyNamePlaceholder}
					/>
					<label htmlFor="name">
						<F defaultMessage="Personality" />
					</label>
					<TldrawUiInput
						className="fairy-config-input"
						value={config.personality}
						onValueChange={(value) => agent.updateFairyConfig({ personality: value })}
						placeholder={fairyPersonalityPlaceholder}
					/>
					<label htmlFor="hat">
						<F defaultMessage="Hat" />
					</label>
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
					<TldrawUiButtonLabel>
						<F defaultMessage="Close" />
					</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}
