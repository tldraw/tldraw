You should now "reimplement" the current branch on a new branch with a perfect git commit log in order to produce a branch that can be cleanly read and understood by a reviewer.

First check that the current branch does not have merge conflicts, uncommit changes, or other problems that need fixing. You should have a good, clean source branch to work from.

Next you should create a new branch, from the current branch, and populate it with an "ideal git commit log." The goal is to reproduce the current state of the branch (its diff against the main branch) in the new branch, but with a narratively perfect git commit log. Essentially we want to "reimplement" the current branch with perfect information about our target end state.

Each commit should be a contained step in the progress of the implementation. Imagine a tutorial that walks through the implementation step by step. Each commit should be a single step in the tutorial. The commit should be named, described, and perhaps even commented (using GitHub comments or inline comments) to explain the added or changed code.

The result should be a branch that can be cleanly read and understood by a reviewer. The reviewer should be able to follow the branch, step by step, and understand the code changes at each step. The reviewer should be able to see the progress of the implementation, and the changes made at each step. It should look like the work of a single master developer who began with a perfect understanding of their change, and implemented it step by step, producing a clean logical narrative via its git commit log and comments.

- verify that the current branch is up to date with the main branch
- study the changes in the current branch against the main branch
- create the new branch ({branch_name}-clean)
- make a plan for your commits in the clean branch
- implement the clean branch, following your plan, commit by commit, using comments or inline comments where needed to explain your changes
- verify that the end state of the clean branch is the same as the end state of the original branch
- create a pull request from the clean branch to the main branch

There may be cases where you will need to push commits with --no-verify in order to avoid known issues. It is not necessary that every commit pass tests or checks, though this should be the exception if you're doing your job correctly. It is essential that the end state of your new branch be identical to the end state of the source branch.

### Misc

1. Never add yourself as an author or contributor on any branch.
2. Write your pull reuqest following the same instructions as in the pr.md command file.
3. In your pull request, include a link to the original branch.
