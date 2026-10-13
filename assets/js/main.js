let fantasias = [];
let imageObserver;
const itemsPerPage = 100;

// Estado dos filtros (espelhado na URL)
const state = {
    view: 'home',     // 'home' (página inicial) ou 'catalog'
    tema: '',         // id de uma data comemorativa (ver SEASONS)
    categoria: '',
    sexo: '',
    tipo: '',
    busca: '',
    pagina: 1,
    ordem: 'default',
    dir: 'asc'
};

// Elementos DOM principais
const costumeContainer = document.getElementById('costumeContainer');
const sidebarCategoryList = document.getElementById('sidebarCategoryList');
const filterSexoContainer = document.getElementById('filterSexo');
const filterTipoContainer = document.getElementById('filterTipo');
const sortSelect = document.getElementById('sortSelect');
const searchNomeInput = document.getElementById('searchNome');
const searchClearButton = document.getElementById('searchClear');
const noResultsMessage = document.getElementById('noResultsMessage');
const clearFiltersButton = document.getElementById('clearFiltersButton');
const emptyClearButton = document.getElementById('emptyClearButton');
const resultsCountContainer = document.getElementById('resultsCount');
const pageTitle = document.getElementById('pageTitle');
const randomSearchButton = document.getElementById('randomSearchButton');
const paginationContainer = document.getElementById('paginationContainer');
const mainContent = document.getElementById('mainContent');
const homeView = document.getElementById('homeView');
const catalogView = document.getElementById('catalogView');
const pageEyebrow = document.getElementById('pageEyebrow');

// Elementos da folha de detalhes
const costumeModal = document.getElementById('costumeModal');
const sheet = document.getElementById('sheet');
const sheetScrim = document.getElementById('sheetScrim');
const sheetMedia = sheet.querySelector('.sheet-media');
const modalCloseButton = document.getElementById('modalCloseButton');
const sheetAnotherButton = document.getElementById('sheetAnotherButton');
const modalImage = document.getElementById('modalImage');
const modalImagePlaceholder = document.getElementById('modalImagePlaceholder');
const modalName = document.getElementById('modalName');
const modalCategoria = document.getElementById('modalCategoria');
const modalSexo = document.getElementById('modalSexo');
const modalTipo = document.getElementById('modalTipo');
const modalId = document.getElementById('modalId');
const modalViewCount = document.getElementById('modalViewCount');
const modalClickCount = document.getElementById('modalClickCount');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const compactLayout = window.matchMedia('(max-width: 767px)');
const stackedLayout = window.matchMedia('(max-width: 899px)');

const fallbackFantasias = [ // Seus dados de fallback
    { "nome": ".", "_id": 6834, "img": 6834, "imgUrl": "https://www.passalaco.com.br/img/6834.jpg", "categoria": 0, "categoriaNome": "Outras", "sexo": "Masculina", "tipo": "Adulta", "criadoEm": "2025-05-22 11:40:13" },
    { "nome": "Abelha", "_id": 2, "img": 2, "imgUrl": "https://www.passalaco.com.br/img/2.jpg", "categoria": 0, "categoriaNome": "Outras", "sexo": "Feminina", "tipo": "Adulta", "criadoEm": "2025-05-22 11:40:13" },
    { "nome": "Bruxa Encantada", "_id": 1001, "img": 1001, "imgUrl": "https://placehold.co/280x300/AACCFF/333333?text=Bruxa", "categoria": 1, "categoriaNome": "Vitrine", "sexo": "Feminina", "tipo": "Adulta", "criadoEm": "2025-05-22 11:40:15" },
    { "nome": "Zorro", "_id": 1002, "img": 1002, "imgUrl": "https://placehold.co/280x300/FFCCAA/333333?text=Zorro", "categoria": 1, "categoriaNome": "Heróis", "sexo": "Masculina", "tipo": "Adulto", "criadoEm": "2025-05-22 11:40:18" },
    { "nome": "Abelha", "_id": 6675, "img": 6675, "imgUrl": "https://www.passalaco.com.br/img/6675.jpg", "categoria": 0, "categoriaNome": "Outras", "sexo": "Feminina", "tipo": "Infantil", "criadoEm": "2025-05-22 11:40:13" }
];

const costumeViewDataKey = 'costumeViewData';
const costumeImageClickDataKey = 'costumeImageClickData';

function getCostumeDataFromStorage(key, costumeId) {
    try {
        const dataStore = JSON.parse(localStorage.getItem(key)) || {};
        return dataStore[costumeId] || { count: 0, lastEventTime: 0 };
    } catch (e) {
        return { count: 0, lastEventTime: 0 };
    }
}

function handleCostumeEvent(key, costumeId) {
    let dataStore = {};
    const oneMinuteInMillis = 1 * 60 * 1000;
    const currentTime = Date.now();

    try {
        dataStore = JSON.parse(localStorage.getItem(key)) || {};
    } catch (e) {
        dataStore = {};
    }

    const entry = dataStore[costumeId] || { count: 0, lastEventTime: 0 };
    let currentCount = entry.count;

    if (currentTime - entry.lastEventTime > oneMinuteInMillis) {
        currentCount = entry.count + 1;
        dataStore[costumeId] = { count: currentCount, lastEventTime: currentTime };
        try {
            localStorage.setItem(key, JSON.stringify(dataStore));
        } catch (e) {
            // armazenamento cheio ou bloqueado: segue sem contar
        }
    }
    return currentCount;
}

// --- Formatação ---

const numberFormat = new Intl.NumberFormat('pt-BR');

function displayName(fantasia) {
    return fantasia.nome === '.' ? 'Sem nome' : fantasia.nome;
}

// "N/A" no catálogo agrupa casais, acessórios e mascotes
function displayValue(value) {
    return value === 'N/A' ? 'Outros' : value;
}

function pluralFantasias(n) {
    return `${numberFormat.format(n)} ${n === 1 ? 'fantasia' : 'fantasias'}`;
}

// minúsculas, sem acentos e sem pontuação: "Mamãe Noel!" → "mamae noel"
function normalizeText(text) {
    return (text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, ' ').trim();
}

// Casa termos no início de palavras (evita "iara" dentro de "tiara")
function textHasTerm(normalizedText, term) {
    return (' ' + normalizedText).includes(' ' + term);
}

// Palavra (ou expressão) inteira: "boto" não casa com "botas"
function textHasWord(normalizedText, term) {
    return (' ' + normalizedText + ' ').includes(' ' + term + ' ');
}

const CATEGORY_EMOJI = {
    'Acessórios': '👑', 'Adultos': '🎭', 'Animais': '🦁', 'Anos 60 e 70': '🕺', 'Árabes/Indianas': '🧞',
    'Bebês': '🍼', 'Carnaval': '🎉', 'Casais': '💑', 'Ciganas/Espanholas': '💃', 'Circo': '🎪',
    'Cleopatras e Faraós': '🏺', 'Coroação': '👼', 'Cosplay': '🎮', 'Danças': '🩰', 'Fadas/Duendes': '🧚',
    'Filmes/TV': '🎬', 'Gregas/Romanos': '🏛️', 'Halloween': '🎃', 'Halloween Adulto': '🧛',
    'Halloween Infantil': '👻', 'Infantis': '🧸', 'Juninas': '🌽', 'Máscaras': '🎭', 'Mascotes': '🐻',
    'Mesversario': '🎂', 'Modelos': '✨', 'Natalinas': '🎄', 'Outras': '🎁', 'Paises': '🌎',
    'Personagens': '📚', 'Piratas': '🏴‍☠️', 'Plus Size': '💖', 'Princesas/Principes': '👸',
    'Profissões': '👩‍🚒', 'Roupas de Época': '🎩', 'Super-heróis': '🦸', 'Vitrine': '⭐'
};

