import { useEffect, useRef } from 'react'
import { getFromLocalStorage, setInLocalStorage } from 'tldraw'

const SCROLL_POSITION_KEY = 'fairy-manual-scroll-position'

export function FairyManualPanel() {
	const contentRef = useRef<HTMLDivElement>(null)

	// Restore scroll position on mount
	useEffect(() => {
		const savedPosition = getFromLocalStorage(SCROLL_POSITION_KEY)
		if (savedPosition && contentRef.current) {
			contentRef.current.scrollTop = parseInt(savedPosition, 10)
		}
	}, [])

	// Save scroll position on scroll
	const handleScroll = () => {
		if (contentRef.current) {
			setInLocalStorage(SCROLL_POSITION_KEY, contentRef.current.scrollTop.toString())
		}
	}

	return (
		<div className="fairy-manual-content" ref={contentRef} onScroll={handleScroll}>
			<div className="fairy-manual-section">
				<h3>What are fairies?</h3>
				<p>
					Fairies are AI assistants that can help you create and edit content on the canvas. They
					appear as animated sprites that move around and interact with your canvas as they work.
				</p>
			</div>

			<div className="fairy-manual-section">
				<h3>Selecting fairies</h3>
				<ul>
					<li>
						<strong>Click</strong> a fairy to select it and open the chat panel. Click again to
						deselect.
					</li>
					<li>
						<strong>Shift+Click</strong> multiple fairies to select them for a group project.
					</li>
					<li>
						<strong>Double-click</strong> a fairy to zoom to its location on the canvas.
					</li>
					<li>
						<strong>Right-click</strong> a fairy to access additional options like renaming,
						customization, or removing it.
					</li>
				</ul>
			</div>

			<div className="fairy-manual-section">
				<h3>Working with a single fairy</h3>
				<p>
					When you select one fairy, it works in solo mode. Just chat with it to give instructions:
				</p>
				<ul>
					<li>Ask it to create shapes, diagrams, or drawings</li>
					<li>Request edits to existing content on the canvas</li>
					<li>Give it a specific area to work in by selecting shapes first</li>
					<li>
						The fairy will create tasks for itself and work through them until your request is
						complete
					</li>
				</ul>
				<p>
					<strong>Tips:</strong> Be specific about what you want. You can reference shapes by their
					position, color, or type. The fairy can see what&apos;s on the canvas and will work
					relative to your current viewport.
				</p>
			</div>

			<div className="fairy-manual-section">
				<h3>Working with multiple fairies</h3>
				<p>
					When you select multiple fairies, they work together as a team to complete your request.
					They will coordinate with each other to break down the work and complete it more quickly.
				</p>
				<p>
					<strong>Note:</strong> Fairies working together cannot be interrupted individually. You
					need to cancel the entire team to stop them.
				</p>
			</div>

			<div className="fairy-manual-section">
				<h3>Understanding fairy behavior</h3>
				<p>Fairies have different poses and animations that show what they&apos;re doing:</p>
				<ul>
					<li>
						<strong>Sleeping:</strong> Inactive fairy that needs to be selected to wake up
					</li>
					<li>
						<strong>Idle:</strong> Awake and ready to receive instructions
					</li>
					<li>
						<strong>Working:</strong> Actively creating or editing content
					</li>
					<li>
						<strong>Thinking:</strong> Planning or reviewing work
					</li>
					<li>
						<strong>Standing by:</strong> Part of a project, waiting for assignment
					</li>
				</ul>
				<p>
					Fairies remember their conversations and actions, so you can reference previous work or
					continue from where you left off.
				</p>
			</div>

			<div className="fairy-manual-section">
				<h3>Managing fairies</h3>
				<ul>
					<li>
						<strong>Add fairies:</strong> Click the plus icon in the sidebar to create new fairies
					</li>
					<li>
						<strong>Customize:</strong> Right-click a fairy to change its name, appearance, or
						astrological sign
					</li>
					<li>
						<strong>Move fairies:</strong> Drag fairies around the canvas to reposition them
					</li>
					<li>
						<strong>Remove fairies:</strong> Right-click and select the option to remove
					</li>
					<li>
						<strong>Reset chat:</strong> Start fresh by resetting a fairy&apos;s conversation
						history
					</li>
					<li>
						<strong>Follow fairy:</strong> Keep the camera focused on a fairy as it moves around
					</li>
				</ul>
			</div>

			<div className="fairy-manual-section">
				<h3>Tasks and todo lists</h3>
				<p>
					Fairies create and manage tasks as they work. You can view task lists in the sidebar and
					see fairies checking off items as they complete them. Task lists help fairies stay
					organized and let you track progress on complex requests.
				</p>
			</div>

			<div className="fairy-manual-section">
				<h3>Best practices</h3>
				<ul>
					<li>
						<strong>Be specific:</strong> Clear instructions get better results. Describe what you
						want, where you want it, and any specific requirements.
					</li>
					<li>
						<strong>Use selection:</strong> Select shapes on the canvas before giving instructions
						to help fairies understand the context.
					</li>
					<li>
						<strong>Break down large tasks:</strong> For complex requests, consider using multiple
						fairies or breaking the work into smaller steps.
					</li>
					<li>
						<strong>Review work:</strong> Fairies work autonomously but you can interrupt them or
						give new instructions at any time.
					</li>
					<li>
						<strong>Use multiple fairies for scale:</strong> When you have many related tasks,
						multiple fairies working as a team can complete work faster.
					</li>
					<li>
						<strong>Be patient:</strong> Complex requests take time. Fairies will work through tasks
						systematically and may need several iterations.
					</li>
				</ul>
			</div>

			<div className="fairy-manual-section">
				<h3>Troubleshooting</h3>
				<ul>
					<li>
						<strong>Fairy not responding:</strong> Make sure the fairy is selected and awake (not
						sleeping). Try clicking it again.
					</li>
					<li>
						<strong>Wrong output:</strong> Give more specific instructions or use the chat to refine
						the request.
					</li>
					<li>
						<strong>Can&apos;t stop a fairy:</strong> If a fairy is working with others, you need to
						cancel the entire team. Solo fairies can be interrupted by sending a new message.
					</li>
					<li>
						<strong>Fairy stuck waiting:</strong> Check the task list to see if work is in progress.
					</li>
					<li>
						<strong>Reset if needed:</strong> You can always reset a fairy&apos;s conversation to
						start fresh.
					</li>
				</ul>
			</div>
		</div>
	)
}
