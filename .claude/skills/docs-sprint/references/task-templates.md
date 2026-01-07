# Task templates

Templates for docs sprint configurations.

## Basic sprint: evaluate + improve

The most common pattern: evaluate all docs, then improve any with low scores.

```json
{
  "project": "docs-sprint-001",
  "description": "Evaluate and improve SDK documentation",
  "branch": "docs/sprint-001",
  "style_guide_version": "2025-01-07",

  "articles": [
    "sdk-features/actions.mdx",
    "sdk-features/groups.mdx",
    "sdk-features/bindings.mdx"
  ],

  "stories": [
    {
      "id": "evaluate",
      "priority": 1,
      "title": "Evaluate documentation",
      "instructions": "Score on readability, voice, completeness, accuracy. Verify code against source.",
      "acceptance": [
        "Scores in frontmatter",
        "Notes populated",
        "Priority fixes if score < 8"
      ],
      "status": {
        "sdk-features/actions.mdx": false,
        "sdk-features/groups.mdx": false,
        "sdk-features/bindings.mdx": false
      }
    },
    {
      "id": "improve",
      "priority": 2,
      "title": "Improve documentation",
      "instructions": "Address priority fixes. Focus on lowest scores first.",
      "acceptance": [
        "All scores 8+",
        "No AI tells",
        "Re-evaluated after changes"
      ],
      "depends_on": "evaluate",
      "status": {
        "sdk-features/actions.mdx": false,
        "sdk-features/groups.mdx": false,
        "sdk-features/bindings.mdx": false
      }
    }
  ],

  "story_definitions": {
    "evaluate": {
      "description": "Score a document on 4 dimensions",
      "workflow": "Use /evaluate-docs pattern"
    },
    "improve": {
      "description": "Improve based on scores and notes",
      "workflow": "Use /improve-docs pattern"
    }
  }
}
```

## Full pipeline: evaluate → improve → update

For thorough documentation refresh including API verification.

```json
{
  "articles": [
    "sdk-features/editor.mdx",
    "sdk-features/shapes.mdx",
    "sdk-features/tools.mdx"
  ],

  "stories": [
    {
      "id": "evaluate",
      "priority": 1,
      "title": "Evaluate documentation",
      "status": {
        "sdk-features/editor.mdx": false,
        "sdk-features/shapes.mdx": false,
        "sdk-features/tools.mdx": false
      }
    },
    {
      "id": "improve",
      "priority": 2,
      "title": "Improve documentation",
      "depends_on": "evaluate",
      "status": {
        "sdk-features/editor.mdx": false,
        "sdk-features/shapes.mdx": false,
        "sdk-features/tools.mdx": false
      }
    },
    {
      "id": "update",
      "priority": 3,
      "title": "Sync with codebase",
      "instructions": "Verify all code snippets against current API. Update outdated sections.",
      "depends_on": "improve",
      "status": {
        "sdk-features/editor.mdx": false,
        "sdk-features/shapes.mdx": false,
        "sdk-features/tools.mdx": false
      }
    }
  ]
}
```

## Adding a new article mid-sprint

To add an article to an existing sprint:

1. Add to `articles` array:
```json
"articles": [
  "sdk-features/actions.mdx",
  "sdk-features/new-feature.mdx"  // ← add
]
```

2. Add to each story's `status` with `false`:
```json
"stories": [
  {
    "id": "evaluate",
    "status": {
      "sdk-features/actions.mdx": true,  // already done
      "sdk-features/new-feature.mdx": false  // ← add
    }
  },
  {
    "id": "improve",
    "status": {
      "sdk-features/actions.mdx": false,
      "sdk-features/new-feature.mdx": false  // ← add
    }
  }
]
```

The loop will pick it up automatically.

## Write-only sprint

For creating new documentation from scratch.

```json
{
  "articles": [
    "sdk-features/new-feature-1.mdx",
    "sdk-features/new-feature-2.mdx"
  ],

  "stories": [
    {
      "id": "write",
      "priority": 1,
      "title": "Write new documentation",
      "instructions": "Research feature in codebase. Create doc following voice guide.",
      "acceptance": [
        "Overview explains what and why",
        "Key concepts with code snippets",
        "Links to examples",
        "Initial scores 8+"
      ],
      "status": {
        "sdk-features/new-feature-1.mdx": false,
        "sdk-features/new-feature-2.mdx": false
      }
    }
  ]
}
```

## Style guide refresh

Apply style updates across existing docs.

```json
{
  "articles": [
    "sdk-features/actions.mdx",
    "sdk-features/groups.mdx",
    "sdk-features/bindings.mdx"
  ],

  "stories": [
    {
      "id": "apply-style",
      "priority": 1,
      "title": "Apply style guide updates",
      "instructions": "Fix hedging, passive voice, AI tells, Title Case headings.",
      "acceptance": [
        "No Title Case headings",
        "No AI writing tells",
        "Voice score 8+"
      ],
      "status": {
        "sdk-features/actions.mdx": false,
        "sdk-features/groups.mdx": false,
        "sdk-features/bindings.mdx": false
      }
    }
  ]
}
```

## Priority guidelines

Lower number = higher priority. Typical ordering:

1. **evaluate** - Need scores before improving
2. **improve** - Fix known issues
3. **write** - New content
4. **update** - Sync with code changes
5. **apply-style** - Polish

Within stories, articles are processed in the order they appear in the status object.

## Dependency rules

- `depends_on` references another story's `id`
- An article is blocked if its dependency story has `status[article] = false`
- Only the same article must be complete in the dependency, not all articles