function categoryEmoji(cat) {
    return CATEGORY_EMOJI[cat] || '🎈';
}

// --- Análise visual (output/analises.json, gerado por scripts/build_analises.py) ---

let analises = {};
const searchTextById = new Map(); // nome + análise, normalizados
const themeTextById = new Map();  // só o tema descrito, normalizado

function indexSearchText() {
    searchTextById.clear();
    themeTextById.clear();
    fantasias.forEach(f => {
        const a = analises[f._id];
        if (a && a.t) themeTextById.set(f._id, normalizeText(a.t));
        const parts = [f.nome === '.' ? '' : f.nome];
        if (a) parts.push(a.t, ...(a.c || []), ...(a.p || []), ...(a.a || []), a.m);
        searchTextById.set(f._id, normalizeText(parts.join(' ')));
    });
}

// Busca na descrição: todas as palavras do termo precisam aparecer
function analysisMatches(fantasia, searchTerm) {
    const words = normalizeText(searchTerm).split(' ').filter(w => w.length >= 3);
    if (!words.length) return false;
    const text = searchTextById.get(fantasia._id) || '';
    return words.every(w => textHasTerm(text, w));
}

// ==========================================================================
// Datas comemorativas do Brasil que movimentam o aluguel de fantasias.
// Cada uma tem a data do evento e uma janela (dias antes/depois) em que
// aparece em destaque na página inicial.
// ==========================================================================

function easterDate(year) {
    // Algoritmo de Meeus/Jones/Butcher (calendário gregoriano)
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

const SEASONS = [
    {
        id: 'carnaval', title: 'Carnaval', emoji: '🎉', event: 'Carnaval',
        date: y => addDays(easterDate(y), -47), before: 50, after: 1,
        categories: ['Carnaval'], terms: ['carnaval', 'folia'], themeTerms: ['carnaval'],
        colors: ['#ff2d87', '#8b3dff', '#ffb800']
    },
    {
        id: 'pascoa', title: 'Páscoa', emoji: '🐰', event: 'Páscoa',
        date: y => easterDate(y), before: 25, after: 0,
        categories: [], terms: ['coelho', 'coelha', 'coelhinho', 'coelhinha', 'pascoa'], themeTerms: ['pascoa'],
        colors: ['#ff8fc7', '#b48cff', '#7fd8ff']
    },
    {
        id: 'livro', title: 'Dia do Livro Infantil', emoji: '📚', event: 'Dia Nacional do Livro Infantil',
        date: y => new Date(y, 3, 18), before: 20, after: 0,
        categories: [], terms: ['emilia', 'visconde', 'sitio do picapau', 'chapeuzinho', 'alice', 'pinoquio', 'peter pan', 'cinderela', 'branca de neve'],
        colors: ['#00a86b', '#ffcc00', '#ff6b35']
    },
    {
        id: 'coroacao', title: 'Coroação de Nossa Senhora', emoji: '👼', event: 'Coroação (mês de Maria)',
        date: y => new Date(y, 4, 31), before: 30, after: 0,
        categories: ['Coroação'], terms: ['anjo', 'anjinho', 'anjinha', 'coroacao', 'nossa senhora'], themeTerms: ['coroacao', 'nossa senhora'],
        colors: ['#5ab4ff', '#a7d8ff', '#f5c542']
    },
    {
        id: 'junina', title: 'Festa Junina', emoji: '🌽', event: 'São João',
        date: y => new Date(y, 5, 24), before: 45, after: 37,
        categories: ['Juninas'], terms: ['junina', 'julina', 'caipira', 'sao joao'], themeTerms: ['festa junina', 'sao joao'],
        colors: ['#ff4d2e', '#ffb300', '#2e9e3e']
    },
    {
        id: 'folclore', title: 'Dia do Folclore', emoji: '🌿', event: 'Dia do Folclore',
        date: y => new Date(y, 7, 22), before: 25, after: 0,
        categories: [], terms: ['saci', 'cuca', 'iara', 'curupira', 'boitata', 'mula sem cabeca', 'boto', 'caipora', 'lobisomem'],
        themeTerms: ['folclore brasileiro'],
        colors: ['#1f9d55', '#ff8a00', '#c0392b']
    },
    {
        id: 'primavera', title: 'Festa da Primavera', emoji: '🌸', event: 'Início da primavera',
        date: y => new Date(y, 8, 22), before: 21, after: 7,
        categories: ['Fadas/Duendes'], terms: ['primavera', 'borboleta', 'joaninha', 'abelha', 'flor', 'florzinha', 'girassol'], themeTerms: ['primavera'],
        colors: ['#ff6fae', '#7ed957', '#ffd23f']
    },
    {
        id: 'criancas', title: 'Dia das Crianças', emoji: '🧸', event: 'Dia das Crianças',
        date: y => new Date(y, 9, 12), before: 20, after: 0,
        categories: ['Super-heróis', 'Princesas/Principes', 'Personagens'], terms: [], tipo: 'Infantil',
        colors: ['#1e88e5', '#ffca28', '#ef5350']
    },
    {
        id: 'halloween', title: 'Halloween', emoji: '🎃', event: 'Dia das Bruxas',
        date: y => new Date(y, 9, 31), before: 30, after: 2,
        categories: ['Halloween', 'Halloween Adulto', 'Halloween Infantil'],
        terms: ['halloween', 'bruxa', 'bruxo', 'vampiro', 'vampira', 'zumbi', 'caveira', 'fantasma', 'abobora'],
        themeTerms: ['halloween', 'dia das bruxas'],
        colors: ['#ff7a00', '#8e24aa', '#2b1055']
    },
    {
        id: 'natal', title: 'Natal', emoji: '🎄', event: 'Natal',
        date: y => new Date(y, 11, 25), before: 40, after: 1,
        categories: ['Natalinas'], terms: ['natal', 'natalino', 'natalina', 'papai noel', 'mamae noel', 'noel', 'rena'],
        themeTerms: ['natal', 'natalino', 'natalina', 'papai noel'],
        colors: ['#d62828', '#2e9e3e', '#f7b801']
    }
];

const VITRINE_SEASON = {
    id: '', title: 'Vitrine', emoji: '⭐', event: '', categories: ['Vitrine'], terms: [],
    colors: ['#d1262d', '#ff7a00', '#ffc400']
};

function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Próxima ocorrência da data (este ano ou o próximo), considerando a janela
function seasonOccurrence(season, today) {
    for (const year of [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1]) {
        const date = season.date(year);
        const end = addDays(date, season.after);
        if (end >= today) {
            const start = addDays(date, -season.before);
            return { season, date, start, end, active: start <= today, daysUntil: Math.round((date - today) / DAY_MS) };
        }
    }
    return null;
}

function getSeasonCalendar(now = new Date()) {
    const today = startOfDay(now);
    const occurrences = SEASONS.map(s => seasonOccurrence(s, today)).filter(Boolean)
        .sort((a, b) => a.date - b.date);
    // Em destaque: a data ativa mais próxima (ainda por vir, ou a que acabou de passar)
    const active = occurrences.filter(o => o.active)
        .sort((a, b) => (a.daysUntil < 0) - (b.daysUntil < 0) || Math.abs(a.daysUntil) - Math.abs(b.daysUntil));
    const upcoming = occurrences.filter(o => !active.includes(o));
    return { active, upcoming };
}

function getSeason(id) {
    return SEASONS.find(s => s.id === id) || null;
}

function fantasiaInSeason(fantasia, season) {
    if (season.tipo && fantasia.tipo !== season.tipo) return false;
    if (season.categories.includes(fantasia.categoriaNome)) return true;
    const name = normalizeText(fantasia.nome);
    if (season.terms.some(term => textHasWord(name, term))) return true;
    // O tema descrito pela análise só conta com termos específicos (é mais amplo que o nome)
    const theme = themeTextById.get(fantasia._id);
    return !!theme && (season.themeTerms || []).some(term => textHasWord(theme, term));
}

// Embaralhamento estável no dia: muda a cada dia, mas não a cada recarga
function dailyShuffle(items, salt = '') {
    const today = new Date();
    let seed = Number(`${today.getFullYear()}${today.getMonth() + 1}${today.getDate()}`);
    for (const ch of salt) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const random = () => {
        seed = (seed + 0x6D2B79F5) >>> 0;
        let t = seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

const monthFormat = new Intl.DateTimeFormat('pt-BR', { month: 'long' });
const shortDateFormat = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' });

function daysLabel(days) {
    if (days === 0) return 'é hoje!';
    if (days === 1) return 'é amanhã';
    if (days < 0) return days === -1 ? 'foi ontem' : `foi há ${-days} dias`;
    return `em ${days} dias`;
}

// --- Carregamento ---

function renderSkeleton() {
    costumeContainer.innerHTML = '';
    for (let i = 0; i < 12; i++) {
        const card = document.createElement('div');
        card.className = 'card skeleton';
        card.setAttribute('aria-hidden', 'true');
        card.innerHTML = '<span class="card-media"></span><span class="card-body"><span class="skeleton-line"></span><span class="skeleton-line short"></span></span>';
        costumeContainer.appendChild(card);
    }
    resultsCountContainer.textContent = 'Carregando catálogo…';
}

async function fetchAnalises() {
    try {
        const response = await fetch('output/analises.json');
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.warn('Análises indisponíveis; seguindo sem descrições:', error);
        return {};
    }
}

async function fetchFantasias() {
    renderSkeleton();
    // A análise chega em paralelo; se demorar, a página abre sem ela e a incorpora depois
    const analisesPromise = fetchAnalises();
    try {
        const response = await fetch('output/fantasias.json');
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
        }
        const lastModified = response.headers.get('Last-Modified');
        if (lastModified) {
            const formatted = new Date(lastModified).toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            document.getElementById('catalogoAtualizadoEm').textContent = `Catálogo atualizado em ${formatted}`;
        }
        fantasias = await response.json();
    } catch (error) {
        console.warn('Falha ao carregar fantasias do arquivo JSON, usando dados de fallback:', error);
        fantasias = fallbackFantasias;
    }
    const timeout = new Promise(resolve => setTimeout(() => resolve(null), 2000));
    const early = await Promise.race([analisesPromise, timeout]);
    if (early) analises = early;
    indexSearchText();
    initializeApp();
    if (!early) {
        analises = await analisesPromise;
        indexSearchText();
    }
}

// --- Cards ---

function createCostumeCard(fantasia) {
    const name = displayName(fantasia);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'card';
    card.dataset.fantasiaId = fantasia._id;
    card.innerHTML = `
        <span class="card-media">
            <img alt="" decoding="async">
            <span class="card-id"></span>
            <span class="media-placeholder" hidden>Imagem não disponível</span>
        </span>
        <span class="card-body">
            <span class="card-title"></span>
            <span class="card-meta"></span>
        </span>`;

    const img = card.querySelector('img');
    const placeholder = card.querySelector('.media-placeholder');
    img.dataset.src = fantasia.imgUrl;
    img.alt = name;
    card.querySelector('.card-id').textContent = `#${fantasia._id}`;
    card.querySelector('.card-title').textContent = name;

    // Categoria só aparece quando não é a categoria que já está aberta
    const meta = [displayValue(fantasia.sexo), displayValue(fantasia.tipo)];
    if (!state.categoria) meta.unshift(fantasia.categoriaNome);
    card.querySelector('.card-meta').textContent = meta.join(' · ');
    card.setAttribute('aria-label', `${name}, código ${fantasia._id}`);

    img.onload = () => {
        img.classList.add('loaded');
        handleCostumeEvent(costumeViewDataKey, fantasia._id);
    };
    img.onerror = () => {
        img.hidden = true;
        placeholder.hidden = false;
    };

    card.addEventListener('click', () => openCostumeSheet(fantasia, card.querySelector('.card-media')));
    return card;
}

function setupImageObserver(cardsToObserve) {
    if (imageObserver) imageObserver.disconnect();
    imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const img = entry.target.querySelector('img[data-src]');
            if (img && !img.src) img.src = img.dataset.src;
            observer.unobserve(entry.target);
        });
    }, { rootMargin: '200px 0px', threshold: 0.01 });
    cardsToObserve.forEach(cardEl => imageObserver.observe(cardEl));
}

