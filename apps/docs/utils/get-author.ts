import authors from '@/content/authors.json'

export const getAuthor = (id: string) => {
	return authors.find((author) => author.id === id)
}
