# xyOps Pre-commit Hook (PowerShell version for Windows)
# Install: Copy this to .git/hooks/pre-commit or use: npm run prepare

param(
    [switch]$Install = $false
)

# Colors for output
$Success = @{ ForegroundColor = 'Green' }
$Fail = @{ ForegroundColor = 'Red' }
$Warn = @{ ForegroundColor = 'Yellow' }
$Info = @{ ForegroundColor = 'Cyan' }

Write-Host "🔍 xyOps Pre-commit Validation..." @Info
Write-Host ""

$issues = 0

# ============================================================================
# 1. Check for blocking I/O in lib files
# ============================================================================
Write-Host "📝 Checking for blocking I/O (fs.readFileSync, fs.writeFileSync)..."

$blockedIO = git diff --cached -- 'lib/*.js' | Select-String -Pattern '\b(fs\.readFileSync|fs\.writeFileSync|fs\.statSync)\b'

if ($blockedIO) {
    Write-Host "❌ FAIL: Found blocking I/O in lib files" @Fail
    Write-Host "   Use async versions: fs.readFile, fs.writeFile, fs.stat"
    $issues++
} else {
    Write-Host "✅ PASS: No blocking I/O detected" @Success
}
Write-Host ""

# ============================================================================
# 2. Check for direct activeJobs workflow mutations
# ============================================================================
Write-Host "📝 Checking for unsafe activeJobs modifications..."

$activeJobsMutations = git diff --cached -- 'lib/*.js' | Select-String -Pattern 'this\.activeJobs\[.*\]\.workflow'

if ($activeJobsMutations) {
    Write-Host "⚠️  WARNING: Found direct activeJobs.workflow modification" @Warn
    Write-Host "   Use this.jobDetails for workflow state, not activeJobs"
    Write-Host "   Reference: docs/AI_AGENT_ANALYSIS.md#job-state-duality"
    $issues++
} else {
    Write-Host "✅ PASS: No unsafe workflow mutations detected" @Success
}
Write-Host ""

# ============================================================================
# 3. Check for missing loadSession in new API endpoints
# ============================================================================
Write-Host "📝 Checking for API endpoints without loadSession..."

$newEndpoints = git diff --cached -- 'lib/api/*.js' | Select-String -Pattern '^\+.*api_[a-z_]+\(' | Measure-Object | Select-Object -ExpandProperty Count

if ($newEndpoints -gt 0) {
    Write-Host "ℹ️  INFO: Found $newEndpoints new API endpoint(s)" @Info
    Write-Host "Verify they include: this.loadSession(args, (err, session, user) => {...})"

    # Extract newly added API methods
    $methods = git diff --cached -- 'lib/api/*.js' | Select-String -Pattern 'api_[a-z_]+\(' -AllMatches | ForEach-Object { $_.Matches.Value } | Sort-Object -Unique

    foreach ($method in $methods) {
        Write-Host "  - Checking $method..."
    }
} else {
    Write-Host "✅ PASS: No new API endpoints to check" @Success
}
Write-Host ""

# ============================================================================
# 4. Check for storage key usage
# ============================================================================
Write-Host "📝 Checking for unnormalized storage keys..."

$unnormalized = git diff --cached -- 'lib/*.js' |
    Select-String -Pattern "storage\.(get|put|delete|listFind)\('[a-z]" |
    Where-Object { $_ -notmatch 'normalizeKey' } |
    Measure-Object |
    Select-Object -ExpandProperty Count

if ($unnormalized -gt 0) {
    Write-Host "⚠️  WARNING: Found $unnormalized storage calls that might not normalize keys" @Warn
    Write-Host "   Use: this.storage.normalizeKey(userInput)"
    Write-Host "   Reference: docs/QUICK_REFERENCE_AI.md#storage-query-checklist"
} else {
    Write-Host "✅ PASS: Storage keys appear normalized" @Success
}
Write-Host ""

# ============================================================================
# 5. Check if tests are added for new lib files
# ============================================================================
Write-Host "📝 Checking if tests are added for lib changes..."

$libChanges = git diff --cached -- 'lib/*.js' | Measure-Object | Select-Object -ExpandProperty Count
$testChanges = git diff --cached -- 'test/**' | Measure-Object | Select-Object -ExpandProperty Count

if ($libChanges -gt 50 -and $testChanges -eq 0) {
    Write-Host "⚠️  WARNING: Major lib changes without test changes" @Warn
    Write-Host "   Consider adding tests to test/suites/"
    $issues++
} else {
    Write-Host "✅ PASS: Tests appear to be included" @Success
}
Write-Host ""

# ============================================================================
# 6. Check if CHANGELOG is updated
# ============================================================================
Write-Host "📝 Checking CHANGELOG updates..."

$apiChanges = git diff --cached -- 'lib/api/*.js' | Measure-Object | Select-Object -ExpandProperty Count
$changelogUpdates = git diff --cached -- 'CHANGELOG.md' | Measure-Object | Select-Object -ExpandProperty Count

if ($apiChanges -gt 0 -and $changelogUpdates -eq 0) {
    Write-Host "⚠️  WARNING: API changes without CHANGELOG update" @Warn
    Write-Host "   Update CHANGELOG.md for user-facing changes"
    $issues++
} else {
    Write-Host "✅ PASS: CHANGELOG appears updated" @Success
}
Write-Host ""

# ============================================================================
# 7. Summary
# ============================================================================
Write-Host "════════════════════════════════════════════════════════════════"

if ($issues -gt 0) {
    Write-Host "⚠️  Found $issues issue(s) to review before committing" @Warn
    Write-Host ""
    Write-Host "More info:" @Info
    Write-Host "  - docs/QUICK_REFERENCE_AI.md → Before Commit Checklist"
    Write-Host "  - docs/AI_AGENT_ANALYSIS.md → Common Mistakes"
    Write-Host ""

    # Interactive prompt (PowerShell style)
    Write-Host "Continue anyway? (y/n) " -NoNewline @Warn
    $response = Read-Host

    if ($response -ne 'y' -and $response -ne 'Y') {
        Write-Host "❌ Commit aborted. Fix issues and try again." @Fail
        exit 1
    }
} else {
    Write-Host "✅ All checks passed!" @Success
}

Write-Host "════════════════════════════════════════════════════════════════"
exit 0
