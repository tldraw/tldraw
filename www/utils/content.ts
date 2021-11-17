/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { serialize } from 'next-mdx-remote/serialize'
import jsonContent from '../content.json'
import { generateContent } from '../scripts/generate-content'
import { Content, Guide, GuideLinks, GuideList, Page, Post, PostLinks, PostList } from '../types'

export async function getMdxSource(source: string) {
  return serialize(source, {
    scope: {},
    mdxOptions: {
      rehypePlugins: [],
    },
  })
}

export function getContent() {
  return process.env.NODE_ENV === 'production' ? (jsonContent as Content) : generateContent()
}

// Pages

export function getPages(): Page[] {
  const content = getContent()
  return content.pages
}

export function getPagePaths() {
  return getPages().map(({ slug }) => ({
    params: { slug },
  }))
}

export function getPage(slug: string): Page {
  return getPages().find((page) => page.slug === slug)!
}

// Posts

export function getPosts(): Post[] {
  const content = getContent()
  return process.env.NODE_ENV === 'development'
    ? content.posts
    : content.posts.filter((post) => post.data.status === 'published')
}

export function getPostPaths() {
  return getPosts().map(({ slug }) => ({
    params: { slug },
  }))
}

export function getPost(slug: string): Post {
  return getPosts().find((post) => post.slug === slug)!
}

export function getPostList(): PostList {
  return getPosts().map((post) => ({
    url: '/posts/' + post.slug,
    slug: post.slug,
    data: post.data,
  }))
}

export function getPostLinks(post: Post): PostLinks {
  const posts = getPosts()
  const prev = posts[post.index - 1]
  const next = posts[post.index + 1]

  return {
    prev: prev
      ? {
          url: '/posts/' + prev.slug,
          slug: prev.slug,
          data: prev.data,
        }
      : null,
    next: next
      ? {
          url: '/posts/' + next.slug,
          slug: next.slug,
          data: next.data,
        }
      : null,
  }
}

// Guides

export function getGuides(): Guide[] {
  const content = getContent()
  return process.env.NODE_ENV === 'development'
    ? content.guides
    : content.guides.filter((post) => post.data.status === 'published')
}

export function getGuide(slug: string): Guide {
  return getGuides().find((page) => page.slug === slug)!
}

export function getGuidePaths() {
  return getGuides().map(({ slug }) => ({
    params: { slug },
  }))
}

export function getGuideList(): GuideList {
  const categories: GuideList = {
    introduction: {
      order: 1,
      category: 'Introduction',
      guides: [],
    },
    tools: {
      order: 2,
      category: 'Tools',
      guides: [],
    },
    styles: {
      order: 3,
      category: 'Styles',
      guides: [],
    },
    shortcuts: {
      order: 4,
      category: 'Shortcuts',
      guides: [],
    },
  }

  getGuides().forEach((guide) => {
    if (!categories[guide.data.category]) {
      throw Error("We don't have that category!")
    }

    categories[guide.data.category].guides.push({
      url: '/guide/' + guide.slug,
      slug: guide.slug,
      data: guide.data,
    })
  })

  return categories
}

export function getGuideLinks(guide: Guide): GuideLinks {
  const guides = getGuides()
  const category = guides.filter((other) => guide.data.category === other.data.category)
  const prev = category[guide.data.order - 1]
  const next = category[guide.data.order + 1]

  return {
    prev: prev
      ? {
          url: '/guide/' + prev.slug,
          slug: prev.slug,
          data: prev.data,
        }
      : null,
    next: next
      ? {
          url: '/guide/' + next.slug,
          slug: next.slug,
          data: next.data,
        }
      : null,
  }
}
