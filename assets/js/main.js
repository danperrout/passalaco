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
    dir: 'asc',
    fantasia: ''      // código da fantasia aberta na folha de detalhes
};

// Raiz do site (/passalaco/ no GitHub Pages); cada fantasia tem o endereço fixo <raiz>f/<código>/
const appRoot = new URL('./', window.location.href).pathname;

// Dados da loja (loja.json, aplicado no index.html por scripts/build_site.py)
const LOJA = Object.assign({ nome: 'Catálogo de fantasias', nomeCurto: '', whatsapp: '', mensagemWhatsapp: '', categorias: {} }, window.LOJA);

// "De para" de categorias (loja.json): o catálogo de origem traz alguns nomes sem acento
function fixCategory(name) {
    return LOJA.categorias[name] || name;
}
const baseTitle = document.title;
// Fixa o ícone num endereço absoluto antes de a URL mudar para f/<código>/
document.querySelectorAll('link[rel~="icon"]').forEach(link => { link.href = link.href; });

// Slug do nome só para o link ficar legível; quem identifica a fantasia é o código
// (mesma regra de slugify() em scripts/build_site.py)
function slugify(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function costumePath(fantasia) {
    const slug = fantasia.nome === '.' ? '' : slugify(fantasia.nome);
    return `${appRoot}f/${fantasia._id}${slug ? '-' + slug : ''}/`;
}

function costumeURL(fantasia) {
    return new URL(costumePath(fantasia), window.location.origin).href;
}

// Conversa no WhatsApp da loja já com o código, o nome e o link da fantasia
function whatsappLink(fantasia) {
    const fields = { codigo: fantasia._id, nome: displayName(fantasia), link: costumeURL(fantasia) };
    const text = LOJA.mensagemWhatsapp.replace(/\{(\w+)\}/g, (match, key) => key in fields ? fields[key] : match);
    return `https://wa.me/${LOJA.whatsapp}?text=${encodeURIComponent(text)}`;
}

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
const sheetShareButton = document.getElementById('sheetShareButton');
const whatsappButton = document.getElementById('whatsappButton');
const mediaTrack = document.getElementById('mediaTrack');
const mediaDots = document.getElementById('mediaDots');
const mediaPrev = document.querySelector('.media-prev');
const mediaNext = document.querySelector('.media-next');
const videoJumpButton = document.getElementById('videoJumpButton');
const zoomButton = document.getElementById('zoomButton');
const viewer = document.getElementById('viewer');
const viewerBackdrop = document.getElementById('viewerBackdrop');
const viewerStage = document.getElementById('viewerStage');
const viewerImage = document.getElementById('viewerImage');
const viewerClose = document.getElementById('viewerClose');
const toast = document.getElementById('toast');
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
    'Cleópatras e Faraós': '🏺', 'Coroação': '👼', 'Cosplay': '🎮', 'Danças': '🩰', 'Fadas/Duendes': '🧚',
    'Filmes/TV': '🎬', 'Gregas/Romanos': '🏛️', 'Halloween': '🎃', 'Halloween Adulto': '🧛',
    'Halloween Infantil': '👻', 'Infantis': '🧸', 'Juninas': '🌽', 'Máscaras': '🎭', 'Mascotes': '🐻',
    'Mesversário': '🎂', 'Modelos': '✨', 'Natalinas': '🎄', 'Outras': '🎁', 'Países': '🌎',
    'Personagens': '📚', 'Piratas': '🏴‍☠️', 'Plus Size': '💖', 'Princesas/Príncipes': '👸',
    'Profissões': '👩‍🚒', 'Roupas de Época': '🎩', 'Super-heróis': '🦸', 'Vitrine': '⭐'
};

function categoryEmoji(cat) {
    return CATEGORY_EMOJI[cat] || '🎈';
}

// --- Análise visual (output/analises.json, gerado por scripts/build_analises.py) ---

let analises = {};
let videos = {}; // videos.json: código da fantasia → links do Instagram/Facebook
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
        categories: ['Super-heróis', 'Princesas/Príncipes', 'Personagens'], terms: [], tipo: 'Infantil',
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

async function fetchVideos() {
    try {
        const response = await fetch('videos.json');
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        const data = await response.json();
        // Aceita um link ou uma lista de links por fantasia
        const result = {};
        Object.entries(data).forEach(([id, links]) => {
            const embeds = [].concat(links).map(videoEmbed).filter(Boolean);
            if (embeds.length) result[id] = embeds;
        });
        return result;
    } catch (error) {
        console.warn('Vídeos indisponíveis:', error);
        return {};
    }
}

async function fetchFantasias() {
    renderSkeleton();
    // A análise chega em paralelo; se demorar, a página abre sem ela e a incorpora depois
    const analisesPromise = fetchAnalises();
    const videosPromise = fetchVideos();
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
        fantasias.forEach(f => { f.categoriaNome = fixCategory(f.categoriaNome); });
    } catch (error) {
        console.warn('Falha ao carregar fantasias do arquivo JSON, usando dados de fallback:', error);
        fantasias = fallbackFantasias;
    }
    videos = await videosPromise;
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
    // Link de verdade: abre em nova aba, copia o endereço e pode ser indexado
    const card = document.createElement('a');
    card.href = costumePath(fantasia);
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
    if (videos[fantasia._id]) {
        // ▶ quando tem vídeo; ícone de várias fotos quando são só posts
        const hasVideo = videos[fantasia._id].some(v => v.video);
        const badge = el('span', 'card-video');
        badge.innerHTML = hasVideo
            ? '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.8v8.4L10 6z"/></svg>'
            : '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3.5 1h6A1.5 1.5 0 0 1 11 2.5v6A1.5 1.5 0 0 1 9.5 10h-6A1.5 1.5 0 0 1 2 8.5v-6A1.5 1.5 0 0 1 3.5 1ZM1 3.5v6A1.5 1.5 0 0 0 2.5 11h6" fill="none" stroke="#fff" stroke-width="1.2"/></svg>';
        badge.title = hasVideo ? 'Tem vídeo' : 'Tem mais fotos';
        card.querySelector('.card-media').appendChild(badge);
    }
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

    card.addEventListener('click', event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        openCostumeSheet(fantasia, card.querySelector('.card-media'));
    });
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
        li.dataset.order = sidebarCategoryList.children.length; // ordem original
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

// --- Reordenação animada das categorias (FLIP com molas) ---
// Categorias sem resultado descem para o fim da lista. Cada item sai de onde
// está na tela e desliza até o novo lugar; se o filtro mudar no meio do
// caminho, ele continua do ponto atual sem perder a velocidade.

