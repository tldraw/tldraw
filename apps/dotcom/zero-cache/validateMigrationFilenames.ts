// Migration numbers are chosen by hand, so two concurrent PRs can pick the same
// one. The filenames differ, so git merges both cleanly and `main` ends up with
// a duplicate. This throws on duplicate or non-contiguous numbers; CI runs it
// against the post-merge tree, catching the collision before it lands.

// Numbers duplicated before this check existed. Don't add to this list.
export const GRANDFATHERED_DUPLICATE_NUMBERS: ReadonlySet<number> = new Set([27])

function pad(n: number) {
	return String(n).padStart(3, '0')
}

export function validateMigrationFilenames(
	filenames: string[],
	allowedDuplicates: ReadonlySet<number> = GRANDFATHERED_DUPLICATE_NUMBERS
) {
	const filesByNumber = new Map<number, string[]>()
	for (const filename of filenames) {
		const match = filename.match(/^(\d{3})_.+\.sql$/)
		if (!match) {
			throw new Error(
				`Migration filename "${filename}" must match "NNN_description.sql" (a three-digit number, for example "032_add_thing.sql").`
			)
		}
		const number = Number(match[1])
		const existing = filesByNumber.get(number)
		if (existing) {
			existing.push(filename)
		} else {
			filesByNumber.set(number, [filename])
		}
	}

	if (filesByNumber.size === 0) {
		throw new Error('No migrations found.')
	}

	const numbers = [...filesByNumber.keys()].sort((a, b) => a - b)

	// Numbers must be unique.
	for (const number of numbers) {
		const files = filesByNumber.get(number)!
		if (files.length > 1 && !allowedDuplicates.has(number)) {
			throw new Error(
				`Duplicate migration number ${pad(number)}: ${[...files].sort().join(', ')}. ` +
					`Each migration must use a unique number — bump one of them to the next free number.`
			)
		}
	}

	// Numbers must be contiguous starting at 000.
	if (numbers[0] !== 0) {
		throw new Error(`Migrations must start at 000, but the lowest number is ${pad(numbers[0])}.`)
	}
	for (let i = 1; i < numbers.length; i++) {
		const prev = numbers[i - 1]
		const curr = numbers[i]
		if (curr !== prev + 1) {
			throw new Error(
				`Migration numbers must be contiguous: missing ${pad(prev + 1)} (jumps from ${pad(prev)} to ${pad(curr)}).`
			)
		}
	}
}
