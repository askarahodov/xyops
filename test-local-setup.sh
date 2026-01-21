#!/bin/bash
# xyOps Development Environment Test Suite
# Tests all setup, pre-commit hooks, and workflow integration
# Usage: ./test-local-setup.sh [--verbose]

set -e

VERBOSE=${1:-""}
REPO_ROOT=$(pwd)
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

log_skip() {
    echo -e "${YELLOW}[SKIP]${NC} $1"
    ((TESTS_SKIPPED++))
}

log_verbose() {
    if [ -n "$VERBOSE" ]; then
        echo -e "${BLUE}      $1${NC}"
    fi
}

# ============================================================================
# TEST SUITE 1: Environment Setup
# ============================================================================

echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}TEST SUITE 1: Environment Setup${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}\n"

# Test 1.1: Node.js version
log_test "Node.js version >= 16"
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 16 ]; then
    log_pass "Node.js v$(node -v | cut -d'v' -f2) is compatible"
else
    log_fail "Node.js v$(node -v | cut -d'v' -f2) is too old (need >= 16)"
fi

# Test 1.2: npm available
log_test "npm is available"
if command -v npm &> /dev/null; then
    log_pass "npm v$(npm -v) is installed"
else
    log_fail "npm not found in PATH"
fi

# Test 1.3: git available
log_test "git is available"
if command -v git &> /dev/null; then
    log_pass "git v$(git --version | cut -d' ' -f3) is installed"
else
    log_fail "git not found in PATH"
fi

# Test 1.4: Repository initialized
log_test "git repository initialized"
if [ -d ".git" ]; then
    log_pass "Git repository found"
    log_verbose "Remote: $(git remote -v | head -1)"
else
    log_fail "Not in a git repository"
fi

# ============================================================================
# TEST SUITE 2: File Structure
# ============================================================================

echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}TEST SUITE 2: File Structure${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}\n"

# Array of required files
REQUIRED_FILES=(
    ".github/copilot-instructions.md"
    "docs/QUICK_REFERENCE_AI.md"
    "docs/AI_AGENT_ANALYSIS.md"
    "bin/pre-commit-hook.sh"
    "bin/pre-commit-hook.ps1"
    ".github/workflows/code-quality.yml"
    ".github/PULL_REQUEST_TEMPLATE_ENHANCED.md"
    "DEVELOPER_SETUP.md"
    "PRIORITY_1_COMPLETE.md"
    "IMPLEMENTATION_STATUS.md"
    "FILE_MANIFEST.md"
    "package.json"
)

for file in "${REQUIRED_FILES[@]}"; do
    log_test "File exists: $file"
    if [ -f "$file" ]; then
        size=$(wc -c < "$file" | tr -d ' ')
        log_pass "Found ($size bytes)"
        log_verbose "Path: $REPO_ROOT/$file"
    else
        log_fail "Missing file: $file"
    fi
done

# ============================================================================
# TEST SUITE 3: Pre-commit Hook
# ============================================================================

echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}TEST SUITE 3: Pre-commit Hook Setup${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}\n"

# Test 3.1: Hook script executable
log_test "Pre-commit hook script is executable"
if [ -x "bin/pre-commit-hook.sh" ]; then
    log_pass "bin/pre-commit-hook.sh has execute permission"
else
    log_fail "bin/pre-commit-hook.sh not executable - run: chmod +x bin/pre-commit-hook.sh"
fi

# Test 3.2: Hook symlink or installed
log_test "Pre-commit hook installed"
if [ -f ".git/hooks/pre-commit" ]; then
    if grep -q "pre-commit-hook" ".git/hooks/pre-commit" 2>/dev/null || [ -L ".git/hooks/pre-commit" ]; then
        log_pass "Pre-commit hook is installed"
        log_verbose "Hook type: $(file .git/hooks/pre-commit | cut -d: -f2-)"
    else
        log_fail "Hook exists but doesn't reference pre-commit-hook.sh"
    fi
else
    log_skip "Pre-commit hook not installed - run: npm run prepare"
fi

# Test 3.3: Hook contains expected checks
log_test "Pre-commit hook has all validation checks"
CHECKS=("Blocking I/O" "activeJobs" "normalizeKey" "loadSession" "Tests" "CHANGELOG")
MISSING_CHECKS=0
for check in "${CHECKS[@]}"; do
    if ! grep -q "$check" "bin/pre-commit-hook.sh" 2>/dev/null; then
        log_verbose "Missing check: $check"
        ((MISSING_CHECKS++))
    fi
done
if [ $MISSING_CHECKS -eq 0 ]; then
    log_pass "All 6 validation checks found in hook"
else
    log_fail "Missing $MISSING_CHECKS validation checks"
fi

# ============================================================================
# TEST SUITE 4: Dependencies
# ============================================================================

echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}TEST SUITE 4: Dependencies${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}\n"

# Test 4.1: node_modules exists
log_test "node_modules directory exists"
if [ -d "node_modules" ]; then
    log_pass "node_modules installed"
    COUNT=$(ls -1 node_modules | wc -l)
    log_verbose "$COUNT packages installed"
else
    log_skip "node_modules not installed - run: npm install"
fi

