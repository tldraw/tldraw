import { Article, ArticleHeading, GeneratedContent } from '@/types/content-types'
import console from 'console'
import GithubSlugger from 'github-slugger'
import { Database } from 'sqlite'
import sqlite3 from 'sqlite3'

let headingId = 1

export async function addContentToDb(
	db: Database<sqlite3.Database, sqlite3.Statement>,
	content: GeneratedContent
) {
	const sectionInsert = await db.prepare(
		`INSERT INTO sections (id, idx, title, description, path, sidebar_behavior) VALUES (?, ?, ?, ?, ?, ?)`
	)

	const categoryInsert = await db.prepare(
		`INSERT INTO categories (id, title, description, sectionId, sectionIndex, path) VALUES (?, ?, ?, ?, ?, ?)`
	)

	const headingsInsert = await db.prepare(
		`INSERT INTO headings (id, idx, articleId, level, title, slug, path, content, parentHeadingId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	)

	const articleInsert = await db.prepare(
		`INSERT INTO articles (
      id,
      groupIndex,
      categoryIndex,
      sectionIndex,
      groupId,
      categoryId,
      sectionId,
      authorId,
      title,
      description,
      hero,
      status,
      date,
      sourceUrl,
			componentCode,
			componentCodeFiles,
      keywords,
	  apiTags,
      content,
			path
    ) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	)

	for (let i = 0; i < content.sections.length; i++) {
		const section = content.sections[i]
		try {
			await sectionInsert.run(
				section.id,
				section.id === 'reference' ? 99999 : i,
				section.title,
				section.description,
				section.path,
				section.sidebar_behavior
			)

			for (let c = 0; c < section.categories.length; c++) {
				const category = section.categories[c]
				await categoryInsert.run(
					category.id,
					category.title,
					category.description,
					section.id,
					c,
					category.path
				)
			}
		} catch (e: any) {
			throw Error(`could not add section to db, ${section.id}: ${e.message}`)
		}
	}

	const articles = Object.values(content.articles) as Article[]

	for (let i = 0; i < articles.length; i++) {
		const article = articles[i]
		if (!article.id) {
			throw Error(`hey, article ${article.id} has no id`)
		}

		try {
			await articleInsert.run(
				article.id,
				article.groupIndex,
				article.categoryIndex,
				article.sectionIndex,
				article.groupId,
				article.categoryId,
				article.sectionId,
				article.author
					? typeof article.author === 'string'
						? article.author
						: article.author.join(', ')
					: null,
				article.title,
				article.description,
				article.hero,
				article.status,
				article.date,
				article.sourceUrl,
				article.componentCode,
				article.componentCodeFiles,
				article.keywords.join(', '),
				article.apiTags,
				article.content,
				article.path
			)
		} catch (e: any) {
			console.error(`ERROR: Could not add article with id '${article.id}'`)
			throw e
		}

		await db.run(`DELETE FROM headings WHERE articleId = ?`, article.id)

		await Promise.all(
			getHeadingLinks(article.content ?? '').map((heading, i) =>
				headingsInsert.run(
					heading.id,
					i,
					article.id,
					heading.level,
					heading.title,
					heading.slug,
					heading.slug ? `${article.path}#${heading.slug}` : article.path,
					heading.content,
					heading.parentHeadingId
				)
			)
		)
	}
}

const slugs = new GithubSlugger()

function getHeadingLinks(content: string) {
	const MATCH_HEADINGS = /(?:^|\n)(#{1,6})\s+(.+?)(?=\n|$)/g

	let match
	const headings: ArticleHeading[] = [
		{
			id: headingId++,
			level: 0,
			title: '',
			slug: '',
			content: '',
			parentHeadingId: null,
		},
	]
	const visited = new Set<string>()

	let lastMatchIdx = 0
	while ((match = MATCH_HEADINGS.exec(content)) !== null) {
		// get the content between the last match and this match
		const contentBetween = content.slice(lastMatchIdx, match.index)
		headings[headings.length - 1].content = contentBetween
		lastMatchIdx = match.index

		const rawTitle = match[2]
		// extract the title from the markdown link
		const title = rawTitle.replace(/\[([^\]]+)\]\(.*\)/, '$1')

		if (visited.has(title)) continue
		visited.add(title)
		slugs.reset()

		const level = match[1].length

		// find the parent heading
		const parentHeadingId = headings.findLast((heading) => heading.level < level)!.id

		headings.push({
			id: headingId++,
			level: match[1].length,
			title: title.replaceAll('`', ''),
			slug: slugs.slug(title, true),
			content: '',
			parentHeadingId,
		})
	}

	// get the content after the last match
	const contentAfter = content.slice(lastMatchIdx)
	headings[headings.length - 1].content = contentAfter

	return headings
}
