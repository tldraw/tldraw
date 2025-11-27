function rand<T>(array: T[]): T {
	return array[Math.floor(Math.random() * array.length)]
}

function upper(str: string): string {
	return str[0].toUpperCase() + str.slice(1)
}

const usedNames = new Set<string>()

export function getRandomFairyName(step = 0) {
	// e.g. Steve Mossgrain, Doris Belltink
	const firstName = `${upper(rand(FIRST_NAME_PARTS))}`
	const lastName = `${upper(rand(LAST_NAME_PARTS_1)) + rand(LAST_NAME_PARTS_2)}`

	// Reset the used names if we've tried 3 attempts
	if (step > 3) usedNames.clear()

	const name = `${firstName} ${lastName}`

	// If the name is already used, try again
	if (usedNames.has(name)) {
		return getRandomFairyName(step + 1)
	}

	// Add the name to the used names
	usedNames.add(name)

	// Return the name
	return name
}

const FIRST_NAME_PARTS = [
	// Baseball players from 1921 MLB / 1943 AAGPBL
	'Tal',
	'Cliff',
	'Bobby',
	'Red',
	'Jack',
	'James',
	'Matt',
	'Ted',
	'Hank',
	'Johnny',
	'Don',
	'Bill',
	'Ken',
	'Nelson',
	'Roy',
	'John',
	'Pete',
	'Bob',
	'Clint',
	'Dick',
	'Chuck',
	'Herb',
	'George',
	'Harry',
	'Larry',
	'Bill',
	'Red',
	'Joe',
	'Hoot',
	'Ferris',
	'Alice',
	'Ann',
	'Anna',
	'Donna',
	'Eva',
	'Frances',
	'Max',
	'Helen',
	'Jane',
	'Janet',
	'Joan',
	'Joyce',
	'June',
	'Kay',
	'Marian',
	'Mary',
	'Rita',
	'Sophie',
	'Mo',
]

// Two syllable, trochaic
const LAST_NAME_PARTS_1 = [
	'Tinkle',
	'Wiggle',
	'Flutter',
	'Farber',
	'Snelle',
	'Sparkle',
	'Glimmer',
	'Glitter',
	'Ribbon',
	'Feather',
	'Tickle',
	'Flicker',
	'Winkle',
	'Whisper',
	'Color',
	'Silver',
	'Shimmer',
	'Murmer',
	'Meadow',
	'Wobble',
	'Nibble',
	'Rustle',
	'Snuggle',
	'Sputter',
	'Tattle',
	'Fiddle',
	'Cinder',
	'Marrow',
	'Pebble',
	'Petal',
	'River',
	'Velvet',
	'Button',
	'Softer',
	'Shiver',
]

// Single syllable
const LAST_NAME_PARTS_2 = [
	// Patronyms, etc
	'son',
	'smith',
	'man',
	'sen',
	'ovich',
	'poulos',
	'ides',
	'ton',
	'ford',
	'ham',
	'ski',
	'berg',
	'er',
	'mann',
	'hard',
	'ward',
	'wyn',
	'kin',
	'ling',
	'let',
	// Characterized
	'snelle',
	'spark',
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
	'bark',
	'shine',
	'iron',
	'coal',
	'stone',
	'moss',
	'bone',
	'wood',
	'leaf',
	'twig',
	'branch',
	'root',
	'trunk',
	'bark',
	'pine',
	'oak',
	'gem',
	'glow',
	'toe',
	'tooth',
	'gold',
]
