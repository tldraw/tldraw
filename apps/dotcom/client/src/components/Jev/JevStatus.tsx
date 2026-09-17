import { useEffect, useState } from 'react'
import {
	Spinner,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiButtonLabel,
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
	useEditor,
	useValue,
} from 'tldraw'
import { defineMessages, useIntl } from '../../tla/utils/i18n'
import { JevHistoryEntry, getJevState } from './JevState'
import styles from './jev.module.css'

const messages = defineMessages({
	idle: { defaultMessage: 'Idle' },
	off: { defaultMessage: 'Off' },
	thinking: { defaultMessage: 'Thinking' },
	applied: { defaultMessage: 'Applied' },
	unchanged: { defaultMessage: 'No change' },
	discarded: { defaultMessage: 'Not applied' },
	error: { defaultMessage: 'Unavailable' },
	history: { defaultMessage: 'Jev history' },
	mode: { defaultMessage: 'Decision mode' },
	single: { defaultMessage: 'Single choice' },
	staged: { defaultMessage: 'Two-stage' },
	route: { defaultMessage: 'First decision' },
	changeTool: { defaultMessage: 'Change tool' },
	changeStyles: { defaultMessage: 'Change styles' },
	empty: {
		defaultMessage: 'Decisions will appear here when you release the pointer or stop moving it.',
	},
	privacy: {
		defaultMessage:
			'When enabled, Jev sends recent actions and nearby canvas content to TypeSafe. It can switch tools or next-shape styles during an interaction.',
	},
	enable: { defaultMessage: 'Turn on' },
	disable: { defaultMessage: 'Turn off' },
	tool: { defaultMessage: 'Switch to {tool}' },
	style: { defaultMessage: '{style} → {value}' },
	keep: { defaultMessage: 'Keep current tool and styles' },
	request: { defaultMessage: 'Evaluating recent actions' },
	probability: { defaultMessage: 'Probability {value}%' },
	confidence: { defaultMessage: 'Confidence {value}%' },
	recent: { defaultMessage: 'Last 100 requests · this canvas session' },
})

