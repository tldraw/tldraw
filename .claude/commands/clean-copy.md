Reimplement the current branch on a new branch with a clean, narrative-quality git commit history suitable for reviewer comprehension.

**New Branch Name**. Decide on the new branch name. The name should be $ARGUMENTS or, if this is not provided, it should be `{source_branch_name}-clean`.

### Steps

1. **Validate the source branch**
   - The current branch is the source branch.
   - Ensure the current branch has no merge conflicts, uncommitted changes, or other issues.
   - Confirm it is up to date with `main`.

2. **Analyze the diff**
   - Study all changes between the current source branch and `main`.
   - Form a clear understanding of the final intended state.

3. **Create the clean branch**
   - Create a new branch off of main using the New Branch Name.

4. **Plan the commit storyline**
   - Break the implementation down into a sequence of self-contained steps.
   - Each step should reflect a logical stage of development—as if writing a tutorial.

5. **Reimplement the work**
   - Recreate the changes in the clean branch, committing step by step according to your plan.
   - Each commit must:
     - Introduce a single coherent idea.
     - Include a clear commit message and description.
     - Add comments or inline GitHub comments when needed to explain intent.

6. **Verify correctness**
   - Confirm that the final state of `{branch_name}-clean` exactly matches the final state of the original branch.
   - Use `--no-verify` only when necessary (e.g., to bypass known issues). Individual commits do not need to pass tests, but this should be rare.

7. **Open a pull request**
   - Create a PR from the clean branch to `main`.
   - Write the PR following the instructions in `pr.md`.
   - Include a link to the original branch.

There may be cases where you will need to push commits with --no-verify in order to avoid known issues. It is not necessary that every commit pass tests or checks, though this should be the exception if you're doing your job correctly. It is essential that the end state of your new branch be identical to the end state of the source branch.

### Misc

1. Never add yourself as an author or contributor on any branch or commit.
2. Write your pull reuqest following the same instructions as in the pr.md command file.
3. In your pull request, include a link to the original branch.

Your commit should never include lines like:

```md
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

or

```md
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

Or else I'll get in trouble with my boss.
