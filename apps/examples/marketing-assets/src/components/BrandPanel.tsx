import { useRef } from 'react'
import { Editor } from 'tldraw'
import { blobToDataUrl } from '../asset/assetBytes'
import { Brand, setBrand, useBrand } from '../brand/brandState'
import { DENSITY_OPTIONS, FONT_OPTIONS, TONE_OPTIONS } from '../constants'
import { usePanelTheme } from './usePanelTheme'

/**
 * The right-hand panel: the campaign's brand assets and guidelines (colours,
 * fonts, tone of voice, logo, and reference images). Every batch reads from this
 * shared brand state, so it stays visible alongside the canvas rather than
 * buried at the bottom of the generate panel.
 */
export function BrandPanel({ editor }: { editor: Editor }) {
	const brand = useBrand(editor)
	const themeClass = usePanelTheme(editor)
	const logoInput = useRef<HTMLInputElement>(null)
	const refsInput = useRef<HTMLInputElement>(null)

	function update(partial: Partial<Brand>) {
		setBrand(editor, { ...brand, ...partial })
	}

	return (
		<div className={`MarketingSidebar ${themeClass}`}>
			<div className="MarketingSidebar-scroll">
				<section className="MarketingSidebar-section">
					<h2 className="MarketingSidebar-heading">Brand assets</h2>

					<label className="MarketingSidebar-label">Colours</label>
					<div className="MarketingSidebar-colors">
						<ColorField
							label="Primary"
							value={brand.primary}
							onChange={(v) => update({ primary: v })}
						/>
						<ColorField
							label="Secondary"
							value={brand.secondary}
							onChange={(v) => update({ secondary: v })}
						/>
						<ColorField
							label="Accent"
							value={brand.accent}
							onChange={(v) => update({ accent: v })}
						/>
						<ColorField
							label="Background"
							value={brand.background}
							onChange={(v) => update({ background: v })}
						/>
					</div>

					<label className="MarketingSidebar-label">Logo</label>
					{brand.logo ? (
						<div className="MarketingSidebar-imageRow">
							<img className="MarketingSidebar-thumb" src={brand.logo} alt="logo" />
							<button
								className="MarketingSidebar-textButton"
								onClick={() => update({ logo: null })}
							>
								Remove
							</button>
						</div>
					) : (
						<button
							className="MarketingSidebar-fileButton"
							onClick={() => logoInput.current?.click()}
						>
							Upload logo
						</button>
					)}
					<input
						ref={logoInput}
						type="file"
						accept="image/*"
						hidden
						onChange={async (e) => {
							const file = e.target.files?.[0]
							if (file) update({ logo: await blobToDataUrl(file) })
							e.target.value = ''
						}}
					/>

					<label className="MarketingSidebar-label">Reference images</label>
					<div className="MarketingSidebar-refs">
						{brand.refs.map((ref, i) => (
							<div key={i} className="MarketingSidebar-refItem">
								<img className="MarketingSidebar-thumb" src={ref} alt={`reference ${i + 1}`} />
								<button
									className="MarketingSidebar-refRemove"
									onClick={() => update({ refs: brand.refs.filter((_, j) => j !== i) })}
								>
									×
								</button>
							</div>
						))}
					</div>
					<button
						className="MarketingSidebar-fileButton"
						onClick={() => refsInput.current?.click()}
					>
						Add reference
					</button>
					<input
						ref={refsInput}
						type="file"
						accept="image/*"
						hidden
						onChange={async (e) => {
							const file = e.target.files?.[0]
							if (file) update({ refs: [...brand.refs, await blobToDataUrl(file)] })
							e.target.value = ''
						}}
					/>
				</section>

				<section className="MarketingSidebar-section">
					<h2 className="MarketingSidebar-heading">Guidelines</h2>

					<label className="MarketingSidebar-label">Heading font</label>
					<select
						className="MarketingSidebar-select"
						value={brand.headingFont}
						onChange={(e) => update({ headingFont: e.target.value })}
					>
						{FONT_OPTIONS.map((f) => (
							<option key={f}>{f}</option>
						))}
					</select>

					<label className="MarketingSidebar-label">Body font</label>
					<select
						className="MarketingSidebar-select"
						value={brand.bodyFont}
						onChange={(e) => update({ bodyFont: e.target.value })}
					>
						{FONT_OPTIONS.map((f) => (
							<option key={f}>{f}</option>
						))}
					</select>

					<label className="MarketingSidebar-label">Tone</label>
					<select
						className="MarketingSidebar-select"
						value={brand.tone}
						onChange={(e) => update({ tone: e.target.value })}
					>
						{TONE_OPTIONS.map((t) => (
							<option key={t}>{t}</option>
						))}
					</select>

					<label className="MarketingSidebar-label">Tone of voice</label>
					<textarea
						className="MarketingSidebar-textarea"
						placeholder="Direct and confident; developer-to-developer; no hype; short sentences"
						value={brand.voice}
						onChange={(e) => update({ voice: e.target.value })}
					/>

					<label className="MarketingSidebar-label">Density</label>
					<select
						className="MarketingSidebar-select"
						value={brand.density}
						onChange={(e) => update({ density: e.target.value })}
					>
						{DENSITY_OPTIONS.map((d) => (
							<option key={d}>{d}</option>
						))}
					</select>
				</section>
			</div>
		</div>
	)
}

function ColorField({
	label,
	value,
	onChange,
}: {
	label: string
	value: string
	onChange(v: string): void
}) {
	return (
		<label className="MarketingSidebar-color">
			<input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
			<span>{label}</span>
		</label>
	)
}
