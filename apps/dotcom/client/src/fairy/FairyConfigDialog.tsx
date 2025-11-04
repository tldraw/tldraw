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
	// const currentMode = getFairyMode(config.mode)
	// const availableWands = currentMode.availableWands

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
						onValueChange={(value) => agent.$fairyConfig.set({ ...config, name: value })}
						placeholder="Fairy's name"
					/>
					<label htmlFor="name">Personality</label>
					<TldrawUiInput
						className="fairy-config-input"
						value={config.personality}
						onValueChange={(value) => agent.$fairyConfig.set({ ...config, personality: value })}
						placeholder="Fairy's personality"
					/>
					{/* <label htmlFor="mode">Mode</label>
					<select
						id="mode"
						value={config.mode}
						onChange={(e) => {
							const newMode = getFairyMode(e.target.value as typeof config.mode)
							const newConfig = {
								...config,
								mode: newMode.id,
								// If current wand isn't available in new mode, use the mode's default wand
								wand: (newMode.availableWands as readonly Wand['type'][]).includes(config.wand)
									? config.wand
									: newMode.defaultWand,
							}
							agent.$fairyConfig.set(newConfig)
						}}
					>
						{FAIRY_MODE_DEFINITIONS.map((mode) => (
							<option key={mode.id} value={mode.id}>
								{mode.id.charAt(0).toUpperCase() + mode.id.slice(1)}
							</option>
						))}
					</select> */}
					<label htmlFor="hat">Hat</label>
					<select
						id="hat"
						value={config.outfit.hat}
						onChange={(e) => {
							agent.$fairyConfig.set({
								...config,
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
					{/* <label htmlFor="wand">Wand</label>
					<select
						id="wand"
						value={config.wand}
						onChange={(e) => {
							agent.$fairyConfig.set({ ...config, wand: e.target.value as Wand['type'] })
						}}
					>
						{WAND_DEFINITIONS.map((wand) => {
							const isAvailable = (availableWands as readonly Wand['type'][]).includes(wand.type)
							return (
								<option key={wand.type} value={wand.type} disabled={!isAvailable}>
									{wand.name} — {wand.description}
								</option>
							)
						})}
					</select> */}
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
