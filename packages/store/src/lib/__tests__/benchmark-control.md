# @tldraw/store Performance Benchmark

Generated: 2025-12-23T00:33:42.263Z

## System Info
- Node.js: v22.12.0
- Platform: darwin arm64

## Results

| Benchmark | Description | Ops/sec | Avg (ms) | Total (ms) | Iterations |
|-----------|-------------|---------|----------|------------|------------|
| single-put | Put a single record into the store | 486,169 | 0.002057 | 102.84 | 50,000 |
| batch-put-100 | Put 100 records in a single call | 7,593 | 0.131697 | 131.70 | 1,000 |
| single-get | Get a single record by ID (reactive) | 10,438,005 | 0.000096 | 9.58 | 100,000 |
| single-get-unsafe | Get a single record by ID (non-reactive) | 14,286,990 | 0.000070 | 7.00 | 100,000 |
| update-record | Update a single record using store.update() | 801,962 | 0.001247 | 24.94 | 20,000 |
| remove-record | Remove a single record | 244,001 | 0.004098 | 40.98 | 10,000 |
| all-records | Get all 10,000 records as array | 2,483 | 0.402745 | 2013.73 | 5,000 |
| query-by-type | Query all records of one type (5,000 records) | 530 | 1.888129 | 18881.29 | 10,000 |
| index-lookup | Lookup records by indexed category | 27,212,114 | 0.000037 | 1.84 | 50,000 |
| listener-notification | Put record with 10 listeners attached | 472,903 | 0.002115 | 21.15 | 10,000 |
| transaction-100-updates | Update 100 records in a transaction | 16,593 | 0.060265 | 60.27 | 1,000 |
| serialize | Serialize store with 10,000 records | 1,156 | 0.865275 | 865.28 | 1,000 |
| load-snapshot | Load snapshot with 10,000 records into empty store | 157 | 6.349506 | 3174.75 | 500 |
| computed-cache-get | Get value from computed cache | 8,330,788 | 0.000120 | 6.00 | 50,000 |
| computed-cache-after-change | Update record then read from computed cache | 781,306 | 0.001280 | 12.80 | 10,000 |
| has-record | Check if record exists (alternating hit/miss) | 4,635,290 | 0.000216 | 21.57 | 100,000 |
| clear-store | Clear store with 1,000 records | 839 | 1.192347 | 596.17 | 500 |
| extract-changes | Extract changes from a batch of operations | 49,931 | 0.020028 | 100.14 | 5,000 |

## Benchmark Descriptions

### Write Operations
- **single-put**: Basic write performance for adding one record
- **batch-put-100**: Efficiency of batching multiple records in one put call
- **update-record**: Cost of updating an existing record
- **remove-record**: Cost of removing a record (includes setup)
- **clear-store**: Bulk removal of all records

### Read Operations
- **single-get**: Reactive read that tracks dependencies
- **single-get-unsafe**: Non-reactive read without dependency tracking
- **all-records**: Fetching all records as an array
- **has-record**: Checking record existence

### Query Operations
- **query-by-type**: Filter records by type name
- **index-lookup**: Lookup records using a pre-built index

### Reactive Operations
- **listener-notification**: Cost of notifying multiple listeners on change
- **transaction-100-updates**: Batching many updates in a transaction
- **computed-cache-get**: Reading from a computed cache (cached)
- **computed-cache-after-change**: Cache read after underlying record changed
- **extract-changes**: Capturing changes from a batch of operations

### Serialization
- **serialize**: Converting store to plain objects
- **load-snapshot**: Loading records from a store snapshot

## Notes

Higher ops/sec is better. Lower avg time is better.
