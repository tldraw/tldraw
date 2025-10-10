# CLAUDE.md

You're currently helping out with a project called Fairydraw. Fairydraw is a canvas‑native multi‑agent experience in tldraw. It introduces “fairies” — small, visually distinct AI agents that act on the canvas with clear identities, roles, and tools. The goal is to enable on‑canvas collaboration with agents while keeping activity legible, safe, and lightweight.

Fairydraw is built partial on tldraw's agent template, which lives in @templates/agent

## Overview
- Fairies are directed by users and can work within defined areas of the canvas.
- Interactions are designed to be glanceable, with optional deeper inspection of status or logs.
- Visuals and state cues emphasise comprehensibility over spectacle.
- Cost and activity visibility are lightweight and unobtrusive.

## Core concepts
- Fairy: A persistent agent with a role, limited tooling, and local context.=
- Tools as “wands”: Explicit, scoped capabilities granted to a fairy.
- States: Idle, moving, acting, with simple visual distinctions for clarity.

## References
- Fairies and wisps: agent identities and task‑scoped helpers.
- Zones: spatial triggers and bounds for on‑canvas behaviour.
- Context artefacts: reusable guidance attached to work.
