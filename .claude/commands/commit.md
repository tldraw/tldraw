Stage all current changes, write a commit message, and commit to the current branch.

### Steps

1. **Check current state**
   - Run `git status` to see all untracked and modified files.
   - Run `git diff` to review unstaged changes.
   - Run `git log -3 --oneline` to see recent commit message style.

2. **Stage changes**
   - Stage all relevant changes using `git add`.
   - Do not stage files that appear to contain API keys, secrets, or other sensitive data.
   - If unsure whether a file should be committed, ask the user.

3. **Write commit message**
   - Use conventional commit format: `type(scope): description`
   - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
   - Scope is optional but recommended when changes are focused on a specific area.
   - Description should be concise (50 chars or less) and use imperative mood.
   - Add a body if the changes need more explanation.

4. **Commit**
   - Create the commit.
   - If pre-commit hooks fail, fix the issues and retry.
   - Never use `--no-verify` unless explicitly requested by the user.

### Dealing with problems

Committing will automatically run the linter. Fix any lint or type errors that arise, unless they would involve meaningful changes to the code, in which case notify the user using the 🚨 emoji.

Example response:

```
🚨 The pre-commit hook failed due to lint errors in files I didn't modify. Would you like me to fix them or commit with --no-verify?
```

### Important

- Never force commit or use `--no-verify` without user permission.
- Never add yourself as an author or contributor.
- Do not include lines like `🤖 Generated with Claude Code` or `Co-Authored-By: Claude` in commits.
