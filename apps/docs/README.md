# tldraw-docs

<div alt style="text-align: center; transform: scale(.5);">
	<picture>
		<img alt="tldraw" src="https://github.com/tldraw/tldraw-lite/raw/main/docs/public/card_repo.png" />
	</picture>
</div>

Welcome to the source for the [tldraw docs site](https://tldraw.dev).

This site is a [Next.js](https://nextjs.org/) app that uses [MDX](https://mdxjs.com/) for content. It contains human-written docs in the `content` folder as well as generated docs in the `api` folder.

We have several scripts that build these files into a SQLite database that is used to generate the site's pages.

To pull the most recent docs from the tldraw repo, create an .env file with a GitHub personal access token and the SHA of the commit or branch that you'd like to pull from.

```
ACCESS_TOKEN=your_github_access_token
SOURCE_SHA=main
```

The files are also provided in this repo.

## Building the content

You can build the markdown and API content using the following scripts:

- `yarn refresh-everything` to reset the database, generate the markdown from the API docs, and populate the database with articles from both the regular content and the generated API content
- `yarn refresh-content` to generate just the regular content

# Content

The docs has two types of content: regular content that is written by the team and auto-generated content that is created using [tsdoc](https://tsdoc.org/) and [API extractor](https://api-extractor.com/).

The `content` folder contains all content in the form of MDX files. All articles belong to a "section" and a "category". The `sections.json` defines each section and any categories belonging to that section.

A section looks like this:

```json
{
	"id": "community",
	"title": "Community",
	"description": "Guides for contributing to tldraw's open source project.",
	"categories": []
}
```

The content is organized into folders for each section. The `gen` folder contains auto-generated content.

## Regular Content

The `content` folder contains all "regular" content in the form of MDX files.All articles belong to a "section" and a "category". The content is organized into folders for each "section".

An article's frontmatter looks like this:

```md
---
title: User Interface
description: How to customize the tldraw user interface using overrides.
status: published
author: steveruizok
date: 3/22/2023
order: 8
keywords:
  - ui
  - interface
  - tools
  - shapes
  - custom
  - button
  - toolbar
  - styles
---
```

### Title

The `title` is displayed in the article's header, in the page title, in the search bar, and in search results. It is used to find an article through the site's search feature.

### Description

The `description` is hidden in the article's frontmatter, but is used to populate the article's meta description tag. It is also used to find an article through the site's search feature.

### Hero

The `hero` is used for the article's social media image. It is not displayed in the article. It should refer to a page in the `public/images` folder.

### Category

An article may declare its `category` in its frontmatter. Any article that does not declare a category will be placed into the "ucg" category for "uncategorized" articles.

### Order

The `order` property defines the article's order in its category. Uncategorized articles are placed at the end of the list of categories sorted by its `order`. For a section without categories, the `order` keyword effectively defines the order that the article will appear in the section list.

### Author

The `author` must refer to an author named in the `content/authors.json` file.

An author looks like this:

```json
"steveruizok": {
	"name": "Steve Ruiz",
	"email": "steve@tldraw.com",
	"twitter": "steveruizok",
	"image": "steve_ruiz.jpg"
}
```

The image should refer to an image in `public/avatars`.

### Date

The `date` is formatted as DD/MM/YYYY.

### Status

An article's `status` may be either `draft` or `published`. A `draft` article is hidden in production.

### Keywords

The `keywords` are used to find an article through the site's search feature.

## Auto-generated content

The auto-generated docs content is created using [tsdoc](https://tsdoc.org/) and [API extractor](https://api-extractor.com/). The source is the API documentation created by `yarn build` or `yarn build-api`. The output is placed in the `gen` folder.

## Developing the docs

When developing the docs, any change to the `content` folder will cause the page to refresh. This is a little shitty but it mostly works.

## Contribution

Please see our [contributing guide](https://github.com/tldraw/tldraw/blob/main/CONTRIBUTING.md). Found a bug? Please [submit an issue](https://github.com/tldraw/tldraw/issues/new).

## License

The tldraw source code and its distributions are provided under the [tldraw license](https://github.com/tldraw/tldraw/blob/master/LICENSE.md). This license does not permit commercial use. To purchase a commercial license or learn more, please fill out [this form](https://forms.gle/PmS4wNzngnbD3fb89).

## Trademarks

Copyright (c) 2023-present tldraw Inc. The tldraw name and logo are trademarks of tldraw. Please see our [trademark guidelines](https://github.com/tldraw/tldraw/blob/main/TRADEMARKS.md) for info on acceptable usage.

## Contact

Find us on Twitter/X at [@tldraw](https://twitter.com/tldraw).

## Community

Have questions, comments or feedback? [Join our discord](https://discord.gg/rhsyWMUJxd) or [start a discussion](https://github.com/tldraw/tldraw/discussions/new). For the latest news and release notes, check out our [Substack](https://tldraw.substack.com/).
