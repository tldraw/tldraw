const NO_INPUT_MESSAGES = [
	'I mumble something quietly.',
	"I'm not sure what to say.",
	'The wind whispers across the canvas.',
	'...',
	'*scratch behind the ears*',
	'Leaves rustle in the breeze.',
]

export function getRandomNoInputMessage() {
	return NO_INPUT_MESSAGES[Math.floor(Math.random() * NO_INPUT_MESSAGES.length)]
}
