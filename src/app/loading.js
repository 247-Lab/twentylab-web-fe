export default function RouteLoading() {
	return (
		<main className="min-h-[70vh] bg-white px-4 py-10" aria-busy="true" aria-label="Loading page">
			<div className="mx-auto w-full max-w-6xl animate-pulse space-y-8">
				<div className="h-8 w-2/5 rounded-full bg-slate-200" />
				<div className="h-4 w-3/5 rounded-full bg-slate-100" />
				<div className="grid gap-5 md:grid-cols-3">
					{[0, 1, 2].map((item) => (
						<div key={item} className="h-56 rounded-3xl bg-slate-100" />
					))}
				</div>
			</div>
		</main>
	);
}
