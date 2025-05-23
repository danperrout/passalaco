let fantasias = [];
let imageObserver;
let currentSortType = 'default';
let currentSortDirectionForName = 'asc';
let currentPage = 1;
const itemsPerPage = 100;

// Elementos DOM principais
const costumeContainer = document.getElementById('costumeContainer');
const filterCategoriaSelect = document.getElementById('filterCategoria');
const filterSexoCheckboxesContainer = document.getElementById('filterSexoCheckboxes');
const filterTipoCheckboxesContainer = document.getElementById('filterTipoCheckboxes');
const searchNomeInput = document.getElementById('searchNome');
const noResultsMessage = document.getElementById('noResultsMessage');
const loadingIndicator = document.getElementById('loadingIndicator');
const clearFiltersButton = document.getElementById('clearFiltersButton');
const errorMessageContainer = document.getElementById('errorMessage');
const resultsCountContainer = document.getElementById('resultsCount');
const sortByNameButton = document.getElementById('sortByNameButton');
const sortByViewsButton = document.getElementById('sortByViewsButton');
const randomSearchButton = document.getElementById('randomSearchButton'); // Agora na barra fixa
const activeFiltersDisplay = document.getElementById('activeFiltersDisplay'); // Agora na barra fixa
const paginationContainerTop = document.getElementById('paginationContainerTop');
const paginationContainerBottom = document.getElementById('paginationContainerBottom');

// Elementos do Modal
const costumeModal = document.getElementById('costumeModal');
const modalCloseButton = document.getElementById('modalCloseButton');
const modalImage = document.getElementById('modalImage');
const modalImagePlaceholder = document.getElementById('modalImagePlaceholder');
const modalName = document.getElementById('modalName');
const modalCategoria = document.getElementById('modalCategoria');
const modalSexo = document.getElementById('modalSexo');
const modalTipo = document.getElementById('modalTipo');
const modalId = document.getElementById('modalId');
const modalViewCount = document.getElementById('modalViewCount');
const modalClickCount = document.getElementById('modalClickCount');

// CONSTANTES PARA A NOVA BARRA FIXA
const customStickyBar = document.getElementById('customStickyBar'); // NOVO ID
const mainContent = document.getElementById('mainContent');
let stickyOffset = 0;


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
        // console.error(`Erro ao ler '${key}' do localStorage:`, e);
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
        // console.error(`Erro ao ler '${key}' do localStorage para atualização, resetando dados:`, e);
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
            // console.error(`Erro ao salvar '${key}' no localStorage:`, e);
        }
    }
    return currentCount;
}

async function fetchFantasias() {
    if (loadingIndicator) loadingIndicator.classList.remove('hidden');
    if (errorMessageContainer) errorMessageContainer.classList.add('hidden');
    try {
        const response = await fetch('output/fantasias.json');
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
        }
        const data = await response.json();
        fantasias = data;
        initializeApp();
    } catch (error) {
        console.warn('Falha ao carregar fantasias do arquivo JSON, usando dados de fallback:', error);
        fantasias = fallbackFantasias;
        initializeApp();
    }
}

