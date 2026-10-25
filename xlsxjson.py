import pandas as pd
import json

# Читаємо файл
df = pd.read_excel("ua_places_game.xlsx")

# 1. Конвертуємо координати ПЕРЕД тим, як чіпати NaN
# Використовуємо pd.to_numeric, який автоматично перетворить порожні клітинки (NaN) на NaN у numpy/pandas
df['longitude'] = pd.to_numeric(df['longitude'].astype(str).str.replace(',', '.'), errors='coerce')
df['latitude'] = pd.to_numeric(df['latitude'].astype(str).str.replace(',', '.'), errors='coerce')

# 2. Фікс решти порожніх клітинок для всього датафрейму
df = df.fillna("")

# Конвертуємо
data = df.to_dict(orient="records")

# Зберігаємо
with open("55.json", "w", encoding="utf-8") as f:
    json.dump(
        data,
        f,
        ensure_ascii=False,
        separators=(",", ":")
    )

print("Готово! Файл успішно зконвертовано.")