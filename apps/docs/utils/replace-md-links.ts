export function replaceMarkdownLinks(text: string) {
	const links = text.match(/\[.*?\)/g)
	if (links !== null && links.length > 0) {
		for (const link of links) {
			const caption = link.match(/\[(.*?)\]/)![1]
			// const url = link.match(/\((.*?)\)/)![1]
			text = text.replace(link, caption)
		}
	}
	return text
}