function openCostumeModal(fantasia) {
    if (!costumeModal) return;
    const viewInfo = getCostumeDataFromStorage(costumeViewDataKey, fantasia._id);
    const clickInfoCount = handleCostumeEvent(costumeImageClickDataKey, fantasia._id);

    modalImage.src = fantasia.imgUrl;
    modalImage.style.display = 'block';
    modalImagePlaceholder.classList.add('hidden');
    modalImage.onerror = () => {
        modalImage.style.display = 'none';
        modalImagePlaceholder.classList.remove('hidden');
    };

    modalImage.alt = `[Imagem de ${fantasia.nome === "." ? "Sem Nome" : fantasia.nome} ampliada]`;
    modalName.textContent = fantasia.nome === "." ? "Sem Nome" : fantasia.nome;
    modalCategoria.textContent = fantasia.categoriaNome;
    modalSexo.textContent = fantasia.sexo;
    modalTipo.textContent = fantasia.tipo;
    modalId.textContent = fantasia._id;
    modalViewCount.textContent = viewInfo.count;
    modalClickCount.textContent = clickInfoCount;

    const cardClickCountSpan = document.querySelector(`#card-click-count-${fantasia._id}`);
    if (cardClickCountSpan) {
        cardClickCountSpan.textContent = clickInfoCount;
    }

    costumeModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCostumeModal() {
    if (!costumeModal) return;
    costumeModal.classList.remove('active');
    document.body.style.overflow = '';
    modalImage.src = "";
    modalImage.style.display = 'block';
    modalImagePlaceholder.classList.add('hidden');
}

function createCostumeCard(fantasia) {
    const displayName = fantasia.nome === "." ? "Sem Nome" : fantasia.nome;
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.fantasiaId = fantasia._id;

    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'image-wrapper';
    imageWrapper.addEventListener('click', () => openCostumeModal(fantasia));

    const miniLoader = document.createElement('div');
    miniLoader.className = 'mini-loader';

    const imgElement = document.createElement('img');
    imgElement.dataset.src = fantasia.imgUrl;
    imgElement.alt = `[Imagem de ${displayName}]`;

    const placeholderText = document.createElement('div');
    placeholderText.className = 'image-placeholder-text hidden';
    placeholderText.textContent = 'Imagem não disponível';

    imageWrapper.appendChild(miniLoader);
    imageWrapper.appendChild(imgElement);
    imageWrapper.appendChild(placeholderText);

    const initialViewInfo = getCostumeDataFromStorage(costumeViewDataKey, fantasia._id);
    const initialClickInfo = getCostumeDataFromStorage(costumeImageClickDataKey, fantasia._id);

    const idElement = document.createElement('div');
    idElement.className = 'absolute top-1.5 left-1.5 card-info-on-image';
    idElement.textContent = `ID: ${fantasia._id}`;
    imageWrapper.appendChild(idElement);

    const statsElement = document.createElement('div');
    statsElement.className = 'absolute bottom-1.5 right-1.5 card-info-on-image';
    statsElement.innerHTML = `
        <span class="mr-0.5">👁️</span> <span id="view-count-${fantasia._id}">${initialViewInfo.count}</span>
        <span class="ml-1.5 mr-0.5">📸</span> <span id="card-click-count-${fantasia._id}">${initialClickInfo.count}</span>
    `;
    imageWrapper.appendChild(statsElement);

    // --- NOVO: Overlay de informações para o hover ---
    const hoverInfoOverlay = document.createElement('div');
    hoverInfoOverlay.className = 'image-hover-info-overlay'; // Classe CSS para o overlay

    const categoriaP = document.createElement('p');
    // Usando classes Tailwind para estilização do texto dentro do overlay se desejar, ou CSS puro.
    categoriaP.innerHTML = `<span class="font-semibold text-sm">Categoria:</span> <span class="text-sm">${fantasia.categoriaNome}</span>`;
    hoverInfoOverlay.appendChild(categoriaP);

    const sexoP = document.createElement('p');
    sexoP.innerHTML = `<span class="font-semibold text-sm">Sexo:</span> <span class="text-sm">${fantasia.sexo}</span>`;
    hoverInfoOverlay.appendChild(sexoP);

    const tipoP = document.createElement('p');
    tipoP.innerHTML = `<span class="font-semibold text-sm">Tipo:</span> <span class="text-sm">${fantasia.tipo}</span>`;
    hoverInfoOverlay.appendChild(tipoP);

    imageWrapper.appendChild(hoverInfoOverlay); // Adiciona o overlay ao imageWrapper
    // --- FIM DO NOVO OVERLAY ---

    imgElement.onload = () => {
        imgElement.classList.add('loaded');
        if (miniLoader) miniLoader.style.display = 'none';
        const updatedViewCount = handleCostumeEvent(costumeViewDataKey, fantasia._id);
        const viewCountSpan = card.querySelector(`#view-count-${fantasia._id}`);
        if (viewCountSpan) viewCountSpan.textContent = updatedViewCount;
    };
    imgElement.onerror = () => {
        if (miniLoader) miniLoader.style.display = 'none';
        if (placeholderText) placeholderText.classList.remove('hidden');
        imgElement.style.display = 'none';
    };

    const textContentDiv = document.createElement('div');
    textContentDiv.className = 'p-3 flex-grow flex flex-col';
    textContentDiv.innerHTML = `
        <h3 class="text-base font-semibold text-gray-800 mb-1 truncate" title="${displayName}">${displayName}</h3>
    `;

    card.appendChild(imageWrapper);
    card.appendChild(textContentDiv);
    return card;
}
// ... (restante do seu código main.js)

function setupImageObserver(cardsToObserve) {
    if (imageObserver) imageObserver.disconnect();
    const options = { root: null, rootMargin: '0px', threshold: 0.1 };
    imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target.querySelector('img[data-src]');
                if (img && !img.src) {
                    img.src = img.dataset.src;
                }
            }
        });
    }, options);
    cardsToObserve.forEach(cardEl => {
        const img = cardEl.querySelector('img[data-src]');
        if (img && !img.classList.contains('loaded')) {
            imageObserver.observe(cardEl);
        }
    });
}

