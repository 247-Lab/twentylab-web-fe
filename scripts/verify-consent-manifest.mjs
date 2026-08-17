import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(scriptPath), '..');
const manifestPath = join(projectRoot, 'config', 'consent-manifest.json');
const locales = Object.freeze(['en', 'es']);
const consentContentKeys = Object.freeze([
	'agreeTo',
	'declarationTitle',
	'declarationContent',
	'termsTitle',
	'termsContent',
	'covidTermsContent',
]);

function readJson(path) {
	return JSON.parse(readFileSync(path, 'utf8'));
}

function consentContent(messages, locale) {
	const common = messages?.Forms?.common;
	if (!common || typeof common !== 'object') {
		throw new Error(`${locale} consent messages are missing Forms.common`);
	}

	const content = {};
	for (const key of consentContentKeys) {
		const value = common[key];
		if (Array.isArray(value)) {
			if (value.length === 0 || value.some((line) => typeof line !== 'string' || line.length === 0)) {
				throw new Error(`${locale} Forms.common.${key} must be a non-empty string array`);
			}
		} else if (typeof value !== 'string' || value.length === 0) {
			throw new Error(`${locale} Forms.common.${key} must be a non-empty string`);
		}
		content[key] = value;
	}
	return content;
}

export function consentContentFingerprint(messages, locale = 'unknown') {
	const canonicalContent = JSON.stringify(consentContent(messages, locale));
	return `sha256:${createHash('sha256').update(canonicalContent, 'utf8').digest('hex')}`;
}

function validateManifestShape(manifest) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(manifest?.activeVersion || '')) {
		throw new Error('Consent manifest activeVersion must use YYYY-MM-DD');
	}
	if (!manifest.versions || typeof manifest.versions !== 'object') {
		throw new Error('Consent manifest versions are missing');
	}

	const versions = Object.keys(manifest.versions).sort();
	if (versions.length === 0 || versions.at(-1) !== manifest.activeVersion) {
		throw new Error('Consent manifest activeVersion must be the newest checked-in version');
	}
	for (const version of versions) {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(version)) {
			throw new Error(`Consent manifest version ${version} must use YYYY-MM-DD`);
		}
		const fingerprints = manifest.versions[version];
		if (locales.some((locale) => !/^sha256:[a-f0-9]{64}$/.test(fingerprints?.[locale] || ''))) {
			throw new Error(`Consent manifest version ${version} must contain EN/ES SHA-256 fingerprints`);
		}
	}
}

export function verifyConsentManifestData(manifest, messagesByLocale) {
	validateManifestShape(manifest);
	const expected = manifest.versions[manifest.activeVersion];
	for (const locale of locales) {
		const actual = consentContentFingerprint(messagesByLocale[locale], locale);
		if (actual !== expected[locale]) {
			throw new Error(
				`${locale} consent text does not match version ${manifest.activeVersion}; add a new manifest version and update the active version`
			);
		}
	}
	return manifest.activeVersion;
}

function gitResult(args) {
	return spawnSync('git', args, { cwd: projectRoot, encoding: 'utf8' });
}

function readBaseManifest(baseReference) {
	if (!baseReference) return null;
	if (/^0+$/.test(baseReference) || gitResult(['cat-file', '-e', `${baseReference}^{commit}`]).status !== 0) {
		throw new Error('CONSENT_BASE_REF must resolve to a fetched commit');
	}

	const result = gitResult(['show', `${baseReference}:config/consent-manifest.json`]);
	if (result.status !== 0) return null;
	return JSON.parse(result.stdout);
}

function verifyManifestHistory(baseManifest, currentManifest) {
	if (!baseManifest) return;
	validateManifestShape(baseManifest);
	for (const [version, fingerprints] of Object.entries(baseManifest.versions)) {
		if (JSON.stringify(currentManifest.versions[version]) !== JSON.stringify(fingerprints)) {
			throw new Error(`Published consent manifest version ${version} is immutable`);
		}
	}
	if (currentManifest.activeVersion < baseManifest.activeVersion) {
		throw new Error('Consent manifest activeVersion cannot move backwards');
	}
}

export function verifyConsentManifest({ baseReference, requireBaseReference = false } = {}) {
	if (requireBaseReference && !baseReference) {
		throw new Error('CONSENT_BASE_REF is required in CI');
	}
	const manifest = readJson(manifestPath);
	const messagesByLocale = Object.fromEntries(
		locales.map((locale) => [locale, readJson(join(projectRoot, 'locales', locale, 'forms.json'))])
	);
	verifyConsentManifestData(manifest, messagesByLocale);
	verifyManifestHistory(readBaseManifest(baseReference), manifest);
	return manifest.activeVersion;
}

if (resolve(process.argv[1] || '') === scriptPath) {
	try {
		const version = verifyConsentManifest({
			baseReference: process.env.CONSENT_BASE_REF,
			requireBaseReference: process.env.GITHUB_ACTIONS === 'true',
		});
		console.log(`Consent manifest ${version} matches the English and Spanish form text.`);
	} catch (error) {
		console.error(error.message);
		process.exitCode = 1;
	}
}
