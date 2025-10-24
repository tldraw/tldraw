---
description: Call subagents to write tests for all files in the directory using subagents.
argument-hint: [directory-path]
allowed-tools: Read
---

# Writing tests for $1

Use given subagent to write the tests for files in this directory: $1

Only write tests for the files at the root level of the given directory, don't go into subdirectories.

If $1 is a file, just write tests for that file.

## Instructions

# Make a todo list

If you're working in a directory, you may have lots of files to review. Make a todo item for each file. Exclude `index.ts` files. Only work at root level of the directory. Make a todo for items that do and do not have tests already.

# For each file

Follow the steps below for each file in your todo list.

## Call test-writer subagent

Call the test-writer subagent on the specified file ONLY. Make sure to pass $1 in as the argument. This will write comprehensive tests for the file.

**Important**
If the subagent makes any changes to the underlying code itself (as opposed to writing tests), you must immediately revert that change and call the subagent again on that file, this time specifiying it must not change the underlying code. If it was trying to fix a bug, or reported a bug to fix, report that bug back to the user.

# When you're done

Once all tests have been written for all files, call the `test-type-fixer` subagent with the directory as an argument in order to do one final pass on the types.