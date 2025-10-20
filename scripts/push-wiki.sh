#!/usr/bin/env bash
#
# Push Wiki Changes Helper Script
#
# This script helps you push changes to the GitHub Wiki repository.
# It's located in /tmp/copima-wiki-migration/copima-cli-crawler.wiki/
#
# Usage:
#   ./scripts/push-wiki.sh
#

set -euo pipefail

WIKI_DIR="/tmp/copima-wiki-migration/copima-cli-crawler.wiki"

echo "📚 Copima CLI Crawler - Wiki Push Helper"
echo "========================================"
echo ""

# Check if wiki directory exists
if [ ! -d "$WIKI_DIR" ]; then
    echo "❌ Wiki directory not found at: $WIKI_DIR"
    echo ""
    echo "To clone the wiki:"
    echo "  mkdir -p /tmp/copima-wiki-migration"
    echo "  cd /tmp/copima-wiki-migration"
    echo "  git clone https://github.com/pdiegmann/copima-cli-crawler.wiki.git"
    exit 1
fi

cd "$WIKI_DIR"

# Check if there are changes
if git diff --quiet && git diff --cached --quiet; then
    echo "✅ No changes to push"
    exit 0
fi

echo "📋 Changes to push:"
echo ""
git status --short
echo ""

# Show commit that will be pushed
echo "📝 Commit message:"
echo ""
git log -1 --pretty=format:"  %s%n  %b" HEAD
echo ""
echo ""

echo "🔐 Authentication required:"
echo ""
echo "The wiki requires authentication to push. You have several options:"
echo ""
echo "1. SSH (recommended):"
echo "   - Ensure you have SSH keys configured: https://docs.github.com/en/authentication/connecting-to-github-with-ssh"
echo "   - Update remote: git remote set-url origin git@github.com:pdiegmann/copima-cli-crawler.wiki.git"
echo ""
echo "2. Personal Access Token (HTTPS):"
echo "   - Create a token: https://github.com/settings/tokens"
echo "   - Token needs 'repo' scope"
echo "   - Username: your-github-username"
echo "   - Password: your-personal-access-token"
echo ""
echo "3. GitHub CLI (gh):"
echo "   - Install: https://cli.github.com/"
echo "   - Authenticate: gh auth login"
echo "   - Push: gh repo clone pdiegmann/copima-cli-crawler.wiki.git"
echo ""

read -p "Ready to push? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Push cancelled"
    exit 1
fi

echo ""
echo "⬆️  Pushing changes..."
echo ""

if git push origin master; then
    echo ""
    echo "✅ Wiki changes pushed successfully!"
    echo ""
    echo "📖 View your changes at:"
    echo "   https://github.com/pdiegmann/copima-cli-crawler/wiki"
    echo ""
else
    echo ""
    echo "❌ Push failed!"
    echo ""
    echo "Troubleshooting:"
    echo ""
    echo "1. Check authentication:"
    echo "   - SSH: ssh -T git@github.com"
    echo "   - HTTPS: Ensure token has correct permissions"
    echo ""
    echo "2. Check remote URL:"
    echo "   git remote -v"
    echo ""
    echo "3. Try updating remote URL:"
    echo "   # For SSH"
    echo "   git remote set-url origin git@github.com:pdiegmann/copima-cli-crawler.wiki.git"
    echo ""
    echo "   # For HTTPS"
    echo "   git remote set-url origin https://github.com/pdiegmann/copima-cli-crawler.wiki.git"
    echo ""
    exit 1
fi
