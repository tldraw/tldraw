export function getRandomFairyName() {
	let firstNamePrefix = NAME_PARTS[Math.floor(Math.random() * NAME_PARTS.length)]
	const firstNameSuffix = NAME_PARTS[Math.floor(Math.random() * NAME_PARTS.length)]
	let lastNamePrefix = NAME_PARTS[Math.floor(Math.random() * NAME_PARTS.length)]
	const lastNameSuffix = NAME_PARTS[Math.floor(Math.random() * NAME_PARTS.length)]

	if (firstNamePrefix.at(-1) === firstNameSuffix[0]) {
		firstNamePrefix = firstNamePrefix.slice(0, -1)
	}

	if (lastNamePrefix.at(-1) === lastNameSuffix[0]) {
		lastNamePrefix = lastNamePrefix.slice(0, -1)
	}

	let firstName = `${firstNamePrefix[0].toUpperCase()}${firstNamePrefix.slice(1)}${firstNameSuffix}`
	let lastName = `${lastNamePrefix[0].toUpperCase()}${lastNamePrefix.slice(1)}${lastNameSuffix}`

	if (firstName in BANNED_NAMES) {
		firstName = BANNED_NAMES[firstName]
	}
	if (lastName in BANNED_NAMES) {
		lastName = BANNED_NAMES[lastName]
	}

	return firstName
	// return `${firstName} ${lastName}`
}

const NAME_PARTS = [
	'tinker',
	'spark',
	'glimmer',
	'blue',
	'flutter',
	'wind',
	'bolt',
	'flame',
	'spark',
	'star',
	'moon',
	'sun',
	'bell',
	'snell',
	'flick',
	'bubble',
	'bark',
	'fluff',
	'fuzz',
	'shine',
	'glow',
	'petal',
	'gum',
	'toe',
	'branch',
	'tooth',
	'gold',
]

const BANNED_NAMES: { [key: string]: string } = { Tinkerbell: 'Bellertink' }
