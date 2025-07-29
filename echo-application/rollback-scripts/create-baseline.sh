#!/bin/bash

# Create Baseline Script
# 
# Creates a git tag marking the current state as the refactoring baseline.
# This allows safe rollback during the refactoring process.

set -e  # Exit on any error

echo "📍 Creating refactoring baseline..."

# Check if we have uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  You have uncommitted changes. Please commit or stash them first."
    echo "📋 Uncommitted files:"
    git status --porcelain
    exit 1
fi

# Check if baseline already exists
if git tag -l | grep -q "^refactor-baseline$"; then
    echo "⚠️  Baseline tag already exists. Delete it first if you want to recreate:"
    echo "📋 git tag -d refactor-baseline"
    exit 1
fi

# Ensure we're on main branch (or whatever the primary branch is)
CURRENT_BRANCH=$(git branch --show-current)
echo "📋 Current branch: $CURRENT_BRANCH"

# Run tests to ensure we're starting from a good state
echo "🧪 Running tests to verify current state..."
if npm test --silent; then
    echo "✅ All tests pass"
else
    echo "❌ Tests are failing. Fix them before creating baseline."
    exit 1
fi

# Create the baseline tag
echo "🏷️  Creating refactor-baseline tag..."
git tag refactor-baseline -m "Baseline before hybrid wizard refactoring"

# Create a backup branch
BACKUP_BRANCH="backup-before-refactor-$(date +%Y%m%d-%H%M%S)"
echo "💾 Creating backup branch: $BACKUP_BRANCH"
git branch "$BACKUP_BRANCH"

echo "✅ Baseline created successfully!"
echo "📋 Tagged as: refactor-baseline"
echo "📋 Backup branch: $BACKUP_BRANCH"
echo "📋 You can now safely proceed with refactoring"
echo "📋 To rollback: ./rollback-scripts/rollback-to-baseline.sh"