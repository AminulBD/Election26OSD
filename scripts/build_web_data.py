import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SQL_DIR = ROOT / "SQL"
OUT_DIR = ROOT / "site" / "data"
MAPS_DIR = ROOT / "maps"
OUT_DIR.mkdir(parents=True, exist_ok=True)

TABLE_FILES = [
    ("divisions", "001_divisions.sql"),
    ("districts", "002_districts.sql"),
    ("upazilas", "003_upazilas.sql"),
    ("constituencies", "004_constituencies.sql"),
    ("unions", "005_unions.sql"),
    ("centers", "006_centers.sql"),
    ("parties", "007_parties.sql"),
]

INSERT_RE = re.compile(
    r"^INSERT INTO\s+(\w+)\s*\(([^)]*)\)\s*VALUES\s*\((.*)\);\s*$",
    re.IGNORECASE,
)


def split_sql_values(payload: str) -> list[str]:
    values = []
    buf = []
    in_quote = False
    i = 0
    length = len(payload)

    while i < length:
        ch = payload[i]
        if ch == "'":
            if in_quote and i + 1 < length and payload[i + 1] == "'":
                buf.append("''")
                i += 2
                continue
            in_quote = not in_quote
            buf.append(ch)
            i += 1
            continue

        if ch == "," and not in_quote:
            values.append("".join(buf).strip())
            buf = []
            i += 1
            continue

        buf.append(ch)
        i += 1

    if buf:
        values.append("".join(buf).strip())

    return values


def parse_value(token: str):
    if token.upper() == "NULL":
        return None

    if token.startswith("'") and token.endswith("'"):
        return token[1:-1].replace("''", "'")

    if re.fullmatch(r"-?\d+", token):
        return int(token)

    if re.fullmatch(r"-?\d+\.\d+", token):
        return float(token)

    return token


def parse_table(file_path: Path, table_name: str) -> list[dict]:
    rows = []
    with file_path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or not line.startswith("INSERT INTO"):
                continue

            match = INSERT_RE.match(line)
            if not match:
                continue

            name, columns_raw, values_raw = match.groups()
            if name.lower() != table_name.lower():
                continue

            columns = [c.strip() for c in columns_raw.split(",")]
            raw_values = split_sql_values(values_raw)
            if len(columns) != len(raw_values):
                continue

            parsed = [parse_value(v) for v in raw_values]
            rows.append(dict(zip(columns, parsed)))

    return rows


def main():
    summary = {}
    for table_name, filename in TABLE_FILES:
        src = SQL_DIR / filename
        rows = parse_table(src, table_name)
        out = OUT_DIR / f"{table_name}.json"
        with out.open("w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, separators=(",", ":"))

        summary[table_name] = len(rows)

    with (OUT_DIR / "summary.json").open("w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    # Build local maps index from /maps/*.svg for website rendering.
    map_slugs = sorted(p.stem.lower() for p in MAPS_DIR.glob("*.svg"))
    with (OUT_DIR / "maps_index.json").open("w", encoding="utf-8") as f:
        json.dump(map_slugs, f, ensure_ascii=False, separators=(",", ":"))
    summary["maps"] = len(map_slugs)

    with (OUT_DIR / "summary.json").open("w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print("Generated data:")
    for k, v in summary.items():
        print(f"- {k}: {v}")


if __name__ == "__main__":
    main()
