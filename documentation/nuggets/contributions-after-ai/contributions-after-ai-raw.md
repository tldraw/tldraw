# Contributions after AI

This week I wrote an issue on tldraw's repository about a new contributions policy. In short, I announced that due to an influx of low-quality AI pull requests, we would soon begin automatically closing pull requests from external contributors. I was expecting to have to defend my decision, however the general response has been very positive: the problem is real, the solution seems reasonable, maybe we should do the same.

Much of the discussion focused on recognizing AI code or preventing people from using AI tools to contribute code. I think this misses the point. We _already_ accept code written with AI. _I_ write code with AI tools. I expect my team to use AI tools too. If you know the codebase and know what you're doing, writing great code has never been easier.

Instead, the question is more fundamental to code contribution as a valuable thing at all.

If the code is so easy to write, _why would I want someone else to do it?_

## Context and contribution

Every repository gets bad pull requests. A few years ago I submitted a full TypeScript re-write of a text editor because I thought it would be fun to do. I hope the maintainers didn't read it.

One of my first big contributions to an open source project was implementating more arrowheads for Excalidraw. I wrote the code and submitted a PR. The next day, the maintainers kindly pointed me toward their issues-first policy and closed my request.

I stuck with it, though. I was sketching state charts, I wanted the little dots on my arrows, and I cared enough to make it happen. So I stayed engaged and got caught up on the history of the problem. It turned out not to be an implementation question but rather a design problem. How do we let a user pick the start and end arrowheads? Which components can be adapted, which need to be created? Do we need new icons?

It took a few rounds of constructive iterations, moved along by my research and design work, before we all aligned on a solution. I wrote a new PR, we landed it, and now you can put a little dot or whatever on the end of your Excalidraw arrows.

If this were happening today, what would be different?

We would still need to have discussed the problem and designed a solution. It would have still required the sustained attention of a contributor who cared and wanted to see the change go in. Our prototypes would still be a useful part of our research and design but their cost (in time) to produce would be lower. We would have made more of them.

Once we had the context we needed and the alignment on what we would do, the final implementation would have been almost ceremonial. who wants to push the button?

## Eternal Sloptember 

In a world where writing the code is the hard part, I would want to have as many people writing well-informed code as possible. In a world where writing code is easy, I want to push the button because I can do it well _even when poorly informed_.

Here's what I mean.

We'd started getting pull requests that purported to fix reported issues but which were, in retrospect, obvious "fix this issue" one-shots by an author using AI coding tools like Claude Code or Cursor. Not surprisingly, without broader knowledge of the codebase or the purpose of the project, the AI agents were taking the issue at face value and producing a diff. Any problems with the issue were multiplied in the pull request, leading to some of the strangest pull request I'd ever seen.

These pull requests would have been incredible a few months prior. They all looked good. They were formally correct. Tests and checks passed. We'd even started landing some! However, we started to notice unusual patterns. Authors almost always ignored our PR template. Even large PRs would be abandoned, languishing because their authors had neglected to sign our CLA. Commits would be spaced out strangely, with too-brief gaps between each commit.

Many others were totally bizzare and more obvious. They would solve a problem in a way that ignored existing patterns, inlined other parts of the codebase, or used tailwind styles despite our codebase not using tailwind. I even started fixing and cleaning up some pulls, asking my own Claude to make fixes that benefited from my wider knowledge: use this helper, use our existing UI components, etc., all the while thinking that it would have been easier to vibe code this myself.

## Stay away from my slop!

More recently, we started getting PRs that were better-formed but still so far off-base that I knew something had changed. These were pull requests that claimed to solve a problem that we didn't have or fix a bug that didn't exist. Each was claiming to close an issue.

A glance at the linked issue confirmed the problem: one of my own AI scripts, a Claude Code `/issue` command, was giving bad directions.

Being a high-powered tech CEO, I am constantly running into bugs and small UX nits that I want to capture for later. Previously, I would fire these into Linear or our issues as empty tickets, "fix bug in sidebar", then hope I remembered what exactly what was when I came back to it later. 

To help with this problem, I'd created a `/issue` command that created well-formed issues out of these low-specificity inputs. I would run into a bug and write something quickly like `/issue dot menu should stay visible when the menu is open sidebar only desktop", fire off Claude Code to try and figure it out, and continue with my work. I'd get an issue, then a follow-up reply with a root cause analysis for bugs or suggested implementation.

If the issue was obvious or my input was detailed enough, Claude would have a well-researched issue ready to be solved, often with a follow-up command to `/take the issue about the sidebar button`. However, if the issue was complex or my input contained too little information (or, hell, if I drew an unlucky seed) then the AI would head off in the wrong direction and produce an issue with an imagined bug or junk solution.

In this system, slop is lubrication. My old "fix button" tickets were poor quality but useful. They added entropy and noise to the system but were worth it in order to capture a certain type of bug or idea. This new system is a very similar exchange, introducing noise into the system in exchange for other things. What's different is that this noise is _well-formed noise_. To an outsider, the result of my fire-and-forget "fix button" might look identical to a professional, well-researched, and intellectually serious bug report.

In the past, my awful issues would have been ignored. The issues _looked wrong_ and the _effort required_ to produce a fix would have fallen on the author. The noise was never a problem because no one would have tried to write a high-effort diff based on such a low-effort issue.

AI was changing all of that! My low-effort issues were becoming low-effort pull requests, with AI doing both sides of the work. My poor Claude had produced a nonsense issue causing the contributor's poor Claude to produce a nonsense solution.

The thing is, _my_ shitty AI issue was providing value. The contributors shitty AI solution was not. There was a piece in between, a part of the process I would have done but the contributor could _not_ have done, which was to read the issue and decide whether it made sense. Instead, I'd put out a call for pointless contribution.

### The solution

I don't have a solution in mind. If the bottleneck to a project's maturity is no longer the code itself, then the value of external contribution is potentially less than zero. If that's the case, then I think it's better to limit contribution to the places it still matters: reporting, discussion, care, and perspective.

I'll push the button, though.