import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const supportedExtension = /\.(?:cjs|css|html|js|json|jsx|md|mjs|scss|ts|tsx|ya?ml)$/i;

function runGit(args) {
	return spawnSync('git', args, { encoding: 'utf8' });
}

function listFiles(args) {
	const result = runGit([...args, '-z']);
	if (result.status !== 0) {
		throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`);
	}
	return result.stdout.split('\0').filter(Boolean);
}

function isCommit(reference) {
	if (!reference || /^0+$/.test(reference)) return false;
	return runGit(['cat-file', '-e', `${reference}^{commit}`]).status === 0;
}

const files = new Set();
const baseReference = process.env.FORMAT_BASE_REF;

if (baseReference) {
	if (!isCommit(baseReference)) {
		throw new Error('FORMAT_BASE_REF must resolve to a fetched commit');
	}
	listFiles(['diff', '--name-only', '--diff-filter=ACMR', baseReference, 'HEAD']).forEach((file) => files.add(file));
} else {
	if (process.env.GITHUB_ACTIONS === 'true') {
		throw new Error('FORMAT_BASE_REF is required in CI');
	}
	if (isCommit('HEAD^')) {
		listFiles(['diff', '--name-only', '--diff-filter=ACMR', 'HEAD^', 'HEAD']).forEach((file) => files.add(file));
	}
}

listFiles(['diff', '--name-only', '--diff-filter=ACMR', 'HEAD']).forEach((file) => files.add(file));
listFiles(['diff', '--cached', '--name-only', '--diff-filter=ACMR']).forEach((file) => files.add(file));
listFiles(['ls-files', '--others', '--exclude-standard']).forEach((file) => files.add(file));

const candidates = [...files].filter((file) => supportedExtension.test(file) && existsSync(file)).sort();

if (candidates.length === 0) {
	console.log('No changed files require a formatting check.');
	process.exit(0);
}

console.log(`Checking formatting for ${candidates.length} changed file(s).`);
const prettier = spawnSync(
	process.execPath,
	['node_modules/prettier/bin/prettier.cjs', '--check', '--', ...candidates],
	{
		stdio: 'inherit',
	}
);
process.exit(prettier.status ?? 1);
