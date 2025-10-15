export function ConfigPanelBooleanControl({
	prop,
	label,
	value,
	onChange,
}: {
	prop: string
	label: string
	value: boolean
	onChange: (prop: string, value: boolean) => void
}) {
	return (
		<label className="shader-config-panel__control shader-config-panel__control--boolean">
			<span className="shader-config-panel__label">{label}</span>
			<input
				type="checkbox"
				checked={value ?? false}
				onChange={(e) => onChange(prop, e.target.checked)}
				className="shader-config-panel__boolean-input"
			/>
		</label>
	)
}
