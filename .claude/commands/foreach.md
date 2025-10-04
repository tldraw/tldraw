---
description: Do something for each file in a directory
argument-hint: [directory-path] [what-to-do] [special-rules?]
allowed-tools: Glob, Grep, LS, Read, Edit, MultiEdit, Write, NotebookEdit, WebFetch, TodoWrite, WebSearch, BashOutput, KillBash
---

# Working in $1

In the directory `$1`, make a todo list for each item. Only work at the root level in the directory unless othewise instructued.

# For each item

For each item, your task is to $2. Accomplish that to the best of your ability. If you're doing things with subagents, call them in batches.

# Special Rules

You may have special rules or instructions. Read these before doing anything. These may modify which files or subdirectories to look in, so you should always priortize the special rules.
Rules: {
    $3
}
Ignore if empty.

# Again

The main flow remains: parse your instructions into a list of files, make a single todo for each file, and do the action specified ($2) for each file individually. One file, one todo item.