// --- Filtros ---

function createSegmentedControl(container, items, allLabel, key) {
    container.innerHTML = '';
    [{ value: '', label: allLabel }, ...items.map(v => ({ value: v, label: displayValue(v) }))].forEach(({ value, label }) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('role', 'radio');
        button.dataset.value = value;
        button.textContent = label;
        button.addEventListener('click', () => {
            if (state[key] === value) return;
            state[key] = value;
            state.pagina = 1;
            render();
        });
        container.appendChild(button);
    });
}

function syncSegmentedControl(container, value) {
    container.querySelectorAll('button').forEach(button => {
        button.setAttribute('aria-checked', String(button.dataset.value === value));
    });
}

function populateFilters() {
    const sexos = [...new Set(fantasias.map(f => f.sexo).filter(Boolean))].sort();
    const tipos = [...new Set(fantasias.map(f => f.tipo).filter(Boolean))].sort();
    createSegmentedControl(filterSexoContainer, sexos, 'Todos', 'sexo');
    createSegmentedControl(filterTipoContainer, tipos, 'Todas', 'tipo');
}

function populateSidebar() {
    // Vitrine (destaques da loja) vem logo depois de "Todas"
    const isVitrine = cat => cat.toLowerCase() === 'vitrine';
    const categoriasUnicas = [...new Set(fantasias.map(f => f.categoriaNome).filter(Boolean))]
        .sort((a, b) => (isVitrine(b) - isVitrine(a)) || a.localeCompare(b, 'pt-BR'));

    sidebarCategoryList.innerHTML = '';
    const addItem = (key, emoji, label, onClick) => {
        const li = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'cat-item';
        button.dataset.cat = key;
        button.innerHTML = '<span class="cat-emoji" aria-hidden="true"></span><span class="cat-name"></span><span class="cat-count"></span>';
        button.querySelector('.cat-emoji').textContent = emoji;
        button.querySelector('.cat-name').textContent = label;
        button.addEventListener('click', onClick);
        li.appendChild(button);
        sidebarCategoryList.appendChild(li);
    };
    addItem('#inicio', '🏠', 'Início', goHome);
    addItem('', '🎈', 'Todas', () => selectCategory(''));
    categoriasUnicas.forEach(cat => addItem(cat, categoryEmoji(cat), cat, () => selectCategory(cat)));
}

function selectCategory(cat) {
    if (state.view === 'catalog' && state.categoria === cat && !state.tema) return;
    state.view = 'catalog';
    state.categoria = cat;
    state.tema = '';
    state.pagina = 1;
    render();
    scrollToResults();
}

function openSeason(id) {
    resetAllFilterStates();
    state.view = 'catalog';
    state.tema = id;
    render();
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
}

function goHome() {
    if (state.view === 'home') {
        window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
        return;
    }
    resetAllFilterStates();
    state.view = 'home';
    render();
    window.scrollTo({ top: 0 });
}

