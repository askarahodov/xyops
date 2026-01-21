#!/bin/bash
# xyOps Pre-commit Hook
# Validates code before commit to catch common issues early
# Install: cp bin/pre-commit-hook.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
CHANGES=$(git diff --cached --name-only)

echo "🔍 xyOps Pre-commit Validation..."
echo ""

# Counter for issues found
ISSUES=0

# ============================================================================
# 1. Check for blocking I/O in lib files
# ============================================================================
echo "📝 Checking for blocking I/O (fs.readFileSync, fs.writeFileSync)..."
if git diff --cached -- 'lib/*.js' | grep -E '\bfs\.(readFileSync|writeFileSync|statSync)\b' > /dev/null 2>&1; then
    echo "❌ FAIL: Found blocking I/O in lib files"
    echo "   Use async versions: fs.readFile, fs.writeFile, fs.stat"
    ISSUES=$((ISSUES + 1))
else
    echo "✅ PASS: No blocking I/O detected"
fi
echo ""

# ============================================================================
# 2. Check for direct activeJobs workflow mutations (potential race condition)
# ============================================================================
echo "📝 Checking for unsafe activeJobs modifications..."
if git diff --cached -- 'lib/*.js' | grep -E 'this\.activeJobs\[.*\]\.workflow' > /dev/null 2>&1; then
    echo "⚠️  WARNING: Found direct activeJobs.workflow modification"
    echo "   Use this.jobDetails for workflow state, not activeJobs"
    echo "   Reference: docs/AI_AGENT_ANALYSIS.md#job-state-duality"
    ISSUES=$((ISSUES + 1))
else
    echo "✅ PASS: No unsafe workflow mutations detected"
fi
echo ""

# ============================================================================
# 3. Check for missing loadSession in new API endpoints
# ============================================================================
echo "📝 Checking for API endpoints without loadSession..."
NEW_API_ENDPOINTS=$(git diff --cached -- 'lib/api/*.js' | grep -E '^\+.*api_[a-z_]+\(' | wc -l)
if [ "$NEW_API_ENDPOINTS" -gt 0 ]; then
    echo "ℹ️  INFO: Found $NEW_API_ENDPOINTS new API endpoint(s)"

    # Extract newly added API method names
    NEW_METHODS=$(git diff --cached -- 'lib/api/*.js' | grep -oE 'api_[a-z_]+\(' | sort -u)

    for method in $NEW_METHODS; do
        # Check if loadSession is called in this method
        if ! git show :"lib/api/*.js" 2>/dev/null | grep -A 10 "$method" | grep -q "loadSession"; then
            echo "❌ FAIL: $method likely missing loadSession()"
            ISSUES=$((ISSUES + 1))
        fi
    done

    if [ "$ISSUES" -eq 0 ]; then
        echo "✅ PASS: All API endpoints have loadSession pattern"
    fi
else
    echo "✅ PASS: No new API endpoints to check"
fi
echo ""

# ============================================================================
# 4. Check for storage key usage (should use normalizeKey)
# ============================================================================
echo "📝 Checking for unnormalized storage keys..."
UNNORMALIZED=$(git diff --cached -- 'lib/*.js' | grep -E "storage\.(get|put|delete|listFind)\('[a-z]" | grep -v normalizeKey | wc -l)
if [ "$UNNORMALIZED" -gt 0 ]; then
    echo "⚠️  WARNING: Found $UNNORMALIZED storage calls that might not normalize keys"
    echo "   Use: this.storage.normalizeKey(userInput)"
    echo "   Reference: docs/QUICK_REFERENCE_AI.md#storage-query-checklist"
fi
echo ""

# ============================================================================
# 5. Check if tests are added for new lib files
# ============================================================================
echo "📝 Checking if tests are added for lib changes..."
LIB_CHANGES=$(git diff --cached -- 'lib/*.js' | wc -l)
TEST_CHANGES=$(git diff --cached -- 'test/**' | wc -l)

if [ "$LIB_CHANGES" -gt 50 ] && [ "$TEST_CHANGES" -eq 0 ]; then
    echo "⚠️  WARNING: Major lib changes without test changes"
    echo "   Consider adding tests to test/suites/"
    ISSUES=$((ISSUES + 1))
else
    echo "✅ PASS: Tests appear to be included"
fi
echo ""

# ============================================================================
# 6. Check if CHANGELOG is updated for user-facing changes
# ============================================================================
echo "📝 Checking CHANGELOG updates..."
if git diff --cached -- 'lib/api/*.js' | grep -q '.' && ! git diff --cached -- 'CHANGELOG.md' | grep -q '.'; then
    echo "⚠️  WARNING: API changes without CHANGELOG update"
    echo "   Update CHANGELOG.md for user-facing changes"
    ISSUES=$((ISSUES + 1))
else
    echo "✅ PASS: CHANGELOG appears updated"
fi
echo ""

# ============================================================================
# 7. Summary
# ============================================================================
echo "════════════════════════════════════════════════════════════════"

if [ "$ISSUES" -gt 0 ]; then
    echo "⚠️  Found $ISSUES issue(s) to review before committing"
    echo ""
    echo "More info:"
    echo "  - docs/QUICK_REFERENCE_AI.md → Before Commit Checklist"
    echo "  - docs/AI_AGENT_ANALYSIS.md → Common Mistakes"
    echo ""
    echo "Continue anyway? (y/n) "
    read -r response
    if [[ "$response" != "y" && "$response" != "Y" ]]; then
        echo "❌ Commit aborted. Fix issues and try again."
        exit 1
    fi
else
    echo "✅ All checks passed!"
fi

echo "════════════════════════════════════════════════════════════════"
exit 0
