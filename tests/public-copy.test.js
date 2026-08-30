import { describe, expect, it } from 'vitest';
import enCommon from '../locales/en/common.json';
import enTesting from '../locales/en/testing.json';
import esCommon from '../locales/es/common.json';
import esTesting from '../locales/es/testing.json';

describe('public-facing operational copy', () => {
	it.each([
		['English checkout pricing', enCommon.CheckoutPage.serverPricingNotice],
		['English testing catalog', enTesting.TestingServicesPage.body],
		['Spanish checkout pricing', esCommon.CheckoutPage.serverPricingNotice],
		['Spanish testing catalog', esTesting.TestingServicesPage.body],
	])('%s explains the experience without implementation terminology', (_label, copy) => {
		expect(copy).not.toMatch(/\b(?:api|backend|server|servidor)\b/iu);
	});
});
