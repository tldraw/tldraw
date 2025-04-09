import { cn } from '@/utils/cn'

export function Logo({ className }: { className: string }) {
	return (
		<svg
			viewBox="0 0 4081 1000"
			xmlns="http://www.w3.org/2000/svg"
			className={cn('fill-current text-black dark:text-white', className)}
		>
			<path
				d="M1303.69 270.972C1303.69 240.816 1328.13 216.369 1358.29 216.369H1428.49C1458.65 216.369 1483.09 240.816 1483.09 270.972V315.954C1483.09 327.011 1492.06 335.975 1503.12 335.975H1541C1561.11 335.975 1577.4 352.272 1577.4 372.376V429.579C1577.4 449.683 1561.11 465.98 1541 465.98H1503.12C1492.06 465.98 1483.09 474.944 1483.09 486.001V674.64C1483.09 681.573 1484.29 687.424 1486.67 692.19C1489.05 696.741 1492.74 700.207 1497.72 702.591C1502.7 704.758 1522.56 705.841 1530.37 705.841C1549.5 705.841 1560.72 712.765 1564.67 731.492L1577.4 791.954C1581.54 811.61 1569.85 830.984 1550.28 835.522C1535.55 838.989 1511.26 841.264 1490.9 842.347C1449.73 844.514 1415.17 840.289 1387.22 829.672C1359.26 818.838 1338.25 801.829 1324.16 778.644C1310.08 755.46 1303.25 726.425 1303.69 691.54V486.001C1303.69 474.944 1294.72 465.98 1283.67 465.98H1266.96C1246.85 465.98 1230.56 449.683 1230.56 429.579V372.376C1230.56 352.272 1246.85 335.975 1266.96 335.975H1283.67C1294.72 335.975 1303.69 327.011 1303.69 315.954V270.972Z"
				fill="currentColor"
			/>
			<path
				d="M1974.54 814.96C1944.85 796.326 1921.02 768.049 1903.03 730.131C1885.27 692.213 1876.38 644.436 1876.38 586.8C1876.38 501.729 1898.19 403.692 1977.14 357.015C2038.76 320.844 2119.52 320.677 2175.17 368.834C2185.85 378.077 2214.4 369.799 2214.4 355.676V225.384C2214.4 195.228 2238.84 170.781 2269 170.781H2339.2C2369.36 170.781 2393.81 195.228 2393.81 225.384V781.808C2393.81 811.964 2369.36 836.411 2339.2 836.411H2249.9C2231.01 836.411 2215.7 821.099 2215.7 802.211C2215.7 791.902 2195.36 785.728 2188.33 793.263C2186.18 795.558 2184.03 797.807 2181.9 800.009C2128.34 855.383 2037.25 854.041 1974.54 814.96ZM2218.3 586.8C2218.3 537.286 2200.48 468.495 2138.99 468.495C2077.29 468.495 2060.99 537.551 2060.99 586.8C2060.99 623.113 2066.97 666.411 2096.74 691.13C2165.89 746.195 2218.3 647.886 2218.3 586.8Z"
				fill="currentColor"
			/>
			<path
				d="M2513.66 836.412C2483.51 836.412 2459.06 811.965 2459.06 781.809V391.792C2459.06 361.636 2483.51 337.19 2513.66 337.19H2603.2C2619.81 337.19 2633.27 350.651 2633.27 367.256C2633.27 382.997 2638.97 387.954 2649.77 387.954C2668.35 387.954 2672.24 328.627 2758.31 330.689C2813.1 330.689 2820.44 385.406 2820.44 412.863C2820.44 475.557 2800.52 481.496 2737.51 481.496C2681.18 481.496 2638.47 519.992 2638.47 576.4V781.809C2638.47 811.965 2614.02 836.412 2583.87 836.412H2513.66Z"
				fill="currentColor"
			/>
			<path
				d="M2970.68 842.913C2916.63 842.913 2859.79 826.876 2828.98 779.21C2815.11 757.759 2808.18 730.458 2808.18 697.306C2808.18 651.927 2823.66 607.404 2861.15 579.651C2898.44 552.053 2946.07 542.134 2991.49 538.699C3020.52 536.448 3107.19 538.281 3107.19 494.497C3107.19 448.71 3041.54 443.568 3011.96 464.271C2970.82 492.82 2973.83 498.397 2910.23 498.397C2834.58 498.397 2857.58 387.482 2932.33 352.791C2965.48 337.19 3006.87 329.39 3056.49 329.39C3114.93 329.39 3177.44 341.047 3225.17 376.842C3245.1 391.576 3260.27 408.91 3270.67 428.844C3281.29 448.562 3286.6 470.013 3286.6 493.197V780.51C3286.6 810.666 3262.15 835.112 3232 835.112H3152.37C3133.88 835.112 3118.89 820.125 3118.89 801.638C3118.89 792.06 3103.8 787.48 3097.15 794.364C3063.59 829.054 3017.92 842.913 2970.68 842.913ZM3097.11 696.981C3108 681.743 3109.4 662.66 3109.14 643.805C3108.97 630.868 3095.3 621.942 3082.84 625.429C3067.81 629.638 3052.39 632.57 3036.99 634.904C3017.05 638.018 2994.44 645.215 2983.36 663.505C2973.07 680.83 2975.13 706.154 2991.81 718.757C3023.43 742.651 3075.6 727.106 3097.11 696.981Z"
				fill="currentColor"
			/>
			<path
				d="M1761.82 163C1792.33 163 1817.06 187.732 1817.06 218.24V781.158C1817.06 811.666 1792.33 836.398 1761.82 836.398H1690.8C1660.29 836.398 1635.56 811.666 1635.56 781.158V218.24C1635.56 187.732 1660.29 163 1690.8 163H1761.82Z"
				fill="currentColor"
			/>
			<path
				d="M3480.44 836.409C3455.39 836.409 3433.55 819.357 3427.47 795.049L3329.98 405.032C3321.37 370.57 3347.43 337.187 3382.95 337.187H3447.12C3473.38 337.187 3495.92 355.886 3500.78 381.699L3534.84 562.897C3538.14 580.407 3563.06 580.816 3566.93 563.423L3607.7 379.944C3613.25 354.961 3635.4 337.187 3660.99 337.187H3748.03C3773.42 337.187 3795.45 354.684 3801.21 379.411L3843.62 561.638C3847.65 578.962 3872.52 578.345 3875.69 560.842L3908.05 382.062C3912.75 356.08 3935.37 337.187 3961.77 337.187H4025.63C4061.15 337.187 4087.21 370.57 4078.6 405.032L3981.11 795.049C3975.03 819.357 3953.19 836.409 3928.14 836.409H3818.64C3794.09 836.409 3772.56 820.015 3766.02 796.343L3719.13 626.567C3714.69 610.471 3691.83 610.567 3687.52 626.7L3642.32 795.901C3635.94 819.79 3614.3 836.409 3589.57 836.409H3480.44Z"
				fill="currentColor"
			/>
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M0.557373 130C0.557373 58 58.5574 0 130.557 0H870.557C942.557 0 1000.56 58 1000.56 130V870C1000.56 942 942.557 1000 870.557 1000H130.557C58.5574 1000 0.557373 942 0.557373 870V130ZM590.557 300C590.557 350 550.557 390 500.557 390C450.557 390 410.557 350 410.557 300C410.557 250 450.557 210 500.557 210C550.557 210 590.557 250 590.557 300ZM470.557 810C513.557 810 554.557 751 569.557 719C588.557 678 599.557 605 580.557 562C567.557 532 537.557 510 497.557 510C449.557 510 410.557 549 410.557 597C410.557 640 441.557 674 481.557 681C483.557 681 485.557 684 485.557 686C481.557 711 470.557 743 453.557 759C432.557 779 438.557 810 470.557 810Z"
				fill="currentColor"
			/>
		</svg>
	)
}
