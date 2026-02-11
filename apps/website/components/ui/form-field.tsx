interface FormFieldProps {
	label: string
	id: string
	name: string
	type?: string
	required?: boolean
	placeholder?: string
	rows?: number
}

const inputClasses =
	'w-full rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm text-black placeholder-zinc-400 outline-hidden transition-colors focus:border-brand-blue dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500'

export function FormField({
	label,
	id,
	name,
	type = 'text',
	required,
	placeholder,
	rows,
}: FormFieldProps) {
	return (
		<div>
			<label htmlFor={id} className="mb-2 block text-sm font-medium text-black dark:text-white">
				{label}
			</label>
			{rows ? (
				<textarea
					id={id}
					name={name}
					rows={rows}
					required={required}
					placeholder={placeholder}
					className={`${inputClasses} resize-y`}
				/>
			) : (
				<input
					id={id}
					name={name}
					type={type}
					required={required}
					placeholder={placeholder}
					className={inputClasses}
				/>
			)}
		</div>
	)
}
