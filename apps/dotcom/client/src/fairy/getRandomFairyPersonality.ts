const GOOD_PERSONALITY_PARTS = [
	'friendly',
	'helpful',
	'kind',
	'generous',
	'caring',
	'compassionate',
	'empathetic',
	'supportive',
	'understanding',
	'patient',
]

const BAD_PERSONALITY_PARTS = [
	'rude',
	'selfish',
	'arrogant',
	'condescending',
	'judgmental',
	'demanding',
	'pushy',
]

export function getRandomFairyPersonality() {
	const startingWithGood = Math.random() < 0.67
	if (startingWithGood) {
		const secondPartGood = Math.random() < 0.67
		if (secondPartGood) {
			const firstIndex = Math.floor(Math.random() * GOOD_PERSONALITY_PARTS.length)
			let secondIndex = Math.floor(Math.random() * GOOD_PERSONALITY_PARTS.length)
			while (secondIndex === firstIndex) {
				secondIndex = Math.floor(Math.random() * GOOD_PERSONALITY_PARTS.length)
			}
			return `${GOOD_PERSONALITY_PARTS[firstIndex]} and ${GOOD_PERSONALITY_PARTS[secondIndex]}`
		} else {
			return `${GOOD_PERSONALITY_PARTS[Math.floor(Math.random() * GOOD_PERSONALITY_PARTS.length)]} but ${BAD_PERSONALITY_PARTS[Math.floor(Math.random() * BAD_PERSONALITY_PARTS.length)]}`
		}
	} else {
		return `${BAD_PERSONALITY_PARTS[Math.floor(Math.random() * BAD_PERSONALITY_PARTS.length)]} but ${GOOD_PERSONALITY_PARTS[Math.floor(Math.random() * GOOD_PERSONALITY_PARTS.length)]}`
	}
}
