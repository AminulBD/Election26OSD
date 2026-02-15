# Election26OSD

Open source polling-station dataset and Bangla-first finder website for Bangladesh.

Data source: [Bangladesh Election Commission - Polling Station](https://ecs.gov.bd/polling-station)  
Related API project: [AminulBD/Election26OSD-API](https://github.com/AminulBD/Election26OSD-API)

![Project Preview](screenshot.png)

## What This Repo Contains

- Raw SQL dump: `database.sql`
- SQLite database: `database.sqlite`
- Split SQL exports: `SQL/`
- Constituency map SVGs: `maps/`
- Party symbols: `symbols/`
- Ready-to-host website: `site/`
- Data build script: `scripts/build_web_data.py`

## Dataset Snapshot

- Divisions: 8
- Districts: 64
- Upazilas: 563
- Constituencies: 300
- Unions/Wards: 7,450
- Polling Centers: 40,827
- Parties: 63

## Website Features (`site/`)

- Bangla UI and mobile-friendly layout
- Cascading filters:
  `Division -> District -> Upazila -> Constituency -> Union`
- Real-time center search with autocomplete
- NID + DOB lookup flow (demo style)
- Voter-type filtering (`BOTH`, `MALE`, `FEMALE`)
- Nearby center lookup using browser geolocation
- Local constituency map SVG integration
- Party symbol showcase

## Important Note About NID + DOB

This project does **not** store private voter profiles.  
The NID flow is an open-data approximation that matches by probable `voter_area_code` (last 6 digits of NID).

## Quick Start

### 1) Build website data from SQL

```bash
python scripts/build_web_data.py
```

### 2) Run website locally

```bash
python -m http.server 8000 --directory site
```

Open: `http://localhost:8000`

## Deploy on GitHub Pages

This repository includes a Pages workflow:  
`.github/workflows/deploy-pages.yml`

After pushing to `main`, enable GitHub Pages in repository settings and set source to **GitHub Actions**.

## Contributing

Please read `CONTRIBUTING.md` before opening pull requests.

## Publish Checklist

Use `GITHUB_PUBLISHING.md` for a step-by-step launch checklist.

## License

MIT License. See `LICENSE`.
