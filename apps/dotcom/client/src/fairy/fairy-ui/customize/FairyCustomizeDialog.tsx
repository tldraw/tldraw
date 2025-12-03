import {
	FairyHatColor,
	FairyHatType,
	HAT_COLORS,
	HAT_TYPES,
	RefreshIcon,
} from '@tldraw/fairy-shared'
import { ReactNode, useCallback, useState } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonIcon,
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
	useValue,
} from 'tldraw'
import { useMsg } from '../../../tla/utils/i18n'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { getRandomFairyName } from '../../fairy-helpers/getRandomFairyName'
import { fairyMessages } from '../../fairy-messages'
import { FairySprite } from '../../fairy-sprite/FairySprite'

export function FairyCustomizeDialog({ agent, onClose }: { agent: FairyAgent; onClose(): void }) {
	const config = useValue('fairy-config', () => agent.getConfig(), [agent])

	const [name, setName] = useState(config.name)
	const [hatType, setHatType] = useState<FairyHatType>(config.hat)
	const [hatColor, setHatColor] = useState<FairyHatColor>(config.hatColor)

	const namePlaceholder = useMsg(fairyMessages.fairyNamePlaceholder)

	const handleSave = useCallback(() => {
		agent.updateFairyConfig({
			name,
			hat: hatType,
			hatColor,
		})
		onClose()
	}, [agent, name, hatType, hatColor, onClose])

	const hasChanges = name !== config.name || hatType !== config.hat || hatColor !== config.hatColor

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
							autoFocus
						/>
						<TldrawUiButton
							className="fairy-customize-random-name-button"
							type="icon"
							title="Random name"
							onClick={() => setName(getRandomFairyName())}
						>
							<TldrawUiButtonIcon icon={<RefreshIcon />} />
						</TldrawUiButton>
					</div>

					{/* Hat type dropdown */}
					<label className="fairy-customize-label">Hat</label>
					<div className="fairy-customize-name-row">
						<TldrawUiDropdownMenuRoot id="hat-type-select">
							<TldrawUiDropdownMenuTrigger>
								<TldrawUiButton type="normal" className="fairy-customize-dropdown-button">
									<TldrawUiButtonLabel>{formatHatType(hatType)}</TldrawUiButtonLabel>
									<TldrawUiButtonIcon icon="chevron-down" small />
								</TldrawUiButton>
							</TldrawUiDropdownMenuTrigger>
							<TldrawUiDropdownMenuContent
								side="bottom"
								align="end"
								className="fairy-customize-dropdown-content"
							>
								{HAT_TYPES.map((type) => (
									<DropdownMenuItem
										key={type}
										label={formatHatType(type)}
										onClick={() => setHatType(type)}
									/>
								))}
							</TldrawUiDropdownMenuContent>
						</TldrawUiDropdownMenuRoot>
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
														border:
															color === 'white' ? '1px solid var(--tl-color-overlay)' : 'none',
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

function formatHatType(type: FairyHatType): string {
	return type
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
}

function formatHatColor(color: FairyHatColor): string {
	return color.charAt(0).toUpperCase() + color.slice(1)
}
