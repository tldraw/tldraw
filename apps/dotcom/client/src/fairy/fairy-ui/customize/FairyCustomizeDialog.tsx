import { FairyHatColor, FairyHatType, HAT_COLORS, HAT_TYPES } from '@tldraw/fairy-shared'
import { ReactNode, useCallback, useState } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuItem,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiInput,
	TldrawUiSlider,
	useValue,
} from 'tldraw'
import { useMsg } from '../../../tla/utils/i18n'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { fairyMessages } from '../../fairy-messages'
import { FairySprite } from '../../fairy-sprite/FairySprite'

export function FairyCustomizeDialog({ agent, onClose }: { agent: FairyAgent; onClose(): void }) {
	const config = useValue('fairy-config', () => agent.getConfig(), [agent])

	const [name, setName] = useState(config.name)
	const [hatType, setHatType] = useState<FairyHatType>(config.hat)
	const [hatColor, setHatColor] = useState<FairyHatColor>(config.hatColor)
	const [legLength, setLegLength] = useState(config.legLength)

	const namePlaceholder = useMsg(fairyMessages.fairyNamePlaceholder)

	const handleSave = useCallback(() => {
		agent.updateFairyConfig({
			name,
			hat: hatType,
			hatColor,
			legLength,
		})
		onClose()
	}, [agent, name, hatType, hatColor, legLength, onClose])

	const hasChanges =
		name !== config.name ||
		hatType !== config.hat ||
		hatColor !== config.hatColor ||
		legLength !== config.legLength

	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>Customize</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className="fairy-customize-dialog-body">
				{/* Preview */}
				<div className="fairy-customize-preview">
					<div className="fairy-customize-preview-sprite">
						<FairySprite
							pose="idle"
							hatColor={hatColor}
							hatType={hatType}
							legLength={legLength}
							isAnimated={true}
							showShadow={true}
						/>
					</div>
				</div>

				{/* Fields grid */}
				<div className="fairy-customize-fields">
					{/* Name input */}
					<label className="fairy-customize-label">Name</label>
					<div className="fairy-customize-name-row">
						<TldrawUiInput
							className="fairy-customize-input"
							value={name}
							onValueChange={setName}
							placeholder={namePlaceholder}
							disabled={true}
							autoFocus
						/>
						{/* <TldrawUiButton
							className="fairy-customize-random-name-button"
							type="icon"
							title="Random name"
							onClick={() => setName(getRandomFairyName())}
						>
							<TldrawUiButtonIcon icon={<RefreshIcon />} />
						</TldrawUiButton> */}
					</div>

					{/* Hat type slider */}
					<label className="fairy-customize-label">Hat</label>
					<div className="fairy-customize-hat-row">
						<TldrawUiSlider
							label="Hat type"
							title="Hat type"
							value={HAT_TYPES.indexOf(hatType)}
							steps={HAT_TYPES.length - 1}
							onValueChange={(index) => setHatType(HAT_TYPES[index])}
						/>
						{/* Hat color dropdown */}
						<TldrawUiDropdownMenuRoot id="hat-color-select">
							<TldrawUiDropdownMenuTrigger>
								<TldrawUiButton type="normal" className="fairy-customize-dropdown-button">
									<span
										className="fairy-customize-color-swatch"
										style={{ backgroundColor: `var(--tl-color-fairy-${hatColor})` }}
									/>
								</TldrawUiButton>
							</TldrawUiDropdownMenuTrigger>
							<TldrawUiDropdownMenuContent
								side="bottom"
								align="end"
								className="fairy-customize-dropdown-content"
							>
								<div className="tlui-grid">
									{HAT_COLORS.map((color) => (
										<DropdownMenuItem
											key={color}
											label={
												<span
													className="fairy-customize-color-swatch"
													style={{
														backgroundColor: `var(--tl-color-fairy-${color})`,
													}}
												/>
											}
											onClick={() => setHatColor(color)}
										/>
									))}
								</div>
							</TldrawUiDropdownMenuContent>
						</TldrawUiDropdownMenuRoot>
					</div>

					{/* Leg length slider */}
					<label className="fairy-customize-label">Legs</label>
					<div className="fairy-customize-leg-row">
						<TldrawUiSlider
							label="Leg length"
							title="Leg length"
							value={legLength * 100}
							steps={100}
							onValueChange={(value) => setLegLength(value / 100)}
						/>
					</div>
				</div>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="normal" onClick={onClose}>
					<TldrawUiButtonLabel>Cancel</TldrawUiButtonLabel>
				</TldrawUiButton>
				<TldrawUiButton type="primary" onClick={handleSave} disabled={!hasChanges}>
					<TldrawUiButtonLabel>Save</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}

function DropdownMenuItem({ label, onClick }: { label: string | ReactNode; onClick(): void }) {
	return (
		<TldrawUiDropdownMenuItem>
			<TldrawUiButton type="menu" onClick={onClick}>
				<TldrawUiButtonLabel>{label}</TldrawUiButtonLabel>
			</TldrawUiButton>
		</TldrawUiDropdownMenuItem>
	)
}
