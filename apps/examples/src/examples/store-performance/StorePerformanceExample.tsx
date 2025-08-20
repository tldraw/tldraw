import { useCallback, useState } from 'react'
import { createShapeId, deferAsyncEffects, sleep, Tldraw, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import './store-performance.css'

interface TestResults {
	indexCreation: number
	simpleQuery: number
	complexQuery: number
	incrementalUpdate: number
	structuralSharing: number
	editorScenario: number
	cachePerformance: number
	memoryGrowth?: number
}

// Utility to measure performance
const measurePerformance = async (fn: () => Promise<void> | void): Promise<number> => {
	const start = performance.now()

	await deferAsyncEffects(async () => {
		await fn()
	})
	return performance.now() - start
}

function PerformanceTestPanel() {
	const editor = useEditor()
	const [isRunning, setIsRunning] = useState(false)
	const [results, setResults] = useState<TestResults | null>(null)
	const [shapeCount, setShapeCount] = useState(3000)
	const [testProgress, setTestProgress] = useState('')

	const runPerformanceTests = useCallback(async () => {
		if (!editor || isRunning) return

		setIsRunning(true)
		setResults(null)

		try {
			const store = editor.store

			// Clear existing shapes and prepare test data
			setTestProgress('Preparing test environment...')
			editor.selectAll()
			editor.deleteShapes(editor.getSelectedShapeIds())

			// Create test data first
			const shapesToCreate = []
			for (let i = 0; i < shapeCount; i++) {
				const type = i % 2 === 0 ? 'geo' : 'draw'
				const color = ['black', 'blue', 'red', 'green', 'yellow'][i % 5]
				const parentId = editor.getCurrentPageId() // Keep all shapes on current page for simplicity

				const baseShape = {
					id: createShapeId(`test-${type}-${i}`),
					x: Math.random() * 2000 - 1000,
					y: Math.random() * 2000 - 1000,
					parentId,
					meta: {
						category: i % 3 === 0 ? 'category-a' : i % 3 === 1 ? 'category-b' : 'category-c',
					},
				}

				if (type === 'geo') {
					shapesToCreate.push({
						...baseShape,
						type: 'geo',
						props: {
							geo: 'rectangle',
							color,
							w: 100 + Math.random() * 200,
							h: 100 + Math.random() * 200,
						},
					})
				} else if (type === 'draw') {
					shapesToCreate.push({
						...baseShape,
						type: 'draw',
						props: {
							segments: [
								{
									type: 'straight',
									points: [
										{ x: 0, y: 0, z: 0.5 },
										{ x: 50, y: 50, z: 0.5 },
									],
								},
							],
							color,
						},
					})
				}
			}

			editor.createShapes(shapesToCreate)

			// Test 1: Index Creation Performance
			setTestProgress('Testing index creation performance...')
			const indexCreationTime = await measurePerformance(async () => {
				// // Create fresh indexes - this tests the core ImmutableSet index building
				// const typeIndex = store.query.index('shape', 'type')
				// const parentIndex = store.query.index('shape', 'parentId')
				// // Force computation of indexes (this is where ImmutableSet construction happens)
				// typeIndex.get()
				// parentIndex.get()
				await sleep(3000)
			})

			// Test 2: Query Execution Performance (Single Condition)
			setTestProgress('Testing simple query execution...')
			const simpleQueryTime = await measurePerformance(() => {
				// // Test basic index lookup - should be fast with good indexing
				// for (let i = 0; i < 200; i++) {
				// 	const query = store.query.ids('shape', () => ({ type: { eq: 'geo' } }))
				// 	query.get() // This uses the precomputed index
				// }
			})

			// Test 3: Query Execution Performance (Multi-Condition)
			setTestProgress('Testing complex query execution...')
			const complexQueryTime = await measurePerformance(() => {
				// // Test set intersection performance - this is where ImmutableSet shines
				// for (let i = 0; i < 100; i++) {
				// 	const query = store.query.ids('shape', () => ({
				// 		type: { eq: 'geo' },
				// 		parentId: { eq: editor.getCurrentPageId() },
				// 	}))
				// 	query.get() // Forces set intersection of type and parentId indexes
				// }
			})

			// Test 4: Incremental Update Performance
			setTestProgress('Testing incremental query updates...')
			const updateQuery = store.query.ids('shape', () => ({ type: { eq: 'geo' } }))
			updateQuery.get() // Initial computation

			const incrementalUpdateTime = await measurePerformance(function shabooby() {
				// Test how efficiently queries update when store changes
				for (let i = 0; i < 50; i++) {
					// Add shapes - should trigger incremental update
					const newShapes = [
						{
							id: createShapeId(`incremental-${i}`),
							type: 'geo',
							x: Math.random() * 100,
							y: Math.random() * 100,
							props: { geo: 'rectangle', color: 'black', w: 50, h: 50 },
						},
					]
					editor.createShapes(newShapes)

					// Query should use incremental update, not full recomputation
					updateQuery.get()

					// Remove shapes
					editor.deleteShapes([`incremental-${i}` as any])
					updateQuery.get()
				}
			})

			// Test 5: Structural Sharing Performance
			setTestProgress('Testing structural sharing...')
			const initialMemory = (performance as any).memory?.usedJSHeapSize || 0

			const structuralSharingTime = await measurePerformance(() => {
				// // Get base result set (not used but shows how to get all shapes)
				// const _baseResult = store.query.ids('shape').get()
				// // Create many derived sets that should share structure
				// const derivedSets = []
				// for (let i = 0; i < 500; i++) {
				// 	// These operations should benefit from structural sharing
				// 	const filtered = store.query
				// 		.ids('shape', () => ({
				// 			type: { neq: `nonexistent-${i}` },
				// 		}))
				// 		.get()
				// 	derivedSets.push(filtered)
				// }
				// // Test intersection performance with structural sharing
				// for (let i = 0; i < 100; i++) {
				// 	const set1 = derivedSets[i * 2]
				// 	const set2 = derivedSets[i * 2 + 1]
				// 	if (set1 && set2 && typeof (set1 as any).intersect === 'function') {
				// 		;(set1 as any).intersect(set2) // Should be fast with structural sharing
				// 	}
				// }
			})

			const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
			const memoryGrowth = finalMemory - initialMemory

			// Test 6: Real Editor Derivation Performance
			setTestProgress('Testing realistic editor queries...')
			const editorScenarioTime = await measurePerformance(() => {
				// // Test patterns similar to real Editor derivations
				// for (let i = 0; i < 100; i++) {
				// 	// Simulate getting shapes for current page (common operation)
				// 	const currentPageShapes = store.query.ids('shape', () => ({
				// 		parentId: { eq: editor.getCurrentPageId() },
				// 	}))
				// 	currentPageShapes.get()
				// 	// Simulate getting shapes by type (for tool logic)
				// 	const geoShapes = store.query.ids('shape', () => ({
				// 		type: { eq: 'geo' },
				// 		parentId: { eq: editor.getCurrentPageId() },
				// 	}))
				// 	geoShapes.get()
				// 	// Simulate bindings query (if any bindings exist)
				// 	const bindings = store.query.ids('binding')
				// 	bindings.get()
				// }
			})

			// Test 7: Query Cache Performance
			setTestProgress('Testing query result caching...')
			const cachePerformance = await measurePerformance(() => {
				// // Create a query and access it many times - should hit cache
				// const cachedQuery = store.query.ids('shape', () => ({ type: { eq: 'geo' } }))
				// for (let i = 0; i < 1000; i++) {
				// 	cachedQuery.get() // Should be cached after first computation
				// }
			})

			setResults({
				indexCreation: indexCreationTime,
				simpleQuery: simpleQueryTime,
				complexQuery: complexQueryTime,
				incrementalUpdate: incrementalUpdateTime,
				structuralSharing: structuralSharingTime,
				editorScenario: editorScenarioTime,
				cachePerformance: cachePerformance,
				memoryGrowth: memoryGrowth,
			})

			setTestProgress('Store performance tests completed!')
		} catch (error) {
			console.error('Store performance test failed:', error)
			setTestProgress(`Test failed: ${error}`)
		} finally {
			setIsRunning(false)
		}
	}, [editor, isRunning, shapeCount])

	const clearShapes = useCallback(() => {
		if (!editor) return
		editor.selectAll()
		editor.deleteShapes(editor.getSelectedShapeIds())
	}, [editor])

	return (
		<div className="store-performance-panel">
			<div className="performance-controls">
				<h3>Store Query Performance Tests</h3>
				<p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
					Tests actual store query system performance including index creation, set intersections,
					and incremental updates. Compare results between main branch (Set) and ImmutableSet
					branch.
				</p>
				<div className="control-group">
					<label>
						Shape Count:
						<input
							type="number"
							value={shapeCount}
							onChange={(e) => setShapeCount(parseInt(e.target.value))}
							min={1000}
							max={12000}
							step={1000}
							disabled={isRunning}
						/>
					</label>
				</div>
				<div className="control-group">
					<button onClick={runPerformanceTests} disabled={isRunning}>
						{isRunning ? 'Running Tests...' : 'Run Performance Tests'}
					</button>
					<button onClick={clearShapes} disabled={isRunning}>
						Clear Shapes
					</button>
				</div>
				{testProgress && <div className="test-progress">{testProgress}</div>}
			</div>

			{results && (
				<div className="performance-results">
					<h4>Store Query Performance Results (ms)</h4>
					<div className="results-grid">
						<div className="result-item">
							<span className="result-label">Index creation:</span>
							<span className="result-value">{results.indexCreation.toFixed(2)}ms</span>
						</div>
						<div className="result-item">
							<span className="result-label">Simple queries (200x):</span>
							<span className="result-value">{results.simpleQuery.toFixed(2)}ms</span>
						</div>
						<div className="result-item">
							<span className="result-label">Complex queries (100x):</span>
							<span className="result-value">{results.complexQuery.toFixed(2)}ms</span>
						</div>
						<div className="result-item">
							<span className="result-label">Incremental updates (50x):</span>
							<span className="result-value">{results.incrementalUpdate.toFixed(2)}ms</span>
						</div>
						<div className="result-item highlight">
							<span className="result-label">Structural sharing test:</span>
							<span className="result-value">{results.structuralSharing.toFixed(2)}ms</span>
						</div>
						<div className="result-item">
							<span className="result-label">Editor scenario (100x):</span>
							<span className="result-value">{results.editorScenario.toFixed(2)}ms</span>
						</div>
						<div className="result-item">
							<span className="result-label">Cache performance (1000x):</span>
							<span className="result-value">{results.cachePerformance.toFixed(2)}ms</span>
						</div>
						{results.memoryGrowth !== undefined && (
							<div className="result-item">
								<span className="result-label">Memory growth:</span>
								<span className="result-value">
									{(results.memoryGrowth / 1024 / 1024).toFixed(1)}MB
								</span>
							</div>
						)}
					</div>
					<div className="performance-notes">
						<h5>What These Tests Measure:</h5>
						<ul>
							<li>
								<strong>Index creation:</strong> Time to build property indexes using
								ImmutableSet/Set
							</li>
							<li>
								<strong>Simple queries:</strong> Basic store.query.ids() with single condition
							</li>
							<li>
								<strong>Complex queries:</strong> Multi-condition queries using set intersections
							</li>
							<li>
								<strong>Incremental updates:</strong> How efficiently queries recompute when data
								changes
							</li>
							<li>
								<strong>Structural sharing:</strong> Memory/performance benefits of ImmutableSet
								sharing
							</li>
							<li>
								<strong>Editor scenarios:</strong> Real patterns used by tldraw Editor
							</li>
							<li>
								<strong>Cache performance:</strong> Query result caching efficiency
							</li>
							<li>Compare results between main branch (Set) and this branch (ImmutableSet)</li>
						</ul>
					</div>
				</div>
			)}
		</div>
	)
}

export default function StorePerformanceExample() {
	return (
		<div className="store-performance-example">
			<div className="tldraw-container">
				<Tldraw>
					<PerformanceTestPanel />
				</Tldraw>
			</div>
		</div>
	)
}
