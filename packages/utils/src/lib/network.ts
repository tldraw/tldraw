/**
 * Just a wrapper around `window.fetch` that sets the `referrerPolicy` to `strict-origin-when-cross-origin`.
 *
 * @internal
 */
export async function fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
	// eslint-disable-next-line no-restricted-properties
	return window.fetch(input, {
		// We want to make sure that the referrer is not sent to other domains.
		referrerPolicy: 'strict-origin-when-cross-origin',
		...init,
	})
}

/**
 * Just a wrapper around `new Image`, and yeah, it's a bit strange that it's in the network.ts file
 * but the main concern here is the referrerPolicy and setting it correctly.
 *
 * @internal
 */
export const Image = (width?: number, height?: number) => {
	// eslint-disable-next-line no-restricted-properties
	const img = new window.Image(width, height)
	img.referrerPolicy = 'strict-origin-when-cross-origin'
	return img
}
