const NUMBER_OF_SEEDED_USERS = 32

function getUserNumber(index: number) {
	if (!Number.isInteger(index) || index < 0) {
		throw new Error(`Expected a non-negative integer parallel index, got ${index}`)
	}
	return index + 1
}

export function getHuppyUserEmail(index: number) {
	return `huppy+clerk_test${getUserNumber(index)}@tldraw.com`
}

export function getSuppyUserEmail(index: number) {
	return `suppy+clerk_test${getUserNumber(index)}@tldraw.com`
}

export const USERS = Array.from({ length: NUMBER_OF_SEEDED_USERS }, (_, i) => getHuppyUserEmail(i))
export const OTHER_USERS = Array.from({ length: NUMBER_OF_SEEDED_USERS }, (_, i) =>
	getSuppyUserEmail(i)
)
