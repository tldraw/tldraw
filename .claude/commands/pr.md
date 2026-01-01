First, if we're on main, create a new branch with a descriptive name.

Next, commit all changes. All unignored files should be committable unless it _really_ seems like we should not be committing these files. Be sure that we don't commit any API keys or other explicitly private things.

Consider the user's comments: $ARGUMENTS

### Dealing with problems

Committing will automatically run the linter, no need to separately run typechecks, linters, or formatters. Fix any lint or type errors that arise, unless they would involve meaningful changes to the code, in which case please notify the user using the 🚨 emoji. Never force commit or force push.

Example response in this situation:

```
🚨 I can't create/update this PR because there are merge conflicts on the current branch. Would you like me to fix them?
```

Once you are able to commit (or if there are no changes to commit), push your changes.

If a PR does not already exist, you should next publish the branch and create a pull request. If a PR already exists for the current branch, then update the PR's title and description.

### PR title

The PR title should use a semantic PR title as described in the following spec:

The key words “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as described in [**RFC 2119**](https://www.ietf.org/rfc/rfc2119.txt).

1. Commits MUST be prefixed with a type, which consists of a noun, `feat`, `fix`, etc., followed by the OPTIONAL scope and REQUIRED terminal colon and space.
2. The type `feat` MUST be used when a commit adds a new feature to your application or library.
3. The type `fix` MUST be used when a commit represents a bug fix for your application.
4. A scope MAY be provided after a type. A scope MUST consist of a noun describing a section of the codebase surrounded by parenthesis, e.g., `fix(parser):`.
5. A description MUST immediately follow the colon and space after the type/scope prefix. The description is a short summary of the code changes, e.g., *fix: array parsing issue when multiple spaces were contained in string*.
6. A longer commit body MAY be provided after the short description, providing additional contextual information about the code changes. The body MUST begin one blank line after the description.
7. A commit body is free-form and MAY consist of any number of newline separated paragraphs.
8. One or more footers MAY be provided one blank line after the body. Each footer MUST consist of a word token, followed by either a `:<space>` or `<space>#` separator, followed by a string value (this is inspired by the [**git trailer convention**](https://git-scm.com/docs/git-interpret-trailers)).
9. A footer’s token MUST use  in place of whitespace characters, e.g., `Acked-by` (this helps differentiate the footer section from a multi-paragraph body). An exception is made for `BREAKING CHANGE`, which MAY also be used as a token.
10. A footer’s value MAY contain spaces and newlines, and parsing MUST terminate when the next valid footer token/separator pair is observed.
11. Breaking changes MUST be indicated in the type/scope prefix of a commit, or as an entry in the footer.
12. If included as a footer, a breaking change MUST consist of the uppercase text BREAKING CHANGE, followed by a colon, space, and description, e.g., *BREAKING CHANGE: environment variables now take precedence over config files*.
13. Types other than `feat` and `fix` MAY be used in your commit messages, e.g., *docs: update ref docs.*
14. The units of information that make up Conventional Commits MUST NOT be treated as case sensitive by implementors, with the exception of BREAKING CHANGE which MUST be uppercase.
15. BREAKING-CHANGE MUST be synonymous with BREAKING CHANGE, when used as a token in a footer.

Whether creating or updating the pull request, ensure that the pull request's title confirms to the spec.

### PR body

Write or update the pull request's body using the template in `pull_request_template.md`, here quoted:

```md
### Change type

- [ ] `bugfix`
- [ ] `improvement`
- [ ] `feature`
- [ ] `api`
- [ ] `other`

### Test plan

1. Create a shape...
2.

- [ ] Unit tests
- [ ] End to end tests

### Release notes

- Fixed a bug with…
```

### API Changes

If the PR introduces changes to the api-report.md, you must also include an API changes section that describes what API changes were made, lists any breaking changes, and notes any new or removed parameters. Like the release notes section above, this section is intended to help us identify breaking changes, communicate with downstream developers, and write our release notes.

```md
### API changes

- Added new `Editor.logSelectedShapes` method that will log the details of selected shapes.
- Breaking! Removed `Editor.freeze` method.
```

### Related issues

If a bug fix or feature implementation, search issues to find relevant issues that are addressed by this PR.

## Tips

- First paragraph matters in a PR description; A good PR begins with a sentence written like, "In order to X, this PR does Y.". You should aim to give high-level up-front information about the problem being solved as well as the type of work taken to solve it. Keep it short and specific, avoiding meaningless phrases like "In order to improve user experience" or "In order to reduce tech debt". If the PR relates to an isue, please link the issue in the first paragraph. Don't expect the reader to also read the issue; you still need to include information about the problem and solution.
- Place the PR description at the top of the file, above the **Change type** heading
- In Change type, you may delete any items that are not ticked
- Make sure you tick ([x]) the Change type
- If your changes cannot be manually tested, you may remove that ordered list
- Tick Unit tests if tests are present, otherwise leave it unticked
- Tick End to end tests if e2e tests are present, otherwise leave it unticked
- Make one or more brief notes in the Release notes list
- A PR should NEVER include `Generated with Claude Code` or other mention of Claude Code unless the changes in the PR directly relate to claude code.
- If the current PR does not conform to the notes here, update it to conform.