const sidebarItemSprings = new WeakMap();
let sidebarOrderReady = false;

function sidebarSprings(li) {
    let springs = sidebarItemSprings.get(li);
    if (!springs) {
        const offset = { x: 0, y: 0 };
        const apply = () => {
            li.style.transform = offset.x || offset.y ? `translate3d(${offset.x}px, ${offset.y}px, 0)` : '';
        };
        // X e Y independentes: a lista é vertical no desktop e horizontal no celular
        springs = {
            x: createSpring(v => { offset.x = v; apply(); }, { restDelta: 0.1 }),
            y: createSpring(v => { offset.y = v; apply(); }, { restDelta: 0.1 })
        };
        sidebarItemSprings.set(li, springs);
    }
    return springs;
}

function reorderSidebar() {
    const animate = sidebarOrderReady; // a primeira ordenação (ao abrir a página) não anima
    sidebarOrderReady = true;
    const items = [...sidebarCategoryList.children];
    const rank = li => {
        const button = li.firstElementChild;
        if (button.dataset.cat === '#inicio' || button.dataset.cat === '') return 0; // fixos no topo
        return button.disabled ? 2 : 1;
    };
    const desired = items.slice().sort((a, b) => rank(a) - rank(b) || a.dataset.order - b.dataset.order);
    if (desired.every((li, i) => li === items[i])) return;

    // First: posição de layout atual (a parte animada fica na mola)
    const before = new Map(items.map(li => [li, { left: li.offsetLeft, top: li.offsetTop, visible: !!li.offsetParent }]));

    // Last: aplica a nova ordem
    desired.forEach(li => sidebarCategoryList.appendChild(li));
    if (!animate) return;

    // Invert + Play: desloca o referencial e deixa a mola levar até zero
    desired.forEach(li => {
        const old = before.get(li);
        const springs = sidebarSprings(li);
        if (reducedMotion.matches || !old.visible || !li.offsetParent) {
            springs.x.set(0);
            springs.y.set(0);
            return;
        }
        const dx = old.left - li.offsetLeft;
        const dy = old.top - li.offsetTop;
        if (!dx && !dy) return;
        springs.x.shift(dx);
        springs.y.shift(dy);
        springs.x.to(0, { damping: 1, response: 0.45 });
        springs.y.to(0, { damping: 1, response: 0.45 });
    });
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

    reorderSidebar();

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
        // Links antigos com o nome sem acento continuam funcionando
        categoria: fixCategory(params.get('categoria') || ''),
        // URLs antigas aceitavam lista separada por vírgula; usamos o primeiro valor
        sexo: (params.get('sexo') || '').split(',')[0],
        tipo: (params.get('tipo') || '').split(',')[0],
        busca: params.get('busca') || '',
        pagina: parseInt(params.get('pagina'), 10) || 1,
        ordem: params.get('ordem') || 'default',
        dir: params.get('dir') || 'asc',
        fantasia: params.get('fantasia') || (window.location.pathname.match(/\/f\/(\d+)[^/]*\/?(?:index\.html)?$/) || [])[1] || ''
    };
    const hasFilters = filters.tema || filters.categoria || filters.sexo || filters.tipo || filters.busca || filters.ordem !== 'default';
    filters.view = hasFilters || params.get('ver') === 'todas' ? 'catalog' : 'home';
    return filters;
}

function urlFromState() {
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
    const query = params.toString();
    const fantasia = state.fantasia && findFantasia(state.fantasia);
    return `${fantasia ? costumePath(fantasia) : appRoot}${query ? '?' + query : ''}`;
}

function updateURLFromState(mode) {
    const newURL = urlFromState();
    if (newURL === window.location.pathname + window.location.search) return;
    history[mode === 'replace' ? 'replaceState' : 'pushState']({ filters: { ...state } }, '', newURL);
}

// Tudo que define o catálogo por trás da folha (a fantasia aberta fica de fora)
function catalogKey(s) {
    return JSON.stringify([s.view, s.tema, s.categoria, s.sexo, s.tipo, s.busca, s.pagina, s.ordem, s.dir]);
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

// Fantasias com vídeo ou post (videos.json) vêm antes nas listas: é o que mais vende
function hasMedia(fantasia) {
    return Boolean(videos[fantasia._id]);
}

function mediaFirst(items) {
    return [...items.filter(hasMedia), ...items.filter(f => !hasMedia(f))];
}

// Com vídeo/post primeiro, depois a Vitrine (curadoria da loja), depois o resto embaralhado no dia
function pickRailItems(items, salt, limit = 16) {
    const media = items.filter(hasMedia);
    const rest = items.filter(f => !hasMedia(f));
    const vitrine = rest.filter(f => f.categoriaNome === 'Vitrine');
    const others = rest.filter(f => f.categoriaNome !== 'Vitrine');
    return [...dailyShuffle(media, salt), ...dailyShuffle(vitrine, salt), ...dailyShuffle(others, salt)].slice(0, limit);
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
            vitrine.appendChild(buildRail(mediaFirst(dailyShuffle(vitrineItems, 'vitrine')).slice(0, 16), cards));
            homeView.appendChild(vitrine);
        }
    }

    const categories = buildSection('Categorias', 'Ver todas as fantasias', () => selectCategory(''));
    const tiles = el('div', 'tiles');
    [...sidebarCategoryList.children]
        .sort((a, b) => a.dataset.order - b.dataset.order)
        .map(li => li.firstElementChild.dataset.cat)
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

// Como os cards novos entram, comparando com o que estava na tela:
// página seguinte vem da direita, anterior da esquerda, outro filtro sobe.
// Digitar na busca não anima (os resultados mudam a cada tecla).
let lastRendered = null;
function renderTransition() {
    const previous = lastRendered;
    lastRendered = { ...state };
    if (!previous || !fantasias.length) return null;
    if (previous.view !== state.view) return { dy: 18 };
    const changed = ['tema', 'categoria', 'sexo', 'tipo', 'ordem', 'dir'].some(key => previous[key] !== state[key]);
    if (changed) return { dy: 18 };
    if (previous.busca !== state.busca) return null;
    if (previous.pagina !== state.pagina) return { dx: state.pagina > previous.pagina ? 48 : -48 };
    return null;
}

