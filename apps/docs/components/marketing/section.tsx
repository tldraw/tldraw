export const Section: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	return (
		<section className="w-full max-w-screen-xl mx-auto md:px-5 pt-16 sm:pt-24 md:pt-32 lg:pt-40">
			{children}
		</section>
	)
}