# Test 4.2: package.json scripts
log_test "package.json has required scripts"
SCRIPTS=("prepare" "test" "start")
MISSING_SCRIPTS=0
for script in "${SCRIPTS[@]}"; do
    if grep -q "\"$script\":" package.json; then
        log_verbose "Script found: $script"
    else
        log_fail "Missing script: $script"
        ((MISSING_SCRIPTS++))
    fi
done
if [ $MISSING_SCRIPTS -eq 0 ]; then
    log_pass "All required npm scripts present"
fi

# ============================================================================
# TEST SUITE 5: Documentation Quality
# ============================================================================

echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}TEST SUITE 5: Documentation Quality${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}\n"

# Test 5.1: copilot-instructions has critical section
log_test "Architecture guide has critical issues section"
if grep -q "Critical.*Issues\|CRITICAL\|Complexities" ".github/copilot-instructions.md"; then
    log_pass "Critical issues documentation found"
else
    log_fail "Critical issues section not found in copilot-instructions.md"
fi

# Test 5.2: Quick reference has checklists
log_test "Quick reference has checklists"
CHECKLISTS=("API Endpoint" "Workflow" "Storage" "Reviewer")
MISSING_CHECKLISTS=0
for checklist in "${CHECKLISTS[@]}"; do
    if grep -q "$checklist" "docs/QUICK_REFERENCE_AI.md" 2>/dev/null; then
        log_verbose "Checklist found: $checklist"
    else
        log_fail "Missing checklist: $checklist"
        ((MISSING_CHECKLISTS++))
    fi
done
if [ $MISSING_CHECKLISTS -eq 0 ]; then
    log_pass "All required checklists present"
fi

# Test 5.3: AI Analysis has all 6 issues documented
log_test "AI Analysis covers all 6 critical issues"
ISSUES=("Job State Duality" "Workflow State Hierarchy" "TOCTOU" "Job Limits" "WebSocket" "Deduplication")
MISSING_ISSUES=0
for issue in "${ISSUES[@]}"; do
    if grep -q "$issue" "docs/AI_AGENT_ANALYSIS.md" 2>/dev/null; then
        log_verbose "Issue documented: $issue"
    else
        log_fail "Issue not documented: $issue"
        ((MISSING_ISSUES++))
    fi
done
if [ $MISSING_ISSUES -eq 0 ]; then
    log_pass "All 6 critical issues documented"
fi

# ============================================================================
# TEST SUITE 6: GitHub Actions Workflow
# ============================================================================

echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}TEST SUITE 6: GitHub Actions Workflow${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}\n"

# Test 6.1: Workflow file is valid YAML
log_test "GitHub Actions workflow is valid YAML"
if command -v yamllint &> /dev/null; then
    if yamllint -d relaxed ".github/workflows/code-quality.yml" > /dev/null 2>&1; then
        log_pass "Workflow YAML is valid"
    else
        log_fail "Workflow YAML has syntax errors"
    fi
else
    log_skip "yamllint not installed - skipping YAML validation"
fi

# Test 6.2: Workflow has required jobs
log_test "Workflow has required jobs"
JOBS=("validate-code" "lint-check")
MISSING_JOBS=0
for job in "${JOBS[@]}"; do
    if grep -q "$job" ".github/workflows/code-quality.yml"; then
        log_verbose "Job found: $job"
    else
        log_fail "Missing job: $job"
        ((MISSING_JOBS++))
    fi
done
if [ $MISSING_JOBS -eq 0 ]; then
    log_pass "All required jobs present"
fi

# ============================================================================
# TEST SUITE 7: Code Quality
# ============================================================================

echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}TEST SUITE 7: Code Quality Checks${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}\n"

# Test 7.1: Run npm test
log_test "Run project tests"
if [ -d "node_modules" ]; then
    if npm test > /tmp/test-output.txt 2>&1; then
        log_pass "All tests pass"
        log_verbose "Test output: $(tail -1 /tmp/test-output.txt)"
    else
        log_fail "Tests failed - check with: npm test"
        log_verbose "Last lines:"
        tail -3 /tmp/test-output.txt | sed 's/^/        /'
    fi
else
    log_skip "Dependencies not installed - run: npm install"
fi

# Test 7.2: Check for syntax errors in scripts
log_test "Check bash scripts for syntax errors"
if bash -n "bin/pre-commit-hook.sh" > /dev/null 2>&1; then
    log_pass "Bash script has valid syntax"
else
    log_fail "Bash script has syntax errors"
fi

# ============================================================================
# SUMMARY
# ============================================================================

echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}TEST SUMMARY${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}\n"

TOTAL=$((TESTS_PASSED + TESTS_FAILED + TESTS_SKIPPED))
echo -e "Total Tests:  $TOTAL"
echo -e "${GREEN}Passed:       $TESTS_PASSED${NC}"
echo -e "${RED}Failed:       $TESTS_FAILED${NC}"
echo -e "${YELLOW}Skipped:      $TESTS_SKIPPED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✅ All critical tests passed!${NC}"
    echo -e "Ready for local development and testing.\n"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed.${NC}"
    echo -e "Fix the issues above and run again.\n"
    exit 1
fi
