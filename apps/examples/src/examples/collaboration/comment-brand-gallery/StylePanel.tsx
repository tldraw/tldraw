import { useState } from 'react'
import {
	CustomStyleConfig,
	DEFAULT_CUSTOM_STYLE,
	FONT_STACKS,
	FontKey,
	randomCustomStyle,
} from './custom-style'

/**
 * The live configurator for the custom style. Every control writes one field of the config; the
 * parent recompiles it into tokens and remounts the stylesheet, so each change restyles the
 * custom tile — and the live canvas, when the custom style is active — as you drag.
 */
export function StylePanel({
	value,
	onChange,
	onCopyCss,
}: {
	value: CustomStyleConfig
	onChange(config: CustomStyleConfig): void
	onCopyCss(): void
}) {
	const [copied, setCopied] = useState(false)
	const set = <K extends keyof CustomStyleConfig>(key: K, fieldValue: CustomStyleConfig[K]) =>
		onChange({ ...value, [key]: fieldValue })

	return (
		<div className="bcg-style-panel">
			<div className="bcg-style-panel__title">Custom style</div>

			<label className="bcg-field">
				<span>Font</span>
				<select value={value.font} onChange={(e) => set('font', e.target.value as FontKey)}>
					{Object.entries(FONT_STACKS).map(([key, font]) => (
						<option key={key} value={key}>
							{font.label}
						</option>
					))}
				</select>
			</label>

			<label className="bcg-field">
				<span>Panel</span>
				<input type="color" value={value.panel} onChange={(e) => set('panel', e.target.value)} />
			</label>
			<label className="bcg-field">
				<span>Text</span>
				<input type="color" value={value.text} onChange={(e) => set('text', e.target.value)} />
			</label>
			<label className="bcg-field">
				<span>Accent</span>
				<input type="color" value={value.accent} onChange={(e) => set('accent', e.target.value)} />
			</label>

			<label className="bcg-field">
				<span>Pin shape</span>
				<select
					value={value.pinShape}
					onChange={(e) => set('pinShape', e.target.value as CustomStyleConfig['pinShape'])}
				>
					<option value="teardrop">Teardrop</option>
					<option value="circle">Circle</option>
					<option value="square">Square</option>
					<option value="leaf">Leaf</option>
				</select>
			</label>
			<label className="bcg-field">
				<span>Pin color</span>
				<input
					type="color"
					value={value.pinColor}
					onChange={(e) => set('pinColor', e.target.value)}
				/>
			</label>

			<label className="bcg-field">
				<span>Radius</span>
				<input
					type="range"
					min={0}
					max={24}
					value={value.radius}
					onChange={(e) => set('radius', Number(e.target.value))}
				/>
			</label>

			<label className="bcg-field">
				<span>Border</span>
				<input
					type="range"
					min={0}
					max={4}
					value={value.borderWidth}
					onChange={(e) => set('borderWidth', Number(e.target.value))}
				/>
			</label>
			<label className="bcg-field">
				<span>Border style</span>
				<select
					value={value.borderStyle}
					onChange={(e) => set('borderStyle', e.target.value as CustomStyleConfig['borderStyle'])}
				>
					<option value="solid">Solid</option>
					<option value="dashed">Dashed</option>
					<option value="double">Double</option>
				</select>
			</label>
			<label className="bcg-field">
				<span>Border color</span>
				<input
					type="color"
					value={value.borderColor}
					onChange={(e) => set('borderColor', e.target.value)}
				/>
			</label>

			<label className="bcg-field">
				<span>Shadow</span>
				<select
					value={value.shadow}
					onChange={(e) => set('shadow', e.target.value as CustomStyleConfig['shadow'])}
				>
					<option value="none">None</option>
					<option value="soft">Soft</option>
					<option value="hard">Hard offset</option>
					<option value="glow">Glow</option>
				</select>
			</label>

			<label className="bcg-field">
				<span>Author</span>
				<select
					value={value.authorStyle}
					onChange={(e) => set('authorStyle', e.target.value as CustomStyleConfig['authorStyle'])}
				>
					<option value="normal">Normal</option>
					<option value="uppercase">Uppercase</option>
					<option value="small-caps">Small caps</option>
				</select>
			</label>

			<label className="bcg-field">
				<span>Tilt</span>
				<input
					type="range"
					min={-3}
					max={3}
					step={0.5}
					value={value.tilt}
					onChange={(e) => set('tilt', Number(e.target.value))}
				/>
			</label>

			<label className="bcg-field">
				<span>Speech tail</span>
				<input
					type="checkbox"
					checked={value.tail}
					onChange={(e) => set('tail', e.target.checked)}
				/>
			</label>

			<div className="bcg-style-panel__actions">
				<button className="bcg-btn" onClick={() => onChange(randomCustomStyle())}>
					Randomize
				</button>
				<button className="bcg-btn" onClick={() => onChange(DEFAULT_CUSTOM_STYLE)}>
					Reset
				</button>
				<button
					className="bcg-btn"
					onClick={() => {
						onCopyCss()
						setCopied(true)
						setTimeout(() => setCopied(false), 1500)
					}}
				>
					{copied ? 'Copied!' : 'Copy CSS'}
				</button>
			</div>
			<p className="bcg-style-panel__note">
				Copy CSS gives you this style as the token block to ship in your own app.
			</p>
		</div>
	)
}
