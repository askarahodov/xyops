#!/usr/bin/env node

/**
 * Setup git hooks for xyOps
 * Usage: npm run setup-hooks
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
	reset: '\x1b[0m',
	green: '\x1b[32m',
	blue: '\x1b[34m',
	cyan: '\x1b[36m'
};

function log(msg) {
	console.log(`${colors.cyan}▸${colors.reset} ${msg}`);
}

function success(msg) {
	console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

const gitDir = path.join(process.cwd(), '.git', 'hooks');
const preCommitSource = path.join(process.cwd(), 'bin', 'hooks', 'pre-commit');
const preCommitTarget = path.join(gitDir, 'pre-commit');

try {
	// Check if .git exists
	if (!fs.existsSync(path.join(process.cwd(), '.git'))) {
		console.error('Error: Not a git repository');
		process.exit(1);
	}

	// Create hooks directory if needed
	if (!fs.existsSync(gitDir)) {
		fs.mkdirSync(gitDir, { recursive: true });
		log('Created .git/hooks directory');
	}

	// Copy or symlink pre-commit hook
	if (fs.existsSync(preCommitSource)) {
		// Try symlink first (Unix-like systems)
		try {
			if (fs.existsSync(preCommitTarget)) {
				fs.unlinkSync(preCommitTarget);
			}
			fs.symlinkSync(preCommitSource, preCommitTarget);
			success('Symlinked pre-commit hook');
		} catch (e) {
			// Fallback to copy (Windows)
			const content = fs.readFileSync(preCommitSource, 'utf-8');
			fs.writeFileSync(preCommitTarget, content);
			success('Copied pre-commit hook');
		}

		// Make executable (Unix-like)
		try {
			fs.chmodSync(preCommitTarget, 0o755);
			success('Made pre-commit hook executable');
		} catch (e) {
			// Windows doesn't support chmod, skip
		}
	} else {
		console.error('Error: bin/hooks/pre-commit not found');
		process.exit(1);
	}

	console.log();
	console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
	console.log(`${colors.green}Git hooks installed successfully!${colors.reset}`);
	console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
	console.log();
	log('Pre-commit hook will run automatically on: git commit');
	log('Skip hook: git commit --no-verify -m "Message"');
	log('Manual check: npm run validate');
	console.log();

} catch (e) {
	console.error('Error setting up hooks:', e.message);
	process.exit(1);
}
