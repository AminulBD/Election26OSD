# GitHub Publishing Checklist

Use this checklist to publish this project cleanly on GitHub.

## 1) Repository Metadata

- Set repository name and description
- Add topics/tags (example: `bangladesh`, `election`, `polling-station`, `open-data`, `gis`)
- Add website URL after GitHub Pages is live

## 2) Branch and Visibility

- Confirm default branch is `main`
- Choose repository visibility (public/private)
- Protect `main` branch if working in team mode

## 3) Core Files

Ensure these files are present:

- `README.md`
- `LICENSE`
- `.gitignore`
- `CONTRIBUTING.md`

## 4) Build Data

Before publishing, regenerate website JSON files:

```bash
python scripts/build_web_data.py
```

## 5) Push Code

```bash
git add .
git commit -m "chore: prepare repository for github publishing"
git push origin main
```

## 6) Enable GitHub Pages

1. Go to `Settings -> Pages`
2. Set source to **GitHub Actions**
3. Keep `.github/workflows/deploy-pages.yml` in `main`

## 7) Verify Live Site

- Open your Pages URL
- Test key flows:
  - area filter search
  - realtime autocomplete search
  - NID + DOB demo lookup
  - map toggle
  - mobile layout

## 8) Optional but Recommended

- Add issue templates
- Add pull request template
- Add CODEOWNERS
- Add release tags for major updates
