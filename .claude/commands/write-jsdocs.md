---
description: Call subagents to write JSDoc comments for all exported items in the provided file or directory using subagents.
argument-hint: [directory-path]
allowed-tools: Read
---

# Writing JSDoc Comments for $1

Use given subagent to write the JSDocs for all exported functions, classes, interfaces, types, and variables in a given file, or for each given file this directory: $1

If given a directory, only write JSDocs for the files at the root level of the given directory, don't go into subdirectories.

## Instructions

# Make a todo list

If you're working in a directory, you may have lots of files to review. Make a todo item for each file. Exlcude tests. Exlcude index files. Only work at root level of the directory.

# For each file

Follow the steps below for each file in your todo list.

## Call jsdoc-writer subagent

Call the jsdoc-writer subagent on the specified file ONLY. Make sure to pass $1 in as the argument. This will write comprehensive JSDocs for the file.

**Important**
If the subagent makes any changes to the underlying code itself (as opposed to the documentation), you must immediately revert that change and call the subagent again on that file, this time specifiying it must not change the underlying code. If it was trying to fix a bug, or reported a bug to fix, report that bug back to the user.
