import { useRef, useState } from 'react'
import { Editor } from 'tldraw'
import { createAndGenerate } from '../asset/assetActions'
import { Brand, setBrand, useBrand } from '../brand/brandState'
import { DENSITY_OPTIONS, FONT_OPTIONS, OUTPUT_TYPES, TONE_OPTIONS } from '../constants'

function fileToDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(reader.result as string)
		reader.onerror = () => reject(reader.error)
		reader.readAsDataURL(file)
	})
}

export function MarketingSidebar({ editor }: { editor: Editor }) {
	const brand = useBrand(editor)

	function update(partial: Partial<Brand>) {
		setBrand(editor, { ...brand, ...partial })
	}

	return (
		<div className="MarketingSidebar tl-theme__light">
			<div className="MarketingSidebar-scroll">
				<GenerateSection editor={editor} />
				<BrandSection brand={brand} update={update} />
			</div>
		</div>
	)
}

function GenerateSection({ editor }: { editor: Editor }) {
	const [prompt, setPrompt] = useState('')
	const [outputTypeId, setOutputTypeId] = useState(OUTPUT_TYPES[0].id)
	const [shot, setShot] = useState<string | null>(null)
	const shotInput = useRef<HTMLInputElement>(null)

	function generate() {
		if (!prompt.trim()) return
		createAndGenerate(editor, { prompt: prompt.trim(), outputTypeId, shot })
	}

	return (
		<section className="MarketingSidebar-section">
			<h2 className="MarketingSidebar-heading">New asset</h2>

			<label className="MarketingSidebar-label">Prompt</label>
			<textarea
				className="MarketingSidebar-textarea"
				placeholder="Summer sale — 20% off, beach vibes"
				value={prompt}
				onChange={(e) => setPrompt(e.target.value)}
			/>

			<label className="MarketingSidebar-label">Output type</label>
			<select
				className="MarketingSidebar-select"
				value={outputTypeId}
				onChange={(e) => setOutputTypeId(e.target.value)}
			>
				{OUTPUT_TYPES.map((t) => (
					<option key={t.id} value={t.id}>
						{t.label} ({t.width}×{t.height})
					</option>
				))}
			</select>

			<label className="MarketingSidebar-label">Reference image (optional)</label>
			{shot ? (
				<div className="MarketingSidebar-imageRow">
					<img className="MarketingSidebar-thumb" src={shot} alt="reference" />
					<button className="MarketingSidebar-textButton" onClick={() => setShot(null)}>
						Remove
					</button>
				</div>
			) : (
				<button className="MarketingSidebar-fileButton" onClick={() => shotInput.current?.click()}>
					Upload image
				</button>
			)}
			<input
				ref={shotInput}
				type="file"
				accept="image/*"
				hidden
				onChange={async (e) => {
					const file = e.target.files?.[0]
					if (file) setShot(await fileToDataUrl(file))
					e.target.value = ''
				}}
			/>

			<button
				className="MarketingSidebar-generate"
				disabled={!prompt.trim()}
				onClick={generate}
			>
				Generate
			</button>
		</section>
	)
}

function BrandSection({ brand, update }: { brand: Brand; update: (p: Partial<Brand>) => void }) {
	const logoInput = useRef<HTMLInputElement>(null)
	const refsInput = useRef<HTMLInputElement>(null)

	return (
		<section className="MarketingSidebar-section">
			<h2 className="MarketingSidebar-heading">Brand</h2>

			<label className="MarketingSidebar-label">Colours</label>
			<div className="MarketingSidebar-colors">
				<ColorField label="Primary" value={brand.primary} onChange={(v) => update({ primary: v })} />
				<ColorField
					label="Secondary"
					value={brand.secondary}
					onChange={(v) => update({ secondary: v })}
				/>
				<ColorField label="Accent" value={brand.accent} onChange={(v) => update({ accent: v })} />
				<ColorField
					label="Background"
					value={brand.background}
					onChange={(v) => update({ background: v })}
				/>
			</div>

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

			<label className="MarketingSidebar-label">Logo</label>
			{brand.logo ? (
				<div className="MarketingSidebar-imageRow">
					<img className="MarketingSidebar-thumb" src={brand.logo} alt="logo" />
					<button className="MarketingSidebar-textButton" onClick={() => update({ logo: null })}>
						Remove
					</button>
				</div>
			) : (
				<button className="MarketingSidebar-fileButton" onClick={() => logoInput.current?.click()}>
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
					if (file) update({ logo: await fileToDataUrl(file) })
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
			<button className="MarketingSidebar-fileButton" onClick={() => refsInput.current?.click()}>
				Add reference
			</button>
			<input
				ref={refsInput}
				type="file"
				accept="image/*"
				hidden
				onChange={async (e) => {
					const file = e.target.files?.[0]
					if (file) update({ refs: [...brand.refs, await fileToDataUrl(file)] })
					e.target.value = ''
				}}
			/>
		</section>
	)
}

function ColorField({
	label,
	value,
	onChange,
}: {
	label: string
	value: string
	onChange: (v: string) => void
}) {
	return (
		<label className="MarketingSidebar-color">
			<input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
			<span>{label}</span>
		</label>
	)
}
