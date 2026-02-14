# Contributing

Thanks for contributing to Election26OSD.

## Local Setup

1. Clone the repository.
2. Build web data:

```bash
python scripts/build_web_data.py
```

3. Run the website locally:

```bash
python -m http.server 8000 --directory site
```

## Contribution Scope

- Data quality fixes in SQL/JSON
- UI and UX improvements for `site/`
- Performance improvements for search and filtering
- Documentation and publishing improvements

## Pull Request Checklist

- Keep changes focused and small
- Update docs when behavior changes
- Rebuild web data if SQL sources are changed
- Verify the site loads and key flows still work:
  - area-based search
  - NID + DOB lookup (demo flow)
  - realtime search/autocomplete
  - map toggle behavior

## Commit Message Style

Use clear, direct messages, for example:

- `feat: add realtime center autocomplete`
- `fix: prevent repeated constituency maps in default results`
- `docs: update github publishing checklist`

## Reporting Issues

Please include:

- steps to reproduce
- expected behavior
- actual behavior
- screenshot or screen recording if UI-related
