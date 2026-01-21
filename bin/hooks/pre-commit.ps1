# Git pre-commit hook for xyOps (PowerShell)
# Install: Copy-Item -Path "bin\hooks\pre-commit.ps1" -Destination ".git\hooks\pre-commit"

node bin/pre-commit-check.js
if ($LASTEXITCODE -ne 0) {
	exit 1
}
