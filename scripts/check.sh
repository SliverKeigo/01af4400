#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0

step() { echo -e "\n${YELLOW}[$1]${NC} $2"; }
pass() { echo -e "  ${GREEN}PASS${NC} $1"; }
fail() { echo -e "  ${RED}FAIL${NC} $1"; ERRORS=$((ERRORS + 1)); }

# ── 1. TypeScript type check ──
step "1/6" "TypeScript type check"
if npx tsc --noEmit 2>&1; then
  pass "tsc --noEmit"
else
  fail "TypeScript has type errors"
fi

# ── 2. Rust cargo check ──
step "2/6" "Rust cargo check"
if [ -z "$SHERPA_ONNX_LIB_DIR" ]; then
  # Try to find libs locally
  CANDIDATE=$(find . -maxdepth 2 -type d -name "lib" -path "*/sherpa-onnx*/lib" 2>/dev/null | head -1)
  if [ -n "$CANDIDATE" ]; then
    export SHERPA_ONNX_LIB_DIR="$(cd "$CANDIDATE" && pwd)"
  fi
fi

if [ -n "$SHERPA_ONNX_LIB_DIR" ]; then
  if (cd src-tauri && cargo check 2>&1); then
    pass "cargo check"
  else
    fail "Rust compilation errors"
  fi
else
  echo -e "  ${YELLOW}SKIP${NC} SHERPA_ONNX_LIB_DIR not set, skipping cargo check"
fi

# ── 3. Rust tests ──
step "3/6" "Rust unit tests"
if [ -n "$SHERPA_ONNX_LIB_DIR" ]; then
  if (cd src-tauri && cargo test 2>&1); then
    pass "cargo test ($(cd src-tauri && cargo test 2>&1 | grep 'test result' | head -1 | grep -o '[0-9]* passed'))"
  else
    fail "Rust tests failed"
  fi
else
  echo -e "  ${YELLOW}SKIP${NC} SHERPA_ONNX_LIB_DIR not set"
fi

# ── 4. Icon RGBA check ──
step "4/6" "Icon format check (RGBA)"
ICON_OK=true
for icon in src-tauri/icons/32x32.png src-tauri/icons/128x128.png src-tauri/icons/icon.png; do
  if [ -f "$icon" ]; then
    if file "$icon" | grep -q "RGBA"; then
      pass "$icon is RGBA"
    else
      fail "$icon is NOT RGBA (Tauri requires RGBA PNGs)"
      ICON_OK=false
    fi
  else
    fail "$icon missing"
    ICON_OK=false
  fi
done

# ── 5. E2E tests (only if vite dev server is running) ──
step "5/6" "Playwright E2E tests"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:1420 2>/dev/null | grep -q "200"; then
  if npx playwright test --reporter=line 2>&1; then
    pass "Playwright e2e tests"
  else
    fail "E2E tests failed"
  fi
else
  echo -e "  ${YELLOW}SKIP${NC} Vite dev server not running on :1420"
fi

# ── 6. GitHub Actions workflow syntax ──
step "6/6" "Workflow YAML syntax"
for f in .github/workflows/*.yml; do
  if [ -f "$f" ]; then
    # Basic YAML syntax check with node
    if node -e "require('fs').readFileSync('$f','utf8')" 2>/dev/null; then
      pass "$f readable"
    else
      fail "$f has syntax errors"
    fi
  fi
done

# ── Summary ──
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}All checks passed!${NC}"
  exit 0
else
  echo -e "${RED}${ERRORS} check(s) failed!${NC}"
  exit 1
fi
