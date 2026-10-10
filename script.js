let allData = [];
let currentPool = [];
let guessedIds = new Set();
let namesMap = new Map();

let currentMode = 'Чернігівська область';
let zoomedRegion = null;

let guessHistory = [];
let historyIndex = -1;
let currentTypedDraft = '';

let totalRegionPop = 0;
let guessedRegionPop = 0;
let regionsData = {};
let rayonsData = {};

const inputField = document.getElementById('guess-input');
const scoreEl = document.getElementById('score');
const totalEl = document.getElementById('total');
const listContainer = document.getElementById('guessed-list');
const statusMsg = document.getElementById('status-message');
const extStatsPanel = document.getElementById('extended-stats');
const sidebarContent = document.getElementById('sidebar-content');
const sidebarHeader = document.getElementById('sidebar-header');
const regionSelect = document.getElementById('region-select');

function cleanRegionName(name) { return name ? name.replace(' область', '').replace('Автономна Республіка', 'АР') : 'Невідомо'; }
function cleanRayonName(name) { return name ? name.replace(' район', '') : 'Невідомо'; }

function showModal(title, text, type, onConfirm) {
    const overlay = document.getElementById('custom-modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-text').innerHTML = text;
    const btns = document.getElementById('modal-buttons');
    btns.innerHTML = '';

    if (type === 'confirm') {
        btns.innerHTML = `
            <button class="btn btn-cancel" id="btn-modal-cancel">Скасувати</button>
            <button class="btn btn-danger" id="btn-modal-confirm">Завершити</button>
        `;
        document.getElementById('btn-modal-cancel').onclick = () => overlay.classList.remove('active');
        document.getElementById('btn-modal-confirm').onclick = () => {
            overlay.classList.remove('active');
            if(onConfirm) onConfirm();
        };
    } else {
        btns.innerHTML = `<button class="btn btn-ok" id="btn-modal-ok">Зрозуміло</button>`;
        document.getElementById('btn-modal-ok').onclick = () => {
            overlay.classList.remove('active');
            if(onConfirm) onConfirm();
        };
    }
    overlay.classList.add('active');
}