function updateSidebar(baseFiltered) {
    const catCounts = new Map();
    baseFiltered.forEach(f => {
        catCounts.set(f.categoriaNome, (catCounts.get(f.categoriaNome) || 0) + 1);
    });

    let activeEl = null;
    sidebarCategoryList.querySelectorAll('.cat-item').forEach(button => {
        const cat = button.dataset.cat;
        if (cat === '#inicio') {
            button.querySelector('.cat-count').textContent = '';
            if (state.view === 'home') {
                button.setAttribute('aria-current', 'true');
                activeEl = button;
            } else {
                button.removeAttribute('aria-current');
            }
            return;
        }
        const count = cat === '' ? baseFiltered.length : (catCounts.get(cat) || 0);
        button.querySelector('.cat-count').textContent = numberFormat.format(count);
        const isActive = state.view === 'catalog' && !state.tema && cat === state.categoria;
        button.disabled = count === 0 && !isActive;
        if (isActive) {
            button.setAttribute('aria-current', 'true');
            activeEl = button;
        } else {
            button.removeAttribute('aria-current');
        }
    });

    // Na fileira horizontal (celular), mantém o chip ativo à vista
    if (activeEl && sidebarCategoryList.scrollWidth > sidebarCategoryList.clientWidth) {
        const li = activeEl.parentElement;
        const left = li.offsetLeft - (sidebarCategoryList.clientWidth - li.offsetWidth) / 2;
        sidebarCategoryList.scrollTo({ left, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    }
}

// A categoria já tem seu próprio controle ("Todas"); "Limpar filtros" cuida do resto
function hasActiveFilters() {
    return !!(state.sexo || state.tipo || state.busca || state.ordem !== 'default');
}

function syncControls() {
    if (document.activeElement !== searchNomeInput) searchNomeInput.value = state.busca;
    searchClearButton.hidden = !searchNomeInput.value;
    syncSegmentedControl(filterSexoContainer, state.sexo);
    syncSegmentedControl(filterTipoContainer, state.tipo);
    sortSelect.value = state.ordem === 'name' ? `name-${state.dir}` : state.ordem;
    sortSelect.querySelector('option[value="default"]').textContent = state.busca ? 'Relevância' : 'Ordem padrão';
    clearFiltersButton.hidden = !hasActiveFilters();
}

function resetAllFilterStates({ keepCategory = false } = {}) {
    Object.assign(state, { sexo: '', tipo: '', busca: '', pagina: 1, ordem: 'default', dir: 'asc' });
    if (!keepCategory) {
        state.categoria = '';
        state.tema = '';
    }
    searchNomeInput.value = '';
}

// --- Paginação ---

function createPaginationControls(container, totalItems, page) {
    container.innerHTML = '';
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return;

    const pageButton = (pageNum, label, { disabled = false, ariaLabel } = {}) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'page-btn';
        button.textContent = label ?? pageNum;
        button.disabled = disabled;
        if (ariaLabel) button.setAttribute('aria-label', ariaLabel);
        if (pageNum === page && label === undefined) button.setAttribute('aria-current', 'page');
        button.addEventListener('click', () => {
            if (button.disabled || pageNum === state.pagina) return;
            state.pagina = pageNum;
            render();
            scrollToResults();
        });
        return button;
    };
    const ellipsis = () => {
        const span = document.createElement('span');
        span.className = 'page-ellipsis';
        span.textContent = '…';
        return span;
    };

    container.appendChild(pageButton(page - 1, '‹', { disabled: page === 1, ariaLabel: 'Página anterior' }));
    const maxPagesToShow = 5; let startPageNum = 1; let endPageNum = totalPages;
    if (totalPages > maxPagesToShow) {
        const pagesBefore = Math.floor((maxPagesToShow - 3) / 2);
        const pagesAfter = Math.ceil((maxPagesToShow - 3) / 2);
        if (page <= pagesBefore + 1) endPageNum = maxPagesToShow - 1;
        else if (page >= totalPages - pagesAfter) startPageNum = totalPages - maxPagesToShow + 2;
        else { startPageNum = page - pagesBefore; endPageNum = page + pagesAfter; }
    }
    if (startPageNum > 1) {
        container.appendChild(pageButton(1));
        if (startPageNum > 2) container.appendChild(ellipsis());
    }
    for (let i = Math.max(1, startPageNum); i <= Math.min(endPageNum, totalPages); i++) {
        container.appendChild(pageButton(i));
    }
    if (endPageNum < totalPages) {
        if (endPageNum < totalPages - 1) container.appendChild(ellipsis());
        container.appendChild(pageButton(totalPages));
    }
    container.appendChild(pageButton(page + 1, '›', { disabled: page === totalPages, ariaLabel: 'Próxima página' }));
}

function scrollToResults() {
    // No celular a fileira de categorias também fica presa no topo
    const stickyHeight = document.getElementById('topbar').offsetHeight +
        (stackedLayout.matches ? document.getElementById('categorySidebar').offsetHeight : 0);
    const top = mainContent.getBoundingClientRect().top + window.scrollY - stickyHeight;
    if (window.scrollY > top) {
        window.scrollTo({ top, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    }
}

// --- URL ---

function getFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);
    const filters = {
        tema: getSeason(params.get('tema')) ? params.get('tema') : '',
        categoria: params.get('categoria') || '',
        // URLs antigas aceitavam lista separada por vírgula; usamos o primeiro valor
        sexo: (params.get('sexo') || '').split(',')[0],
        tipo: (params.get('tipo') || '').split(',')[0],
        busca: params.get('busca') || '',
        pagina: parseInt(params.get('pagina'), 10) || 1,
        ordem: params.get('ordem') || 'default',
        dir: params.get('dir') || 'asc'
    };
    const hasFilters = filters.tema || filters.categoria || filters.sexo || filters.tipo || filters.busca || filters.ordem !== 'default';
    filters.view = hasFilters || params.get('ver') === 'todas' ? 'catalog' : 'home';
    return filters;
}

function updateURLFromState(mode) {
    const params = new URLSearchParams();
    if (state.tema) params.set('tema', state.tema);
    if (state.categoria) params.set('categoria', state.categoria);
    if (state.sexo) params.set('sexo', state.sexo);
    if (state.tipo) params.set('tipo', state.tipo);
    if (state.busca) params.set('busca', state.busca);
    if (state.pagina > 1) params.set('pagina', state.pagina);
    if (state.ordem !== 'default') {
        params.set('ordem', state.ordem);
        if (state.ordem === 'name') params.set('dir', state.dir);
    }
    if (state.view === 'catalog' && ![...params.keys()].length) params.set('ver', 'todas');
    const newQueryString = params.toString();
    if (newQueryString === window.location.search.substring(1)) return;
    const newURL = `${window.location.pathname}${newQueryString ? '?' + newQueryString : ''}`;
    history[mode === 'replace' ? 'replaceState' : 'pushState']({ filters: { ...state } }, '', newURL);
}

// --- Busca por similaridade ---

function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = [];
    for (let i = 0; i <= m; i++) {
        dp[i] = [i];
        for (let j = 1; j <= n; j++) dp[i][j] = i === 0 ? j : 0;
    }
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

function phoneticNormalize(word) {
    let s = word.toLowerCase();
    s = s.replace(/ç/g, 's');
    s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    // Dígrafos portugueses (antes das regras simples)
    s = s.replace(/ch/g, 'x');        // cachorro → caxorro, chapeuzinho → xapeuzinho
    s = s.replace(/lh/g, 'l');        // lhama → lama
    s = s.replace(/nh/g, 'n');        // nhoque → noque
    s = s.replace(/ph/g, 'f');        // sophia → sofia
    s = s.replace(/th/g, 't');        // catherine → caterine
    s = s.replace(/ck/g, 'k');
    s = s.replace(/gh/g, 'g');
    // Equivalências fonéticas do português
    s = s.replace(/g([ei])/g, 'j$1'); // girafa → jirafa, gelo → jelo
    s = s.replace(/j/g, 'j');
    s = s.replace(/qu([ei])/g, 'k$1');// quero → kero
    s = s.replace(/qu([ao])/g, 'kw$1');
    s = s.replace(/c([ei])/g, 's$1'); // cena → sena
    s = s.replace(/c([^h]|$)/g, 'k$1'); // ca/co/cu → ka/ko/ku
    s = s.replace(/z/g, 's');         // zero → sero (z e s soam igual em muitos contextos)
    s = s.replace(/ss/g, 's');
    s = s.replace(/rr/g, 'r');
    s = s.replace(/y/g, 'i');         // yara → iara
    s = s.replace(/w/g, 'v');         // wendy → vendy
    s = s.replace(/(.)\1+/g, '$1');   // letras duplas
    return s;
}

function wordMatches(nameWord, termWord) {
    if (nameWord === termWord) return true;
    if (nameWord.startsWith(termWord)) return true;
    const np = phoneticNormalize(nameWord);
    const tp = phoneticNormalize(termWord);
    if (np === tp) return true;
    if (termWord.length < 4) return false;
    const t = Math.ceil(termWord.length / 3);
    if (Math.abs(nameWord.length - termWord.length) <= t && levenshtein(nameWord, termWord) <= t) return true;
    if (Math.abs(np.length - tp.length) <= t && levenshtein(np, tp) <= t) return true;
    return false;
}

function getSimilarityScore(nome, searchTerm) {
    if (!searchTerm) return 0;
    const nameLower = nome === '.' ? 'sem nome' : nome.toLowerCase();
    const term = searchTerm.toLowerCase();

    if (nameLower === term) return 100;
    if (nameLower.startsWith(term)) return 90;
    if (nameLower.includes(term)) return 75;

    const nameWords = nameLower.split(/\s+/);
    const termWords = term.split(/\s+/);

    // Multi-word: cada palavra do termo deve casar com alguma palavra do nome
    if (termWords.length > 1) {
        const allMatch = termWords.every(tw => nameWords.some(nw => wordMatches(nw, tw)));
        if (allMatch) {
            const exactCount = termWords.filter(tw => nameWords.includes(tw)).length;
            return Math.round(65 + (exactCount / termWords.length) * 10);
        }
    }

    // Single word: fonética exata por palavra
    const termPhonetic = phoneticNormalize(term);
    for (const word of nameWords) {
        if (phoneticNormalize(word) === termPhonetic) return 70;
    }

    if (term.length < 4) return 0;
    const threshold = Math.ceil(term.length / 3);
    let minDist = Infinity;

    for (const word of nameWords) {
        if (Math.abs(word.length - term.length) <= threshold) {
            const d = levenshtein(word, term);
            if (d < minDist) minDist = d;
        }
        const wp = phoneticNormalize(word);
        if (Math.abs(wp.length - termPhonetic.length) <= threshold) {
            const d = levenshtein(wp, termPhonetic);
            if (d < minDist) minDist = d;
        }
    }

    if (minDist > threshold) return 0;
    return Math.max(0, Math.round(70 - minDist * 15));
}

// --- Página inicial ---

const TILE_COLORS = ['#ff5a5f', '#ff9f1c', '#f7c600', '#2ec4b6', '#3a86ff', '#8338ec', '#ff006e', '#2e9e3e'];

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function setSeasonColors(node, season) {
    season.colors.forEach((color, i) => node.style.setProperty(`--c${i + 1}`, color));
}

// Bandeirinhas de festa nas cores do tema
function buntingSVG(colors) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'bunting');
    svg.setAttribute('viewBox', '0 0 600 34');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    const palette = [...colors, '#ffffff', '#ffd23f', '#3a86ff'];
    const rope = document.createElementNS(svgNS, 'path');
    rope.setAttribute('d', 'M0 4 Q300 16 600 4');
    rope.setAttribute('class', 'bunting-rope');
    svg.appendChild(rope);
    for (let i = 0; i < 20; i++) {
        const x = i * 30 + 3;
        const sag = 4 + 12 * (1 - Math.pow((x + 12 - 300) / 300, 2)) * 0.5;
        const flag = document.createElementNS(svgNS, 'path');
        flag.setAttribute('d', `M${x} ${sag} L${x + 24} ${sag} L${x + 12} ${sag + 22} Z`);
        flag.setAttribute('fill', palette[i % palette.length]);
        svg.appendChild(flag);
    }
    return svg;
}

