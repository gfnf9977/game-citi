import pandas as pd
import json

# Завантажуємо твій фінальний Excel-файл
df = pd.read_excel('updated_FINAL_ua-name-places.xlsx')

# 1. Залишаємо лише необхідні для гри колонки
columns_to_keep = ['name:uk', 'old_name:uk', 'region', 'rayon', 'hromada', 'population', 'type:uk']
df = df[columns_to_keep]

# 2. Замінюємо порожні значення (NaN) на порожні рядки
df.fillna('', inplace=True)

# 3. Конвертуємо у список словників
records = df.to_dict(orient='records')

# 4. Видаляємо порожні ключі з кожного об'єкта для максимального стиснення
optimized_records = []
for row in records:
    # Якщо population = 0 або '', не передаємо його, щоб економити вагу
    cleaned_row = {k: v for k, v in row.items() if v != '' and v != 0}
    optimized_records.append(cleaned_row)

# 5. Зберігаємо у мініфікований JSON (без зайвих відступів)
with open('ua-name-places.json', 'w', encoding='utf-8') as f:
    json.dump(optimized_records, f, ensure_ascii=False, separators=(',', ':'))

print(f"Готово! Файл оптимізовано. Розмір бази: {len(optimized_records)} пунктів.")