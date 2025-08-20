---
title: Store performance
component: ./StorePerformanceExample.tsx
category: events
priority: 2
keywords: [performance, store, queries, immutable, benchmark, set]
---

A performance testing example for comparing store query operations.

This example provides two different performance test suites to measure store operations and validate performance improvements from ImmutableSet structural sharing.

## StorePerformanceExample (Editor-level tests)

Tests performance through the Editor API:

- 10,000 shapes across different types (geo, text, draw)
- Multiple query operations with filtering
- Index operations on shape properties
- Bulk update operations
- Structural sharing scenarios

## StorePerformanceDirect (Store-level tests)

Tests the store's internal query system directly - this is where ImmutableSet should show the most benefit:

- Direct store.query.ids() operations
- Index creation and lookup performance
- Complex multi-property queries
- Set intersection operations (core to query performance)
- Structural sharing with similar queries

## Key Performance Indicators for ImmutableSet:

- **Structural sharing tests**: Should be significantly faster due to shared structure
- **Set intersections**: Core operation for complex queries - ImmutableSet should excel
- **Index queries**: Should benefit from structural sharing in index results
- **Type/Property queries**: Should show moderate improvements

## Usage:

1. Run tests on main branch (using Set)
2. Run tests on feature branch (using ImmutableSet)
3. Compare results to validate performance improvements
4. Run multiple times and average results for accurate comparison

Performance metrics are displayed in real-time with detailed explanations of what each test measures.
