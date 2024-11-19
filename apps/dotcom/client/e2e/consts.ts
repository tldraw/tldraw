const NUMBER_OF_USERS = 8
export const USERS = Array.from({ length: NUMBER_OF_USERS }).map(
	(_, i) => `huppy+clerk_test${i + 1}@tldraw.com`
)
export const OTHER_USERS = Array.from({ length: NUMBER_OF_USERS }).map(
	(_, i) => `suppy+clerk_test${i + 1}@tldraw.com`
)
