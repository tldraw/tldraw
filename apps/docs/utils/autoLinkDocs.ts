/* eslint-disable no-useless-escape */
import { Article } from '@/types/content-types'
import { Database } from 'sqlite'
import sqlite3 from 'sqlite3'

export async function autoLinkDocs(db: Database<sqlite3.Database, sqlite3.Statement>) {
	// replace [TLEditor](?) with [TLEditor](/reference/editor/TLEditor)?
	// not sure how we would get there but finding an article with the same title
	const articles = await db.all(
		'SELECT id, content, path FROM articles WHERE sectionId != ?',
		'reference'
	)
	await Promise.all(articles.map((a) => autoLinkDocsForArticle(db, a)))
}

const regex = /\[`?([^\[\]]*?)`?\]\(\?\)/g

export async function autoLinkDocsForArticle(
	db: Database<sqlite3.Database, sqlite3.Statement>,
	{ id, content, path }: Pick<Article, 'id' | 'content' | 'path'>
) {
	if (!content) return

	let didChange = false
	let result = content

	const matches = content.matchAll(regex)
	if (!matches) return

	for (const match of Array.from(matches)) {
		const [hit, _title] = match
		const [title, heading] = _title.split('#')
		const article = await db.get(
			'SELECT id, sectionId, categoryId FROM articles WHERE title = ? AND sectionId = ?',
			title,
			'reference'
		)

		// Get the LOC of the error
		const loc = content.split('\n').reduce((acc, line, i) => {
			if (line.includes(hit)) {
				acc = i
			}
			return acc
		}, 0)

		if (!article) {
			throw Error(`💥 Could not find article for ${_title} (${title}) in ${path} at line ${loc}`)
		}

		let str = ''

		if (heading) {
			const headingRow = await db.get('SELECT slug FROM headings WHERE slug = ?', heading)
			if (!headingRow) throw Error(`Could not find heading for ${_title} (${heading}) in ${id}`)
			str = `[\`${title}.${heading}\`](/${article.sectionId}/${article.categoryId}/${article.id}#${headingRow.slug})`
		} else {
			str = `[\`${title}\`](/${article.sectionId}/${article.categoryId}/${article.id})`
		}

		result = result.replaceAll(hit, str)
		didChange = true
	}

	if (didChange) {
		await db.run('UPDATE articles SET content = ? WHERE id = ?', result, id)
	}
}
