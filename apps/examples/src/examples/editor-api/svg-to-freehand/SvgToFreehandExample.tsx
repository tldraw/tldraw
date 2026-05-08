import { useState } from 'react'
import {
	b64Vecs,
	createShapeId,
	Editor,
	TLDrawShapeSegment,
	Tldraw,
	TLShapeId,
	Vec,
	VecModel,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { ARROW_PORTRAIT_PRESET_SVG } from './arrow-portrait-preset-svg'
import { parseSvgToStrokes, Stroke } from './svg-to-freehand'

const PRESETS: { name: string; svg: string }[] = [
	{
		name: 'Star',
		svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
			<polygon points="50,5 61,38 96,38 68,59 79,92 50,72 21,92 32,59 4,38 39,38" fill="gold" stroke="orange"/>
		</svg>`,
	},
	{
		name: 'Heart',
		svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
			<path d="M50 88 C 20 65, 5 45, 5 28 C 5 12, 20 5, 30 5 C 40 5, 48 12, 50 22 C 52 12, 60 5, 70 5 C 80 5, 95 12, 95 28 C 95 45, 80 65, 50 88 Z" fill="red"/>
		</svg>`,
	},
	{
		name: 'House',
		svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
			<rect x="20" y="45" width="60" height="45" fill="none" stroke="black"/>
			<polygon points="15,45 50,15 85,45" fill="none" stroke="red"/>
			<rect x="42" y="65" width="16" height="25" fill="none" stroke="black"/>
			<rect x="28" y="55" width="10" height="10" fill="none" stroke="blue"/>
			<rect x="62" y="55" width="10" height="10" fill="none" stroke="blue"/>
		</svg>`,
	},
	{
		name: 'Logo',
		svg: `<svg width="565" height="565" viewBox="328 25 565 565" fill="none" xmlns="http://www.w3.org/2000/svg">
			<!-- SVG created with Arrow, by QuiverAI (https://quiver.ai) -->
			<path d="M560.772 267.85C546.679 236.86 545.507 189.73 570.957 147.797C579.486 133.98 594.016 119.864 595.556 118.531C592.751 106.967 577.831 102.76 557.921 102.76C533.575 102.76 519.528 113.473 514.149 131.497C504.838 163.913 505.16 201.179 488.193 232.101C480.675 245.527 471.64 257.688 456.306 257.688C443.087 257.688 439.064 244.492 440.696 232.101C445.041 204.007 460.146 175.729 460.146 138.21C460.146 109.726 443.892 86 410.74 86C382.21 86 363.795 99.1502 354.691 106.852C347.357 113.197 347.955 124.508 354.231 124.508C373.336 124.508 381.75 133.359 381.75 151.797C381.75 177.569 359.22 216.812 359.22 257.688C359.22 291.116 380.899 314.519 418.764 314.519C454.375 314.519 478.859 290.38 493.021 263.988L493.504 263.206C488.883 301.461 473.893 365.971 422.005 365.971C393.659 365.971 376.692 351.349 376.692 327.624V324.681H371.267C348.254 324.681 332 349.51 332 373.649C332 404.617 359.864 429.124 412.809 429.124C444.949 429.124 469.341 420.388 487.297 408.939C496.814 373.649 518.103 343.532 545.668 320.336C553.783 303.76 558.496 280.586 560.772 267.85Z" fill="#FF616B"/>
			<path d="M686.004 98.9141C622 98.9141 566.434 150.595 566.434 222.071C566.434 255.406 582.526 285.96 609.999 299.386C614.551 298.949 619.195 298.696 623.931 298.696C643.932 298.696 662.738 305.294 676.555 310.766C687.705 309.202 698.395 305.294 702.488 302.834C716.098 272.189 741.111 257.107 764.606 248.808C778.354 239.75 795.872 233.934 817.391 233.934C839.806 233.934 856.796 242.394 864.612 247.865C874.958 244.854 876.038 224.002 876.038 219.174C876.038 200.529 858.221 176.988 824.426 176.988C790.01 176.988 761.664 205.472 741.272 228.416C722.696 249.429 702.166 257.452 684.28 257.452C660.554 257.452 648.691 246.509 641.036 227.198C703.269 224.002 752.606 193.425 752.606 150.365C752.606 123.007 728.098 98.9141 686.004 98.9141ZM678.187 135.031C689.889 135.031 693.843 145.124 693.843 153.055C693.843 173.516 671.497 194.46 637.702 196.437C638.806 166.665 654.577 135.031 678.187 135.031Z" fill="#FF616B"/>
			<path d="M809.733 258.227C761.96 258.227 713.244 286.389 713.244 332.806C713.244 361.29 732.05 379.429 759.776 391.568L788.122 405.385C802.882 412.213 811.296 419.523 811.296 431.593C811.296 445.41 796.859 453.411 780.605 453.411C759.316 453.411 750.58 437.341 752.465 422.88C753.247 418.029 754.971 415.017 754.971 412.466C754.971 407.224 743.269 401.224 729.521 401.224C703.497 401.224 692.691 421.018 692.691 437.341C692.691 465.825 723.797 492.792 779.041 492.792C841.896 492.792 887.14 461.227 887.14 417.408C887.14 388.924 870.472 374.601 840.47 359.152L808.17 344.209C792.536 337.381 782.03 330.875 782.03 317.058C782.03 304.505 793.962 295.148 807.71 295.148C825.527 295.148 834.102 306.758 834.102 317.058C834.102 322.828 832.056 327.61 832.056 330.622C832.056 335.404 842.195 339.105 854.885 339.105C877.139 339.105 889.002 322.483 889.002 306.16C889.002 278.94 857.736 258.227 809.733 258.227Z" fill="#FF616B"/>
			<path d="M621.378 314.555C557.374 314.555 501.164 363.454 501.164 437.78C501.164 479.783 530.568 529.51 596.641 529.51C637.264 529.51 670.415 506.704 698.21 480.565C687.865 470.61 680.508 458.701 678.186 447.436C660.231 465.989 639.379 473.369 620.734 473.369C597.009 473.369 584.479 460.31 578.502 442.838C640.713 440.723 693.635 411.112 693.635 369.271C693.635 339.499 669.381 314.555 621.378 314.555ZM614.78 350.672C627.47 350.672 630.413 360.764 630.413 368.696C630.413 390.329 608.09 409.733 575.789 410.813C575.789 385.042 592.365 350.672 614.78 350.672Z" fill="#FF616B"/>
		</svg>`,
	},
	{
		name: 'Bird',
		svg: `<svg xmlns="http://www.w3.org/2000/svg" width="250" height="250" viewBox="0 0 250 250" fill="none">
			<!-- SVG created with Arrow, by QuiverAI (https://quiver.ai) -->
			<path d="M 244.01,11.09 C 234.02,8.29 217.91,8.63 209.25,8.63 C 171.12,8.63 137.27,16.18 106.11,30.99 C 90.23,18.68 74.16,10.55 54.97,11.71 L 48.82,11.99 C 59.28,26.91 61.72,44.87 58.66,61.77 C 66.11,54.76 71.87,51.62 79.96,47.66 C 63.44,60.91 43.91,82.17 39.31,111.51 C 56.09,99.45 74.29,92.82 98.03,88.32 C 70.32,100.37 35.21,114.01 6.08,152.25 L 6,152.66 C 18.89,147.92 20.09,146.91 27.37,143.21 C 44.41,134.46 59.09,128.21 82.94,125.09 C 92.48,111.41 101.01,102.93 115.22,89.9 C 106.92,77.45 105.41,66.46 106.31,52.37 C 108.08,67.13 112.08,76.09 122.09,85.08 C 114.86,71.22 113.86,58.02 117.68,42.94 C 116.51,58.72 120.82,69.11 130.18,80.26 C 125.01,65.18 125.17,54.04 130.16,35.05 C 127.92,47.71 128.94,54.77 133.01,65.92 C 139.75,62.31 147.21,59.43 151.21,58.02 C 156.09,56.28 159.38,46.14 168.01,43.01 C 187.86,33.03 204.19,26.26 235.22,16.71 C 232.98,27.71 224.82,39.59 215.91,46.91 C 207.25,42.61 193.01,44.41 181.56,48.41 C 175.32,51.39 169.85,57.38 165.51,61.18 C 177.06,55.91 184.91,55.23 195.41,55.64 C 201.09,56.08 205.06,56.78 207.91,59.23 C 196.72,72.43 175.09,83.76 150.96,95.22 C 126.07,106.73 100.06,123.67 95.92,148.96 C 92.11,172.02 105.15,188.91 128.84,198.84 C 102.09,195.71 71.41,178.78 72.69,145.75 C 72.94,141.39 73.51,138.26 74.37,133.51 C 63.04,134.46 54.11,137.38 42.62,141.81 C 48.78,164.91 64.21,181.78 84.71,193.41 C 90.08,203.79 94.46,210.18 103.71,215.63 C 104.01,208.94 106.21,205.68 109.06,202.25 C 118.95,205.38 127.31,206.46 140.12,206.77 C 150.65,226.96 163.79,237.96 185.86,241.37 C 176.32,228.51 172.86,216.63 170.01,202.11 C 176.01,188.25 178.91,183.33 186.28,172.09 C 188.21,170.16 189.91,169.82 192.61,169.21 L 200.06,149.42 C 176.06,153.38 156.63,169.01 142.06,188.32 C 134.72,186.52 127.92,183.91 123.72,180.24 C 124.28,176.28 126.02,173.73 128.42,170.75 C 120.02,169.55 112.16,166.91 108.91,164.24 C 104.91,157.71 105.16,147.04 113.91,136.66 C 120.72,128.93 127.72,123.81 135.22,119.71 C 158.91,121.91 167.11,127.09 180.71,133.92 C 187.01,137.18 190.91,138.66 196.71,140.2 C 196.36,123.26 188.01,111.11 173.96,98.52 C 189.21,90.11 215.71,72.09 216.51,59.09 L 216.76,58.96 C 231.55,46.64 242.75,31.13 244.35,12.63 C 244.51,11.69 244.61,11.36 244.01,11.09 Z M 187.91,25.09 C 184.81,25.09 184.41,22.01 184.41,21.51 C 184.41,19.16 186.21,18.12 187.91,18.12 C 190.51,18.12 191.36,20.09 191.36,21.51 C 191.36,23.48 189.91,25.09 187.91,25.09 Z" fill="black"/>
		</svg>`,
	},
	{
		name: 'Car',
		svg: `<svg xmlns="http://www.w3.org/2000/svg" width="250" height="250" viewBox="0 0 250 250">
			<!-- SVG created with Arrow, by QuiverAI (https://quiver.ai) -->
			<path d="m228.1 100.4h-0.98c-6.45 0-10.8 1.47-14.45 4.43l-3.77-3.61c3.23-2.65 6.53-3.85 9.99-5.07-2.67-21.09-16.35-39.17-47.47-39.17h-97c-26.34 0-42.64 14.14-46.66 38.74l-0.21 0.1c13.58 2.43 23.44 11.23 23.44 29.99v26.46c0.17 2.49-2.09 2.8-2.85 2.46-1.5-0.51-2.22-1.28-2.06-3l0.05-25.92c0-14.71-9.01-25.03-23.14-25.03h-1.93c-10.24 0-18.55 7.54-18.55 17.37v0.62c0 9.34 8.16 15.83 17.51 16.68v31.55c0 7.38 6.3 11.4 11.4 11.18l8.51-0.08-0.03 6.61c0 4.96 3.92 7.77 7.92 7.77h1.07c5.83 0 9-3.58 9-7.43v-6.98l136.5-0.17v7.15c0 4.66 4.04 7.43 7.6 7.43h-1.3c6.32 0 8.51-4.58 8.51-7.43v-7.15h9.29c7.22 0 11.95-5.26 11.95-11.1v-31.4c10.32-1.02 17.73-8.46 17.73-16.78v-0.32c0-9.83-9-17.9-20.1-17.9z" fill="#000"/>
			<path d="m126.8 87.26c-2.51 3.59-3.42 7.8-3.03 11.86 0.92 9.86 5.33 11.82 11.16 8.89-0.73 6.15-0.06 11.17 2.09 13.7l-2.46 0.4c-0.94 0.16-1.14 1.3-0.09 1.45l7.05 0.83c0.95 4.12 4.31 5.12 8.4 5.06 3.52-0.05 4.16-0.33 7.21 1.98 2.79 2.13 4.14 1.05 6.79 1.25 2.38 0.18 3.16 2.03 2.82 4.55-0.52 3.76-5.54 4.39-10.64 3.88-4.14-0.42-8.1-3.03-13.33-3.19-7.58-0.24-14.75-0.55-17.54-4.01-2.6-1.29-2.41-5.84-1.47-13.8 0.24-2.1-1.38-2.36-2.3-0.19l-3.3 7.81c-0.74 1.26-1.64 0.68-2.24-0.15-2.08-2.5-5.8-3.8-8.38-3.95 4.55-9.82 0.25-20.22-13.91-21.14-3.5-0.23-6.33-0.17-9.91 0.41-1.59 0.31-1.33 1.29 0.41 1.41 6.66 0.45 18.79 1.91 19.94 10.6 0.92 7.36-3.92 11.05-8.95 13.25 3.18-0.1 4.58-1.27 10.88-1.17 6.92 0.11 11.12 3.96 10.92 7.42s-3.79 4.12-11.97 4.02c-6.22-0.07-12.75-1.06-17.77-1.73-1.56-0.23-1.56-0.79-1.3-2.19l0.56-2.6c0.26-1.1-0.2-1.36-1.12-1.41-7.5-0.56-15.3-2.19-19.4-8.18-5.83-8.35-4.5-17.54 2.7-22.83 10.72-8.07 28.43-13.31 48.88-12.98 3.62 0.1 6.47 0.31 9.3 0.75z" fill="#FEFFFE"/>
			<path d="m158.4 82.62c1.86-1.01 4.53-0.94 7.58-0.94 6.7 0 10.3 1.5 15.05 3.67 4.85 2.23 8.12 5.38 8.76 8.36 6.22-1.66 11.27 3.36 14.79 8.55v3.56c-0.1 1.07-0.8 0.61-1.43-0.06-4.37-4.45-7.27-7.75-10.93-6.83l-0.44-0.22c2.3 4 2.81 16.9-2.7 23.2-2.07 1.81-5.02 0.82-7.64 1.81-4.45 1.71-9.56 5.47-12.75 7.07-2.9 1.07-4.91-1.1-7.08-3.63-1.86-2.28-2.22-4.06-1.3-4.94l0.82-0.05c5.63-0.36 7.75-2.12 7.65-4.55-0.2-3.46-4.65-4.83-8.8-4.83-4.84 0-6.92 1.71-6.3 4.91 0.61 2.53 2.1 5.03 4.07 5.45-0.57 1.91-2.07 3.04-5.83 2.98-5.93-0.1-7.79-1.66-8.04-6.11l0.15-3.61c0-0.77-0.72-0.67-1.13-0.15l-2.08 2.27c-3.04-4.45-2.73-16.45 7.09-27 1.97-2.18 3.68-3.69 5.85-5.14 1.12-1.08-0.85-2-4.98-1.69-4.85 0.41-9.9 1.64-14.62 3.19-1.4 0.62-1.81-0.1-1.5-1.66 0.36-1.45 4.96-2.72 9.26-3.84 5.46-1.28 12.76-1.95 16.48 0.23z" fill="#FEFFFE"/>
			<path d="m58.61 113.9c-1.22-0.21-3.82 4.1-3.82 9.03 0 6.87 6.32 13.07 12.4 15.29 4.84 1.5 10.22 0.68 12.5-0.34 1.86-0.68 0.84-2.64-2.68-4.76-3.76-2.23-6.95-2.28-10.3-4.35-5.3-3.14-6.22-10.97-7.09-13.87-0.21-0.68-0.51-0.94-1.01-1z" fill="#FEFFFE"/>
			<path d="m188.1 125.6c5.99-0.36 8.59 1.71 8.59 4.9 0 5.73-9 9.8-17.29 9.8-5.63 0-8.75-2.01-8.75-4.96 0-4.64 8.14-9.25 17.45-9.74z" fill="#FEFFFE"/>
			<path d="m172.1 110.8c0.57-0.36 1.69-0.58 2.59-0.62 1.45 3.75 3.41 5.47 7.85 4.45 1.13-0.62 2.53-1.03 3.15 0 1.02 1.66-0.95 3.73-3.8 3.99-6.3 0.62-8.77-2.89-9.79-7.82z" fill="#000"/>
			<path d="m146.8 103.5c0.26-0.88 2.33-1.19 2.33-0.11 0 2.33 1.2 3.3 3.78 3.2 2.17-0.1 2.73-1.18 5.03-0.97 1.4 0.21 0.99 1.76-1.86 3.27-2.17 1.18-4.44 1.12-5.94 0.81-3.39-0.73-4.11-2.69-3.34-6.2z" fill="#000"/>
		</svg>`,
	},
	{
		name: 'Medallion',
		svg: `<svg width="454" height="454" viewBox="385 80 454 454" fill="none" xmlns="http://www.w3.org/2000/svg">
			<!-- SVG created with Arrow, by QuiverAI (https://quiver.ai) -->
			<path d="M545.693 93.8984H393.59V291.114C400.298 282.589 405.439 276.484 412.77 271.669V112.261H553.9C549.059 105.902 548.067 101.087 545.693 93.8984Z" fill="url(#paint0_linear_3605_6329)"/>
			<path d="M691.414 93.8984C701.511 96.3406 714.559 101.663 720.83 112.261H809.768V156.45C820.164 157.556 827.126 161.588 830.999 165.688V93.8984H691.414Z" fill="url(#paint1_linear_3605_6329)"/>
			<path d="M809.768 243.647V508.275H704.785C707.321 515.394 707.897 520.279 709.211 530.439H831V237.404C821.456 233.648 814.632 236.044 809.768 243.647Z" fill="url(#paint2_linear_3605_6329)"/>
			<path d="M393.59 371.766V445.767C400.805 433.027 406.361 422.59 412.77 416.508V387.87C404.609 384.575 399.653 380.359 393.59 371.766Z" fill="url(#paint3_linear_3605_6329)"/>
			<path d="M491.938 508.273C493.943 514.863 494.704 522.304 494.681 529.377H590.811C581.544 522.304 575.596 517.005 570.064 508.273H491.938Z" fill="url(#paint4_linear_3605_6329)"/>
			<path d="M393.589 529.386H448.685C449.238 514.664 434.116 508.282 412.492 510.447C415.489 482.432 421.852 462.71 435.107 449.117C416.803 457.181 404.101 471.834 397.807 477.548C389.209 498.698 391.837 510.447 393.589 529.386Z" fill="#E6C36D"/>
			<path d="M420.635 500.76C429.856 494.885 437.717 493.341 445.717 492.926C450.327 472.56 462.246 462.699 473.265 461.524C522.16 453.783 531.75 436.78 545.697 410.723C559.367 385.218 576.98 373.307 608.216 368.791C632.745 365.197 639.107 355.037 638.877 328.841C630.14 346.812 616.654 347.319 596.99 350.268C579.493 352.894 567.966 359.253 551.599 375.427C552.567 354 559.414 330.754 576.818 307.392C584.703 296.886 588.944 289.145 590.143 281.081L575.343 266.682C559.414 293.96 550.423 298.545 519.901 310.226C496.617 319.349 485.713 330.754 476.585 343.517C462.638 362.709 448.068 360.474 443.481 360.244C423.01 359.576 411.322 347.549 411.322 331.261C411.322 311.838 427.92 298.844 459.157 288.915C495.096 276.727 534.401 262.005 534.401 221.041C534.401 196.021 515.383 174.617 485.598 174.617C461.07 174.617 439.124 188.349 432.623 213.853C429.372 227.1 427.851 231.04 426.099 235.556C446.57 235.556 464.551 228.298 472.043 209.13C475.639 199.2 478.498 192.496 490.9 192.496C507.913 192.496 516.535 208.554 516.535 221.041C516.535 243.412 496.525 259.102 462.868 270.022C427.782 281.818 395.577 295.803 393.594 330.293C391.842 355.037 412.059 377.731 437.925 377.731C450.927 377.731 459.825 374.367 466.787 370.082C462.638 389.25 466.211 422.818 427.782 428.716C424.785 429.223 423.678 429.223 421.58 429.453C407.218 444.314 398.458 462.353 394.839 475.716C408.648 457.216 428.012 446.733 441.152 443.185C464.436 434.453 479.581 415.976 482.947 384.573C485.299 364.598 495.096 347.319 507.521 338.218C498.393 353.655 497.632 365.451 498.831 376.625C501.712 396.807 496.41 412.128 486.151 425.237C503.649 419.823 515.936 398.535 515.936 378.353C513.561 349.3 519.417 330.5 551.829 314.695C537.559 335.845 534.055 350.475 533.087 379.551C531.335 405.608 515.936 434.66 487.742 440.789C470.245 444.775 467.018 442.954 453.416 450.811C434.259 461.317 428.635 480.024 424.393 496.636" fill="url(#paint5_linear_3605_6329)"/>
			<path d="M422.703 502.073C432.616 499.539 436.65 497.258 446.909 497.258C469.039 497.258 478.722 510.897 478.722 529.374H463.576C462.377 512.74 452.464 507.026 441.445 507.026C434.621 507.026 429.112 505.598 422.703 502.073Z" fill="url(#paint6_linear_3605_6329)"/>
			<path d="M585.508 411.599C579.007 403.996 573.267 401.853 568.564 399.618L557.66 413.902C573.267 420.261 580.206 432.656 580.206 441.987C580.206 452.608 570.731 461.363 559.597 463.275C569.279 489.701 589.404 515.528 612.134 529.375H669.305C667.069 516.888 660.891 513.823 651.439 510.437C667.807 507.626 677.143 515.759 680.74 530.389H694.456C692.911 508.755 679.31 494.793 658.724 496.705C640.42 498.94 624.052 490.646 619.35 472.169C618.474 468.551 623.2 467.123 626.427 463.851C640.558 450.857 646.068 437.241 646.068 425.445C646.068 408.834 635.925 392.776 621.447 381.602C606.97 382.108 595.375 384.228 580.575 390.264C607.454 391.462 626.657 407.267 626.657 428.118C626.657 440.881 618.635 452.793 607.109 459.497C603.074 461.847 602.337 467.123 602.337 470.855C602.337 485.831 616.929 501.244 631.291 510.206H616.583C600.746 501.474 587.859 484.863 580.921 471.224C594.038 462.699 598.187 451.41 598.187 441.365C598.187 431.689 593.323 421.298 585.508 411.599Z" fill="url(#paint7_linear_3605_6329)"/>
			<path d="M725.414 314.996C750.058 302.347 773.111 277.833 790.032 242.814C799.137 224.82 813.499 218.001 830.997 222.47C828.622 205.076 815.39 197.565 800.359 202.633C794.734 204.5 791.738 206.873 788.049 209.015C794.02 193.072 806.307 185.907 828.645 186.022C821.798 172.798 813.315 171.945 803.425 171.945C785.559 171.945 778.505 185.055 775.508 198.924C771.013 217.77 747.614 238.137 725.668 244.611C729.034 251.085 730.67 256.983 731.408 264.816C747.983 256.868 759.348 249.91 774.171 233.644C766.679 258.642 750.865 277.833 729.933 289.86C727.697 301.034 726.498 305.964 724.262 314.834" fill="url(#paint8_linear_3605_6329)"/>
			<path d="M657.848 290.992L691.805 316.704L669.858 301.498L665.916 294.794L657.848 290.992Z" fill="url(#paint9_linear_3605_6329)"/>
			<path d="M605.311 271.547L630.208 291.798C630.208 309.308 617.206 328.131 587.307 336.517C573.959 340.365 565.683 341.885 558.629 350.986C561.626 337.001 564.116 328.5 572.415 321.542C586.454 317.187 612.019 312.004 613.887 292.72C614.509 285.877 610.475 277.376 605.311 271.547Z" fill="#E1BC68"/>
			<path d="M649.523 198.312C653.788 206.054 662.641 210.385 675.158 215.177C703.813 226.236 719.305 250.865 718.106 278.189L717.138 291.114C709.069 268.766 692.056 245.842 673.614 232.111C661.327 222.757 650.054 211.468 649.523 198.312Z" fill="#D9B463"/>
			<path fill-rule="evenodd" clip-rule="evenodd" d="M630.811 84.669C656.284 83.7244 670.001 92.7095 681.389 111.647C700.038 116.463 703.957 119.734 707.784 127.567C718.043 130.632 732.405 134.848 738.906 139.894L734.642 149.593C735.84 158.693 733.096 167.679 723.068 174.038C721.063 168.762 717.375 163.601 710.644 163.37C701.515 163.002 692.916 171.757 692.293 179.82C692.062 184.382 694.276 192.124 703.958 192.492C709.929 192.607 715.9 190.579 721.294 184.221L722.492 196.132C723.806 202.053 719.887 209.771 708.384 217.167C705.41 208.666 704.004 202.975 692.178 202.975C674.681 202.975 664.768 179.037 665.967 164.845C660.918 173.139 659.719 182.217 660.203 192.838C642.706 172.932 642.106 157.864 648.953 141.806C623.849 169.683 630.926 213.919 650.567 235.553C633.186 228.157 618.155 213.619 614.974 193.46C612.622 176.734 617.302 157.795 634.568 139.548C626.293 137.659 619.123 133.074 618.523 123.974C618.155 118.099 621.198 112.177 629.197 111.463C632.886 111.117 638.05 111.233 643.79 115.933L654.809 113.583C648.953 107.316 642.568 100.612 630.742 99.7822C619.354 98.8376 607.205 106.325 605.545 120.84C604.6 131.115 607.458 136.737 614.674 144.801C608.288 152.865 600.98 162.334 599.459 179.337C596.992 206.638 626.293 225.3 658.729 242.925C686.207 257.232 702.044 278.29 709.214 311.397C714.263 333.031 743.033 358.144 757.51 358.144C767.077 358.143 769.613 351.094 778.604 350.265C791.605 349.09 800.573 359.595 799.374 375.423C794.095 367.912 789.507 366.484 781.462 370.585C787.179 374.824 793.564 378.741 794.878 387.61C795.477 393.462 792.135 401.849 781.462 410.488C781.462 395.283 776.298 386.413 761.152 383.142C764.979 387.012 769.451 391.205 769.705 400.328C769.936 406.318 762.558 416.732 748.75 418.76C750.617 415.811 752.599 410.649 750.248 407.378C745.753 401.733 742.271 391.343 736.531 391.205C720.948 390.698 714.539 387.98 700.062 379.801C679.014 367.659 669.424 362.591 645.403 363.535L647.04 358.121C658.313 323.839 644.482 298.956 621.198 283.98C604.715 272.691 582.561 260.895 571.403 240.713C569.052 249.33 564.026 259.951 555.658 262.577C557.664 252.855 559.416 243.04 558.033 225.047C557.065 210.74 555.059 192.607 569.421 172.194C568.568 238.017 618.386 256.864 641.969 275.917C654.141 285.501 681.504 309.531 691.763 316.696C685.815 279.834 663.869 262.831 629.797 245.828C598.191 229.885 582.446 206.638 580.925 183.599C580.21 168.393 582.861 156.482 596.992 136.737C576.982 144.34 562.182 156.252 547.59 182.332C548.443 152.911 559.232 128.028 587.311 114.412C574.447 113.583 569.052 111.002 563.289 101.533C589.408 102.363 605.545 86.3049 630.811 84.669ZM666.32 310.78C671.269 326.433 670.483 336.356 670.483 347.197C690.585 349.663 704.187 360.952 717.788 368.025C726.387 372.472 734.778 372.241 740.726 370.697C720.831 363.071 706.583 339.71 687.703 332.867C676.517 328.62 669.351 319.684 666.32 310.78ZM691.578 130.286C686.875 127.913 677.539 128.858 669.655 129.803C674.22 136.599 678.139 141.161 686.207 141.161L699.578 139.041L691.578 130.286Z" fill="url(#paint10_linear_3605_6329)"/>
			<defs>
				<linearGradient id="paint0_linear_3605_6329" x1="473.744" y1="93.8881" x2="473.744" y2="291.108" gradientUnits="userSpaceOnUse">
					<stop stop-color="#F6D779"/>
					<stop offset="1" stop-color="#CDA459"/>
				</linearGradient>
				<linearGradient id="paint1_linear_3605_6329" x1="761.204" y1="93.8881" x2="761.204" y2="165.692" gradientUnits="userSpaceOnUse">
					<stop stop-color="#F6D779"/>
					<stop offset="1" stop-color="#CDA459"/>
				</linearGradient>
				<linearGradient id="paint2_linear_3605_6329" x1="767.89" y1="235.724" x2="767.89" y2="530.43" gradientUnits="userSpaceOnUse">
					<stop stop-color="#F6D779"/>
					<stop offset="1" stop-color="#CDA459"/>
				</linearGradient>
				<linearGradient id="paint3_linear_3605_6329" x1="403.177" y1="371.756" x2="403.177" y2="445.758" gradientUnits="userSpaceOnUse">
					<stop stop-color="#F6D779"/>
					<stop offset="1" stop-color="#CDA459"/>
				</linearGradient>
				<linearGradient id="paint4_linear_3605_6329" x1="540.686" y1="508.264" x2="540.686" y2="529.377" gradientUnits="userSpaceOnUse">
					<stop stop-color="#F6D779"/>
					<stop offset="1" stop-color="#CDA459"/>
				</linearGradient>
				<linearGradient id="paint5_linear_3605_6329" x1="520.838" y1="174.609" x2="520.838" y2="529.374" gradientUnits="userSpaceOnUse">
					<stop stop-color="#F6D779"/>
					<stop offset="1" stop-color="#CDA459"/>
				</linearGradient>
				<linearGradient id="paint6_linear_3605_6329" x1="450.713" y1="497.253" x2="450.713" y2="529.374" gradientUnits="userSpaceOnUse">
					<stop stop-color="#F6D779"/>
					<stop offset="1" stop-color="#CDA459"/>
				</linearGradient>
				<linearGradient id="paint7_linear_3605_6329" x1="627.25" y1="379.553" x2="627.25" y2="529.375" gradientUnits="userSpaceOnUse">
					<stop stop-color="#F6D779"/>
					<stop offset="1" stop-color="#CDA459"/>
				</linearGradient>
				<linearGradient id="paint8_linear_3605_6329" x1="777.631" y1="171.937" x2="777.631" y2="314.986" gradientUnits="userSpaceOnUse">
					<stop stop-color="#F6D779"/>
					<stop offset="1" stop-color="#CDA459"/>
				</linearGradient>
				<linearGradient id="paint9_linear_3605_6329" x1="674.828" y1="290.983" x2="674.828" y2="316.695" gradientUnits="userSpaceOnUse">
					<stop stop-color="#4A1431"/>
					<stop offset="0.5" stop-color="#4A1431" stop-opacity="0.5607"/>
					<stop offset="1" stop-color="#4A1431" stop-opacity="0.1275"/>
				</linearGradient>
				<linearGradient id="paint10_linear_3605_6329" x1="672.862" y1="84.5618" x2="672.862" y2="418.751" gradientUnits="userSpaceOnUse">
					<stop stop-color="#F6D779"/>
					<stop offset="1" stop-color="#CDA459"/>
				</linearGradient>
			</defs>
		</svg>`,
	},
	{
		name: 'Portrait',
		svg: ARROW_PORTRAIT_PRESET_SVG,
	},
]

const CANVAS_SIZE = 400

const SPLAT_LAYERS = 15
const SPLAT_DEPTH = 12
const SPLAT_TILT_DEG = -30
const SPLAT_FOCAL = 1200

// Fisheye strength. Positive values bulge the center outward; negative values
// pinch it inward (pincushion). With splat, k is interpolated across layers.
const FISHEYE_K = 3
const FISHEYE_SPLAT_RANGE: [number, number] = [-0.4, 1.2]

type VanishingPoint = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

function getVanishingPoint(mode: VanishingPoint): { x: number; y: number } {
	switch (mode) {
		case 'top-left':
			return { x: 0, y: 0 }
		case 'top-right':
			return { x: CANVAS_SIZE, y: 0 }
		case 'bottom-left':
			return { x: 0, y: CANVAS_SIZE }
		case 'bottom-right':
			return { x: CANVAS_SIZE, y: CANVAS_SIZE }
		case 'center':
		default:
			return { x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2 }
	}
}

export default function SvgToFreehandExample() {
	const [editor, setEditor] = useState<Editor | null>(null)
	const [animate, setAnimate] = useState(true)
	const [splat, setSplat] = useState(false)
	const [fisheye, setFisheye] = useState(false)
	const [vanishingPoint, setVanishingPoint] = useState<VanishingPoint>('center')
	const [prompt, setPrompt] = useState('')
	const [generating, setGenerating] = useState(false)
	const [generationError, setGenerationError] = useState<string | null>(null)

	const drawPreset = async (svg: string) => {
		if (!editor) return

		const viewport = editor.getViewportPageBounds()
		const originX = viewport.x + (viewport.w - CANVAS_SIZE) / 2
		const originY = viewport.y + (viewport.h - CANVAS_SIZE) / 2

		const baseStrokes = parseSvgToStrokes(svg, CANVAS_SIZE, CANVAS_SIZE)

		// Fisheye warps around the SVG's geometric center, regardless of perspective anchor.
		const fisheyeCenterX = CANVAS_SIZE / 2
		const fisheyeCenterY = CANVAS_SIZE / 2
		const fisheyeScale = CANVAS_SIZE / 2

		const created: CreatedShape[] = []

		if (!splat) {
			const strokes = fisheye
				? warpStrokes(baseStrokes, (x, y) =>
						applyFisheye(x, y, FISHEYE_K, {
							centerX: fisheyeCenterX,
							centerY: fisheyeCenterY,
							scale: fisheyeScale,
						})
					)
				: baseStrokes
			for (const stroke of strokes) {
				const c = createDrawShape(editor, stroke, { originX, originY, animate })
				if (c) created.push(c)
			}
		} else {
			// Splat's perspective anchor (vanishing point). Tilt is disabled for non-center
			// anchors — corner perspective looks cleanest as pure one-point projection.
			const vp = getVanishingPoint(vanishingPoint)
			const tilt = vanishingPoint === 'center' ? (SPLAT_TILT_DEG * Math.PI) / 180 : 0

			// Build & create all layer shapes synchronously, back-to-front, so tldraw's
			// creation order gives us the correct z-order. Animation is started later.
			for (let i = SPLAT_LAYERS - 1; i >= 0; i--) {
				const z = i * SPLAT_DEPTH

				// When fisheye is on, vary k across layers so the stack also distorts through depth.
				const k = fisheye
					? lerp(FISHEYE_SPLAT_RANGE[0], FISHEYE_SPLAT_RANGE[1], i / (SPLAT_LAYERS - 1))
					: null

				const transformed = baseStrokes.map((stroke) => ({
					...stroke,
					points: stroke.points.map((p) => {
						const warped =
							k !== null
								? applyFisheye(p.x, p.y, k, {
										centerX: fisheyeCenterX,
										centerY: fisheyeCenterY,
										scale: fisheyeScale,
									})
								: { x: p.x, y: p.y }
						return project3D(warped.x, warped.y, z, {
							centerX: vp.x,
							centerY: vp.y,
							tilt,
							focal: SPLAT_FOCAL,
						})
					}),
				}))
				for (const stroke of transformed) {
					const c = createDrawShape(editor, stroke, { originX, originY, animate })
					if (c) created.push(c)
				}
			}
		}

		if (created.length === 0) return

		// Animate every pending stroke in parallel, then group all of them so the
		// drawing behaves as a single object on the canvas.
		await finishAnimations(editor, created)
		editor.groupShapes(
			created.map((c) => c.id),
			{ select: false }
		)
	}

	const generateAndDraw = async () => {
		if (!editor || !prompt.trim() || generating) return
		setGenerating(true)
		setGenerationError(null)
		try {
			const res = await fetch('/api/quiver/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ prompt }),
			})
			const json = (await res.json()) as { data: { svg: string }[] } | { error: string }
			if (!res.ok || 'error' in json) {
				const msg = 'error' in json ? json.error : `HTTP ${res.status}`
				setGenerationError(msg)
				return
			}
			const svg = json.data[0]?.svg
			if (!svg) {
				setGenerationError('No SVG returned from API.')
				return
			}
			await drawPreset(svg)
		} catch (err) {
			setGenerationError((err as Error).message)
		} finally {
			setGenerating(false)
		}
	}

	return (
		<div style={{ position: 'absolute', inset: 0 }}>
			<Tldraw onMount={setEditor} />
			<div
				style={{
					position: 'absolute',
					top: 60,
					left: 60,
					zIndex: 1000,
					display: 'flex',
					flexDirection: 'column',
					gap: 8,
					padding: 12,
					background: 'white',
					border: '1px solid #ddd',
					borderRadius: 8,
					boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
					pointerEvents: 'all',
				}}
			>
				<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
					<input
						type="text"
						placeholder="Generate from prompt (e.g. a cat riding a bike)"
						value={prompt}
						onChange={(e) => setPrompt(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') generateAndDraw()
						}}
						disabled={generating}
						style={{ flex: 1, minWidth: 280, padding: '4px 8px' }}
					/>
					<button onClick={generateAndDraw} disabled={generating || !prompt.trim()}>
						{generating ? 'Generating…' : 'Generate'}
					</button>
				</div>
				{generationError && <div style={{ color: '#b00020', fontSize: 12 }}>{generationError}</div>}
				<div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
					{PRESETS.map((preset) => (
						<button key={preset.name} onClick={() => drawPreset(preset.svg)}>
							Draw {preset.name.toLowerCase()}
						</button>
					))}
					<label style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: 8 }}>
						<input
							type="checkbox"
							checked={animate}
							onChange={(e) => setAnimate(e.target.checked)}
						/>
						Animate
					</label>
					<label style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
						<input type="checkbox" checked={splat} onChange={(e) => setSplat(e.target.checked)} />
						Splat
					</label>
					<label style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
						<input
							type="checkbox"
							checked={fisheye}
							onChange={(e) => setFisheye(e.target.checked)}
						/>
						Fisheye
					</label>
					{splat && (
						<label style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
							VP:
							<select
								value={vanishingPoint}
								onChange={(e) => setVanishingPoint(e.target.value as VanishingPoint)}
							>
								<option value="center">center</option>
								<option value="top-left">top-left</option>
								<option value="top-right">top-right</option>
								<option value="bottom-left">bottom-left</option>
								<option value="bottom-right">bottom-right</option>
							</select>
						</label>
					)}
				</div>
			</div>
		</div>
	)
}

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t
}

/**
 * Apply a radial polynomial warp around (centerX, centerY): r' = r * (1 + k*(r/scale)²).
 * Positive k bulges the center outward (fisheye); negative k pinches inward (pincushion).
 */
function applyFisheye(
	x: number,
	y: number,
	k: number,
	opts: { centerX: number; centerY: number; scale: number }
): { x: number; y: number } {
	const dx = x - opts.centerX
	const dy = y - opts.centerY
	const rNorm = Math.hypot(dx, dy) / opts.scale
	const factor = 1 + k * rNorm * rNorm
	return {
		x: opts.centerX + dx * factor,
		y: opts.centerY + dy * factor,
	}
}

/** Apply a per-point transform to every stroke in a list, returning a new list. */
function warpStrokes(
	strokes: Stroke[],
	fn: (x: number, y: number) => { x: number; y: number }
): Stroke[] {
	return strokes.map((stroke) => ({
		...stroke,
		points: stroke.points.map((p) => fn(p.x, p.y)),
	}))
}

/**
 * Project a point on a 2D plane at depth z onto the screen, after tilting the
 * plane forward around the horizontal axis through (centerX, centerY).
 *
 * Used by the splat mode to stack multiple z-extruded copies of the SVG.
 */
function project3D(
	x: number,
	y: number,
	z: number,
	opts: { centerX: number; centerY: number; tilt: number; focal: number }
): { x: number; y: number } {
	const dx = x - opts.centerX
	const dy = y - opts.centerY

	// Rotate (dy, z) around the X axis by `tilt` so the plane leans forward.
	const cos = Math.cos(opts.tilt)
	const sin = Math.sin(opts.tilt)
	const ny = dy * cos - z * sin
	const nz = dy * sin + z * cos

	// Perspective divide.
	const scale = opts.focal / (opts.focal + nz)

	return {
		x: dx * scale + opts.centerX,
		y: ny * scale + opts.centerY,
	}
}

interface CreatedShape {
	id: TLShapeId
	/** Set when the shape was created partial and still needs an animation pass. */
	pendingAnimation: { segmentPoints: VecModel[]; isClosed: boolean } | null
}

const ANIMATION_DURATION_MS = 250
const ANIMATION_FRAME_MS = 16

/**
 * Synchronously create a draw shape for a single stroke and return its id.
 * If `animate` is true, the shape starts with only its first two points and
 * the returned `pendingAnimation` carries the full list for `animateDrawShape`
 * to fill in. Returns `null` only for degenerate strokes (under 2 points).
 */
function createDrawShape(
	editor: Editor,
	stroke: Stroke,
	{ originX, originY, animate }: { originX: number; originY: number; animate: boolean }
): CreatedShape | null {
	if (stroke.points.length < 2) return null

	const pagePoints = stroke.points.map((p) => ({ x: p.x + originX, y: p.y + originY }))
	const inputPoints = [...pagePoints]
	if (stroke.closed) inputPoints.push(inputPoints[0])

	const minX = Math.min(...inputPoints.map((p) => p.x))
	const minY = Math.min(...inputPoints.map((p) => p.y))

	// Densify so the rendered stroke is smooth even when SVG samples are sparse.
	const maxGap = 10
	const interpolated: VecModel[] = []
	for (let j = 0; j < inputPoints.length - 1; j++) {
		const pt = inputPoints[j]
		interpolated.push(pt)
		const next = inputPoints[j + 1]
		const dist = Vec.Dist(pt, next)
		const n = Math.floor(dist / maxGap)
		for (let k = 0; k < n; k++) {
			interpolated.push(Vec.Lrp(pt, next, (k + 1) / (n + 1)))
		}
	}
	interpolated.push(inputPoints[inputPoints.length - 1])
	if (interpolated.length < 2) return null

	const segmentPoints = interpolated.map((p) => ({ x: p.x - minX, y: p.y - minY, z: 0.75 }))

	const id = createShapeId()
	const baseProps = {
		color: stroke.color,
		fill: stroke.fill,
		dash: 'draw' as const,
		size: 's' as const,
		isPen: true,
	}

	if (!animate) {
		editor.createShape({
			id,
			type: 'draw',
			x: minX,
			y: minY,
			props: {
				...baseProps,
				segments: [{ type: 'free', path: b64Vecs.encodePoints(segmentPoints) }],
				isComplete: true,
				isClosed: stroke.closed,
			},
		})
		return { id, pendingAnimation: null }
	}

	editor.createShape({
		id,
		type: 'draw',
		x: minX,
		y: minY,
		props: {
			...baseProps,
			segments: [{ type: 'free', path: b64Vecs.encodePoints(segmentPoints.slice(0, 2)) }],
			isComplete: false,
			isClosed: false,
		},
	})

	return { id, pendingAnimation: { segmentPoints, isClosed: stroke.closed } }
}

/** Progressively reveal a created shape's points over `ANIMATION_DURATION_MS`. */
async function animateDrawShape(
	editor: Editor,
	id: TLShapeId,
	animation: { segmentPoints: VecModel[]; isClosed: boolean }
): Promise<void> {
	const { segmentPoints, isClosed } = animation
	const totalFrames = Math.ceil(ANIMATION_DURATION_MS / ANIMATION_FRAME_MS)
	const pointsPerFrame = Math.max(1, Math.ceil(segmentPoints.length / totalFrames))

	for (let f = 2; f < segmentPoints.length; f += pointsPerFrame) {
		const end = Math.min(f + pointsPerFrame, segmentPoints.length)
		editor.updateShape({
			id,
			type: 'draw',
			props: {
				segments: [
					{
						type: 'free',
						path: b64Vecs.encodePoints(segmentPoints.slice(0, end)),
					} as TLDrawShapeSegment,
				],
			},
		})
		await new Promise((r) => setTimeout(r, ANIMATION_FRAME_MS))
	}

	editor.updateShape({
		id,
		type: 'draw',
		props: {
			segments: [{ type: 'free', path: b64Vecs.encodePoints(segmentPoints) } as TLDrawShapeSegment],
			isComplete: true,
			isClosed,
		},
	})
}

/** Run the pending animations on all created shapes in parallel. */
async function finishAnimations(editor: Editor, created: CreatedShape[]): Promise<void> {
	const animations = created
		.filter(
			(
				c
			): c is CreatedShape & { pendingAnimation: NonNullable<CreatedShape['pendingAnimation']> } =>
				c.pendingAnimation !== null
		)
		.map((c) => animateDrawShape(editor, c.id, c.pendingAnimation))
	if (animations.length > 0) await Promise.all(animations)
}
