#!/bin/bash
echo "=========================================="
echo "CTS v3.2 - Comprehensive System Audit"
echo "=========================================="
echo ""

# 1. Check Build
echo "[1/8] Build Status"
if npm run build > /tmp/build.log 2>&1; then
  echo "  ✓ Build successful"
else
  echo "  ✗ Build failed - see /tmp/build.log"
fi

# 2. Check TypeScript
echo "[2/8] TypeScript Check"
TS_ERRORS=$(npx tsc --noEmit 2>&1 | grep "error TS" | wc -l)
echo "  TypeScript errors: $TS_ERRORS"

# 3. Check Redis Persistence
echo "[3/8] Redis Persistence"
if [ -f "lib/redis-db.ts" ] && grep -q "saveToDisk\|loadFromDisk" lib/redis-db.ts; then
  echo "  ✓ Persistence methods found in redis-db.ts"
else
  echo "  ✗ Persistence methods missing"
fi

if [ -d "data" ]; then
  echo "  ✓ Data directory exists"
else
  echo "  ⚠ Data directory missing"
fi

# 4. Check Deployment Files
echo "[4/8] Deployment Configuration"
for f in Dockerfile docker-compose.independent.yml independent-server-start.sh .env.example; do
  if [ -f "$f" ]; then
    echo "  ✓ $f exists"
  else
    echo "  ✗ $f missing"
  fi
done

# 5. Check API Routes
echo "[5/8] API Routes"
for route in /api/system/init /api/system/health /health; do
  if find app -name "$(echo $route | sed 's/\//' | sed 's/^\///').ts" 2>/dev/null | grep -q .; then
    echo "  ✓ Route $route exists"
  else
    echo "  ⚠ Route $route not found"
  fi
done

# 6. Check Environment
echo "[6/8] Environment Configuration"
if [ -f ".env.example" ]; then
  echo "  ✓ .env.example exists"
  req_vars=("JWT_SECRET" "NODE_ENV" "REDIS_PERSISTENCE")
  for var in "${req_vars[@]}"; do
    if grep -q "$var" .env.example; then
      echo "    ✓ $var configured"
    else
      echo "    ⚠ $var missing"
    fi
  done
fi

# 7. Check Git Status
echo "[7/8] Git Repository"
if git status >/dev/null 2>&1; then
  BRANCH=$(git branch --show-current 2>/dev/null)
  UNCOMMITED=$(git status --short | wc -l)
  echo "  ✓ On branch: $BRANCH"
  echo "  Uncommitted changes: $UNCOMMITED"
else
  echo "  ⚠ Not a git repository"
fi

# 8. Summary
echo ""
echo "[8/8] System Summary"
echo "=========================================="
echo "Build: $(npm run build >/dev/null 2>&1 && echo "PASS" || echo "FAIL")"
echo "TypeScript Errors: $TS_ERRORS"
echo "Redis Persistence: $(grep -q 'saveToDisk' lib/redis-db.ts 2>/dev/null && echo "ENABLED" || echo "DISABLED")"
echo "Docker Config: $([ -f "Dockerfile" ] && echo "READY" || echo "MISSING")"
echo "Independent Deploy: $([ -f "independent-server-start.sh" ] && echo "READY" || echo "MISSING")"
echo "=========================================="
