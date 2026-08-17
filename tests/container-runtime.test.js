import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const dockerfile = fs.readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');
const workflow = fs.readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');

describe('production container boundary', () => {
	it('removes npm build tooling from the final runtime stage', () => {
		const runtime = dockerfile.slice(dockerfile.lastIndexOf(' AS runner'));

		expect(runtime).toContain('rm -rf /usr/local/lib/node_modules/npm');
		expect(runtime).toContain('rm -f /usr/local/bin/npm /usr/local/bin/npx');
		expect(runtime).not.toContain('npm run');
	});
});

it('smoke-checks downloaded HTML without a pipefail race', () => {
	expect(workflow).toContain('curl --fail --silent --output "$home_page"');
	expect(workflow).toContain('grep --quiet \'<!DOCTYPE html>\' "$home_page"');
	expect(workflow).not.toMatch(/curl[^\n]+\|\s*grep/);
});
