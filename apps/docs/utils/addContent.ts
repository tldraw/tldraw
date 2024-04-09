import { Article, ArticleHeadings, GeneratedContent } from '@/types/content-types'
import GithubSlugger from 'github-slugger'
import { Database } from 'sqlite'
import sqlite3 from 'sqlite3'

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
		`INSERT INTO headings (idx, articleId, level, title, slug, isCode, path) VALUES (?, ?, ?, ?, ?, ?, ?)`
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
      content,
			path
    ) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
				article.author,
				article.title,
				article.description,
				article.hero,
				article.status,
				article.date,
				article.sourceUrl,
				article.componentCode,
				article.componentCodeFiles,
				article.keywords.join(', '),
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
					i,
					article.id,
					heading.level,
					heading.title,
					heading.slug,
					heading.isCode,
					`${article.path}#${heading.slug}`
				)
			)
		)
	}
}

export async function addFTS(db: Database<sqlite3.Database, sqlite3.Statement>) {
	await db.run(`DROP TABLE IF EXISTS ftsArticles`)
	await db.run(
		`CREATE VIRTUAL TABLE ftsArticles USING fts5(title, content, description, keywords, id, sectionId, categoryId, tokenize="trigram")`
	)
	await db.run(
		`INSERT INTO ftsArticles SELECT title, content, description, keywords, id, sectionId, categoryId FROM articles;`
	)

	await db.run(`DROP TABLE IF EXISTS ftsHeadings`)
	await db.run(
		`CREATE VIRTUAL TABLE ftsHeadings USING fts5(title, slug, id, articleId, tokenize="trigram")`
	)
	await db.run(`INSERT INTO ftsHeadings SELECT title, slug, id, articleId FROM headings;`)
}

const slugs = new GithubSlugger()

const MATCH_HEADINGS = /(?:^|\n)(#{1,6})\s+(.+?)(?=\n|$)/g
function getHeadingLinks(content: string) {
	let match
	const headings: ArticleHeadings = []
	const visited = new Set<string>()
	while ((match = MATCH_HEADINGS.exec(content)) !== null) {
		if (visited.has(match[2])) continue
		visited.add(match[2])
		slugs.reset()
		headings.push({
			level: match[1].length,
			title: match[2].replaceAll('`', ''),
			slug: slugs.slug(match[2], true),
			isCode: match[2].startsWith('`'),
		})
	}
	return headings
}
