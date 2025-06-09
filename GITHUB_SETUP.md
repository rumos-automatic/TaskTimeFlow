# GitHub Repository Setup Commands

## Quick Setup (Replace YOUR_USERNAME with your GitHub username)

```bash
# Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/TaskTimeFlow.git

# Push to GitHub
git push -u origin main

# Verify remote setup
git remote -v
```

## Repository Configuration

### Repository Settings
1. Go to: https://github.com/YOUR_USERNAME/TaskTimeFlow/settings
2. Add description: "革新的生産性向上SaaS - かんばん×24時間タイムライン統合アプリ"
3. Add website: Your Vercel deployment URL
4. Add topics: productivity, saas, nextjs, supabase, kanban, timeline, ai, typescript

### GitHub Actions Secrets
Navigate to: Settings → Secrets and variables → Actions

Required secrets for CI/CD:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

### Branch Protection Rules
1. Go to: Settings → Branches
2. Add rule for `main` branch:
   - Require status checks to pass
   - Require branches to be up to date
   - Require pull request reviews

### GitHub Pages (Documentation)
1. Go to: Settings → Pages
2. Source: Deploy from a branch
3. Branch: main
4. Folder: /docs

## Verification Commands

```bash
# Check repository status
git status

# View commit history
git log --oneline

# Check remote configuration
git remote -v

# View repository info
git show --stat HEAD
```

## Next Steps After GitHub Setup

1. **Vercel Deployment**:
   - Connect GitHub repository to Vercel
   - Configure environment variables
   - Enable automatic deployments

2. **Supabase Setup**:
   - Create new Supabase project
   - Run database migrations: `npm run db:push`
   - Configure authentication providers

3. **Development**:
   - Install dependencies: `npm install`
   - Start development server: `npm run dev`
   - Access at: http://localhost:3000

4. **Documentation**:
   - Update README.md with your repository URL
   - Add live demo links
   - Update API documentation

## Troubleshooting

### Authentication Issues
```bash
# If using HTTPS and encountering auth issues
git remote set-url origin git@github.com:YOUR_USERNAME/TaskTimeFlow.git

# Or use GitHub CLI
gh auth login
gh repo create TaskTimeFlow --public --source=. --push
```

### Large Repository Warning
If you encounter file size warnings:
```bash
# Check repository size
du -sh .git

# Consider using Git LFS for large files
git lfs track "*.png"
git lfs track "*.jpg"
```