function buildRail(items, cards, className = '') {
    const rail = el('div', `rail ${className}`.trim());
    items.forEach(fantasia => {
        const card = createCostumeCard(fantasia);
        cards.push(card);
        rail.appendChild(card);
    });
    return withRailArrows(rail);
}

// Setas para quem usa mouse (no toque, o trilho já desliza com o dedo)
function withRailArrows(rail) {
    const wrap = el('div', 'rail-wrap');
    wrap.appendChild(rail);
    [['prev', '‹', 'Anteriores', -1], ['next', '›', 'Próximas', 1]].forEach(([name, symbol, label, dir]) => {
        const button = el('button', `rail-arrow rail-${name}`, symbol);
        button.type = 'button';
        button.setAttribute('aria-label', label);
        button.tabIndex = -1;
        button.addEventListener('click', () => rail.scrollBy({
            left: dir * rail.clientWidth * 0.8,
            behavior: reducedMotion.matches ? 'auto' : 'smooth'
        }));
        wrap.appendChild(button);
    });
    const sync = () => {
        wrap.classList.toggle('at-start', rail.scrollLeft <= 4);
        wrap.classList.toggle('at-end', rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4);
    };
    rail.addEventListener('scroll', sync, { passive: true });
    requestAnimationFrame(sync);
    return wrap;
}

function seasonItems(season) {
    return fantasias.filter(f => fantasiaInSeason(f, season));
}

// Vitrine primeiro (curadoria da loja), depois o resto embaralhado no dia
function pickRailItems(items, salt, limit = 16) {
    const vitrine = items.filter(f => f.categoriaNome === 'Vitrine');
    const others = items.filter(f => f.categoriaNome !== 'Vitrine');
    return [...dailyShuffle(vitrine, salt), ...dailyShuffle(others, salt)].slice(0, limit);
}

function buildHero(occurrence, cards) {
    const season = occurrence ? occurrence.season : VITRINE_SEASON;
    const items = seasonItems(season);
    const hero = el('section', 'hero');
    setSeasonColors(hero, season);
    hero.appendChild(buntingSVG(season.colors));

    const text = el('div', 'hero-text');
    const month = monthFormat.format(new Date());
    text.appendChild(el('p', 'hero-eyebrow', occurrence ? `Em alta em ${month}` : 'Destaques da loja'));
    const title = el('h2', 'hero-title', `${season.title} `);
    title.appendChild(el('span', 'hero-emoji', season.emoji));
    text.appendChild(title);
    const sub = occurrence
        ? `${occurrence.season.event} ${daysLabel(occurrence.daysUntil)} · ${pluralFantasias(items.length)}`
        : pluralFantasias(items.length);
    text.appendChild(el('p', 'hero-sub', sub));
    const cta = el('button', 'hero-cta', 'Ver todas');
    cta.type = 'button';
    cta.addEventListener('click', () => occurrence ? openSeason(season.id) : selectCategory('Vitrine'));
    text.appendChild(cta);
    hero.appendChild(text);

    hero.appendChild(buildRail(pickRailItems(items, season.id || 'vitrine'), cards, 'hero-rail'));
    return hero;
}

function buildSection(titleText, actionLabel, onAction) {
    const section = el('section', 'home-section');
    const head = el('div', 'section-head');
    head.appendChild(el('h2', 'section-title', titleText));
    if (actionLabel) {
        const action = el('button', 'btn-plain', actionLabel);
        action.type = 'button';
        action.addEventListener('click', onAction);
        head.appendChild(action);
    }
    section.appendChild(head);
    return section;
}

