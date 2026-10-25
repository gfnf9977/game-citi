import json
import pandas as pd

GEOJSON_FILE = "export.1.geojson"
EXCEL_FILE = "updated_FINAL_ua-name-places.xlsx"
OUTPUT_FILE = "updated_FINAL_ua-name-places_coords1.xlsx"

print("Зчитування GeoJSON...")

with open(GEOJSON_FILE, "r", encoding="utf-8") as f:
    geojson = json.load(f)

rows = []

for feature in geojson["features"]:

    props = feature.get("properties", {})
    geometry = feature.get("geometry", {})

    katotth = props.get("katotth")
    place = props.get("place")

    # беремо тільки населені пункти
    if not katotth or not place:
        continue

    if geometry.get("type") != "Point":
        continue

    coords = geometry.get("coordinates")

    if not coords or len(coords) < 2:
        continue

    rows.append({
        "katotth": str(katotth),
        "longitude": coords[0],
        "latitude": coords[1]
    })

coords_df = pd.DataFrame(rows)

print(f"Знайдено населених пунктів: {len(coords_df):,}")

duplicates = coords_df["katotth"].duplicated().sum()
print(f"Дублікатів KATOTTH: {duplicates}")

coords_df = coords_df.drop_duplicates(
    subset=["katotth"],
    keep="first"
)

print("Зчитування Excel...")

places_df = pd.read_excel(
    EXCEL_FILE,
    engine="openpyxl",
    dtype={"katotth": str}
)

print(f"Рядків у Excel: {len(places_df):,}")

result = places_df.merge(
    coords_df,
    on="katotth",
    how="left"
)

matched = result["latitude"].notna().sum()

print(f"Збігів: {matched:,}")
print(f"Без координат: {len(result) - matched:,}")

result.to_excel(
    OUTPUT_FILE,
    index=False
)

print(f"Готово: {OUTPUT_FILE}")