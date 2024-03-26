import { useId } from 'react'

export function SelectButtons<Items extends { value: any; label: string }[]>({
	label,
	items,
	value,
	onChange,
}: {
	label: string
	items: Items
	value: Items[number]['value']
	onChange: (value: Items[number]['value']) => void
}) {
	const id = useId()
	return (
		<div className="SelectButtons" role="radiogroup" aria-labelledby={id}>
			<div id={id}>{label}</div>
			{items.map((item, i) => (
				<button
					key={i}
					role="radio"
					aria-checked={item.value === value}
					onClick={() => onChange(item.value)}
				>
					<span>{item.label}</span>
				</button>
			))}
		</div>
	)
}
