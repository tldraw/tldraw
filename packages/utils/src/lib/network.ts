/**
 * Just a wrapper around `window.fetch` that sets the `referrerPolicy` to `strict-origin-when-cross-origin`.
 *
 * @public
 */
export async function fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
	return window.fetch(input, {
		// We want to make sure that the referrer is not sent to other domains.
		referrerPolicy: 'strict-origin-when-cross-origin',
		...init,
	})
}
