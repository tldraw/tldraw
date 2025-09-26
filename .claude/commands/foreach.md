---
description: Do something for each file in a directory
argument-hint: [directory-path] [what-to-do] [special-rules?]
allowed-tools: Glob, Grep, LS, Read, Edit, MultiEdit, Write, NotebookEdit, WebFetch, TodoWrite, WebSearch, BashOutput, KillBash
---

# Working in $1

In the directory `$1`, make a todo list for each item. Only work at the root level in the directory unless othewise instructued.

# For each item

For each item, your task is to $2. Accomplish that to the best of your ability.

# Special Rules

You may have special rules or instructions. Read these before doing anything.
Rules: {
    $3
}
Ignore if empty.