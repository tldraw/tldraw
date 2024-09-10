import authors from '@/content/authors.json'

export function getAuthor(id: string) {
	return authors.find((author) => author.id === id)
}
