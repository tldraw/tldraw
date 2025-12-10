import { FairySpriteProps } from '../sprite-types'

export function RaisedWingsSprite1({
	topWingColor,
	bottomWingColor,
}: FairySpriteProps & {
	topWingColor: string
	bottomWingColor: string
}) {
	return (
		<>
			<path
				d="M75.5645 74.4256C74.0173 71.8738 67.6193 66.94 64.3156 64.489C63.5934 63.9533 62.6222 64.5776 62.8055 65.458C63.7089 69.7967 65.7317 78.6689 67.633 81.1489C73.532 88.8437 80.5292 82.6135 75.5645 74.4256Z"
				fill={bottomWingColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
			/>
			<path
				d="M32.9254 72.3892C34.4709 69.644 40.856 64.3391 44.163 61.6962C44.874 61.128 45.8758 61.7387 45.7035 62.6324C44.8097 67.2683 42.7717 76.9406 40.857 79.6305C34.9579 87.9183 27.9608 81.2081 32.9254 72.3892Z"
				fill={bottomWingColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
			/>
			<path
				d="M91.5606 41.4765C82.8617 35.9985 59.6558 51.276 59.6558 60.9994C59.6558 70.7228 95.7412 80.9856 95.7412 65.5522C95.7412 57.604 87.0132 56.4469 87.0132 56.4469C87.0132 56.4469 100.259 46.9544 91.5606 41.4765Z"
				fill={topWingColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
				strokeLinejoin="round"
			/>
			<path
				d="M16.4091 40.2836C25.0447 35.0606 48.0821 49.6272 48.0822 58.8982C48.0822 68.1692 12.2588 77.9545 12.2588 63.2392C12.2588 55.6608 20.9234 54.5575 20.9234 54.5575C20.9234 54.5575 7.77337 45.5067 16.4091 40.2836Z"
				fill={topWingColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
				strokeLinejoin="round"
			/>
		</>
	)
}

export function RaisedWingsSprite2({
	topWingColor,
	bottomWingColor,
}: {
	topWingColor: string
	bottomWingColor: string
}) {
	return (
		<>
			<path
				d="M32.8914 71.7305C34.738 69.1781 41.6831 64.6308 45.2682 62.3797C46.039 61.8957 46.9651 62.6159 46.6927 63.4844C45.2794 67.9892 42.1585 77.3683 39.9514 79.8239C33.1512 87.3898 26.9595 79.93 32.8914 71.7305Z"
				fill={bottomWingColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
			/>
			<path
				d="M75.5927 73.9676C73.8488 71.546 67.0813 67.1326 63.5944 64.9501C62.8322 64.473 61.9133 65.1721 62.1655 66.0352C63.4086 70.2891 66.1255 78.9739 68.2166 81.2961C74.7047 88.5012 81.1882 81.7381 75.5927 73.9676Z"
				fill={bottomWingColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
			/>
			<path
				d="M91.2736 38.7404C82.1022 34.0967 60.4205 51.4695 61.3263 61.1507C62.2321 70.8318 99.1168 77.6882 97.679 62.3219C96.9385 54.4083 88.1407 54.0693 88.1407 54.0693C88.1407 54.0693 100.445 43.3841 91.2736 38.7404Z"
				fill={topWingColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
				strokeLinejoin="round"
			/>
			<path
				d="M18.3965 38.043C27.628 33.9644 48.6187 51.3512 47.4359 60.5464C46.2531 69.7416 9.47406 74.8765 11.3515 60.2815C12.3183 52.7651 21.0529 52.7762 21.0529 52.7762C21.0529 52.7762 9.16505 42.1217 18.3965 38.043Z"
				fill={topWingColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
				strokeLinejoin="round"
			/>
		</>
	)
}

export function RaisedWingsSprite3({
	topWingColor,
	bottomWingColor,
}: {
	topWingColor: string
	bottomWingColor: string
}) {
	return (
		<>
			<path
				d="M75.2405 73.2446C73.0191 71.2519 65.4642 68.3881 61.5912 67.0018C60.7446 66.6988 59.9965 67.5782 60.4275 68.3674C62.5516 72.257 67.0631 80.1598 69.6024 81.981C77.4814 87.6318 82.3684 79.6386 75.2405 73.2446Z"
				fill={bottomWingColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
			/>
			<path
				d="M34.5291 72.3869C36.8145 70.2186 44.4788 67.0295 48.4175 65.4778C49.2643 65.1442 50.0418 66.0228 49.6139 66.8261C47.3945 70.9932 42.5982 79.6363 39.9763 81.643C31.898 87.8258 27.1874 79.3525 34.5291 72.3869Z"
				fill={bottomWingColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
			/>
			<path
				d="M89.0416 37.7705C79.3162 34.4397 60.2453 54.644 62.4812 64.1069C64.7172 73.5697 102.196 75.2594 98.6466 60.2396C96.8188 52.5044 88.0587 53.3854 88.0587 53.3854C88.0587 53.3854 98.767 41.1012 89.0416 37.7705Z"
				fill={topWingColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
				strokeLinejoin="round"
			/>
			<path
				d="M22.0372 36.3095C31.8575 33.9823 49.3267 54.9044 46.4874 63.7299C43.648 72.5554 6.5492 70.8991 11.0559 56.8909C13.3769 49.6767 21.963 51.2801 21.963 51.2801C21.963 51.2801 12.2168 38.6368 22.0372 36.3095Z"
				fill={topWingColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
				strokeLinejoin="round"
			/>
		</>
	)
}