function createCheckboxGroup(container, items, groupName, changeHandler) {
    if (!container) return;
    container.innerHTML = '';
    items.forEach(item => {
        if (item) {
            const label = document.createElement('label');
            label.className = 'checkbox-label text-sm text-gray-700 select-none';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'checkbox-input form-checkbox';
            checkbox.value = item;
            checkbox.name = groupName;
            checkbox.addEventListener('change', changeHandler);
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(` ${item}`));
            container.appendChild(label);
        }
    });
}

function populateFilters() {
    if (!fantasias || fantasias.length === 0) return;
    const categoriasUnicas = [...new Set(fantasias.map(f => f.categoriaNome).filter(Boolean))].sort();
    const sexos = [...new Set(fantasias.map(f => f.sexo).filter(Boolean))].sort();
    const tipos = [...new Set(fantasias.map(f => f.tipo).filter(Boolean))].sort();

    if (filterCategoriaSelect) {
        while (filterCategoriaSelect.options.length > 1) filterCategoriaSelect.remove(1);
        categoriasUnicas.forEach(cat => {
            const count = fantasias.filter(f => f.categoriaNome === cat).length;
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = `${cat} (${count})`;
            filterCategoriaSelect.appendChild(option);
        });
    }
    const checkboxChangeHandler = () => { currentPage = 1; applyFiltersAndSort(null); };
    if (filterSexoCheckboxesContainer) createCheckboxGroup(filterSexoCheckboxesContainer, sexos, 'sexo', checkboxChangeHandler);
    if (filterTipoCheckboxesContainer) createCheckboxGroup(filterTipoCheckboxesContainer, tipos, 'tipo', checkboxChangeHandler);
}

