import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(join(cwd(), '.github', 'workflows', 'publish-production-image.yml'), 'utf8');

describe('immutable production image publisher', () => {
	it('is default-off, protected, current-main, and CI-bound', () => {
		expect(workflow).toMatch(/vars\.AWS_ARTIFACT_PUBLISH_ENABLED == 'true'/);
		expect(workflow).toMatch(/environment: production-artifact/);
		expect(workflow).toMatch(/github\.ref == 'refs\/heads\/main'/);
		expect(workflow).toMatch(/commits\/main/);
		expect(workflow).toMatch(/\.event == "push"/);
		expect(workflow).toMatch(/container-security-\$\{SOURCE_SHA\}/);
	});

	it('publishes only an immutable checkout-disabled image and cannot deploy', () => {
		expect(workflow).toMatch(/ECR_REPOSITORY: 24-7labs-production\/web/);
		expect(workflow).toMatch(/NEXT_PUBLIC_CHECKOUT_ENABLED=false/);
		expect(workflow).toMatch(/image_tag="sha-\$\{SOURCE_SHA\}"/);
		expect(workflow).toMatch(/HIGH,CRITICAL/);
		expect(workflow).toMatch(/deployed: false/);
		expect(workflow).not.toMatch(
			/aws (?:ssm send-command|ecs update-service|cloudfront create-invalidation|route53 |rds )/
		);
	});
});
