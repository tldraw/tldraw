---
title: Cluster graph playground
component: ./ClusterGraphPlaygroundExample.tsx
category: editor-api
priority: 50
keywords: [clustering, graph, overlay, spatial, delaunay, keywords, bindings, agents]
---

Cluster the shapes on the page into a navigable graph and visualize it live with a custom overlay.

---

This playground explores how to turn a freeform canvas into a walkable, queryable graph — for example, so an agent-facing API can let an LLM explore a board by meaning ("the login wireframe", "the flowchart next to it") instead of raw coordinates.

Every top-level shape is a clusterable atom; frames and groups carry their children with them. A union-find linkage pass merges atoms by:

- **Proximity** — bounds-gap or center distance within `eps`. Auto mode derives `eps` from the page's nearest-neighbor distance distribution and median shape size, so dense wireframes cluster tightly while sparse boards cluster coarsely. Threshold linkage with union-find is equivalent to single-linkage clustering cut at `eps` (DBSCAN with `minPts = 1`), so every shape lands in exactly one cluster.
- **Containment** — a shape fully inside another joins its cluster.
- **Arrow bindings** — three modes: `ignore` (arrows never affect membership), `merge` (an arrow pulls its two ends into one cluster), and `separate` (a text or note shape that only points at things — no arrows point back at it — is treated as an annotation: it keeps its own cluster and the relationship becomes a graph edge instead, while peer-to-peer connections like flowchart nodes stay proximity-clustered).

Cluster centroids become graph nodes, connected by your choice of spatial graph — Delaunay triangulation, Gabriel graph, relative neighborhood graph, minimum spanning tree, or k-nearest neighbors (each a progressively sparser subgraph of the last). Arrows that span clusters add dashed "semantic" edges. Toggle subclusters to run the same linkage at a finer eps inside each cluster.

Each cluster gets keywords via c-TF-IDF (term frequency in the cluster, discounted by how many clusters share the term) over shape text, with frame names boosted and used verbatim as titles.

Hover a cluster hull to highlight its graph neighborhood and preview the JSON payload an agent would receive when querying that node — including teaser labels for adjacent nodes.
