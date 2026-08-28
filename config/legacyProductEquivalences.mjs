// Explicitly reviewed exception to exact-name matching. The public WordPress
// product spells the number as a word; the final July 21 catalog uses a digit.
// Price equality and unique published/visible target selection are mandatory.
export const REVIEWED_LEGACY_PRODUCT_EQUIVALENCES = Object.freeze([
	Object.freeze({
		path: '/product/hair-10-panel-drug-test/',
		legacyName: 'Hair Ten Panel Drug Test',
		targetName: 'Hair 10 Panel Drug Test',
		requiredPrice: '299.00',
		reviewBasis: 'numeric_token_spelling_equivalence',
	}),
]);
