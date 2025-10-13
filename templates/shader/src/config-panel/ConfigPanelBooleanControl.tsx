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
		<label className="shader-boolean-control">
			{label}
			<input
				type="checkbox"
				checked={value ?? false}
				onChange={(e) => onChange(prop, e.target.checked)}
				className="shader-boolean-input"
			/>
		</label>
	)
}
