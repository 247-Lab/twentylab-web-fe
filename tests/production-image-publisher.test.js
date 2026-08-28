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

	it('publishes only an immutable profile-bound image and cannot deploy', () => {
		expect(workflow).toMatch(/ECR_REPOSITORY: 24-7labs-production\/web/);
		expect(workflow).toMatch(/private_validation[\s\S]*launch_candidate/);
		expect(workflow).toMatch(/confirm_launch_candidate/);
		expect(workflow).toMatch(/NEXT_PUBLIC_CHECKOUT_ENABLED=\$\{checkout_enabled\}/);
		expect(workflow).toMatch(/NEXT_PUBLIC_AUTHORIZE_NET_ENVIRONMENT=production/);
		expect(workflow).toMatch(/image_tag="sha-\$\{SOURCE_SHA\}-\$\{BUILD_PROFILE\}"/);
		expect(workflow).toMatch(/profile: \$build_profile/);
		expect(workflow).toMatch(/checkout_enabled: \(\$build_profile == "launch_candidate"\)/);
		expect(workflow).toMatch(/HIGH,CRITICAL/);
		expect(workflow).toMatch(/deployed: false/);
		expect(workflow).not.toMatch(
			/aws (?:ssm send-command|ecs update-service|cloudfront create-invalidation|route53 |rds )/
		);
	});

	it('keeps public Authorize.Net identifiers out of the disabled build', () => {
		expect(workflow).toMatch(/if test "\$BUILD_PROFILE" = launch_candidate/);
		expect(workflow).toMatch(/AUTHORIZE_NET_PUBLIC_API_LOGIN_ID: \$\{\{ vars\./);
		expect(workflow).toMatch(/AUTHORIZE_NET_PUBLIC_CLIENT_KEY: \$\{\{ vars\./);
		expect(workflow).toMatch(/test -n "\$AUTHORIZE_NET_PUBLIC_API_LOGIN_ID"/);
	});
});