function getSelectedCheckboxValues(groupName) {
    const checkboxes = document.querySelectorAll(`input[name="${groupName}"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

function updateActiveFiltersDisplay() {
    if (!activeFiltersDisplay) return;
    const activeFilters = [];
    const selectedCategoriaValue = filterCategoriaSelect ? filterCategoriaSelect.value : "";
    const selectedSexosValues = getSelectedCheckboxValues('sexo');
    const selectedTiposValues = getSelectedCheckboxValues('tipo');
    const searchTermValue = searchNomeInput ? searchNomeInput.value.trim() : "";

    if (selectedCategoriaValue) {
        const catOptionText = filterCategoriaSelect.options[filterCategoriaSelect.selectedIndex]?.textContent.split(' (')[0];
        activeFilters.push(`Cat: ${catOptionText || selectedCategoriaValue}`);
    }
    if (selectedSexosValues.length > 0) activeFilters.push(`Sexo: ${selectedSexosValues.join(', ')}`);
    if (selectedTiposValues.length > 0) activeFilters.push(`Tipo: ${selectedTiposValues.join(', ')}`);
    if (searchTermValue) activeFilters.push(`Busca: "${searchTermValue}"`);

    if (activeFilters.length > 0) {
        activeFiltersDisplay.innerHTML = `<span class="font-semibold">Filtros:</span> ${activeFilters.join('; ')}`;
        activeFiltersDisplay.classList.remove('hidden');
    } else {
        activeFiltersDisplay.innerHTML = 'Passa Laço'; // Ou ocultar
        // activeFiltersDisplay.classList.add('hidden'); 
    }
}

function toggleButtonLoading(button, isLoading) {
    if (!button) return;
    const textSpan = button.querySelector('.btn-text');
    const loaderSpan = button.querySelector('.btn-loader-icon');
    button.disabled = isLoading;
    if (textSpan) textSpan.style.opacity = isLoading ? '0' : '1';
    if (loaderSpan) {
        if (isLoading) {
            loaderSpan.classList.add('btn-loader');
            loaderSpan.style.display = 'inline-block';
        } else {
            loaderSpan.classList.remove('btn-loader');
            loaderSpan.style.display = 'none';
        }
    }
}

function createPaginationControls(container, totalItems, page) {
    if (!container) return;
    container.innerHTML = '';
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return;

    const pageButton = (pageNum, text, isDisabled = false, isActive = false) => {
        const button = document.createElement('button');
        const textSpan = document.createElement('span');
        textSpan.className = 'btn-text'; textSpan.textContent = text || pageNum;
        const loaderSpan = document.createElement('span');
        loaderSpan.className = 'btn-loader-icon hidden';
        button.appendChild(textSpan); button.appendChild(loaderSpan);
        button.className = 'pagination-button';
        if (isActive) button.classList.add('active');
        button.disabled = isDisabled;
        button.addEventListener('click', function () {
            if (this.disabled || this.classList.contains('active')) return;
            toggleButtonLoading(this, true); currentPage = pageNum; applyFiltersAndSort(this);
            if (costumeContainer) {
                let offset = (customStickyBar && customStickyBar.classList.contains('sticky')) ? customStickyBar.offsetHeight : 0;
                window.scrollTo({ top: costumeContainer.offsetTop - offset - 20, behavior: 'smooth' });
            }
        });
        return button;
    };

    container.appendChild(pageButton(page - 1, 'Anterior', page === 1));
    const maxPagesToShow = 5; let startPageNum = 1; let endPageNum = totalPages;
    if (totalPages > maxPagesToShow) {
        let pagesBefore = Math.floor((maxPagesToShow - 3) / 2);
        let pagesAfter = Math.ceil((maxPagesToShow - 3) / 2);
        if (page <= pagesBefore + 1) endPageNum = maxPagesToShow - 1;
        else if (page >= totalPages - pagesAfter) startPageNum = totalPages - maxPagesToShow + 2;
        else { startPageNum = page - pagesBefore; endPageNum = page + pagesAfter; }
    }
    if (startPageNum > 1) {
        container.appendChild(pageButton(1, '1', false, 1 === page));
        if (startPageNum > 2) { const dots = document.createElement('span'); dots.textContent = '...'; dots.className = 'px-2 py-1 self-center'; container.appendChild(dots); }
    }
    for (let i = startPageNum; i <= endPageNum; i++) {
        if (i > 0 && i <= totalPages) container.appendChild(pageButton(i, null, false, i === page));
    }
    if (endPageNum < totalPages) {
        if (endPageNum < totalPages - 1) { const dots = document.createElement('span'); dots.textContent = '...'; dots.className = 'px-2 py-1 self-center'; container.appendChild(dots); }
        container.appendChild(pageButton(totalPages, totalPages, false, totalPages === page));
    }
    container.appendChild(pageButton(page + 1, 'Próxima', page === totalPages));
}

function getFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);
    const filters = {};
    if (params.has('categoria')) filters.categoria = params.get('categoria');
    if (params.has('sexo')) filters.sexo = params.get('sexo').split(',');
    if (params.has('tipo')) filters.tipo = params.get('tipo').split(',');
    if (params.has('busca')) filters.busca = params.get('busca');
    if (params.has('pagina')) filters.pagina = parseInt(params.get('pagina'), 10) || 1;
    if (params.has('ordem')) filters.ordem = params.get('ordem');
    if (params.has('dir')) filters.dir = params.get('dir');
    return filters;
}

function setFiltersFromStateObject(filters) {
    if (filterCategoriaSelect) filterCategoriaSelect.value = filters.categoria || "";
    if (searchNomeInput) searchNomeInput.value = filters.busca || "";
    document.querySelectorAll('input[name="sexo"]').forEach(cb => { cb.checked = !!(filters.sexo && filters.sexo.includes(cb.value)); });
    document.querySelectorAll('input[name="tipo"]').forEach(cb => { cb.checked = !!(filters.tipo && filters.tipo.includes(cb.value)); });
    currentSortType = filters.ordem || 'default';
    currentSortDirectionForName = filters.dir || 'asc';
    if (sortByNameButton) sortByNameButton.querySelector('.btn-text').textContent = `Ordenar por Nome (${currentSortType === 'name' && currentSortDirectionForName === 'desc' ? 'Z-A' : 'A-Z'})`;
}

function updateURLFromCurrentFilters() {
    const params = new URLSearchParams();
    if (filterCategoriaSelect && filterCategoriaSelect.value) params.set('categoria', filterCategoriaSelect.value);
    const selectedSexos = getSelectedCheckboxValues('sexo'); if (selectedSexos.length > 0) params.set('sexo', selectedSexos.join(','));
    const selectedTipos = getSelectedCheckboxValues('tipo'); if (selectedTipos.length > 0) params.set('tipo', selectedTipos.join(','));
    if (searchNomeInput && searchNomeInput.value.trim()) params.set('busca', searchNomeInput.value.trim());
    if (currentPage > 1) params.set('pagina', currentPage);
    if (currentSortType !== 'default') {
        params.set('ordem', currentSortType);
        if (currentSortType === 'name') params.set('dir', currentSortDirectionForName);
    }
    const newQueryString = params.toString();
    const currentQueryString = window.location.search.substring(1);
    if (newQueryString !== currentQueryString) {
        const newURL = `${window.location.pathname}${newQueryString ? '?' + newQueryString : ''}`;
        history.pushState({ path: newURL, filters: getCurrentFiltersStateForHistory() }, '', newURL);
    }
}

function getCurrentFiltersStateForHistory() {
    return {
        categoria: filterCategoriaSelect ? filterCategoriaSelect.value : "",
        sexo: getSelectedCheckboxValues('sexo'),
        tipo: getSelectedCheckboxValues('tipo'),
        busca: searchNomeInput ? searchNomeInput.value.trim() : "",
        pagina: currentPage,
        ordem: currentSortType,
        dir: currentSortDirectionForName
    };
}

let filterApplyTimeout; // Renomeado para evitar conflito com filterTimeout global se houver
function applyFiltersAndSort(initiatingButton = null, updateUrl = true) {
    if (!fantasias) return;
    if (!initiatingButton && loadingIndicator) {
        loadingIndicator.classList.remove('hidden');
        if (costumeContainer) costumeContainer.innerHTML = '';
        if (paginationContainerTop) paginationContainerTop.innerHTML = '';
        if (paginationContainerBottom) paginationContainerBottom.innerHTML = '';
        if (resultsCountContainer) resultsCountContainer.textContent = 'Carregando...';
    }
    if (noResultsMessage) noResultsMessage.classList.add('hidden');

    clearTimeout(filterApplyTimeout);
    filterApplyTimeout = setTimeout(() => {
        const selectedCategoria = filterCategoriaSelect ? filterCategoriaSelect.value : "";
        const selectedSexos = getSelectedCheckboxValues('sexo');
        const selectedTipos = getSelectedCheckboxValues('tipo');
        const searchTerm = searchNomeInput ? searchNomeInput.value.toLowerCase().trim() : "";

        let filteredAndSortedFantasias = fantasias.filter(fantasia => {
            const searchId = String(fantasia._id);
            const nameMatches = fantasia.nome.toLowerCase().includes(searchTerm) || (fantasia.nome === "." && ("sem nome".includes(searchTerm) || searchTerm === "."));
            const idMatches = searchId.includes(searchTerm);
            const nameOrIdMatches = nameMatches || idMatches;
            const categoriaMatches = !selectedCategoria || fantasia.categoriaNome === selectedCategoria;
            const sexoMatches = selectedSexos.length === 0 || selectedSexos.includes(fantasia.sexo);
            const tipoMatches = selectedTipos.length === 0 || selectedTipos.includes(fantasia.tipo);
            return nameOrIdMatches && categoriaMatches && sexoMatches && tipoMatches;
        });

        if (currentSortType === 'name') {
            filteredAndSortedFantasias.sort((a, b) => {
                const nameA = a.nome === "." ? "zzzzzz" : a.nome.toLowerCase();
                const nameB = b.nome === "." ? "zzzzzz" : b.nome.toLowerCase();
                if (nameA < nameB) return currentSortDirectionForName === 'asc' ? -1 : 1;
                if (nameA > nameB) return currentSortDirectionForName === 'asc' ? 1 : -1;
                return 0;
            });
        } else if (currentSortType === 'views') {
            filteredAndSortedFantasias.sort((a, b) => {
                const viewsA = getCostumeDataFromStorage(costumeViewDataKey, a._id).count;
                const viewsB = getCostumeDataFromStorage(costumeViewDataKey, b._id).count;
                return viewsB - viewsA;
            });
        }

        const totalFilteredItems = filteredAndSortedFantasias.length;
        const totalPages = Math.ceil(totalFilteredItems / itemsPerPage);
        currentPage = Math.max(1, Math.min(currentPage, totalPages || 1));
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const itemsForCurrentPage = filteredAndSortedFantasias.slice(startIndex, endIndex);

        if (costumeContainer) costumeContainer.innerHTML = '';
        const currentCardsOnPage = [];
        if (itemsForCurrentPage.length === 0 && fantasias.length > 0) {
            if (noResultsMessage) noResultsMessage.classList.remove('hidden');
        } else {
            itemsForCurrentPage.forEach(fantasia => {
                const cardElement = createCostumeCard(fantasia);
                currentCardsOnPage.push(cardElement);
                if (costumeContainer) costumeContainer.appendChild(cardElement);
            });
            if (currentCardsOnPage.length > 0) setupImageObserver(currentCardsOnPage);
        }

        if (resultsCountContainer) {
            const startItemNum = totalFilteredItems > 0 ? startIndex + 1 : 0;
            const endItemNum = Math.min(endIndex, totalFilteredItems);
            resultsCountContainer.textContent = `Exibindo ${startItemNum}-${endItemNum} de ${totalFilteredItems} fantasias. (Total: ${fantasias.length})`;
        }
        updateActiveFiltersDisplay();
        if (paginationContainerTop) createPaginationControls(paginationContainerTop, totalFilteredItems, currentPage);
        if (paginationContainerBottom) createPaginationControls(paginationContainerBottom, totalFilteredItems, currentPage);
        if (updateUrl) updateURLFromCurrentFilters();
        if (initiatingButton) toggleButtonLoading(initiatingButton, false);
        if (loadingIndicator) loadingIndicator.classList.add('hidden');
    }, searchNomeInput === document.activeElement || initiatingButton ? 100 : 50);
}

function handleSortByNameClick() {
    if (!sortByNameButton) return;
    toggleButtonLoading(sortByNameButton, true);
    if (currentSortType === 'name') currentSortDirectionForName = currentSortDirectionForName === 'asc' ? 'desc' : 'asc';
    else { currentSortType = 'name'; currentSortDirectionForName = 'asc'; }
    sortByNameButton.querySelector('.btn-text').textContent = `Ordenar por Nome (${currentSortDirectionForName === 'asc' ? 'A-Z' : 'Z-A'})`;
    currentPage = 1; applyFiltersAndSort(sortByNameButton);
}

function handleSortByViewsClick() {
    if (!sortByViewsButton) return;
    toggleButtonLoading(sortByViewsButton, true);
    currentSortType = 'views';
    if (sortByNameButton) sortByNameButton.querySelector('.btn-text').textContent = `Ordenar por Nome (A-Z)`;
    currentSortDirectionForName = 'asc'; currentPage = 1; applyFiltersAndSort(sortByViewsButton);
}

function resetAllFilterStates() {
    if (searchNomeInput) searchNomeInput.value = '';
    if (filterCategoriaSelect) filterCategoriaSelect.value = '';
    document.querySelectorAll('input[name="sexo"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[name="tipo"]').forEach(cb => cb.checked = false);
    currentSortType = 'default'; currentSortDirectionForName = 'asc';
    if (sortByNameButton) sortByNameButton.querySelector('.btn-text').textContent = `Ordenar por Nome (A-Z)`;
    currentPage = 1;
}

function handleRandomSearchClick() {
    if (!randomSearchButton) return;
    toggleButtonLoading(randomSearchButton, true); resetAllFilterStates();
    if (fantasias.length > 0) {
        const randomIndex = Math.floor(Math.random() * fantasias.length);
        const randomCostume = fantasias[randomIndex];
        if (searchNomeInput) searchNomeInput.value = randomCostume.nome === "." ? String(randomCostume._id) : randomCostume.nome;
    }
    applyFiltersAndSort(randomSearchButton);
}

function clearFiltersButtonClickHandler() {
    if (!clearFiltersButton) return;
    toggleButtonLoading(clearFiltersButton, true); resetAllFilterStates(); applyFiltersAndSort(clearFiltersButton);
}

// FUNÇÕES PARA A NOVA BARRA FIXA (customStickyBar)
function handleCustomStickyBar() {
    if (!customStickyBar || !mainContent) return;
    if (window.pageYOffset > stickyOffset) {
        if (!customStickyBar.classList.contains('sticky')) {
            const barHeight = customStickyBar.offsetHeight;
            customStickyBar.classList.add('sticky');
            mainContent.style.paddingTop = barHeight + 'px';
        }
    } else {
        if (customStickyBar.classList.contains('sticky')) {
            customStickyBar.classList.remove('sticky');
            mainContent.style.paddingTop = '0';
        }
    }
}

function setupStickyBehavior() {
    if (customStickyBar && mainContent) { // Garante que ambos os elementos existam
        setTimeout(() => {
            stickyOffset = customStickyBar.offsetTop;
            handleCustomStickyBar();
        }, 300); // Aumentado ligeiramente o delay para garantir o cálculo correto do offset

        window.addEventListener('scroll', handleCustomStickyBar);
        window.addEventListener('resize', () => {
            if (customStickyBar.classList.contains('sticky')) {
                mainContent.style.paddingTop = customStickyBar.offsetHeight + 'px';
            }
            if (!customStickyBar.classList.contains('sticky')) {
                setTimeout(() => {
                    stickyOffset = customStickyBar.offsetTop;
                }, 100);
            }
        });
    }
}

function initializeApp() {
    populateFilters();
    const initialFilters = getFiltersFromURL();
    setFiltersFromStateObject(initialFilters);
    currentPage = initialFilters.pagina || 1;

    const checkboxChangeHandler = () => { currentPage = 1; applyFiltersAndSort(null); };
    document.querySelectorAll('#filterSexoCheckboxes input, #filterTipoCheckboxes input').forEach(cb => {
        cb.removeEventListener('change', checkboxChangeHandler);
        cb.addEventListener('change', checkboxChangeHandler);
    });

    if (!initialFilters.categoria && (!initialFilters.sexo || initialFilters.sexo.length === 0) && (!initialFilters.tipo || initialFilters.tipo.length === 0) && !initialFilters.busca) {
        if (filterCategoriaSelect) {
            const vitrineOption = Array.from(filterCategoriaSelect.options).find(opt => opt.value.toLowerCase() === "vitrine");
            if (vitrineOption) filterCategoriaSelect.value = vitrineOption.value;
        }
    }
    applyFiltersAndSort(null, true);

    // Event Listeners
    if (filterCategoriaSelect) filterCategoriaSelect.addEventListener('change', () => { currentPage = 1; applyFiltersAndSort(null); });
    if (searchNomeInput) searchNomeInput.addEventListener('input', () => { currentPage = 1; applyFiltersAndSort(null); });
    if (clearFiltersButton) clearFiltersButton.addEventListener('click', clearFiltersButtonClickHandler);
    if (sortByNameButton) sortByNameButton.addEventListener('click', handleSortByNameClick);
    if (sortByViewsButton) sortByViewsButton.addEventListener('click', handleSortByViewsClick);
    if (randomSearchButton) randomSearchButton.addEventListener('click', handleRandomSearchClick); // Este está na barra fixa

    if (modalCloseButton) modalCloseButton.addEventListener('click', closeCostumeModal);
    if (costumeModal) costumeModal.addEventListener('click', (event) => { if (event.target === costumeModal) closeCostumeModal(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && costumeModal && costumeModal.classList.contains('active')) closeCostumeModal(); });

    window.addEventListener('popstate', (event) => {
        const state = event.state;
        if (state && state.filters) { setFiltersFromStateObject(state.filters); currentPage = state.filters.pagina || 1; }
        else { const filtersFromURL = getFiltersFromURL(); setFiltersFromStateObject(filtersFromURL); currentPage = filtersFromURL.pagina || 1; }
        applyFiltersAndSort(null, false);
    });

    if (!history.state || !history.state.filters) {
        history.replaceState({ path: window.location.href, filters: getCurrentFiltersStateForHistory() }, '', window.location.href);
    }

    setupStickyBehavior(); // CONFIGURA A NOVA BARRA FIXA
}

document.addEventListener('DOMContentLoaded', fetchFantasias);