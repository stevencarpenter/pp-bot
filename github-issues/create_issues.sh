#!/bin/bash
#
# Script to create all pp-bot GitHub issues using GitHub CLI
# 
# Prerequisites:
#   - GitHub CLI (gh) installed: https://cli.github.com/
#   - Authenticated with: gh auth login
#
# Usage:
#   chmod +x create_issues.sh
#   ./create_issues.sh
#

set -e

# Configuration
REPO="stevencarpenter/pp-bot"
MILESTONE_1="Phase 1: Foundation"
MILESTONE_2="Phase 2: Database & Features"
MILESTONE_3="Phase 3: Deployment & Production"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "======================================================================"
echo -e "${BLUE}Creating GitHub Issues for pp-bot${NC}"
echo "======================================================================"
echo

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
    echo "Install from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not authenticated with GitHub CLI${NC}"
    echo "Run: gh auth login"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI is ready${NC}"
echo

# Function to create an issue
create_issue() {
    local issue_num=$1
    local title=$2
    local milestone=$3
    local labels=$4
    local filename="issue-${issue_num}.md"
    
    echo -e "${BLUE}📝 Creating Issue #${issue_num}: ${title}${NC}"
    
    # Extract body from markdown file (skip title and metadata)
    body=$(sed -n '/^---$/,/^---$/d; /^---$/,$p' "$filename" | tail -n +2)
    
    # Create the issue
    if gh issue create \
        --repo "$REPO" \
        --title "$title" \
        --body "$body" \
        --milestone "$milestone" \
        --label "$labels"; then
        echo -e "${GREEN}✅ Successfully created Issue #${issue_num}${NC}"
        echo
    else
        echo -e "${RED}❌ Failed to create Issue #${issue_num}${NC}"
        echo
        return 1
    fi
}

# Create all issues
echo "Creating issues..."
echo

# Issue 1: Slack App Setup & Configuration Guide
create_issue "01" \
    "Slack App Setup & Configuration Guide" \
    "$MILESTONE_1" \
    "documentation,setup,good-first-issue"

# Issue 2: Migrate to TypeScript
create_issue "02" \
    "Migrate to TypeScript" \
    "$MILESTONE_1" \
    "enhancement,typescript,refactoring"

# Issue 3: PostgreSQL Database Integration
create_issue "03" \
    "PostgreSQL Database Integration" \
    "$MILESTONE_2" \
    "enhancement,database,postgresql"

# Issue 4: Implement Leaderboard View Command
create_issue "04" \
    "Implement Leaderboard View Command" \
    "$MILESTONE_2" \
    "enhancement,feature"

# Issue 5: Railway.com Deployment Configuration
create_issue "05" \
    "Railway.com Deployment Configuration" \
    "$MILESTONE_3" \
    "deployment,infrastructure"

# Issue 6: CI/CD with GitHub Actions
create_issue "06" \
    "CI/CD with GitHub Actions" \
    "$MILESTONE_3" \
    "ci/cd,automation,github-actions"

# Issue 7: Error Handling & Logging
create_issue "07" \
    "Error Handling & Logging" \
    "$MILESTONE_1" \
    "enhancement,logging,error-handling"

# Issue 8: Testing Infrastructure
create_issue "08" \
    "Testing Infrastructure" \
    "$MILESTONE_2" \
    "testing,quality"

# Issue 9: Documentation
create_issue "09" \
    "Documentation" \
    "$MILESTONE_3" \
    "documentation"

echo "======================================================================"
echo -e "${GREEN}✅ All issues created successfully!${NC}"
echo "======================================================================"
echo
echo "View issues at: https://github.com/$REPO/issues"
echo
