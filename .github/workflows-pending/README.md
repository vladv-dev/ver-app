# Pending workflows — one step to activate CI/CD

These are the real GitHub Actions workflows (`ci.yml`, `deploy.yml`). They live
here, not in `.github/workflows/`, because the OAuth token used to create the
repo lacks the `workflow` scope — GitHub refuses to push or API-write files
under `.github/workflows/` without it.

## Activate (one time, ~1 min)

A teammate/agent whose `gh` (or git) credential has the **`workflow`** scope runs:

```bash
gh auth refresh -s workflow            # grant the scope (interactive device flow)
mkdir -p .github/workflows
git mv .github/workflows-pending/ci.yml     .github/workflows/ci.yml
git mv .github/workflows-pending/deploy.yml .github/workflows/deploy.yml
git rm  .github/workflows-pending/README.md
git commit -m "ci: activate CI + Pages deploy workflows"
git push
```

On push:

- **CI** (`ci.yml`) runs lint + test + build on every push/PR to `main`.
- **Deploy** (`deploy.yml`) publishes a static export to GitHub Pages.
  Enable once at **Settings → Pages → Source: GitHub Actions**; the live URL is
  then `https://<owner>.github.io/<repo>/`.

## Already verified locally

`npm run lint`, `npm test`, and `npm run build` (both default and
`DEPLOY_TARGET=github-pages`) all pass — see VER-3. Activation just moves these
checks into CI.
