#!/bin/bash

# Validate Rollback Script
# 
# Validates that the rollback was successful by running comprehensive tests.
# Part of the zero-error refactoring safety net.

set -e  # Exit on any error

echo "🔍 Validating rollback state..."

# Check git status
echo "📋 Git status:"
git status --porcelain

# Check if we're at the baseline tag
CURRENT_COMMIT=$(git rev-parse HEAD)
BASELINE_COMMIT=$(git rev-parse refactor-baseline)

if [ "$CURRENT_COMMIT" = "$BASELINE_COMMIT" ]; then
    echo "✅ At baseline commit"
else
    echo "⚠️  Not at baseline commit"
    echo "📋 Current: $CURRENT_COMMIT"
    echo "📋 Baseline: $BASELINE_COMMIT"
fi

# Run all tests
echo "🧪 Running comprehensive test suite..."

# Unit tests
echo "📋 Running unit tests..."
if npm test --silent; then
    echo "✅ Unit tests pass"
else
    echo "❌ Unit tests failing"
    exit 1
fi

# TypeScript compilation
echo "📋 Checking TypeScript compilation..."
if npx tsc --noEmit; then
    echo "✅ TypeScript compiles cleanly"
else
    echo "❌ TypeScript compilation errors"
    exit 1
fi

# ESLint
echo "📋 Running ESLint..."
if npm run lint --silent; then
    echo "✅ ESLint passes"
else
    echo "⚠️  ESLint warnings/errors found"
    # Don't exit on lint warnings, just notify
fi

# Build test
echo "📋 Testing build..."
if npm run build --silent; then
    echo "✅ Build succeeds"
else
    echo "❌ Build failing"
    exit 1
fi

# Check for required files
echo "📋 Checking critical files exist..."
CRITICAL_FILES=(
    "src/hooks/projects/useHybridProjectState.ts"
    "src/components/projects/HybridProjectCreator.tsx"
    "src/components/projects/ConversationPane.tsx"
    "src/components/projects/LiveProjectBrief.tsx"
    "src/app/projects/page.tsx"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ Missing critical file: $file"
        exit 1
    fi
done

echo "🎯 Rollback validation complete!"
echo "✅ All systems operational at baseline state"