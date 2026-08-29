'use client';

export default function GlobalError({ reset }) {
	return (
		<html lang="en">
			<body>
				<main
					style={{ maxWidth: '40rem', margin: '4rem auto', padding: '1rem', fontFamily: 'sans-serif', lineHeight: 1.6 }}
				>
					<h1>This page could not be loaded</h1>
					<p role="alert">
						Please try loading the page again. If the problem continues, call 24-7 Labs at (813) 932-3741.
					</p>
					<button type="button" onClick={reset}>
						Load page again
					</button>
					<p>If you were sending a form or payment, check whether it was received before submitting again.</p>
				</main>
			</body>
		</html>
	);
}
