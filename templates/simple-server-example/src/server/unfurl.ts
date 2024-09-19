import _unfurl from 'unfurl.js'

export async function unfurl(url: string) {
	const { title, description, open_graph, twitter_card, favicon } = await _unfurl.unfurl(url)

	const image = open_graph?.images?.[0]?.url || twitter_card?.images?.[0]?.url

	return {
		title,
		description,
		image,
		favicon,
	}
}