function render({ history: historyMode = 'push' } = {}) {
    const isHome = state.view === 'home';
    const transition = renderTransition();
    homeView.hidden = !isHome;
    catalogView.hidden = isHome;
    if (isHome) {
        renderHome();
        if (transition) animateIn([...homeView.children], { ...transition, stagger: 50, max: 6 });
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
        // Com vídeo ou post, nome que contém a busca conta como resultado exato (vem antes)
        const rank = f => {
            const score = scoreMap.get(f._id) || 0;
            return hasMedia(f) && score >= 75 ? Math.max(score, 100) : score;
        };
        filtered.sort((a, b) => rank(b) - rank(a) || hasMedia(b) - hasMedia(a));
    } else {
        filtered.sort((a, b) => hasMedia(b) - hasMedia(a));
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
    if (transition) animateIn(cards, transition);
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

// restDelta: menor diferença perceptível (1 = progresso 0–1; para pixels use ~0.1)
function createSpring(onUpdate, { restDelta = 0.001 } = {}) {
    let value = 0;
    let velocity = 0;
    let target = 0;
    let damping = 1;
    let response = 0.4;
    let frame = 0;
    let lastTime = 0;
    let onRest = null;

    function step(now) {
        // O timestamp do quadro pode ser anterior ao momento em que a mola foi disparada
        const dt = Math.min(0.064, Math.max(0, (now - lastTime) / 1000));
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
        if (Math.abs(velocity) < restDelta * 10 && Math.abs(value - target) < restDelta) {
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
        },
        // Desloca o referencial sem mexer na velocidade (o elemento mudou de lugar no layout)
        shift(delta) {
            value += delta;
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

function lerp(a, b, t) {
    return a + (b - a) * t;
}

// A mesma mola criticamente amortecida, como curva CSS linear() para a Web Animations API
// (entradas que ninguém arrasta: cards de uma página nova)
const springTimingCache = new Map();
function springTiming(response) {
    if (springTimingCache.has(response)) return springTimingCache.get(response);
    const w = 2 * Math.PI / response;
    const rest = t => (1 + w * t) * Math.exp(-w * t); // quanto falta para chegar
    let duration = 0;
    while (duration < 3 && rest(duration) > 0.001) duration += 0.01;
    const points = [];
    for (let i = 0; i <= 32; i++) points.push((1 - rest(duration * i / 32)).toFixed(4));
    const linear = `linear(${points.join(', ')})`;
    const timing = {
        duration: Math.round(duration * 1000),
        easing: CSS.supports('animation-timing-function', linear) ? linear : 'cubic-bezier(0.2, 0.9, 0.3, 1)'
    };
    springTimingCache.set(response, timing);
    return timing;
}

// Elementos entram em cascata a partir de um deslocamento (dx/dy); só os primeiros, que estão à vista
function animateIn(elements, { dx = 0, dy = 0, stagger = 18, max = 24 } = {}) {
    if (!elements.length || !elements[0].animate) return;
    const timing = springTiming(0.45);
    const reduce = reducedMotion.matches;
    elements.slice(0, max).forEach((element, i) => {
        element.animate(reduce
            ? [{ opacity: 0 }, { opacity: 1 }]
            : [{ opacity: 0, transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.97)` }, { opacity: 1, transform: 'none' }], {
            duration: reduce ? 200 : timing.duration,
            easing: reduce ? 'ease' : timing.easing,
            delay: reduce ? 0 : Math.min(i * stagger, 240),
            fill: 'backwards'
        });
    });
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
    renderFlight(p);
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

// --- Foto que voa do card para a folha (e volta para o card ao fechar) ---
// Um clone da foto vai do retângulo do card ao lugar final da foto na folha,
// guiado pelo mesmo progresso da folha: chegam juntos e respondem juntos ao gesto.
let flight = null;
let sheetSource = null; // card de onde a folha saiu, para a foto voltar para ele

function cardImage(sourceEl) {
    const img = sourceEl && sourceEl.querySelector && sourceEl.querySelector('.card-media img, img');
    return img && img.classList.contains('loaded') && img.naturalWidth ? img : null;
}

// Retângulo final da foto na folha (sem o deslocamento da animação)
function finalSheetImageRect(ratio) {
    const previous = sheet.style.transform;
    sheet.style.transform = 'none';
    const box = modalImage.getBoundingClientRect();
    sheet.style.transform = previous;
    return containedRect(box, ratio);
}

function startFlight(sourceEl) {
    endFlight();
    const img = cardImage(sourceEl);
    if (!img || reducedMotion.matches) return;
    const from = sourceEl.getBoundingClientRect();
    if (from.bottom < 0 || from.top > window.innerHeight) return; // card fora da tela
    const ratio = img.naturalWidth / img.naturalHeight;
    const el = document.createElement('div');
    el.className = 'flight';
    const clone = document.createElement('img');
    clone.src = img.currentSrc || img.src;
    clone.alt = '';
    el.appendChild(clone);
    document.body.appendChild(el);
    flight = {
        el,
        cardImg: img,
        from: { x: from.left, y: from.top, w: from.width, h: from.height },
        to: finalSheetImageRect(ratio),
        radius: parseFloat(getComputedStyle(sourceEl).borderRadius) || 0
    };
    img.style.visibility = 'hidden';
    modalImage.classList.add('in-flight');
    renderFlight(sheetSpring.value);
}

function renderFlight(p) {
    if (!flight) return;
    const t = clamp01(p);
    const { from, to, el } = flight;
    el.style.width = `${lerp(from.w, to.w, t)}px`;
    el.style.height = `${lerp(from.h, to.h, t)}px`;
    el.style.transform = `translate3d(${lerp(from.x, to.x, t)}px, ${lerp(from.y, to.y, t)}px, 0)`;
    el.style.borderRadius = `${flight.radius * (1 - t)}px`;
}

function endFlight() {
    if (!flight) return;
    const { el, cardImg } = flight;
    flight = null;
    cardImg.style.visibility = '';
    const reveal = () => {
        modalImage.classList.remove('in-flight');
        el.remove();
    };
    // Mantém o clone até a foto da folha estar pronta, para não piscar
    if (!sheetIsOpen || modalImage.complete) reveal();
    else {
        modalImage.addEventListener('load', reveal, { once: true });
        modalImage.addEventListener('error', reveal, { once: true });
    }
}

// --- Sortear outra: o conteúdo sai para a esquerda e a nova fantasia entra pela direita ---
// Mola de -1 (à direita, entrando) a 1 (à esquerda, saindo); 0 = no lugar.
const sheetDetails = sheet.querySelector('.sheet-details');
let swapPending = null;
const swapSpring = createSpring(v => {
    sheet.style.setProperty('--swap-x', reducedMotion.matches ? '0px' : `${-v * 44}px`);
    sheet.style.setProperty('--swap-o', 1 - Math.min(1, Math.abs(v)));
    // Troca assim que o conteúdo antigo some, sem esperar a cauda da mola
    if (swapPending && v > 0.95) requestAnimationFrame(enterSwap);
}, { restDelta: 0.002 });

function enterSwap() {
    if (!swapPending) return;
    fillSheet(swapPending);
    swapPending = null;
    sheetDetails.scrollTop = 0;
    swapSpring.set(-1);
    swapSpring.to(0, {
        damping: 1,
        response: 0.4,
        onRest: () => sheet.classList.remove('swapping')
    });
}

function swapSheetTo(fantasia) {
    swapPending = fantasia;
    sheet.classList.add('swapping');
    // Interrompível: se a nova fantasia ainda estava entrando, sai a partir de onde está
    swapSpring.to(1, { damping: 1, response: 0.22 });
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
    document.getElementById('modalItensSection').hidden = !itens.length;
}

// --- Vídeos do Instagram e do Facebook ---
// Em videos.json basta o link do post/reel (o "embed" é montado aqui), mas também
// funciona colar o endereço do código de incorporação do Facebook.

// O Facebook desenha o player na largura pedida; o iframe tem a mesma largura (styles.css)
const FACEBOOK_VIDEO_WIDTH = 320;

function videoEmbed(link) {
    if (typeof link !== 'string') return null;
    let url;
    try {
        url = new URL(link.trim().replace(/&amp;/g, '&'));
    } catch (error) {
        return null;
    }
    const host = url.hostname.replace(/^www\.|^m\./, '');
    if (host === 'instagram.com') {
        const match = url.pathname.match(/\/(p|reels?|tv)\/([\w-]+)/);
        if (!match) return null;
        // /p/ é post (foto, carrossel ou vídeo); reel e tv são sempre vídeo
        const kind = match[1] === 'p' ? 'p' : 'reel';
        return { type: 'instagram', video: kind === 'reel', link: `https://www.instagram.com/${kind}/${match[2]}/`, src: `https://www.instagram.com/${kind}/${match[2]}/embed/` };
    }
    if (host === 'facebook.com' || host === 'fb.watch') {
        // Código de incorporação: o vídeo de verdade está no parâmetro href
        const target = url.pathname.startsWith('/plugins/') ? url.searchParams.get('href') : url.href;
        if (!target) return null;
        const src = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(target)}&show_text=false&width=${FACEBOOK_VIDEO_WIDTH}`;
        return { type: 'facebook', video: true, link: target, src };
    }
    return null;
}

// Tamanho natural de cada player; no carrossel ele é reduzido para caber no espaço da foto
const VIDEO_SIZES = { instagram: { w: 340, h: 640 }, facebook: { w: FACEBOOK_VIDEO_WIDTH, h: Math.round(FACEBOOK_VIDEO_WIDTH * 16 / 9) } };
let mediaIndex = 0;

// O slide da foto é fixo no HTML; vídeos e posts entram antes dele (aparecem primeiro)
const photoSlide = mediaTrack.firstElementChild;

function mediaSlides() {
    return [...mediaTrack.children];
}

function photoIndex() {
    return mediaSlides().indexOf(photoSlide);
}

function renderVideos(fantasia) {
    const list = (fantasia && videos[fantasia._id]) || [];
    mediaSlides().filter(slide => slide !== photoSlide).forEach(slide => slide.remove());
    list.forEach(video => {
        const slide = el('div', 'media-slide media-slide-video');
        const frame = document.createElement('iframe');
        frame.className = `video-frame video-${video.type}`;
        frame.dataset.src = video.src;
        frame.src = video.src;
        frame.title = video.type === 'instagram' ? (video.video ? 'Vídeo no Instagram' : 'Post do Instagram') : 'Vídeo no Facebook';
        frame.allow = 'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share';
        frame.allowFullscreen = true;
        frame.setAttribute('scrolling', 'no');
        frame.dataset.w = VIDEO_SIZES[video.type].w;
        frame.dataset.h = VIDEO_SIZES[video.type].h;
        slide.appendChild(frame);
        mediaTrack.insertBefore(slide, photoSlide);
    });
    mediaDots.innerHTML = '';
    if (list.length) {
        mediaSlides().forEach((slide, i) => {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'media-dot';
            dot.setAttribute('aria-label', slide === photoSlide ? 'Foto da fantasia' : `${list[i].video ? 'Vídeo' : 'Post'} ${i + 1} de ${list.length}`);
            dot.addEventListener('click', () => goToSlide(i));
            mediaDots.appendChild(dot);
        });
    }
    mediaDots.hidden = !list.length;
    // "Ver vídeo" se só há vídeos; com posts de foto, "Ver mais"
    videoJumpButton.querySelector('span').textContent = list.every(v => v.video) ? (list.length > 1 ? 'Ver vídeos' : 'Ver vídeo') : 'Ver mais';
    videoJumpButton.querySelector('svg').style.display = list.some(v => v.video) ? '' : 'none';
    mediaTrack.scrollLeft = 0;
    mediaIndex = 0;
    layoutVideos();
    // Abrindo a ficha: a área já nasce no tamanho certo, sem animar
    syncMediaControls({ instant: costumeModal.hidden });
}

// Reduz cada player (largura e altura naturais) para caber no slide, centralizado
function layoutVideos() {
    const slide = mediaTrack.firstElementChild;
    const w = slide.clientWidth;
    const h = slide.clientHeight;
    if (!w || !h) return;
    mediaTrack.querySelectorAll('.video-frame').forEach(frame => {
        const fw = +frame.dataset.w;
        const fh = +frame.dataset.h;
        const scale = Math.min(1, (w - 16) / fw, (h - 16) / fh);
        frame.style.width = `${fw}px`;
        frame.style.height = `${fh}px`;
        frame.style.transform = `translate(-50%, -50%) scale(${scale})`;
    });
}

function goToSlide(index) {
    const slides = mediaSlides();
    index = Math.max(0, Math.min(slides.length - 1, index));
    mediaTrack.scrollTo({ left: index * mediaTrack.clientWidth, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
}

// No celular a área da foto é baixa demais para um vídeo: cresce enquanto um vídeo
// está à vista e volta ao tamanho da foto depois (a altura anima no CSS)
let mediaResizeFrame = 0;
function syncMediaHeight({ instant = false } = {}) {
    const expand = mediaIndex !== photoIndex() && compactLayout.matches;
    if (sheetMedia.classList.contains('show-video') === expand) return;
    if (instant) {
        sheetMedia.style.transition = 'none';
        sheetMedia.classList.toggle('show-video', expand);
        sheetMedia.offsetHeight; // aplica a altura antes de devolver a transição
        sheetMedia.style.transition = '';
        layoutVideos();
        return;
    }
    sheetMedia.classList.toggle('show-video', expand);
    // Acompanha a transição: o player é redimensionado a cada quadro
    cancelAnimationFrame(mediaResizeFrame);
    const until = performance.now() + 450;
    const step = now => {
        layoutVideos();
        mediaTrack.scrollLeft = mediaIndex * mediaTrack.clientWidth;
        if (now < until) mediaResizeFrame = requestAnimationFrame(step);
    };
    mediaResizeFrame = requestAnimationFrame(step);
}

function syncMediaControls(options) {
    syncMediaHeight(options);
    const count = mediaSlides().length;
    [...mediaDots.children].forEach((dot, i) => dot.setAttribute('aria-current', i === mediaIndex ? 'true' : 'false'));
    const onPhoto = mediaIndex === photoIndex();
    zoomButton.hidden = !onPhoto || !modalImage.classList.contains('loaded');
    videoJumpButton.hidden = !onPhoto || count < 2;
    mediaPrev.hidden = count < 2 || mediaIndex === 0;
    mediaNext.hidden = count < 2 || mediaIndex === count - 1;
}

function onMediaScroll() {
    const index = Math.round(mediaTrack.scrollLeft / Math.max(1, mediaTrack.clientWidth));
    if (index === mediaIndex) return;
    // Saiu de um vídeo: recarrega o player para ele parar de tocar
    const previous = mediaSlides()[mediaIndex];
    const frame = previous && previous.querySelector('iframe');
    if (frame) frame.src = frame.dataset.src;
    mediaIndex = index;
    syncMediaControls();
}

// O Instagram avisa a altura do post por mensagem (é o que o embed.js oficial faz)
window.addEventListener('message', event => {
    if (!/^https:\/\/www\.instagram\.com$/.test(event.origin)) return;
    let data = event.data;
    try {
        if (typeof data === 'string') data = JSON.parse(data);
    } catch (error) {
        return;
    }
    if (!data || data.type !== 'MEASURE' || !data.details || !data.details.height) return;
    const frame = [...mediaTrack.querySelectorAll('iframe.video-instagram')].find(f => f.contentWindow === event.source);
    if (!frame || +frame.dataset.h === data.details.height) return;
    frame.dataset.h = data.details.height;
    layoutVideos();
});

function fillSheet(fantasia) {
    const name = displayName(fantasia);
    const viewInfo = getCostumeDataFromStorage(costumeViewDataKey, fantasia._id);
    const clickCount = handleCostumeEvent(costumeImageClickDataKey, fantasia._id);

    modalImage.classList.remove('loaded');
    modalImage.hidden = false;
    modalImagePlaceholder.hidden = true;
    zoomButton.hidden = true;
    modalImage.onload = () => {
        modalImage.classList.add('loaded');
        syncMediaControls();
    };
    modalImage.onerror = () => {
        modalImage.hidden = true;
        modalImagePlaceholder.hidden = false;
    };
    modalImage.src = fantasia.imgUrl;
    modalImage.alt = name;
    sheetMedia.style.setProperty('--media-image', `url("${fantasia.imgUrl}")`);

    modalCategoria.textContent = fantasia.categoriaNome;
    modalName.textContent = name;
    renderVideos(fantasia);
    whatsappButton.hidden = !LOJA.whatsapp;
    if (LOJA.whatsapp) whatsappButton.href = whatsappLink(fantasia);
    modalId.textContent = `#${fantasia._id}`;
    modalSexo.textContent = displayValue(fantasia.sexo);
    modalTipo.textContent = displayValue(fantasia.tipo);
    fillSheetAnalysis(analises[fantasia._id]);
    modalViewCount.textContent = `${numberFormat.format(viewInfo.count)} ${viewInfo.count === 1 ? 'visualização' : 'visualizações'}`;
    modalClickCount.textContent = `${numberFormat.format(clickCount)} ${clickCount === 1 ? 'clique na foto' : 'cliques na foto'}`;
}

// A folha tem endereço próprio: abrir cria uma entrada no histórico, e o
// "voltar" do navegador (ou do Android) fecha a folha
let sheetFantasia = null;
let sheetClosingFantasia = null;
let sheetHistoryPushed = false;

// Agarrou a folha enquanto ela fechava: ela volta a ser a fantasia aberta, com endereço
function reclaimSheet() {
    if (sheetIsOpen || !sheetClosingFantasia) return;
    sheetFantasia = sheetClosingFantasia;
    document.title = `${displayName(sheetFantasia)} — ${LOJA.nome}`;
    state.fantasia = String(sheetFantasia._id);
    updateURLFromState('push');
    sheetHistoryPushed = true;
}

function openCostumeSheet(fantasia, sourceEl, { random = false, history: historyMode } = {}) {
    const swapping = sheetIsOpen && !costumeModal.hidden;
    if (swapping) swapSheetTo(fantasia);
    else fillSheet(fantasia);
    sheetFantasia = fantasia;
    sheetRandomMode = random;
    sheetAnotherButton.hidden = !random;
    document.title = `${displayName(fantasia)} — ${LOJA.nome}`;
    state.fantasia = String(fantasia._id);
    const mode = historyMode || (sheetIsOpen ? 'replace' : 'push');
    if (mode !== 'none') {
        updateURLFromState(mode);
        if (mode === 'push') sheetHistoryPushed = true;
    }

    if (!sheetIsOpen) sheetReturnFocus = document.activeElement;
    const wasHidden = costumeModal.hidden;
    costumeModal.hidden = false;
    document.documentElement.classList.add('sheet-open');
    measureSheet(sourceEl);
    layoutVideos();
    if (wasHidden) sheetSpring.set(0);

    // A foto só voa quando a folha nasce de um card; ao sortear outra, o card já não corresponde
    // (com vídeo ou post, quem aparece primeiro é ele, e a foto não está à vista)
    sheetSource = !swapping && mediaIndex === photoIndex() && cardImage(sourceEl) ? sourceEl : null;
    if (wasHidden && sheetSource) startFlight(sheetSource);

    sheetIsOpen = true;
    sheetSpring.to(1, { damping: 1, response: sheetMode === 'sheet' ? 0.4 : 0.35, onRest: endFlight });
    modalCloseButton.focus({ preventScroll: true });
}

function closeCostumeSheet(velocity, { fromHistory = false } = {}) {
    if (!sheetIsOpen) return;
    sheetIsOpen = false;
    sheetClosingFantasia = sheetFantasia;
    sheetFantasia = null;
    if (viewerIsOpen) closeViewer({ fromHistory: true, instant: true });
    document.title = baseTitle;
    state.fantasia = '';
    if (!fromHistory) {
        // Volta para a entrada do catálogo em vez de empilhar outra
        if (sheetHistoryPushed) history.back();
        else updateURLFromState('replace');
    }
    sheetHistoryPushed = false;
    // Fechou pelo botão, Esc ou fundo (folha parada no lugar): a foto volta para o card.
    // Arrastando para baixo, a foto desce junto com a folha.
    endFlight();
    if (velocity === undefined && sheetSpring.value > 0.98 && mediaIndex === photoIndex() && sheetSource && sheetSource.isConnected) {
        startFlight(sheetSource);
    }
    sheetSource = null;
    sheetSpring.to(0, {
        damping: 1,
        response: 0.35,
        velocity,
        onRest: () => {
            endFlight();
            sheetClosingFantasia = null;
            costumeModal.hidden = true;
            document.documentElement.classList.remove('sheet-open');
            modalImage.removeAttribute('src');
            renderVideos(null); // para o vídeo que estiver tocando
            if (sheetReturnFocus && sheetReturnFocus.isConnected) sheetReturnFocus.focus({ preventScroll: true });
            sheetReturnFocus = null;
        }
    });
}

function findFantasia(id) {
    return fantasias.find(f => String(f._id) === String(id));
}

// Mostra a fantasia pedida pelo endereço (link compartilhado, voltar/avançar)
function syncSheetWithState() {
    const fantasia = state.fantasia && findFantasia(state.fantasia);
    if (fantasia) {
        if (sheetFantasia !== fantasia) {
            openCostumeSheet(fantasia, null, { history: 'none' });
            sheetHistoryPushed = true;
        }
    } else if (sheetIsOpen) {
        closeCostumeSheet(undefined, { fromHistory: true });
    }
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('visible'), 2000);
}

// Celular: folha de compartilhar do sistema (WhatsApp, Instagram…). Computador: copia o link.
async function shareCurrentCostume() {
    if (!sheetFantasia) return;
    const name = displayName(sheetFantasia);
    const url = costumeURL(sheetFantasia);
    const data = { title: `${name} — ${LOJA.nome}`, text: `Olha essa fantasia da ${LOJA.nomeCurto || LOJA.nome}: ${name}`, url };
    if (navigator.share && matchMedia('(pointer: coarse)').matches && (!navigator.canShare || navigator.canShare(data))) {
        try {
            await navigator.share(data);
            return;
        } catch (error) {
            if (error.name === 'AbortError') return;
        }
    }
    try {
        await navigator.clipboard.writeText(url);
        showToast('Link copiado');
    } catch (error) {
        window.prompt('Copie o link da fantasia:', url);
    }
}

function openRandomCostume(sourceEl) {
    if (!fantasias.length) return;
    const randomCostume = fantasias[Math.floor(Math.random() * fantasias.length)];
    openCostumeSheet(randomCostume, sourceEl, { random: true });
}

// Arrastar a folha (celular): acompanha o dedo 1:1, solta com momento
let sheetDrag = null;
let sheetDragDistance = 0; // distinguir toque na foto de arraste da folha

function setupSheetDrag() {
    sheet.addEventListener('pointerdown', event => {
        if (sheetMode !== 'sheet' || reducedMotion.matches) return;
        if (event.button !== 0 || event.target.closest('button, .sheet-details')) return;
        sheetSpring.set(sheetSpring.value); // agarra do valor atual, mesmo no meio da animação
        endFlight();
        reclaimSheet();
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
        const first = samples[0];
        const last = samples[samples.length - 1];
        sheetDragDistance = Math.abs(event.clientY - sheetDrag.startY);
        sheetDrag = null;
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

// --- Foto em tela cheia ---
// A foto cresce de onde está na folha até ocupar a tela e volta pelo mesmo caminho.
// Pinça e toque duplo (ou clique e roda do mouse) ampliam; arrastar move a foto
// ampliada; com a foto inteira, arrastar para baixo fecha.

const VIEWER_MAX_SCALE = 4;
const VIEWER_ZOOM = 2.5;
let viewerIsOpen = false;
let viewerHistoryPushed = false;
let viewerReturnFocus = null;
let viewerFrom = { x: 0, y: 0, k: 1 }; // de onde a foto sai, relativo à posição final
let viewerSize = { w: 0, h: 0 };       // foto inteira na tela, sem zoom
let viewerDismissY = 0;

const viewerProgress = createSpring(renderViewerStage);
const viewerDismiss = createSpring(value => { viewerDismissY = value; renderViewerStage(viewerProgress.value); });
const zoom = { s: 1, x: 0, y: 0 };
const zoomSprings = {
    s: createSpring(value => { zoom.s = value; renderZoom(); }, { restDelta: 0.0005 }),
    x: createSpring(value => { zoom.x = value; renderZoom(); }, { restDelta: 0.1 }),
    y: createSpring(value => { zoom.y = value; renderZoom(); }, { restDelta: 0.1 })
};

function renderViewerStage(p) {
    const q = 1 - p;
    const k = 1 + (viewerFrom.k - 1) * q;
    viewerStage.style.transform =
        `translate3d(${viewerFrom.x * q}px, ${viewerFrom.y * q + viewerDismissY}px, 0) scale(${k})`;
    const dismissFade = 1 - Math.min(1, Math.abs(viewerDismissY) / (viewer.clientHeight * 0.6));
    viewerBackdrop.style.opacity = clamp01(p) * dismissFade;
    viewerClose.style.opacity = clamp01(p * 2 - 1) * dismissFade;
}

function renderZoom() {
    viewerImage.style.transform = `translate3d(${zoom.x}px, ${zoom.y}px, 0) scale(${zoom.s})`;
    viewer.classList.toggle('is-zoomed', zoom.s > 1.01);
}

// Retângulo da foto dentro de uma caixa com object-fit: contain
function containedRect(box, ratio) {
    const boxRatio = box.width / box.height;
    const w = ratio > boxRatio ? box.width : box.height * ratio;
    const h = ratio > boxRatio ? box.width / ratio : box.height;
    return { x: box.left + (box.width - w) / 2, y: box.top + (box.height - h) / 2, w, h };
}

function layoutViewer() {
    const ratio = viewerImage.naturalWidth / viewerImage.naturalHeight || 1;
    const fit = containedRect({ left: 0, top: 0, width: viewer.clientWidth, height: viewer.clientHeight }, ratio);
    viewerSize = { w: fit.w, h: fit.h };
    viewerImage.style.width = `${fit.w}px`;
    viewerImage.style.height = `${fit.h}px`;
    const from = containedRect(modalImage.getBoundingClientRect(), ratio);
    viewerFrom = {
        x: from.x + from.w / 2 - viewer.clientWidth / 2,
        y: from.y + from.h / 2 - viewer.clientHeight / 2,
        k: from.w / fit.w
    };
}

function setZoom(s, x, y) {
    zoomSprings.s.set(s);
    zoomSprings.x.set(x);
    zoomSprings.y.set(y);
}

function animateZoom(s, x, y, { vx = 0, vy = 0, damping = 1 } = {}) {
    zoomSprings.s.to(s, { damping, response: 0.35 });
    zoomSprings.x.to(x, { damping, response: 0.35, velocity: vx });
    zoomSprings.y.to(y, { damping, response: 0.35, velocity: vy });
}

// Até onde a foto ampliada pode andar sem mostrar fundo
function panBounds(s) {
    return {
        x: Math.max(0, (viewerSize.w * s - viewer.clientWidth) / 2),
        y: Math.max(0, (viewerSize.h * s - viewer.clientHeight) / 2)
    };
}

function clampPan(value, bound) {
    return Math.max(-bound, Math.min(bound, value));
}

// Deslocamento que mantém fixo o ponto da tela (px, py) ao trocar de escala
function zoomAround(px, py, fromS, toS, fromX, fromY) {
    const cx = px - viewer.clientWidth / 2;
    const cy = py - viewer.clientHeight / 2;
    return {
        x: cx - (cx - fromX) * (toS / fromS),
        y: cy - (cy - fromY) * (toS / fromS)
    };
}

function toggleZoomAt(px, py) {
    if (zoom.s > 1.01) {
        animateZoom(1, 0, 0);
        return;
    }
    const target = zoomAround(px, py, zoom.s, VIEWER_ZOOM, zoom.x, zoom.y);
    const bounds = panBounds(VIEWER_ZOOM);
    animateZoom(VIEWER_ZOOM, clampPan(target.x, bounds.x), clampPan(target.y, bounds.y));
}

function openViewer() {
    if (viewerIsOpen || !modalImage.classList.contains('loaded')) return;
    viewerIsOpen = true;
    viewerReturnFocus = document.activeElement;
    viewerImage.src = modalImage.currentSrc || modalImage.src;
    viewerImage.alt = modalImage.alt;
    viewer.hidden = false;
    layoutViewer();
    setZoom(1, 0, 0);
    viewerDismiss.set(0);
    modalImage.classList.add('zoomed-out');
    if (reducedMotion.matches) viewerProgress.set(1);
    else {
        viewerProgress.set(viewerProgress.value);
        viewerProgress.to(1, { damping: 1, response: 0.4 });
    }
    history.pushState({ filters: { ...state }, viewer: true }, '', window.location.href);
    viewerHistoryPushed = true;
    viewerClose.focus({ preventScroll: true });
}

function closeViewer({ velocity, fromHistory = false, instant = false } = {}) {
    if (!viewerIsOpen) return;
    viewerIsOpen = false;
    if (!fromHistory && viewerHistoryPushed) history.back();
    viewerHistoryPushed = false;
    const finish = () => {
        viewer.hidden = true;
        modalImage.classList.remove('zoomed-out');
        viewerImage.removeAttribute('src');
        if (viewerReturnFocus && viewerReturnFocus.isConnected) viewerReturnFocus.focus({ preventScroll: true });
        viewerReturnFocus = null;
    };
    if (instant || reducedMotion.matches) {
        viewerProgress.set(0);
        finish();
        return;
    }
    // Volta para a foto da folha, que pode ter mudado de lugar (rotação, rolagem)
    layoutViewer();
    animateZoom(1, 0, 0);
    viewerDismiss.to(0, { damping: 1, response: 0.4 });
    viewerProgress.to(0, { damping: 1, response: 0.4, velocity, onRest: finish });
}

function setupViewer() {
    zoomButton.addEventListener('click', openViewer);
    modalImage.addEventListener('click', () => {
        if (sheetDragDistance < 8) openViewer();
    });
    viewerClose.addEventListener('click', () => closeViewer());

    const pointers = new Map();
    let gesture = null;
    let lastTap = { t: 0, x: 0, y: 0 };
    let samples = [];

    const midpoint = () => {
        const [a, b] = [...pointers.values()];
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) };
    };

    const startGesture = () => {
        // Agarra do valor atual, mesmo no meio de uma animação
        Object.values(zoomSprings).forEach(spring => spring.set(spring.value));
        viewerDismiss.set(viewerDismiss.value);
        const base = { s: zoom.s, x: zoom.x, y: zoom.y };
        if (pointers.size === 2) {
            gesture = { type: 'pinch', base, start: midpoint() };
        } else {
            const p = [...pointers.values()][0];
            gesture = { type: 'pan', base, startX: p.x, startY: p.y, moved: false, dismiss: zoom.s <= 1.01, startDismiss: viewerDismissY };
        }
        samples = [];
    };

    viewer.addEventListener('pointerdown', event => {
        if (!viewerIsOpen || event.target.closest('button')) return;
        try { viewer.setPointerCapture(event.pointerId); } catch (e) { /* ponteiro já liberado */ }
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.size <= 2) startGesture();
    });

    viewer.addEventListener('pointermove', event => {
        if (!gesture || !pointers.has(event.pointerId)) return;
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        samples.push({ x: event.clientX, y: event.clientY, t: event.timeStamp });
        while (samples.length > 2 && event.timeStamp - samples[0].t > 100) samples.shift();

        if (gesture.type === 'pinch' && pointers.size === 2) {
            const m = midpoint();
            let s = gesture.base.s * (m.d / gesture.start.d);
            // Passou dos limites: resiste em vez de travar
            if (s > VIEWER_MAX_SCALE) s = VIEWER_MAX_SCALE + rubberband(s - VIEWER_MAX_SCALE, VIEWER_MAX_SCALE, 0.3);
            if (s < 1) s = 1 - rubberband(1 - s, 1, 0.3);
            const t = zoomAround(gesture.start.x, gesture.start.y, gesture.base.s, s, gesture.base.x, gesture.base.y);
            setZoom(s, t.x + m.x - gesture.start.x, t.y + m.y - gesture.start.y);
            return;
        }
        if (gesture.type !== 'pan') return;
        const dx = event.clientX - gesture.startX;
        const dy = event.clientY - gesture.startY;
        if (!gesture.moved && Math.hypot(dx, dy) < 10) return; // ainda pode ser um toque
        gesture.moved = true;
        if (gesture.dismiss) {
            viewerDismiss.set(gesture.startDismiss + dy);
            renderViewerStage(viewerProgress.value);
            return;
        }
        const bounds = panBounds(zoom.s);
        const soft = (value, bound, size) =>
            Math.abs(value) <= bound ? value : Math.sign(value) * (bound + rubberband(Math.abs(value) - bound, size));
        setZoom(zoom.s,
            soft(gesture.base.x + dx, bounds.x, viewer.clientWidth),
            soft(gesture.base.y + dy, bounds.y, viewer.clientHeight));
    });

    const endPointer = event => {
        if (!pointers.has(event.pointerId)) return;
        pointers.delete(event.pointerId);
        if (!gesture) return;

        const first = samples[0];
        const last = samples[samples.length - 1];
        const dt = first && last ? (last.t - first.t) / 1000 : 0;
        const vx = dt > 0 ? (last.x - first.x) / dt : 0;
        const vy = dt > 0 ? (last.y - first.y) / dt : 0;

        if (gesture.type === 'pinch') {
            // Ao soltar o primeiro dedo a pinça termina; o outro dedo não faz mais nada
            gesture = null;
            const s = Math.max(1, Math.min(VIEWER_MAX_SCALE, zoom.s));
            const bounds = panBounds(s);
            const t = zoomAround(event.clientX, event.clientY, zoom.s, s, zoom.x, zoom.y);
            animateZoom(s, clampPan(t.x, bounds.x), clampPan(t.y, bounds.y));
            return;
        }

        const g = gesture;
        gesture = null;
        if (!g.moved) {
            if (event.type === 'pointercancel') return;
            // Mouse: um clique amplia. Toque: dois toques seguidos.
            if (event.pointerType === 'mouse') {
                toggleZoomAt(event.clientX, event.clientY);
                return;
            }
            const now = event.timeStamp;
            if (now - lastTap.t < 300 && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 30) {
                lastTap.t = 0;
                toggleZoomAt(event.clientX, event.clientY);
            } else {
                lastTap = { t: now, x: event.clientX, y: event.clientY };
            }
            return;
        }
        if (g.dismiss) {
            if (Math.abs(viewerDismissY + project(vy)) > viewer.clientHeight * 0.25 || Math.abs(vy) > 800) {
                closeViewer({ velocity: -Math.abs(vy) / viewer.clientHeight });
            } else {
                viewerDismiss.to(0, { damping: 0.8, response: 0.3, velocity: vy });
            }
            return;
        }
        // Foto ampliada: segue com o momento do dedo até a borda
        const bounds = panBounds(zoom.s);
        animateZoom(zoom.s,
            clampPan(zoom.x + project(vx, 0.995), bounds.x),
            clampPan(zoom.y + project(vy, 0.995), bounds.y),
            { vx, vy });
    };

    viewer.addEventListener('pointerup', endPointer);
    viewer.addEventListener('pointercancel', endPointer);

    // Roda do mouse / pinça do trackpad amplia em torno do cursor
    viewer.addEventListener('wheel', event => {
        if (!viewerIsOpen) return;
        event.preventDefault();
        const s = Math.max(1, Math.min(VIEWER_MAX_SCALE, zoom.s * Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.002))));
        const t = zoomAround(event.clientX, event.clientY, zoom.s, s, zoom.x, zoom.y);
        const bounds = panBounds(s);
        setZoom(s, clampPan(t.x, bounds.x), clampPan(t.y, bounds.y));
    }, { passive: false });

    window.addEventListener('resize', () => {
        if (!viewerIsOpen) return;
        layoutViewer();
        setZoom(1, 0, 0);
        renderViewerStage(viewerProgress.value);
    });
}

function trapFocus(event) {
    if (event.key !== 'Tab' || costumeModal.hidden) return;
    if (viewerIsOpen) {
        event.preventDefault();
        viewerClose.focus();
        return;
    }
    const focusables = [...sheet.querySelectorAll('button:not([hidden]), a[href]:not([hidden])')];
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
    if (state.fantasia && !findFantasia(state.fantasia)) state.fantasia = '';
    render({ history: 'none' });
    // Link de fantasia: abre direto nela, já com o endereço fixo (?fantasia=123 vira f/123/)
    if (state.fantasia) openCostumeSheet(findFantasia(state.fantasia), null, { history: 'none' });
    history.replaceState({ filters: { ...state } }, '', urlFromState());
    document.querySelector('.brand').href = appRoot;
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
    sheetShareButton.addEventListener('click', shareCurrentCostume);
    videoJumpButton.addEventListener('click', () => goToSlide(0));
    mediaPrev.addEventListener('click', () => goToSlide(mediaIndex - 1));
    mediaNext.addEventListener('click', () => goToSlide(mediaIndex + 1));
    mediaTrack.addEventListener('scroll', onMediaScroll, { passive: true });
    setupViewer();

    modalCloseButton.addEventListener('click', () => closeCostumeSheet());
    sheetScrim.addEventListener('click', () => closeCostumeSheet());
    setupSheetDrag();

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && viewerIsOpen) closeViewer();
        else if (event.key === 'Escape' && sheetIsOpen) closeCostumeSheet();
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
        layoutVideos();
        mediaTrack.scrollLeft = mediaIndex * mediaTrack.clientWidth;
        renderSheet(sheetSpring.value);
    });

    window.addEventListener('popstate', event => {
        // "Voltar" com a foto em tela cheia fecha só a foto
        if (viewerIsOpen && !(event.state && event.state.viewer)) closeViewer({ fromHistory: true });
        const filters = (event.state && event.state.filters) || getFiltersFromURL();
        const before = catalogKey(state);
        Object.assign(state, { fantasia: '' }, filters);
        searchNomeInput.value = state.busca;
        if (catalogKey(state) !== before) render({ history: 'none' });
        syncSheetWithState();
    });

    setupScrollEdge();
}

document.addEventListener('DOMContentLoaded', fetchFantasias);
