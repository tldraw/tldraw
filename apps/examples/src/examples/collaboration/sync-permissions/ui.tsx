import { ReactNode } from 'react'

export function Segmented<T extends string>({
	label,
	value,
	options,
	onChange,
}: {
	label: ReactNode
	value: T
	options: readonly T[]
	onChange(value: T): void
}) {
	return (
		<div className="perm-control">
			<span>{label}</span>
			<div className="perm-segmented">
				{options.map((option) => (
					<button
						key={option}
						className={option === value ? 'is-active' : undefined}
						onClick={() => onChange(option)}
					>
						{option}
					</button>
				))}
			</div>
		</div>
	)
}

export function Action({ children, onClick }: { children: ReactNode; onClick(): void }) {
	return (
		<button className="perm-action" onClick={onClick}>
			{children}
		</button>
	)
}

export function Check({
	label,
	checked,
	onChange,
}: {
	label: ReactNode
	checked: boolean
	onChange(checked: boolean): void
}) {
	return (
		<label className="perm-check">
			<input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
			{label}
		</label>
	)
}
