import { MouseEvent, RefObject, useEffect, useRef } from 'react'
import { getFromLocalStorage, setInLocalStorage, useValue } from 'tldraw'
import { ExternalLink } from '../../../tla/components/ExternalLink/ExternalLink'
import { getLocalSessionState } from '../../../tla/utils/local-session-state'

const SCROLL_POSITION_KEY_PREFIX = 'fairy-manual-scroll-position'

export function FairyManualPanel() {
	const introductionRef = useRef<HTMLDivElement>(null)
	const usageRef = useRef<HTMLDivElement>(null)
	const aboutRef = useRef<HTMLDivElement>(null)
	const videoRef = useRef<HTMLVideoElement>(null)

	const fairyManualActiveTab = useValue(
		'fairy manual active tab',
		() => getLocalSessionState().fairyManualActiveTab,
		[]
	)

	// Restore scroll position for each tab on mount
	useEffect(() => {
		const restoreScroll = (ref: RefObject<HTMLDivElement>, tabId: string) => {
			const savedPosition = getFromLocalStorage(`${SCROLL_POSITION_KEY_PREFIX}-${tabId}`)
			if (savedPosition && ref.current) {
				ref.current.scrollTop = parseInt(savedPosition, 10)
			}
		}

		restoreScroll(introductionRef, 'introduction')
		restoreScroll(usageRef, 'usage')
		restoreScroll(aboutRef, 'about')
	}, [])

	// Restore scroll position when switching tabs
	useEffect(() => {
		const activeRef =
			fairyManualActiveTab === 'introduction'
				? introductionRef
				: fairyManualActiveTab === 'usage'
					? usageRef
					: aboutRef

		const savedPosition = getFromLocalStorage(
			`${SCROLL_POSITION_KEY_PREFIX}-${fairyManualActiveTab}`
		)
		if (savedPosition && activeRef.current) {
			activeRef.current.scrollTop = parseInt(savedPosition, 10)
		}
	}, [fairyManualActiveTab])

	// Save scroll position on scroll for a specific tab
	const createScrollHandler = (ref: RefObject<HTMLDivElement>, tabId: string) => () => {
		if (ref.current) {
			setInLocalStorage(`${SCROLL_POSITION_KEY_PREFIX}-${tabId}`, ref.current.scrollTop.toString())
		}
	}

	// Handle video play/pause on click (desktop only)
	const handleVideoClick = (e: MouseEvent<HTMLVideoElement>) => {
		// Only handle mouse clicks (e.detail > 0 indicates mouse click, not touch)
		if (e.detail > 0 && videoRef.current) {
			if (videoRef.current.paused) {
				videoRef.current.play()
			} else {
				videoRef.current.pause()
			}
		}
	}

	return (
		<div className="fairy-manual-content-container">
			{fairyManualActiveTab === 'introduction' && (
				<div
					ref={introductionRef}
					className="fairy-manual-content"
					onScroll={createScrollHandler(introductionRef, 'introduction')}
				>
					<video
						ref={videoRef}
						src="https://cdn.tldraw.com/misc/fairy_intro.mp4"
						loop
						muted
						playsInline
						autoPlay
						preload="metadata"
						className="fairy-manual-video"
					/>
					<p>Welcome to fairies in tldraw.</p>
				</div>
			)}

			{fairyManualActiveTab === 'usage' && (
				<div
					ref={usageRef}
					onScroll={createScrollHandler(usageRef, 'usage')}
					className="fairy-manual-content"
				>
					<div className="fairy-manual-section">
						<h3>What are fairies?</h3>
						<p>
							Fairies are AI assistants that can help you create and edit content on the canvas.
							They appear as animated sprites that move around and interact with your canvas as they
							work.
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
								<strong>Reviewing:</strong> Reviewing work or content
							</li>
							<li>
								<strong>Waiting:</strong> Part of a project, waiting for assignment
							</li>
							<li>
								<strong>Panicking:</strong> The fairy is freaking out
							</li>
						</ul>
						<p>
							Fairies remember their conversations and actions, so you can reference previous work
							or continue from where you left off.
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
								<strong>Right-click</strong> a fairy to access additional actions like summoning,
								following, or putting the fairy to sleep.
							</li>
						</ul>
					</div>

					<div className="fairy-manual-section">
						<h3>Working with a single fairy</h3>
						<p>
							When you select one fairy, it works in solo mode. Just chat with it to give
							instructions:
						</p>
						<ul>
							<li>Ask it to create shapes, diagrams, or drawings</li>
							<li>Request edits to existing content on the canvas</li>
							<li>
								The fairy will create tasks for itself and work through them until your request is
								complete
							</li>
						</ul>
						<p>
							<strong>Tips:</strong> Be specific about what you want. You can reference shapes by
							their position, color, or type. The fairy can see what&apos;s on the canvas in their
							surrounding area.
						</p>
					</div>

					<div className="fairy-manual-section">
						<h3>Working with multiple fairies</h3>
						<p>
							When you select multiple fairies, they work together as a team to complete your
							request. They will coordinate with each other to break down the work and complete it
							more quickly.
						</p>
						<p>
							<strong>Note:</strong> Fairies working together cannot be interrupted individually.
							You need to cancel the entire team to stop them.
						</p>
					</div>

					<div className="fairy-manual-section">
						<h3>Managing fairies</h3>
						<ul>
							<li>
								<strong>Move fairies:</strong> Drag fairies around the canvas to reposition them
							</li>
							<li>
								<strong>Sleep fairies:</strong> Right-click and select the option to put them to
								sleep
							</li>
							<li>
								<strong>Clear chat:</strong> Start fresh by clearing a fairy&apos;s conversation
								history
							</li>
							<li>
								<strong>Follow fairy:</strong> Keep the camera focused on a fairy as it moves around
							</li>
						</ul>
					</div>

					<div className="fairy-manual-section">
						<h3>Turning off fairies</h3>
						<p>
							If you want to hide the fairies feature, you can disable it in your user settings:
						</p>
						<ol>
							<li>Click on your account name in the sidebar to open the user settings menu</li>
							<li>
								Select <strong>Fairies</strong> from the menu
							</li>
							<li>
								Uncheck <strong>Enable fairies</strong> to turn off the feature
							</li>
						</ol>
						<p>
							When disabled, fairies will be hidden from your view. You can re-enable them at any
							time by following the same steps and checking the option again.
						</p>
					</div>

					<div className="fairy-manual-section">
						<h3>Tasks and todo lists</h3>
						<p>
							Fairies create and manage tasks as they work. You can view task lists in the sidebar
							and see fairies checking off items as they complete them. Task lists help fairies stay
							organized and let you track progress on complex requests.
						</p>
					</div>

					<div className="fairy-manual-section">
						<h3>Best practices</h3>
						<ul>
							<li>
								<strong>Be specific:</strong> Clear instructions get better results. Describe what
								you want, where you want it, and any specific requirements.
							</li>
							<li>
								<strong>Break down large tasks:</strong> For complex requests, consider using
								multiple fairies or breaking the work into smaller steps.
							</li>
							<li>
								<strong>Review work:</strong> Fairies work autonomously but you can interrupt them
								or give new instructions at any time.
							</li>
							<li>
								<strong>Use multiple fairies for scale:</strong> When you have many related tasks,
								multiple fairies working as a team can complete work faster.
							</li>
							<li>
								<strong>Be patient:</strong> Complex requests take time. Fairies will work through
								tasks systematically and may need several iterations.
							</li>
						</ul>
					</div>

					<div className="fairy-manual-section">
						<h3>Troubleshooting</h3>
						<ul>
							<li>
								<strong>Fairy not responding:</strong> Make sure the fairy is selected and awake
								(not sleeping). Try clicking it again.
							</li>
							<li>
								<strong>Wrong output:</strong> Give more specific instructions or use the chat to
								refine the request.
							</li>
							<li>
								<strong>Can&apos;t stop a fairy:</strong> If a fairy is working with others, you
								need to cancel the entire team. Fairies can be interrupted by sending a new message.
							</li>
							<li>
								<strong>Fairy stuck waiting:</strong> Check the task list to see if work is in
								progress.
							</li>
							<li>
								<strong>Reset if needed:</strong> You can always reset a fairy&apos;s conversation
								to start fresh.
							</li>
						</ul>
					</div>
				</div>
			)}

			{fairyManualActiveTab === 'about' && (
				<div
					ref={aboutRef}
					onScroll={createScrollHandler(aboutRef, 'about')}
					className="fairy-manual-content"
				>
					<div className="fairy-manual-section">
						<h3>About fairies</h3>
						<p>
							Fairies are a temporary feature that will be removed on January 1st, 2026. Perhaps
							they will return again someday.
						</p>
					</div>

					<div className="fairy-manual-section">
						<h3>Developers</h3>
						<p>
							Are you a developer? Would you like to build something like this for your product?
							Check out the <ExternalLink to="https://tldraw.dev">tldraw SDK</ExternalLink> to get
							started.
						</p>
					</div>

					<div className="fairy-manual-section">
						<h3>Feedback and support</h3>
						<p>
							To give feedback or report issues, please chat with us on{' '}
							<ExternalLink to="https://discord.tldraw.com/?utm_source=dotcom&utm_medium=organic&utm_campaign=dotcom-feedback">
								Discord
							</ExternalLink>{' '}
							or submit an issue on{' '}
							<ExternalLink to="https://github.com/tldraw/tldraw/issues">GitHub</ExternalLink>.
						</p>
					</div>
				</div>
			)}
		</div>
	)
}
