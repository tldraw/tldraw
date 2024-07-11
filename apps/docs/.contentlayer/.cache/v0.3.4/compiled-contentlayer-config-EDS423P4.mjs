// contentlayer.config.ts
import { defineDocumentType, makeSource } from "contentlayer/source-files";
var Author = defineDocumentType(() => ({
  name: "Author",
  filePathPattern: `authors/**/*.mdx`,
  fields: {
    name: { type: "string", required: true },
    description: { type: "string", required: false },
    avatar: { type: "string", required: true },
    twitterHandle: { type: "string", required: false }
  },
  computedFields: {
    slug: {
      type: "string",
      resolve: (author) => author._raw.sourceFileName.replace(".mdx", "")
    }
  }
}));
var Category = defineDocumentType(() => ({
  name: "Category",
  filePathPattern: `categories/**/*.mdx`,
  fields: {
    name: { type: "string", required: true },
    description: { type: "string", required: false }
  },
  computedFields: {
    slug: {
      type: "string",
      resolve: (category) => category._raw.sourceFileName.replace(".mdx", "")
    }
  }
}));
var Post = defineDocumentType(() => ({
  name: "Post",
  filePathPattern: `posts/**/*.mdx`,
  fields: {
    title: { type: "string", required: true },
    excerpt: { type: "string", required: true },
    thumbnail: { type: "string", required: true },
    date: { type: "date", required: true },
    category: { type: "enum", options: ["release-notes", "announcements", "product"] },
    authors: { type: "list", of: { type: "string" }, required: true }
  },
  computedFields: {
    slug: {
      type: "string",
      resolve: (post) => post._raw.sourceFileName.replace(".mdx", "")
    }
  }
}));
var contentlayer_config_default = makeSource({
  contentDirPath: "blog",
  documentTypes: [Post, Category, Author]
});
export {
  contentlayer_config_default as default
};
//# sourceMappingURL=compiled-contentlayer-config-EDS423P4.mjs.map
