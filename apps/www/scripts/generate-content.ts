import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { Content, Guide, GuideFrontmatter, PageFrontmatter, Post, PostFrontmatter } from '../types'

const rootDir = path.join(process.cwd())
const contentDir = path.join(rootDir, 'content')
const postsDir = path.join(contentDir, 'posts')
const pagesDir = path.join(contentDir, 'pages')
const guideDir = path.join(contentDir, 'guide')

export function generateContent() {
  const content: Content = {
    pages: [],
    posts: [],
    guides: [],
  }

  fs.readdirSync(pagesDir, {
    withFileTypes: false,
  })
    .map((result) => {
      const filename = result.toString()
      const slug = filename.replace('.mdx', '')
      const contents = fs.readFileSync(path.join(pagesDir, filename)).toString()
      const parsed = matter({ content: contents }, {})

      return {
        slug: slug,
        content: parsed.content,
        data: parsed.data as PageFrontmatter,
      }
    })
    .map((result, i) => ({ ...result, index: i }))
    .forEach((result) => content.pages.push(result))

  // Posts
  fs.readdirSync(postsDir, {
    withFileTypes: false,
  })
    .map((result: string | Buffer): Post => {
      const filename = result.toString()
      const slug = filename.replace('.mdx', '')
      const contents = fs.readFileSync(path.join(postsDir, filename)).toString()
      const parsed = matter({ content: contents }, {})

      return {
        index: 0,
        slug: slug,
        content: parsed.content,
        date: new Date(parsed.data.date as string).getTime(),
        data: {
          ...(parsed.data as PostFrontmatter),
          date: new Intl.DateTimeFormat('en-GB', {
            dateStyle: 'full',
          }).format(new Date(parsed.data.date)),
        },
      }
    })
    .filter((result) =>
      process.env.NODE_ENV === 'development' ? true : result.data.status === 'published'
    )
    .sort((a, b) => b.date - a.date)
    .map((result, i) => ({ ...result, index: i }))
    .forEach((result) => content.posts.push(result))

  // Guides
  fs.readdirSync(guideDir, {
    withFileTypes: false,
  })
    .map((result: string | Buffer): Guide => {
      const filename = result.toString()
      const slug = filename.replace('.mdx', '')
      const contents = fs.readFileSync(path.join(guideDir, filename)).toString()
      const parsed = matter({ content: contents }, {})

      return {
        index: 0,
        slug: slug,
        content: parsed.content,
        data: {
          ...(parsed.data as GuideFrontmatter),
        },
      }
    })
    .filter((result) =>
      process.env.NODE_ENV === 'development' ? true : result.data.status === 'published'
    )
    .map((result, i) => ({ ...result, index: i }))
    .forEach((result) => content.guides.push(result))

  fs.writeFileSync(path.join(rootDir, 'content.json'), JSON.stringify(content))

  return content
}

generateContent()