function normalize(str) {
    if(!str) return '';
    return str.toLowerCase().replace(/['`’ʼ]/g, "'").trim();
}

function getPop(place) { return parseInt(place.population) || 0; }

async function loadData() {
    try {
        const response = await fetch('55.json');
        if (!response.ok) throw new Error('Мережева помилка');
        allData = await response.json();
        populateRegions();
        startGame(currentMode);
    } catch (error) {
        statusMsg.textContent = "Помилка завантаження файлу!";
        console.error(error);
    }
}

function populateRegions() {
    const regions = [...new Set(allData.map(p => p.region).filter(Boolean))].sort();
    regionSelect.innerHTML = `<option value="all">Вся Україна</option>`;
    regions.forEach(r => {
        const option = document.createElement('option');
        option.value = r; option.textContent = r;
        regionSelect.appendChild(option);
    });
    regionSelect.value = currentMode;
}

function startGame(regionValue) {
    guessedIds.clear();
    listContainer.innerHTML = '';
    namesMap.clear();
    guessHistory = [];
    historyIndex = -1;

    currentMode = regionValue;
    zoomedRegion = null;

    totalRegionPop = 0; guessedRegionPop = 0;
    regionsData = {}; rayonsData = {};

    if (regionValue === 'all') {
        currentPool = allData;
        statusMsg.textContent = "Вся Україна";
    } else {
        currentPool = allData.filter(p => p.region === regionValue);
        statusMsg.textContent = `${regionValue}`;
    }

    extStatsPanel.classList.remove('hidden');

    currentPool.forEach((place, index) => {
        place._id = index;
        const pop = getPop(place);
        totalRegionPop += pop;

        const nName = normalize(place['name:uk']);
        if (!namesMap.has(nName)) namesMap.set(nName, []);
        namesMap.get(nName).push(place);

        const oldName = place['old_name:uk'];
        if (oldName) {
            const nOldName = normalize(oldName);
            if (!namesMap.has(nOldName)) namesMap.set(nOldName, []);
            namesMap.get(nOldName).push(place);
        }

        const reg = place.region || 'Невідомий регіон';
        if (!regionsData[reg]) regionsData[reg] = { totalItems: 0, guessedItems: 0, totalPop: 0, guessedPop: 0 };
        regionsData[reg].totalItems++;
        regionsData[reg].totalPop += pop;

        const ray = place.rayon || 'Невідомий район';
        if (!rayonsData[ray]) rayonsData[ray] = { region: reg, totalItems: 0, guessedItems: 0, totalPop: 0, guessedPop: 0 };
        rayonsData[ray].totalItems++;
        rayonsData[ray].totalPop += pop;
    });

    scoreEl.textContent = '0';
    totalEl.textContent = currentPool.length;

    renderSidebar();
    updateExtendedStats();

    inputField.disabled = false;
    inputField.value = '';
    inputField.focus();
}

function renderSidebar() {
    sidebarContent.innerHTML = '';
    if (currentMode === 'all' && !zoomedRegion) {
        sidebarHeader.classList.add('hidden');
        const grid = document.createElement('div');
        grid.className = 'regions-grid';
        const sortedRegions = Object.keys(regionsData).sort((a,b) => regionsData[b].totalItems - regionsData[a].totalItems);

        sortedRegions.forEach(regName => {
            const r = regionsData[regName];
            const percent = r.totalItems > 0 ? ((r.guessedItems / r.totalItems) * 100).toFixed(1) : 0;

            const pie = document.createElement('div');
            pie.className = 'pie-chart';
            pie.id = `reg-pie-${regName}`;
            pie.style.setProperty('--fill', `${percent}%`);
            pie.onclick = () => { zoomedRegion = regName; renderSidebar(); };

            pie.innerHTML = `
                <div class="pie-inner">
                    <span class="pie-name">${cleanRegionName(regName)}</span>
                    <span class="pie-val" id="reg-val-${regName}">${r.guessedItems}/${r.totalItems}</span>
                </div>
            `;
            grid.appendChild(pie);
        });
        sidebarContent.appendChild(grid);
    } else {
        const activeRegion = zoomedRegion || currentMode;
        if (zoomedRegion) {
            sidebarHeader.classList.remove('hidden');
            document.getElementById('sidebar-title').textContent = activeRegion;
        } else {
            sidebarHeader.classList.add('hidden');
        }

        const activeRayons = Object.keys(rayonsData).filter(rName => rayonsData[rName].region === activeRegion);
        activeRayons.sort((a,b) => rayonsData[b].totalItems - rayonsData[a].totalItems);

        activeRayons.forEach(rName => {
            const r = rayonsData[rName];
            const percent = r.totalItems > 0 ? ((r.guessedItems / r.totalItems) * 100).toFixed(1) : 0;

            const div = document.createElement('div');
            div.className = 'rayon-card';
            div.innerHTML = `
                <div class="rayon-header">
                    <span>${cleanRayonName(rName)}</span>
                    <span id="r-count-${rName}">${r.guessedItems} / ${r.totalItems}</span>
                </div>
                <div class="rayon-stats-text">
                    <span>Населення:</span>
                    <span id="r-pop-${rName}">${r.guessedPop.toLocaleString('uk-UA')} / ${r.totalPop.toLocaleString('uk-UA')}</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" id="r-fill-${rName}" style="width: ${percent}%; ${percent >= 100 ? 'background: var(--success);' : ''}"></div>
                </div>
            `;
            sidebarContent.appendChild(div);
        });
    }
}

document.getElementById('btn-zoom-out').addEventListener('click', () => { zoomedRegion = null; renderSidebar(); });

function updateExtendedStats() {
    const npPercent = currentPool.length > 0 ? ((guessedIds.size / currentPool.length) * 100).toFixed(1) : 0;
    const popPercent = totalRegionPop > 0 ? ((guessedRegionPop / totalRegionPop) * 100).toFixed(1) : 0;
    document.getElementById('stat-np-percent').textContent = `${npPercent}%`;
    document.getElementById('stat-pop-score').textContent = guessedRegionPop.toLocaleString('uk-UA');
    document.getElementById('stat-pop-total').textContent = totalRegionPop.toLocaleString('uk-UA');
    document.getElementById('stat-pop-percent').textContent = `${popPercent}%`;
}

function updateLiveSidebar(regName, rName) {
    const pieEl = document.getElementById(`reg-pie-${regName}`);
    if (pieEl) {
        const rData = regionsData[regName];
        const percent = (rData.guessedItems / rData.totalItems) * 100;
        pieEl.style.setProperty('--fill', `${percent}%`);
        if(percent >= 100) pieEl.style.background = 'conic-gradient(var(--success) 100%, var(--bg-color) 0)';
        document.getElementById(`reg-val-${regName}`).textContent = `${rData.guessedItems}/${rData.totalItems}`;
    }

    const rData = rayonsData[rName];
    if (rData) {
        const countEl = document.getElementById(`r-count-${rName}`);
        const popEl = document.getElementById(`r-pop-${rName}`);
        const fillEl = document.getElementById(`r-fill-${rName}`);
        if (countEl) countEl.textContent = `${rData.guessedItems} / ${rData.totalItems}`;
        if (popEl) popEl.textContent = `${rData.guessedPop.toLocaleString('uk-UA')} / ${rData.totalPop.toLocaleString('uk-UA')}`;
        if (fillEl) {
            const percent = (rData.guessedItems / rData.totalItems) * 100;
            fillEl.style.width = `${percent}%`;
            if (percent >= 100) fillEl.style.background = 'var(--success)';
        }
    }
}

regionSelect.addEventListener('change', (e) => {
    const newRegion = e.target.value;
    if (guessedIds.size > 0) {
        const previousRegion = currentMode;
        e.target.value = previousRegion;
        showModal('Почати спочатку?', 'Поточна гра буде завершена, а прогрес скинуто. Ти впевнений?', 'confirm',
            () => {
                showModal('Гру завершено!', `Твій результат: <b>${guessedIds.size}</b> з ${currentPool.length} <br>(${statusMsg.textContent})`, 'info',
                    () => { regionSelect.value = newRegion; startGame(newRegion); }
                );
            }
        );
    } else { startGame(newRegion); }
});

inputField.addEventListener('keydown', (e) => {
    if (guessHistory.length === 0) return;

    if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (historyIndex === -1) {
            currentTypedDraft = inputField.value;
            historyIndex = guessHistory.length - 1;
        } else if (historyIndex > 0) {
            historyIndex--;
        }
        inputField.value = guessHistory[historyIndex];
        inputField.dispatchEvent(new Event('input'));

    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex !== -1) {
            if (historyIndex < guessHistory.length - 1) {
                historyIndex++;
                inputField.value = guessHistory[historyIndex];
                inputField.dispatchEvent(new Event('input'));
            } else {
                historyIndex = -1;
                inputField.value = currentTypedDraft;
            }
        }
    }
});

