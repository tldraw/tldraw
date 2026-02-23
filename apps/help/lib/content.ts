import fs from 'fs'
import matter from 'gray-matter'
import path from 'path'

const CONTENT_DIR = path.join(process.cwd(), 'content')

export interface Guide {
	slug: string
	title: string
	order: number
	section: string
	content: string
}

export function getAllGuides(): Guide[] {
	const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.mdx'))

	const guides = files.map((filename) => {
		const slug = filename.replace(/\.mdx$/, '')
		const raw = fs.readFileSync(path.join(CONTENT_DIR, filename), 'utf-8')
		const { data, content } = matter(raw)
		return {
			slug,
			title: (data.title as string) ?? slug,
			order: (data.order as number) ?? 999,
			section: (data.section as string) ?? 'General',
			content,
		}
	})

	return guides.sort((a, b) => a.order - b.order)
}

export function getGuide(slug: string): Guide | null {
	const filepath = path.join(CONTENT_DIR, `${slug}.mdx`)
	if (!fs.existsSync(filepath)) return null

	const raw = fs.readFileSync(filepath, 'utf-8')
	const { data, content } = matter(raw)
	return {
		slug,
		title: (data.title as string) ?? slug,
		order: (data.order as number) ?? 999,
		section: (data.section as string) ?? 'General',
		content,
	}
}
