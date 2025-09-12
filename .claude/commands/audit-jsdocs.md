---
description: Audit the quality of all JSDoc comments for all exported items in the provided file or directory using subagents.
argument-hint: [directory-path]
allowed-tools: Read, Edit, MultiEdit
---

# Auditing JSDoc Comments

Use given subagents to audit the JSDocs for all exported functions, classes, interfaces, types, and variables in a given file, or for each given file in a directory.

## Instructions

**Arguments:**

- `$1` (optional): File/directory path to audit (if not provided, uses the current directory)

# Make a todo list
If you're working in a directory, you may have lots of files to review. Make a todo to audit each item. Exlcude tests.

# Audit each file

Follow the steps below for each file in your todo list.

## Call subagents in order

To properly audit a file, call the 2 following subagents, one after the other. 

### Call jsdoc-description-param-auditor subagent

The first thing you do is call the jsdoc-description-param-auditor subagent on the specifc file you want to edit. This will do a pass on the descriptions and params to make sure they are accurate.

### Call jsdoc-example-auditor subagent

The next thing you do is call the jsdoc-example-auditor subagent. This will do a pass on the examples section and to make sure they are accurate and show how to use the function.

**Important**
If either of these subagents makes any changes to the underlying code itself (as opposed to the documentation), you must immediately revert that change and call the subagent again on that file, this time specifiying it must not change the code of the function.