export function JevStatus() {
	const editor = useEditor()
	const intl = useIntl()
	const mode = useValue(
		'Jev mode',
		() => (editor.getInstanceState().meta.jevMode === 'staged' ? 'staged' : 'single'),
		[editor]
	)
	const enabled = useValue(
		'Jev enabled',
		() => editor.getInstanceState().meta.jevEnabled === true,
		[editor]
	)
	const readonly = useValue('Jev readonly', () => editor.getIsReadonly(), [editor])
	const { history } = useValue(getJevState(editor))
	const latest = history[0]
	const lastApplied = history.find((entry) => entry.status === 'applied')
	const appliedAt =
		lastApplied && 'duration' in lastApplied ? lastApplied.time + lastApplied.duration : 0
	const [isFlashing, setIsFlashing] = useState(false)
	useEffect(() => {
		const remaining = appliedAt + 1_000 - Date.now()
		setIsFlashing(remaining > 0)
		if (remaining <= 0) return
		const timer = setTimeout(() => setIsFlashing(false), remaining)
		return () => clearTimeout(timer)
	}, [appliedAt])
	const [showResult, setShowResult] = useState(false)
	useEffect(() => {
		setShowResult(true)
		const timer = setTimeout(() => setShowResult(false), 3_000)
		return () => clearTimeout(timer)
	}, [latest])
	if (readonly) return null
	const status = !enabled
		? 'off'
		: latest?.status === 'thinking' || (showResult && latest)
			? latest.status
			: 'idle'
	const label = intl.formatMessage(messages[status])
	const describeChoice = (choice: string) => {
		if (choice === 'tool') return intl.formatMessage(messages.changeTool)
		if (choice === 'styles') return intl.formatMessage(messages.changeStyles)
		const [type, name, value] = choice.split(':')
		if (type === 'tool') return intl.formatMessage(messages.tool, { tool: name })
		if (type === 'style') return intl.formatMessage(messages.style, { style: name, value })
		return intl.formatMessage(messages.keep)
	}
	const describe = (entry: JevHistoryEntry) => {
		const result = 'result' in entry ? entry.result : undefined
		if (!result) return intl.formatMessage(messages.request)
		const choices = result.choices ?? [result.suggestedChoice]
		return choices.length
			? choices.map(describeChoice).join(' · ')
			: intl.formatMessage(messages.keep)
	}
	return (
		<div className={styles.root}>
			<TldrawUiPopover id="jev-history">
				<TldrawUiPopoverTrigger>
					<TldrawUiButton
						type="normal"
						className={styles.pill}
						title={intl.formatMessage(messages.history)}
						data-testid="jev-status"
						data-applied={enabled && isFlashing}
					>
						{status === 'thinking' ? (
							<Spinner />
						) : (
							<TldrawUiButtonIcon
								icon={
									status === 'applied'
										? 'check'
										: status === 'discarded' || status === 'error'
											? 'cross-2'
											: 'dot'
								}
								small
							/>
						)}
						<TldrawUiButtonLabel>
							<span aria-live="polite">Jev · {label}</span>
						</TldrawUiButtonLabel>
						{showResult &&
							enabled &&
							latest &&
							latest.status !== 'thinking' &&
							latest.status !== 'error' && (
								<span className={styles.summary}>{describe(latest)}</span>
							)}
						<TldrawUiButtonIcon icon="chevron-down" small />
					</TldrawUiButton>
				</TldrawUiPopoverTrigger>
				<TldrawUiPopoverContent side="bottom" align="center" collisionPadding={8}>
					<div className={styles.history} data-testid="jev-history">
						<div className={styles.header}>
							<strong>{intl.formatMessage(messages.history)}</strong>
							<TldrawUiButton
								type="normal"
								onClick={() =>
									editor.updateInstanceState(
										{ meta: { ...editor.getInstanceState().meta, jevEnabled: !enabled } },
										{ history: 'ignore' }
									)
								}
							>
								<TldrawUiButtonLabel>
									{intl.formatMessage(enabled ? messages.disable : messages.enable)}
								</TldrawUiButtonLabel>
							</TldrawUiButton>
						</div>
						<div
							className={styles.modes}
							role="group"
							aria-label={intl.formatMessage(messages.mode)}
						>
							{(['single', 'staged'] as const).map((value) => (
								<TldrawUiButton
									key={value}
									type="normal"
									isActive={mode === value}
									aria-pressed={mode === value}
									onClick={() =>
										editor.updateInstanceState(
											{
												meta: { ...editor.getInstanceState().meta, jevMode: value },
											},
											{ history: 'ignore' }
										)
									}
								>
									<TldrawUiButtonLabel>{intl.formatMessage(messages[value])}</TldrawUiButtonLabel>
								</TldrawUiButton>
							))}
						</div>
						<p className={styles.description}>{intl.formatMessage(messages.privacy)}</p>
						{history.length === 0 ? (
							<p className={styles.empty}>{intl.formatMessage(messages.empty)}</p>
						) : (
							<ol className={styles.entries}>
								{history.map((entry) => (
									<li key={entry.id} className={styles.entry}>
										<div className={styles.entryHeader}>
											<span>
												{entry.status === 'thinking' && <Spinner />}
												{intl.formatMessage(messages[entry.status])}
											</span>
											<time dateTime={new Date(entry.time).toISOString()}>
												{new Date(entry.time).toLocaleTimeString([], {
													hour: '2-digit',
													minute: '2-digit',
													second: '2-digit',
												})}
											</time>
										</div>
										<div>{describe(entry)}</div>
										{'result' in entry && entry.result?.steps && (
											<div className={styles.steps}>
												<strong>{intl.formatMessage(messages.staged)}</strong>
												{entry.result.steps.map((step) => (
													<div key={step.question}>
														{step.question === 'route'
															? intl.formatMessage(messages.route)
															: step.question}
														{': '}
														{step.choice === 'none'
															? intl.formatMessage(messages.unchanged)
															: describeChoice(step.choice)}
														{step.probability !== null &&
															` · ${Math.round(step.probability * 100)}%`}
													</div>
												))}
											</div>
										)}
										{entry.trigger && <p className={styles.reason}>{entry.trigger}</p>}
										{'reason' in entry && <p className={styles.reason}>{entry.reason}</p>}
										{'duration' in entry && (
											<div className={styles.metrics}>
												<span>{entry.duration} ms</span>
												{'result' in entry && entry.result?.probability != null && (
													<span>
														{intl.formatMessage(messages.probability, {
															value: Math.round(entry.result.probability * 100),
														})}
													</span>
												)}
												{'result' in entry && entry.result?.confidence != null && (
													<span>
														{intl.formatMessage(messages.confidence, {
															value: Math.round(entry.result.confidence * 100),
														})}
													</span>
												)}
											</div>
										)}
									</li>
								))}
							</ol>
						)}
						<div className={styles.footer}>{intl.formatMessage(messages.recent)}</div>
					</div>
				</TldrawUiPopoverContent>
			</TldrawUiPopover>
		</div>
	)
}