inputField.addEventListener('input', (e) => {
    const rawInput = e.target.value;
    const val = normalize(rawInput);

    if (e.isTrusted) {
        historyIndex = -1;
    }

    if (namesMap.has(val)) {
        const matches = namesMap.get(val);
        let added = false;

        matches.forEach(place => {
            if (!guessedIds.has(place._id)) {
                guessedIds.add(place._id);
                added = true;

                const pop = getPop(place);
                guessedRegionPop += pop;

                const rName = place.rayon || 'Невідомий район';
                const regName = place.region || 'Невідомий регіон';

                if (rayonsData[rName]) {
                    rayonsData[rName].guessedItems++;
                    rayonsData[rName].guessedPop += pop;
                }
                if (regionsData[regName]) {
                    regionsData[regName].guessedItems++;
                    regionsData[regName].guessedPop += pop;
                }

                updateLiveSidebar(regName, rName);

                const div = document.createElement('div');
                div.className = 'place-item';

                const placeType = place.place || place['type:uk'] || '';
                const metaInfo = [placeType, place.rayon, currentMode === 'all' ? place.region : ''].filter(Boolean).join(' | ');
                const popInfo = place.population ? `Нас: ${pop.toLocaleString('uk-UA')}` : '';

                const oldNameHtml = place['old_name:uk'] ? `<div class="place-old-name">колиш. ${place['old_name:uk']}</div>` : '';

                div.innerHTML = `
                    <div class="place-name-container">
                        <div class="place-name">${place['name:uk']}</div>
                        ${oldNameHtml}
                    </div>
                    <div class="place-meta">
                        <div style="color: var(--accent); font-weight: bold;">${metaInfo}</div>
                        <div>${popInfo}</div>
                    </div>
                `;
                listContainer.prepend(div);
            }
        });

        if (added) {
            guessHistory.push(rawInput.trim());
            historyIndex = -1;

            inputField.value = '';
            scoreEl.textContent = guessedIds.size;
            updateExtendedStats();

            inputField.style.borderColor = "var(--success)";
            setTimeout(() => inputField.style.borderColor = "var(--border)", 300);
        }
    }
});

loadData();