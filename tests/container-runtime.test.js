import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const dockerfile = fs.readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');
const workflow = fs.readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');

describe('production container boundary', () => {
	it('builds Next output natively and installs runtime dependencies for the target platform', () => {
		expect(dockerfile).toMatch(/^FROM --platform=\$BUILDPLATFORM node:[^\n]+ AS build-dependencies$/m);
		expect(dockerfile).toMatch(/^FROM --platform=\$BUILDPLATFORM node:[^\n]+ AS builder$/m);
		expect(dockerfile).toMatch(/^FROM node:[^\n]+ AS runtime-dependencies$/m);
		expect(dockerfile).toContain('rm -rf .next/standalone/node_modules');
		expect(dockerfile).toContain('COPY --from=runtime-dependencies');
		expect(dockerfile).not.toMatch(/^FROM --platform=\$BUILDPLATFORM node:[^\n]+ AS (?:runtime-dependencies|runner)$/m);
	});

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
