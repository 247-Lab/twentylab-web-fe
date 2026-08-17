import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const dockerfile = fs.readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');

describe('production container boundary', () => {
	it('removes npm build tooling from the final runtime stage', () => {
		const runtime = dockerfile.slice(dockerfile.lastIndexOf(' AS runner'));

		expect(runtime).toContain('rm -rf /usr/local/lib/node_modules/npm');
		expect(runtime).toContain('rm -f /usr/local/bin/npm /usr/local/bin/npx');
		expect(runtime).not.toContain('npm run');
	});
});
