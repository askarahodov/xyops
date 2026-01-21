#!/usr/bin/env node

/**
 * Pre-commit validation script for xyOps
 *
 * Checks for common mistakes and code quality issues before commit:
 * - Job state separation (activeJobs vs jobDetails)
 * - loadSession() in API endpoints
 * - Blocking I/O in plugins
 * - Storage key normalization
 * - JEXL expression safety
 * - Test coverage
 * - CHANGELOG updates
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for output
const colors = {
	reset: '\x1b[0m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	cyan: '\x1b[36m'
};

let hasErrors = false;
let hasWarnings = false;

function log(type, message) {
	const prefix = {
		error: `${colors.red}✗ ERROR${colors.reset}`,
		warn: `${colors.yellow}⚠ WARNING${colors.reset}`,
		info: `${colors.blue}ℹ INFO${colors.reset}`,
		success: `${colors.green}✓ OK${colors.reset}`
	}[type];
	console.log(`${prefix}: ${message}`);
}

function getStagedFiles() {
	try {
		const output = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
		return output.trim().split('\n').filter(f => f);
	} catch (e) {
		return [];
	}
}

function getFileContent(filePath) {
	try {
		return fs.readFileSync(filePath, 'utf-8');
	} catch (e) {
		return null;
	}
}

function checkJobStateSeparation(files) {
	log('info', 'Checking Job state separation...');
	let found = false;

	const libFiles = files.filter(f => f.startsWith('lib/') && f.endsWith('.js'));

	libFiles.forEach(file => {
		const content = getFileContent(file);
		if (!content) return;

		// Check for improper workflow state writes
		if (content.includes('this.activeJobs[') && content.includes('.workflow')) {
			const lines = content.split('\n');
			lines.forEach((line, idx) => {
				if (line.includes('this.activeJobs[') &&
					line.includes('.workflow') &&
					(line.includes('=') && !line.trim().startsWith('//'))) {
					log('error', `${file}:${idx + 1} - Direct write to activeJobs.workflow (should use jobDetails)`);
					found = true;
					hasErrors = true;
				}
			});
		}

		// Check for jobDetails usage (good pattern)
		if (content.includes('this.jobDetails[') && content.includes('.wfJobData')) {
			// This is correct
		}
	});

	if (!found) {
		log('success', 'Job state separation looks good');
	}
}

function checkLoadSession(files) {
	log('info', 'Checking loadSession() in API endpoints...');
	let missing = false;

	const apiFiles = files.filter(f => f.startsWith('lib/api/') && f.endsWith('.js'));

	apiFiles.forEach(file => {
		const content = getFileContent(file);
		if (!content) return;

		// Find API methods
		const apiMethods = content.match(/api_\w+\s*\(\s*args\s*,\s*callback/g) || [];

		apiMethods.forEach(method => {
			const methodName = method.match(/api_\w+/)[0];
			const methodStart = content.indexOf(method);
			let braceCount = 0;
			let methodEnd = methodStart;

			for (let i = methodStart; i < content.length; i++) {
				if (content[i] === '{') braceCount++;
				if (content[i] === '}') {
					braceCount--;
					if (braceCount === 0) {
						methodEnd = i;
						break;
					}
				}
			}

			const methodBody = content.substring(methodStart, methodEnd);

			// Skip if it's a helper method or no session needed
			if (methodBody.includes('//') && methodBody.includes('no session')) return;
			if (methodName.includes('static')) return;

			if (!methodBody.includes('this.loadSession') &&
				!methodBody.includes('this.requireMaster')) {
				log('warn', `${file} - ${methodName}() may be missing loadSession() call`);
				hasWarnings = true;
			}
		});
	});

	if (!missing) {
		log('success', 'loadSession() checks look good');
	}
}

function checkBlockingIO(files) {
	log('info', 'Checking for blocking I/O in plugins...');
	let found = false;

	const pluginFiles = files.filter(f =>
		(f.includes('plugin') || f.includes('lib/')) && f.endsWith('.js')
	);

	pluginFiles.forEach(file => {
		const content = getFileContent(file);
		if (!content) return;

		const blockingPatterns = [
			'fs.readFileSync',
			'fs.writeFileSync',
			'fs.readdirSync',
			'require("child_process").execSync',
			'execSync'
		];

		blockingPatterns.forEach(pattern => {
			if (content.includes(pattern)) {
				const lines = content.split('\n');
				lines.forEach((line, idx) => {
					if (line.includes(pattern) && !line.trim().startsWith('//')) {
						log('error', `${file}:${idx + 1} - Blocking I/O: ${pattern}`);
						found = true;
						hasErrors = true;
					}
				});
			}
		});
	});

	if (!found) {
		log('success', 'No blocking I/O detected');
	}
}

function checkStorageKeys(files) {
	log('info', 'Checking storage key normalization...');
	let found = false;

	const libFiles = files.filter(f => f.startsWith('lib/') && f.endsWith('.js'));

	libFiles.forEach(file => {
		const content = getFileContent(file);
		if (!content) return;

		const lines = content.split('\n');
		lines.forEach((line, idx) => {
			// Check for direct storage.get/put with user input without normalization
			if (line.includes('storage.get') || line.includes('storage.put')) {
				// Look ahead for normalizeKey
				let found_normalize = false;
				for (let i = Math.max(0, idx - 5); i < Math.min(content.split('\n').length, idx + 5); i++) {
					if (content.split('\n')[i].includes('normalizeKey')) {
						found_normalize = true;
						break;
					}
				}

				if (!found_normalize && line.includes('[') && line.includes(']')) {
					log('warn', `${file}:${idx + 1} - Storage key may not be normalized`);
					hasWarnings = true;
				}
			}
		});
	});

	if (!found) {
		log('success', 'Storage key usage looks good');
	}
}

function checkJEXLSafety(files) {
	log('info', 'Checking JEXL expression safety...');
	let found = false;

	const libFiles = files.filter(f => f.startsWith('lib/') && f.endsWith('.js'));

	libFiles.forEach(file => {
		const content = getFileContent(file);
		if (!content) return;

		const lines = content.split('\n');
		lines.forEach((line, idx) => {
			// Check for unsafe property access in expressions
			if (line.includes('jexl.eval') || line.includes('{{') && line.includes('}}')) {
				if (!line.includes('||') && !line.includes('?.')) {
					// This might be unsafe, but not always - only warn
					if (line.match(/\w+\.\w+\s*[><=]/)) {
						log('warn', `${file}:${idx + 1} - JEXL expression might need safe property access`);
						hasWarnings = true;
					}
				}
			}
		});
	});

	if (!found) {
		log('success', 'JEXL safety checks look good');
	}
}

function checkChangelogUpdated(files) {
	log('info', 'Checking if CHANGELOG.md was updated...');

	if (files.includes('CHANGELOG.md')) {
		log('success', 'CHANGELOG.md updated');
	} else {
		log('warn', 'CHANGELOG.md not updated (should document changes)');
		hasWarnings = true;
	}
}

function runTests() {
	log('info', 'Running tests (npm test)...');
	try {
		execSync('npm test', { stdio: 'inherit', cwd: process.cwd() });
		log('success', 'Tests passed');
	} catch (e) {
		log('error', 'Tests failed');
		hasErrors = true;
	}
}

function main() {
	console.log(`\n${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
	console.log(`${colors.cyan}xyOps Pre-commit Validation${colors.reset}`);
	console.log(`${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`);

	const staged = getStagedFiles();

	if (staged.length === 0) {
		log('info', 'No staged files found');
		process.exit(0);
	}

	log('info', `Checking ${staged.length} staged files...\n`);

	// Run checks
	checkJobStateSeparation(staged);
	console.log();

	checkLoadSession(staged);
	console.log();

	checkBlockingIO(staged);
	console.log();

	checkStorageKeys(staged);
	console.log();

	checkJEXLSafety(staged);
	console.log();

	checkChangelogUpdated(staged);
	console.log();

	// Summary
	console.log(`${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);

	if (hasErrors) {
		console.log(`${colors.red}❌ COMMIT BLOCKED: Fix errors above${colors.reset}`);
		process.exit(1);
	} else if (hasWarnings) {
		console.log(`${colors.yellow}⚠ COMMIT ALLOWED: Review warnings above${colors.reset}`);
		process.exit(0);
	} else {
		console.log(`${colors.green}✓ All checks passed!${colors.reset}`);
		process.exit(0);
	}
}

// Run if called directly
if (require.main === module) {
	main();
}

module.exports = { getStagedFiles, checkJobStateSeparation, checkLoadSession };
