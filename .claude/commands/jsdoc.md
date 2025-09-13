---
description: Creat or update JSDoc comments for all exported items in the provided file or directory.
allowed-tools: Read, Edit, MultiEdit
---

Add comprehensive JSDoc comments to all exported functions, classes, interfaces, types, and variables in the provided file. If no file is provided, use the current file as reported by the ide. If neither are available, do nothing and ask for a file.

You do not need to add JSDoc comments to items that are not exported.

For each exported item, include:

- A concise description of what it does. Do not use the @description tag.
- **@param** - For each parameter with type and description
- **@returns** - Return type and description
- **@example** - Code example showing typical usage (required for functions, class methods, and classes)
- **@public** or **@internal** - Visibility annotation (preserve existing visibility annotations)

Guidelines:

- Only document exported items (functions, classes, interfaces, types, variables)
- Use TypeScript-style type annotations in JSDoc
- Keep descriptions concise but informative
- When included, examples should be small, realistic, and helpful
- Follow existing code style and formatting
- Preserve all existing functionality
- Mark as @public for public API or @internal for internal use

Where you find existing JSDoc comments:

Focus on improving code documentation without changing any implementation details. Check that the examples accurately follow the implementation in code. If the file's comments are already up to date, do nothing. Doing nothing is an acceptable response and preferred to adding comments that are not necessary or which would be less accurate.

Do not add JSDoc comments to items that are not exported.

You can use `npx tsx` to run the code that you are testing.
