import { Article, GeneratedContent } from '@/types/content-types'
import console from 'console'
import { Database } from 'sqlite'
import sqlite3 from 'sqlite3'
import { parseMarkdown } from './parse-markdown'

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
		`INSERT INTO headings (idx, articleId, level, title, slug, path) VALUES (?, ?, ?, ?, ?, ?)`
	)

	const articleInsert = await db.prepare(
		`INSERT INTO articles (
      id,
      groupIndex,
      categoryIndex,
	  priority,
      sectionIndex,
      groupId,
      categoryId,
      sectionId,
      authorId,
      title,
	  sidebarTitle,
      description,
      hero,
	  thumbnail,
	  socialImage,
      status,
      date,
      sourceUrl,
			componentCode,
			componentCodeFiles,
      keywords,
	  apiTags,
      content,
			path
    ) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
				article.priority,
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
				article.sidebarTitle,
				article.description,
				article.hero,
				article.thumbnail,
				article.socialImage,
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
			parseMarkdown(article.content ?? '', article.path ?? article.id).headings.map((heading, i) =>
				headingsInsert.run(
					i,
					article.id,
					heading.level,
					heading.title,
					heading.slug,
					heading.slug ? `${article.path}#${heading.slug}` : article.path
				)
			)
		)
	}
}