function buildDateCard(occurrence, isNow) {
    const { season } = occurrence;
    const card = el('button', 'date-card');
    card.type = 'button';
    setSeasonColors(card, season);
    card.appendChild(el('span', 'date-emoji', season.emoji));
    card.appendChild(el('span', 'date-title', season.title));
    const when = isNow ? 'Agora' : `${shortDateFormat.format(occurrence.date).replace('.', '')} · ${daysLabel(occurrence.daysUntil)}`;
    card.appendChild(el('span', 'date-when', when));
    card.appendChild(el('span', 'date-count', pluralFantasias(seasonItems(season).length)));
    card.addEventListener('click', () => openSeason(season.id));
    return card;
}

function renderHome() {
    homeView.innerHTML = '';
    const cards = [];
    const { active, upcoming } = getSeasonCalendar();
    const featured = active[0] || null;

    homeView.appendChild(buildHero(featured, cards));

    const dates = buildSection('Datas comemorativas');
    const datesRail = el('div', 'rail dates-rail');
    active.slice(1).forEach(o => datesRail.appendChild(buildDateCard(o, true)));
    upcoming.slice(0, 6).forEach(o => datesRail.appendChild(buildDateCard(o, false)));
    dates.appendChild(withRailArrows(datesRail));
    homeView.appendChild(dates);

    if (featured) {
        const vitrineItems = fantasias.filter(f => f.categoriaNome === 'Vitrine');
        if (vitrineItems.length) {
            const vitrine = buildSection('⭐ Vitrine', 'Ver tudo', () => selectCategory('Vitrine'));
            vitrine.appendChild(buildRail(dailyShuffle(vitrineItems, 'vitrine').slice(0, 16), cards));
            homeView.appendChild(vitrine);
        }
    }

    const categories = buildSection('Categorias', 'Ver todas as fantasias', () => selectCategory(''));
    const tiles = el('div', 'tiles');
    [...sidebarCategoryList.querySelectorAll('.cat-item')]
        .map(button => button.dataset.cat)
        .filter(cat => cat && cat !== '#inicio')
        .forEach((cat, i) => {
            const tile = el('button', 'tile');
            tile.type = 'button';
            tile.style.setProperty('--tile', TILE_COLORS[i % TILE_COLORS.length]);
            tile.appendChild(el('span', 'tile-emoji', categoryEmoji(cat)));
            tile.appendChild(el('span', 'tile-name', cat.replace(/\//g, '/​'))); // quebra após "/"
            tile.appendChild(el('span', 'tile-count', pluralFantasias(fantasias.filter(f => f.categoriaNome === cat).length)));
            tile.addEventListener('click', () => selectCategory(cat));
            tiles.appendChild(tile);
        });
    categories.appendChild(tiles);
    homeView.appendChild(categories);

    const surprise = el('button', 'surprise');
    surprise.type = 'button';
    surprise.appendChild(el('span', 'surprise-dice', '🎲'));
    const surpriseText = el('span', 'surprise-text');
    surpriseText.appendChild(el('strong', '', 'Está sem ideia?'));
    surpriseText.appendChild(el('span', '', 'Deixe a sorte escolher uma fantasia para você.'));
    surprise.appendChild(surpriseText);
    surprise.addEventListener('click', () => openRandomCostume(surprise.querySelector('.surprise-dice')));
    homeView.appendChild(surprise);

    setupImageObserver(cards);
}

// --- Renderização ---

function render({ history: historyMode = 'push' } = {}) {
    const isHome = state.view === 'home';
    homeView.hidden = !isHome;
    catalogView.hidden = isHome;
    if (isHome) {
        renderHome();
        updateSidebar(fantasias);
        syncControls();
        if (historyMode !== 'none') updateURLFromState(historyMode);
        return;
    }

    const searchTerm = state.busca.toLowerCase().trim();
    const season = getSeason(state.tema);

    // Busca + sexo + tipo: base para as contagens das categorias
    const scoreMap = new Map();
    const baseFiltered = fantasias.filter(fantasia => {
        if (searchTerm) {
            let score = getSimilarityScore(fantasia.nome, searchTerm);
            if (score <= 50 && String(fantasia._id).includes(searchTerm)) score = 55;
            // Também encontra pela descrição da foto: cores, peças, tema
            if (score <= 50 && analysisMatches(fantasia, searchTerm)) score = 52;
            if (score <= 50) return false;
            scoreMap.set(fantasia._id, score);
        }
        if (state.sexo && fantasia.sexo !== state.sexo) return false;
        if (state.tipo && fantasia.tipo !== state.tipo) return false;
        return true;
    });

    const filtered = baseFiltered.filter(f =>
        (!state.categoria || f.categoriaNome === state.categoria) &&
        (!season || fantasiaInSeason(f, season)));

    if (state.ordem === 'name') {
        filtered.sort((a, b) => {
            const nameA = a.nome === '.' ? 'zzzzzz' : a.nome.toLowerCase();
            const nameB = b.nome === '.' ? 'zzzzzz' : b.nome.toLowerCase();
            const cmp = nameA.localeCompare(nameB, 'pt-BR');
            return state.dir === 'asc' ? cmp : -cmp;
        });
    } else if (state.ordem === 'views') {
        filtered.sort((a, b) =>
            getCostumeDataFromStorage(costumeViewDataKey, b._id).count -
            getCostumeDataFromStorage(costumeViewDataKey, a._id).count);
    } else if (searchTerm) {
        filtered.sort((a, b) => (scoreMap.get(b._id) || 0) - (scoreMap.get(a._id) || 0));
    }

    const totalFilteredItems = filtered.length;
    const totalPages = Math.ceil(totalFilteredItems / itemsPerPage);
    state.pagina = Math.max(1, Math.min(state.pagina, totalPages || 1));
    const startIndex = (state.pagina - 1) * itemsPerPage;
    const itemsForCurrentPage = filtered.slice(startIndex, startIndex + itemsPerPage);

    costumeContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const cards = itemsForCurrentPage.map(createCostumeCard);
    cards.forEach(card => fragment.appendChild(card));
    costumeContainer.appendChild(fragment);
    setupImageObserver(cards);
    noResultsMessage.hidden = totalFilteredItems > 0;

    if (searchTerm) pageTitle.textContent = `Resultados para “${state.busca.trim()}”`;
    else if (season) pageTitle.textContent = `${season.title} ${season.emoji}`;
    else if (state.categoria) pageTitle.textContent = `${state.categoria} ${categoryEmoji(state.categoria)}`;
    else pageTitle.textContent = 'Todas as fantasias';
    pageEyebrow.textContent = season ? 'Data comemorativa' : 'Aluguel de fantasias';
    catalogView.style.setProperty('--season-a', (season || VITRINE_SEASON).colors[0]);
    catalogView.style.setProperty('--season-b', (season || VITRINE_SEASON).colors[1]);

    let countText = pluralFantasias(totalFilteredItems);
    if (searchTerm && (state.categoria || season)) countText += ` em ${state.categoria || season.title}`;
    if (totalPages > 1) countText += ` · página ${state.pagina} de ${totalPages}`;
    resultsCountContainer.textContent = countText;

    updateSidebar(baseFiltered);
    syncControls();
    createPaginationControls(paginationContainer, totalFilteredItems, state.pagina);
    if (historyMode !== 'none') updateURLFromState(historyMode);
}

// Coalesce várias teclas no mesmo quadro, sem atraso artificial.
// A primeira tecla cria uma entrada no histórico; as seguintes a substituem.
let pendingSearchFrame = 0;
let searchHistoryPushed = false;
function scheduleSearchRender() {
    cancelAnimationFrame(pendingSearchFrame);
    const historyMode = searchHistoryPushed ? 'replace' : 'push';
    pendingSearchFrame = requestAnimationFrame(() => {
        render({ history: historyMode });
        searchHistoryPushed = true;
    });
}

// ==========================================================================
// Movimento: molas com os parâmetros da Apple (damping ratio + response).
// Sempre partem do valor atual e preservam a velocidade, então qualquer
// animação pode ser interrompida e redirecionada a qualquer momento.
// ==========================================================================

function createSpring(onUpdate) {
    let value = 0;
    let velocity = 0;
    let target = 0;
    let damping = 1;
    let response = 0.4;
    let frame = 0;
    let lastTime = 0;
    let onRest = null;

    function step(now) {
        const dt = Math.min(0.064, (now - lastTime) / 1000);
        lastTime = now;
        const stiffness = Math.pow(2 * Math.PI / response, 2);
        const friction = 4 * Math.PI * damping / response;
        const substeps = Math.max(1, Math.ceil(dt / 0.004));
        const h = dt / substeps;
        for (let i = 0; i < substeps; i++) {
            const acceleration = -stiffness * (value - target) - friction * velocity;
            velocity += acceleration * h;
            value += velocity * h;
        }
        if (Math.abs(velocity) < 0.01 && Math.abs(value - target) < 0.001) {
            value = target;
            velocity = 0;
            frame = 0;
            onUpdate(value);
            const callback = onRest;
            onRest = null;
            if (callback) callback();
            return;
        }
        onUpdate(value);
        frame = requestAnimationFrame(step);
    }

    return {
        get value() { return value; },
        to(nextTarget, options = {}) {
            target = nextTarget;
            damping = options.damping ?? 1;
            response = options.response ?? 0.4;
            if (options.velocity !== undefined) velocity = options.velocity;
            onRest = options.onRest || null;
            if (!frame) {
                lastTime = performance.now();
                frame = requestAnimationFrame(step);
            }
        },
        set(nextValue) {
            cancelAnimationFrame(frame);
            frame = 0;
            onRest = null;
            value = nextValue;
            velocity = 0;
            onUpdate(value);
        }
    };
}

// Projeção de momento da Apple (Designing Fluid Interfaces): onde o gesto vai parar
function project(initialVelocity, decelerationRate = 0.998) {
    return (initialVelocity / 1000) * decelerationRate / (1 - decelerationRate);
}

// Resistência progressiva nos limites
function rubberband(overshoot, dimension, constant = 0.55) {
    return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

function clamp01(v) {
    return Math.min(1, Math.max(0, v));
}

// --- Folha de detalhes ---

// progresso 0 = fechada, 1 = aberta
const sheetSpring = createSpring(renderSheet);
let sheetMode = 'dialog';
let sheetHeight = 0;
let sheetIsOpen = false;
let sheetReturnFocus = null;
let sheetRandomMode = false;

function renderSheet(p) {
    sheetScrim.style.opacity = clamp01(p);
    if (reducedMotion.matches) {
        sheet.style.transform = 'none';
        sheet.style.opacity = clamp01(p);
    } else if (sheetMode === 'sheet') {
        sheet.style.transform = `translate3d(0, ${(1 - p) * sheetHeight}px, 0)`;
        sheet.style.opacity = '';
    } else {
        sheet.style.transform = `scale(${0.86 + 0.14 * p})`;
        sheet.style.opacity = clamp01(p);
    }
}

function measureSheet(sourceEl) {
    sheetMode = compactLayout.matches ? 'sheet' : 'dialog';
    costumeModal.dataset.mode = sheetMode;
    const previous = sheet.style.transform;
    sheet.style.transform = 'none';
    const rect = sheet.getBoundingClientRect();
    sheet.style.transform = previous;
    sheetHeight = rect.height;

    // O diálogo nasce de onde veio o toque (card ou botão)
    if (sheetMode === 'dialog' && sourceEl) {
        const src = sourceEl.getBoundingClientRect();
        const originX = src.left + src.width / 2 - rect.left;
        const originY = src.top + src.height / 2 - rect.top;
        sheet.style.transformOrigin = `${originX}px ${originY}px`;
    } else {
        sheet.style.transformOrigin = '';
    }
}

const COLOR_SWATCHES = {
    'preto': '#1d1d1f', 'branco': '#ffffff', 'vermelho': '#e53935', 'amarelo': '#fdd835', 'azul': '#1e88e5',
    'dourado': '#d4af37', 'verde': '#43a047', 'rosa': '#f48fb1', 'marrom': '#8d6e63', 'bege': '#e8d5b5',
    'laranja': '#fb8c00', 'roxo': '#8e24aa', 'prata': '#c0c0c0', 'cinza': '#9e9e9e', 'azul claro': '#81d4fa',
    'azul marinho': '#1a237e', 'azul royal': '#2a4bd7', 'vinho': '#7b1e3a', 'verde escuro': '#1b5e20',
    'lilas': '#c8a2c8', 'rosa choque': '#ff1493', 'nude': '#e3bc9a', 'creme': '#f8f0d0', 'verde claro': '#a5d6a7',
    'turquesa': '#40e0d0', 'salmao': '#fa8072', 'bordo': '#800020', 'cobre': '#b87333', 'off white': '#f8f8f0',
    'verde limao': '#c6ff00', 'azul turquesa': '#30c5d2', 'rosa claro': '#ffc1d9', 'lilás': '#c8a2c8',
    'colorido': 'multi', 'multicolorido': 'multi'
};

function colorSwatch(name) {
    const key = normalizeText(name);
    return COLOR_SWATCHES[key] || COLOR_SWATCHES[key.split(' ')[0]] || null;
}

function capitalize(text) {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function fillSheetAnalysis(analysis) {
    const a = analysis || {};
    const modalDescricao = document.getElementById('modalDescricao');
    const modalCores = document.getElementById('modalCores');
    const modalItens = document.getElementById('modalItens');

    modalDescricao.textContent = capitalize(a.t || '');
    modalDescricao.hidden = !a.t;

    modalCores.innerHTML = '';
    (a.c || []).forEach(color => {
        const chip = el('li', 'color-chip');
        const dot = el('span', 'color-dot');
        const swatch = colorSwatch(color);
        if (swatch === 'multi') dot.classList.add('multi');
        else if (swatch) dot.style.background = swatch;
        else dot.classList.add('unknown');
        chip.appendChild(dot);
        chip.appendChild(document.createTextNode(color));
        modalCores.appendChild(chip);
    });
    modalCores.hidden = !(a.c && a.c.length);

    document.getElementById('modalMaterial').textContent = capitalize(a.m || '');
    document.getElementById('modalMaterialRow').hidden = !a.m;
    document.getElementById('modalCorte').textContent = capitalize(a.e || '');
    document.getElementById('modalCorteRow').hidden = !a.e;

    // Peças e acessórios juntos, sem repetir
    const seen = new Set();
    const itens = [...(a.p || []), ...(a.a || [])].filter(item => {
        const key = normalizeText(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    modalItens.innerHTML = '';
    itens.forEach(item => modalItens.appendChild(el('li', 'item-chip', item)));
    document.getElementById('modalItensSection').hidden = !itens.length;}

function fillSheet(fantasia) {
    const name = displayName(fantasia);
    const viewInfo = getCostumeDataFromStorage(costumeViewDataKey, fantasia._id);
    const clickCount = handleCostumeEvent(costumeImageClickDataKey, fantasia._id);

    modalImage.classList.remove('loaded');
    modalImage.hidden = false;
    modalImagePlaceholder.hidden = true;
    modalImage.onload = () => modalImage.classList.add('loaded');
    modalImage.onerror = () => {
        modalImage.hidden = true;
        modalImagePlaceholder.hidden = false;
    };
    modalImage.src = fantasia.imgUrl;
    modalImage.alt = name;
    sheetMedia.style.setProperty('--media-image', `url("${fantasia.imgUrl}")`);

    modalCategoria.textContent = fantasia.categoriaNome;
    modalName.textContent = name;
    modalId.textContent = `#${fantasia._id}`;
    modalSexo.textContent = displayValue(fantasia.sexo);
    modalTipo.textContent = displayValue(fantasia.tipo);
    fillSheetAnalysis(analises[fantasia._id]);
    modalViewCount.textContent = `${numberFormat.format(viewInfo.count)} ${viewInfo.count === 1 ? 'visualização' : 'visualizações'}`;
    modalClickCount.textContent = `${numberFormat.format(clickCount)} ${clickCount === 1 ? 'clique na foto' : 'cliques na foto'}`;
}

function openCostumeSheet(fantasia, sourceEl, { random = false } = {}) {
    fillSheet(fantasia);
    sheetRandomMode = random;
    sheetAnotherButton.hidden = !random;

    if (!sheetIsOpen) sheetReturnFocus = document.activeElement;
    const wasHidden = costumeModal.hidden;
    costumeModal.hidden = false;
    document.documentElement.classList.add('sheet-open');
    measureSheet(sourceEl);
    if (wasHidden) sheetSpring.set(0);

    sheetIsOpen = true;
    sheetSpring.to(1, { damping: 1, response: sheetMode === 'sheet' ? 0.4 : 0.35 });
    modalCloseButton.focus({ preventScroll: true });
}

function closeCostumeSheet(velocity) {
    if (!sheetIsOpen) return;
    sheetIsOpen = false;
    sheetSpring.to(0, {
        damping: 1,
        response: 0.35,
        velocity,
        onRest: () => {
            costumeModal.hidden = true;
            document.documentElement.classList.remove('sheet-open');
            modalImage.removeAttribute('src');
            if (sheetReturnFocus && sheetReturnFocus.isConnected) sheetReturnFocus.focus({ preventScroll: true });
            sheetReturnFocus = null;
        }
    });
}

function openRandomCostume(sourceEl) {
    if (!fantasias.length) return;
    const randomCostume = fantasias[Math.floor(Math.random() * fantasias.length)];
    openCostumeSheet(randomCostume, sourceEl, { random: true });
}

// Arrastar a folha (celular): acompanha o dedo 1:1, solta com momento
let sheetDrag = null;

function setupSheetDrag() {
    sheet.addEventListener('pointerdown', event => {
        if (sheetMode !== 'sheet' || reducedMotion.matches) return;
        if (event.button !== 0 || event.target.closest('button, .sheet-details')) return;
        sheetSpring.set(sheetSpring.value); // agarra do valor atual, mesmo no meio da animação
        sheetIsOpen = true;
        try { sheet.setPointerCapture(event.pointerId); } catch (e) { /* ponteiro já liberado */ }
        sheetDrag = {
            pointerId: event.pointerId,
            startY: event.clientY,
            startProgress: sheetSpring.value,
            samples: [{ y: event.clientY, t: event.timeStamp }]
        };
    });

    sheet.addEventListener('pointermove', event => {
        if (!sheetDrag || event.pointerId !== sheetDrag.pointerId) return;
        const dy = event.clientY - sheetDrag.startY;
        let offset = (1 - sheetDrag.startProgress) * sheetHeight + dy; // px abaixo da posição aberta
        if (offset < 0) offset = -rubberband(-offset, sheetHeight);
        sheetSpring.set(1 - offset / sheetHeight);

        sheetDrag.samples.push({ y: event.clientY, t: event.timeStamp });
        while (sheetDrag.samples.length > 2 && event.timeStamp - sheetDrag.samples[0].t > 100) {
            sheetDrag.samples.shift();
        }
    });

    const endDrag = event => {
        if (!sheetDrag || event.pointerId !== sheetDrag.pointerId) return;
        const samples = sheetDrag.samples;
        sheetDrag = null;
        const first = samples[0];
        const last = samples[samples.length - 1];
        const dt = (last.t - first.t) / 1000;
        const velocityY = dt > 0 ? (last.y - first.y) / dt : 0; // px/s, positivo = para baixo

        const offset = (1 - sheetSpring.value) * sheetHeight;
        const projectedOffset = offset + project(velocityY);
        const progressVelocity = -velocityY / sheetHeight;

        const flickDown = velocityY > 500;
        const flickUp = velocityY < -500;
        if (flickDown || (!flickUp && projectedOffset > sheetHeight * 0.5)) {
            closeCostumeSheet(progressVelocity);
        } else {
            sheetIsOpen = true;
            sheetSpring.to(1, { damping: 0.8, response: 0.3, velocity: progressVelocity });
        }
    };
    sheet.addEventListener('pointerup', endDrag);
    sheet.addEventListener('pointercancel', endDrag);
}

function trapFocus(event) {
    if (event.key !== 'Tab' || costumeModal.hidden) return;
    const focusables = [...sheet.querySelectorAll('button:not([hidden])')];
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}

// --- Inicialização ---

function setupScrollEdge() {
    const sentinel = document.getElementById('scrollSentinel');
    new IntersectionObserver(([entry]) => {
        document.body.classList.toggle('is-scrolled', !entry.isIntersecting);
    }).observe(sentinel);
}

function initializeApp() {
    populateFilters();
    populateSidebar();
    Object.assign(state, getFiltersFromURL());
    render({ history: 'none' });
    history.replaceState({ filters: { ...state } }, '', window.location.href);
    searchNomeInput.placeholder = stackedLayout.matches ? 'Buscar' : 'Buscar por nome, código ou cor';

    document.querySelector('.brand').addEventListener('click', event => {
        event.preventDefault();
        goHome();
    });

    searchNomeInput.addEventListener('input', () => {
        state.busca = searchNomeInput.value;
        state.pagina = 1;
        if (state.busca.trim()) {
            state.view = 'catalog';
            state.categoria = '';
            state.tema = '';
        }
        searchClearButton.hidden = !searchNomeInput.value;
        scheduleSearchRender();
    });
    searchNomeInput.addEventListener('blur', () => { searchHistoryPushed = false; });
    searchNomeInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') searchNomeInput.blur();
        if (event.key === 'Escape' && searchNomeInput.value) {
            event.preventDefault();
            searchClearButton.click();
        }
    });
    searchClearButton.addEventListener('click', () => {
        searchNomeInput.value = '';
        state.busca = '';
        state.pagina = 1;
        render();
        searchNomeInput.focus();
    });

    sortSelect.addEventListener('change', () => {
        const [ordem, dir] = sortSelect.value.split('-');
        state.ordem = ordem;
        state.dir = dir || 'asc';
        state.pagina = 1;
        render();
    });

    clearFiltersButton.addEventListener('click', () => { resetAllFilterStates({ keepCategory: true }); render(); });
    emptyClearButton.addEventListener('click', () => { resetAllFilterStates(); render(); });

    randomSearchButton.addEventListener('click', () => openRandomCostume(randomSearchButton));
    sheetAnotherButton.addEventListener('click', () => openRandomCostume(null));

    modalCloseButton.addEventListener('click', () => closeCostumeSheet());
    sheetScrim.addEventListener('click', () => closeCostumeSheet());
    setupSheetDrag();

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && sheetIsOpen) closeCostumeSheet();
        trapFocus(event);
        // "/" leva direto à busca
        if (event.key === '/' && document.activeElement !== searchNomeInput && costumeModal.hidden) {
            event.preventDefault();
            searchNomeInput.focus();
            searchNomeInput.select();
        }
    });

    window.addEventListener('resize', () => {
        if (costumeModal.hidden) return;
        measureSheet(null);
        renderSheet(sheetSpring.value);
    });

    window.addEventListener('popstate', event => {
        const filters = (event.state && event.state.filters) || getFiltersFromURL();
        Object.assign(state, filters);
        searchNomeInput.value = state.busca;
        render({ history: 'none' });
    });

    setupScrollEdge();
}

document.addEventListener('DOMContentLoaded', fetchFantasias);
