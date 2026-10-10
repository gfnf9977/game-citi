import requests
from bs4 import BeautifulSoup
import json
import time

# Еталонні назви областей для виправлення відмінків
REGIONS = {
    1: "Автономна Республіка Крим", 2: "Вінницька область", 3: "Волинська область",
    4: "Дніпропетровська область", 5: "Донецька область", 6: "Житомирська область",
    7: "Закарпатська область", 8: "Запорізька область", 9: "Івано-Франківська область",
    10: "Київська область", 11: "Кіровоградська область", 12: "Луганська область",
    13: "Львівська область", 14: "Миколаївська область", 15: "Одеська область",
    16: "Полтавська область", 17: "Рівненська область", 18: "Сумська область",
    19: "Тернопільська область", 20: "Харківська область", 21: "Херсонська область",
    22: "Хмельницька область", 23: "Черкаська область", 24: "Чернівецька область",
    25: "Чернігівська область", 26: "м. Київ"
}


def parse_all_regions_full(output_json):
    settlements_data = {}
    headers = {'User-Agent': 'Mozilla/5.0'}

    for i in range(1, 27):
        url = f"https://atu.land.kiev.ua/obl-{i}.php"
        print(f"Парсимо: {REGIONS[i]}...")

        try:
            response = requests.get(url, headers=headers, timeout=15)
            if response.status_code != 200: continue

            soup = BeautifulSoup(response.text, 'html.parser')  # Якщо є lxml, краще 'lxml'
            rayons = soup.find_all('input', {'name': 'servis-np-region'})

            for rayon_input in rayons:
                rayon_label = soup.find('label', {'for': rayon_input['id']})
                if not rayon_label: continue
                rayon_name = rayon_label.find('span', class_='table-accordion-label__name').text.strip()

                rayon_content = rayon_input.find_next_sibling('div', class_='accordion-content')
                if not rayon_content: continue

                hromadas = rayon_content.find_all('input', {'name': 'servis-np'})

                for hromada_input in hromadas:
                    hromada_label = soup.find('label', {'for': hromada_input['id']})
                    if not hromada_label: continue
                    raw_hromada_name = hromada_label.text.strip()

                    hromada_content = hromada_input.find_next_sibling('div', class_='accordion-content')
                    if not hromada_content: continue

                    rows = hromada_content.find_all('tr')[1:]  # Пропускаємо заголовок
                    if not rows: continue

                    # 1. Визначаємо тип громади за її центром (перший рядок у списку)
                    first_row_cols = rows[0].find_all('td')
                    center_type = first_row_cols[0].text.strip().lower()

                    if center_type == 'місто':
                        h_type = 'міська'
                    elif center_type == 'селище' or center_type == 'смт':
                        h_type = 'селищна'
                    else:
                        h_type = 'сільська'

                    # Формуємо повну назву громади
                    full_hromada_name = raw_hromada_name.replace(' громада', f' {h_type} громада')

                    # 2. Збираємо всі населені пункти
                    for row in rows:
                        cols = row.find_all('td')
                        if len(cols) >= 3:
                            settlement_type = cols[0].text.strip()
                            name = cols[1].text.strip()
                            katotth = cols[2].text.strip()

                            settlements_data[katotth] = {
                                "type:uk": settlement_type,
                                "name:uk": name,
                                "region": REGIONS[i],
                                "rayon": rayon_name,
                                "hromada": full_hromada_name
                            }

        except Exception as e:
            print(f"[!] Сталася помилка на {url}: {e}")

        time.sleep(1)

    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(settlements_data, f, ensure_ascii=False, indent=4)

    print(f"\nГотово! Зібрано {len(settlements_data)} населених пунктів.")


parse_all_regions_full('ukraine_reference_full.json')