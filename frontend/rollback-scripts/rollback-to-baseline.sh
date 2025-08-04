#!/bin/bash

# Rollback to Baseline Script
# 
# Restores the codebase to the state before refactoring began.
# Part of Phase 1: Foundation Setup for zero-error refactoring.

set -e  # Exit on any error

echo "🔄 Rolling back to pre-refactoring baseline..."

# Store current changes in case rollback was accidental
ROLLBACK_STASH="refactor-rollback-$(date +%Y%m%d-%H%M%S)"
echo "💾 Stashing current changes as: $ROLLBACK_STASH"
git stash push -m "$ROLLBACK_STASH" --include-untracked

# Check if baseline tag exists
if git tag -l | grep -q "^refactor-baseline$"; then
    echo "✅ Found refactor-baseline tag"
    
    # Reset to baseline
    echo "🔙 Resetting to baseline state..."
    git reset --hard refactor-baseline
    
    # Clean untracked files
    echo "🧹 Cleaning untracked files..."
    git clean -fd
    
    echo "✅ Rollback complete!"
    echo "📋 Your previous changes are saved in stash: $ROLLBACK_STASH"
    echo "📋 To recover them: git stash apply stash^{/$ROLLBACK_STASH}"
    
else
    echo "❌ No refactor-baseline tag found"
    echo "💡 Create baseline first with: ./rollback-scripts/create-baseline.sh"
    
    # Restore stashed changes
    git stash pop
    exit 1
fi

# Verify rollback
echo "🧪 Verifying rollback..."
if npm test --silent; then
    echo "✅ Tests pass after rollback"
else
    echo "⚠️  Tests failing after rollback - check for uncommitted changes"
fi

echo "🎯 Rollback to baseline complete!"