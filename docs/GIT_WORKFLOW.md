# WildVision - Git Workflow

## Branch Strategy

### Main Branches
- `main` - Production-ready code
- `dev` - Development branch (default)
- `release/*` - Release preparation branches

### Feature Branches
- `feat/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation changes
- `refactor/*` - Code refactoring
- `test/*` - Test additions/updates

## Workflow

### 1. Starting New Work

```bash
# Make sure you're on dev branch
git checkout dev
git pull origin dev

# Create feature branch
git checkout -b feat/camera-management
```

### 2. Making Commits

Follow conventional commits format:

```bash
# Format: <type>(<scope>): <subject>
git commit -m "feat(api): add camera CRUD endpoints"
git commit -m "fix(web): resolve map marker clustering issue"
git commit -m "docs: update API documentation"
```

**Commit Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `perf`: Performance improvement
- `test`: Tests
- `build`: Build system
- `ci`: CI/CD
- `chore`: Maintenance

### 3. Pushing Changes

```bash
git push origin feat/camera-management
```

### 4. Creating Pull Request

1. Go to GitHub/GitLab
2. Create PR from `feat/camera-management` to `dev`
3. Fill out PR template
4. Request review from code owners
5. Address review comments
6. Merge after approval

### 5. Merging to Main

Only release branches merge to main:

```bash
# Create release branch from dev
git checkout -b release/v1.0.0 dev

# After testing, merge to main
git checkout main
git merge release/v1.0.0
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin main --tags

# Also merge back to dev
git checkout dev
git merge release/v1.0.0
```

## Commit Message Guidelines

### Good Examples
```
feat(auth): implement JWT authentication
fix(map): correct marker positioning on zoom
docs(api): add endpoint documentation for cameras
refactor(db): optimize PostGIS queries
test(api): add integration tests for auth endpoints
```

### Bad Examples
```
❌ update code
❌ fix bug
❌ WIP
❌ changes
```

## Code Review Process

1. **Self-Review**: Review your own code before creating PR
2. **Automated Checks**: Ensure all CI checks pass
3. **Peer Review**: At least one approval required
4. **Code Owner Review**: Required for critical paths
5. **Testing**: All tests must pass
6. **Documentation**: Update docs if needed

## Pre-Commit Checks

Husky will automatically run:
- Commit message linting (commitlint)
- Code formatting (prettier)
- Linting (ESLint)

## Best Practices

1. **Small, Focused Commits**: One logical change per commit
2. **Descriptive Messages**: Explain what and why, not how
3. **Reference Issues**: Link to issue numbers when applicable
4. **Keep Branches Updated**: Regularly merge dev into feature branches
5. **Clean History**: Squash commits before merging if needed

## Emergency Hotfixes

For critical production issues:

```bash
# Create hotfix from main
git checkout -b hotfix/critical-bug main

# Fix and commit
git commit -m "fix(api): resolve critical authentication bypass"

# Merge to main
git checkout main
git merge hotfix/critical-bug
git tag -a v1.0.1 -m "Hotfix: authentication bypass"

# Also merge to dev
git checkout dev
git merge hotfix/critical-bug
```

---

**Last Updated:** Jan 31, 2026
