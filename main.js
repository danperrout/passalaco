let fantasias = [];
let imageObserver;
let currentSortType = 'default';
let currentSortDirectionForName = 'asc';
let currentPage = 1;
const itemsPerPage = 100;

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
const randomSearchButton = document.getElementById('randomSearchButton');
const activeFiltersDisplay = document.getElementById('activeFiltersDisplay');
const paginationContainerTop = document.getElementById('paginationContainerTop');
const paginationContainerBottom = document.getElementById('paginationContainerBottom');

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


const fallbackFantasias = [
    {
        "nome": ".",
        "_id": 6834,
        "img": 6834,
        "imgUrl": "https://www.passalaco.com.br/img/6834.jpg",
        "categoria": 0,
        "categoriaNome": "Outras",
        "sexo": "Masculina",
        "tipo": "Adulta",
        "criadoEm": "2025-05-22 11:40:13"
    },
    {
        "nome": "Abelha",
        "_id": 2,
        "img": 2,
        "imgUrl": "https://www.passalaco.com.br/img/2.jpg",
        "categoria": 0,
        "categoriaNome": "Outras",
        "sexo": "Feminina",
        "tipo": "Adulta",
        "criadoEm": "2025-05-22 11:40:13"
    },
    {
        "nome": "Bruxa Encantada",
        "_id": 1001,
        "img": 1001,
        "imgUrl": "https://placehold.co/280x300/AACCFF/333333?text=Bruxa",
        "categoria": 1,
        "categoriaNome": "Vitrine",
        "sexo": "Feminina",
        "tipo": "Adulta",
        "criadoEm": "2025-05-22 11:40:15"
    },
    {
        "nome": "Zorro",
        "_id": 1002,
        "img": 1002,
        "imgUrl": "https://placehold.co/280x300/FFCCAA/333333?text=Zorro",
        "categoria": 1,
        "categoriaNome": "Heróis",
        "sexo": "Masculina",
        "tipo": "Adulto",
        "criadoEm": "2025-05-22 11:40:18"
    },
    {
        "nome": "Abelha",
        "_id": 6675,
        "img": 6675,
        "imgUrl": "https://www.passalaco.com.br/img/6675.jpg",
        "categoria": 0,
        "categoriaNome": "Outras",
        "sexo": "Feminina",
        "tipo": "Infantil",
        "criadoEm": "2025-05-22 11:40:13"
    }
];

const costumeViewDataKey = 'costumeViewData';
const costumeImageClickDataKey = 'costumeImageClickData';

function getCostumeDataFromStorage(key, costumeId) {
    try {
        const dataStore = JSON.parse(localStorage.getItem(key)) || {};
        return dataStore[costumeId] || { count: 0, lastEventTime: 0 };
    } catch (e) {
        console.error(`Erro ao ler '${key}' do localStorage:`, e);
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
        console.error(`Erro ao ler '${key}' do localStorage para atualização, resetando dados:`, e);
        dataStore = {};
    }

    const entry = dataStore[costumeId] || { count: 0, lastEventTime: 0 };
    let currentCount = entry.count;

    console.log(`${(currentTime - entry.lastEventTime)/1000} seconds since last event for costume ${costumeId}.`);

    if (currentTime - entry.lastEventTime > oneMinuteInMillis) {
        currentCount = entry.count + 1;
        dataStore[costumeId] = { count: currentCount, lastEventTime: currentTime };
        try {
            localStorage.setItem(key, JSON.stringify(dataStore));
        } catch (e) {
            console.error(`Erro ao salvar '${key}' no localStorage:`, e);
        }
    } 
    return currentCount;
}


async function fetchFantasias() {
    loadingIndicator.classList.remove('hidden');
    errorMessageContainer.classList.add('hidden');
    try {
        const response = await fetch('./output/fantasias.json');
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
        }
        const data = await response.json();
        fantasias = data;
        console.log("Fantasias carregadas do arquivo JSON.");
        initializeApp();
    } catch (error) {
        console.warn('Falha ao carregar fantasias do arquivo JSON, usando dados de fallback:', error);
        fantasias = fallbackFantasias;
        initializeApp();
    }
}

function openCostumeModal(fantasia) {
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
    costumeModal.classList.remove('active');
    document.body.style.overflow = '';
    modalImage.src = "";
    modalImage.style.display = 'block';
    modalImagePlaceholder.classList.add('hidden');
}


function createCostumeCard(fantasia) {
    const displayName = fantasia.nome === "." ? "Sem Nome" : fantasia.nome;
    const card = document.createElement('div');
    card.className = 'card flex flex-col';
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

    imgElement.onload = () => {
        imgElement.classList.add('loaded');
        miniLoader.style.display = 'none';

        const updatedViewCount = handleCostumeEvent(costumeViewDataKey, fantasia._id);
        const viewCountSpan = card.querySelector(`#view-count-${fantasia._id}`);
        if (viewCountSpan) {
            viewCountSpan.textContent = updatedViewCount;
        }
    };
    imgElement.onerror = () => {
        miniLoader.style.display = 'none';
        placeholderText.classList.remove('hidden');
        imgElement.style.display = 'none';
    };

    const textContentDiv = document.createElement('div');
    textContentDiv.className = 'p-5 flex-grow flex flex-col';
    textContentDiv.innerHTML = `
                <h3 class="text-xl font-semibold text-gray-800 mb-2">${displayName}</h3>
                <p class="text-sm text-gray-600 mb-1"><span class="font-medium">Categoria:</span> ${fantasia.categoriaNome}</p>
                <p class="text-sm text-gray-600 mb-1"><span class="font-medium">Sexo:</span> ${fantasia.sexo}</p>
                <p class="text-sm text-gray-600"><span class="font-medium">Tipo:</span> ${fantasia.tipo}</p>
                <div class="mt-auto pt-3">
                    <p class="text-xs text-gray-400">ID: ${fantasia._id}</p>
                    <p class="text-xs text-gray-500 mt-1">Visualizações (Card): <span id="view-count-${fantasia._id}">${initialViewInfo.count}</span></p>
                    <p class="text-xs text-gray-500 mt-1">Cliques na Foto: <span id="card-click-count-${fantasia._id}">${initialClickInfo.count}</span></p>
                </div>
            `;

    card.appendChild(imageWrapper);
    card.appendChild(textContentDiv);

    return card;
}

function setupImageObserver(cardsToObserve) {
    if (imageObserver) {
        imageObserver.disconnect();
    }
    const options = { root: null, rootMargin: '0px', threshold: 0.1 };
    imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target.querySelector('img[data-src]');
                if (img && !img.src) {
                    img.src = img.dataset.src;
                    observer.unobserve(entry.target);
                }
            }
        });
    }, options);
    cardsToObserve.forEach(cardEl => imageObserver.observe(cardEl));
}

function createCheckboxGroup(container, items, groupName, changeHandler) {
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
    const categoriasUnicas = [...new Set(fantasias.map(f => f.categoriaNome))].sort();
    const sexos = [...new Set(fantasias.map(f => f.sexo))].sort();
    const tipos = [...new Set(fantasias.map(f => f.tipo))].sort();

    while (filterCategoriaSelect.options.length > 1) filterCategoriaSelect.remove(1);

    categoriasUnicas.forEach(cat => {
        if (cat) {
            const count = fantasias.filter(f => f.categoriaNome === cat).length;
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = `${cat} (${count})`;
            filterCategoriaSelect.appendChild(option);
        }
    });
    const checkboxChangeHandler = () => { currentPage = 1; applyFiltersAndSort(null); };
    createCheckboxGroup(filterSexoCheckboxesContainer, sexos, 'sexo', checkboxChangeHandler);
    createCheckboxGroup(filterTipoCheckboxesContainer, tipos, 'tipo', checkboxChangeHandler);
}

function getSelectedCheckboxValues(groupName) {
    const checkboxes = document.querySelectorAll(`input[name="${groupName}"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

function updateActiveFiltersDisplay() {
    const activeFilters = [];
    const selectedCategoriaValue = filterCategoriaSelect.value;
    const selectedSexosValues = getSelectedCheckboxValues('sexo');
    const selectedTiposValues = getSelectedCheckboxValues('tipo');
    const searchTermValue = searchNomeInput.value.trim();

    if (selectedCategoriaValue) {
        const catOption = Array.from(filterCategoriaSelect.options).find(opt => opt.value === selectedCategoriaValue);
        activeFilters.push(`Categoria: ${catOption ? catOption.textContent : selectedCategoriaValue}`);
    }
    if (selectedSexosValues.length > 0) {
        activeFilters.push(`Sexo: ${selectedSexosValues.join(', ')}`);
    }
    if (selectedTiposValues.length > 0) {
        activeFilters.push(`Tipo: ${selectedTiposValues.join(', ')}`);
    }
    if (searchTermValue) {
        activeFilters.push(`Busca: "${searchTermValue}"`);
    }

    if (activeFilters.length > 0) {
        activeFiltersDisplay.innerHTML = `<strong class="font-semibold">Filtros Ativos:</strong> ${activeFilters.join('; ')}`;
        activeFiltersDisplay.classList.remove('hidden');
    } else {
        activeFiltersDisplay.textContent = '';
        activeFiltersDisplay.classList.add('hidden');
    }
}

function toggleButtonLoading(button, isLoading) {
    if (!button) return;
    const textSpan = button.querySelector('.btn-text');
    const loaderSpan = button.querySelector('.btn-loader-icon');

    if (isLoading) {
        button.disabled = true;
        if (textSpan) textSpan.style.display = 'none';
        if (loaderSpan) {
            loaderSpan.classList.add('btn-loader');
            loaderSpan.style.display = 'inline-block';
        }
    } else {
        button.disabled = false;
        if (textSpan) textSpan.style.display = 'inline';
        if (loaderSpan) {
            loaderSpan.classList.remove('btn-loader');
            loaderSpan.style.display = 'none';
        }
    }
}


function createPaginationControls(container, totalItems, page) {
    container.innerHTML = '';
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages <= 1) {
        if (container === paginationContainerBottom) {
            resultsCountContainer.textContent = `Exibindo ${totalItems} de ${fantasias.length} fantasias.`;
        }
        return;
    }

    const pageButton = (pageNum, text, isDisabled = false, isActive = false) => {
        const button = document.createElement('button');
        const textSpan = document.createElement('span');
        textSpan.className = 'btn-text';
        textSpan.textContent = text || pageNum;
        const loaderSpan = document.createElement('span');
        loaderSpan.className = 'btn-loader-icon hidden';

        button.appendChild(textSpan);
        button.appendChild(loaderSpan);
        button.className = 'pagination-button';

        if (isActive) button.classList.add('active');
        button.disabled = isDisabled;
        button.addEventListener('click', function () {
            toggleButtonLoading(this, true);
            currentPage = pageNum;
            applyFiltersAndSort(this);
            window.scrollTo({ top: costumeContainer.offsetTop - 100, behavior: 'smooth' });
        });
        return button;
    };

    container.appendChild(pageButton(page - 1, 'Anterior', page === 1));

    const maxPagesToShow = 5;
    let startPageNum = 1;
    let endPageNum = totalPages;

    if (totalPages > maxPagesToShow) {
        if (page <= Math.floor(maxPagesToShow / 2) + 1) {
            endPageNum = maxPagesToShow - 1;
            container.appendChild(pageButton(1, null, false, 1 === page));
            for (let i = 2; i <= endPageNum; i++) {
                container.appendChild(pageButton(i, null, false, i === page));
            }
            container.appendChild(document.createTextNode('...'));
            container.appendChild(pageButton(totalPages, null, false, totalPages === page));

        } else if (page >= totalPages - Math.floor(maxPagesToShow / 2)) {
            startPageNum = totalPages - maxPagesToShow + 2;
            container.appendChild(pageButton(1, null, false, 1 === page));
            container.appendChild(document.createTextNode('...'));
            for (let i = startPageNum; i <= totalPages; i++) {
                container.appendChild(pageButton(i, null, false, i === page));
            }
        } else {
            startPageNum = page - Math.floor((maxPagesToShow - 3) / 2);
            endPageNum = page + Math.floor((maxPagesToShow - 3) / 2);
            container.appendChild(pageButton(1, null, false, 1 === page));
            container.appendChild(document.createTextNode('...'));
            for (let i = startPageNum; i <= endPageNum; i++) {
                container.appendChild(pageButton(i, null, false, i === page));
            }
            container.appendChild(document.createTextNode('...'));
            container.appendChild(pageButton(totalPages, null, false, totalPages === page));
        }
    } else {
        for (let i = 1; i <= totalPages; i++) {
            container.appendChild(pageButton(i, null, false, i === page));
        }
    }
    container.appendChild(pageButton(page + 1, 'Próxima', page === totalPages));
}

// Funções para URL
function getFiltersFromURL() {
    const params = new URLSearchParams(window.location.search); // Alterado de hash para search
    const filters = {};
    if (params.has('categoria')) filters.categoria = params.get('categoria');
    if (params.has('sexo')) filters.sexo = params.get('sexo').split(',');
    if (params.has('tipo')) filters.tipo = params.get('tipo').split(',');
    if (params.has('busca')) filters.busca = params.get('busca');
    if (params.has('pagina')) filters.pagina = parseInt(params.get('pagina'), 10);
    if (params.has('ordem')) filters.ordem = params.get('ordem');
    if (params.has('dir')) filters.dir = params.get('dir');
    return filters;
}

function setFiltersFromStateObject(filters) {
    if (filters.categoria) filterCategoriaSelect.value = filters.categoria;
    if (filters.busca) searchNomeInput.value = filters.busca;

    document.querySelectorAll('input[name="sexo"]').forEach(cb => {
        cb.checked = filters.sexo ? filters.sexo.includes(cb.value) : false;
    });
    document.querySelectorAll('input[name="tipo"]').forEach(cb => {
        cb.checked = filters.tipo ? filters.tipo.includes(cb.value) : false;
    });

    if (filters.ordem) currentSortType = filters.ordem;
    if (filters.dir) currentSortDirectionForName = filters.dir;

    if (currentSortType === 'name') {
        sortByNameButton.querySelector('.btn-text').textContent = `Ordenar por Nome (${currentSortDirectionForName === 'asc' ? 'A-Z' : 'Z-A'})`;
    } else {
        sortByNameButton.querySelector('.btn-text').textContent = `Ordenar por Nome (A-Z)`;
    }
}

function updateURLFromCurrentFilters() {
    const params = new URLSearchParams();
    const selectedCategoria = filterCategoriaSelect.value;
    const selectedSexos = getSelectedCheckboxValues('sexo');
    const selectedTipos = getSelectedCheckboxValues('tipo');
    const searchTerm = searchNomeInput.value.trim();

    if (selectedCategoria) params.set('categoria', selectedCategoria);
    if (selectedSexos.length > 0) params.set('sexo', selectedSexos.join(','));
    if (selectedTipos.length > 0) params.set('tipo', selectedTipos.join(','));
    if (searchTerm) params.set('busca', searchTerm);
    if (currentPage > 1) params.set('pagina', currentPage);
    if (currentSortType !== 'default') {
        params.set('ordem', currentSortType);
        if (currentSortType === 'name') {
            params.set('dir', currentSortDirectionForName);
        }
    }

    const newQueryString = params.toString();
    const newURL = `${window.location.pathname}${newQueryString ? '?' + newQueryString : ''}`;

    // Só atualiza se a URL realmente mudou para evitar loops com popstate
    if (window.location.href !== newURL && window.location.search !== (newQueryString ? '?' + newQueryString : '')) {
        history.pushState({ path: newURL }, '', newURL);
    }
}


let filterTimeout;
function applyFiltersAndSort(initiatingButton = null, updateUrl = true) {
    if (!fantasias) return;
    noResultsMessage.classList.add('hidden');
    if (!initiatingButton) {
        loadingIndicator.classList.remove('hidden');
    }


    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(() => {
        const selectedCategoria = filterCategoriaSelect.value;
        const selectedSexos = getSelectedCheckboxValues('sexo');
        const selectedTipos = getSelectedCheckboxValues('tipo');
        const searchTerm = searchNomeInput.value.toLowerCase().trim();

        let filteredAndSortedFantasias = fantasias.filter(fantasia => {
            const searchId = String(fantasia._id);
            const nameOrIdMatches = fantasia.nome.toLowerCase().includes(searchTerm) ||
                (fantasia.nome === "." && ("sem nome".includes(searchTerm) || searchTerm === ".")) ||
                searchId.includes(searchTerm);
            const categoriaMatches = !selectedCategoria || fantasia.categoriaNome === selectedCategoria;
            const sexoMatches = selectedSexos.length === 0 || selectedSexos.includes(fantasia.sexo);
            const tipoMatches = selectedTipos.length === 0 || selectedTipos.includes(fantasia.tipo);
            return nameOrIdMatches && categoriaMatches && sexoMatches && tipoMatches;
        });

        if (currentSortType === 'name') {
            filteredAndSortedFantasias.sort((a, b) => {
                const nameA = a.nome === "." ? "zzz" : a.nome.toLowerCase();
                const nameB = b.nome === "." ? "zzz" : b.nome.toLowerCase();
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

        costumeContainer.innerHTML = '';
        const currentCardsOnPage = [];

        if (itemsForCurrentPage.length === 0 && fantasias.length > 0) {
            noResultsMessage.classList.remove('hidden');
        } else {
            itemsForCurrentPage.forEach(fantasia => {
                const cardElement = createCostumeCard(fantasia);
                currentCardsOnPage.push(cardElement);
                costumeContainer.appendChild(cardElement);
            });
            setupImageObserver(currentCardsOnPage);
        }

        const startItemNum = totalFilteredItems > 0 ? startIndex + 1 : 0;
        const endItemNum = Math.min(endIndex, totalFilteredItems);
        resultsCountContainer.textContent = `Exibindo ${startItemNum}-${endItemNum} de ${totalFilteredItems} fantasias. (Total: ${fantasias.length})`;
        updateActiveFiltersDisplay();
        createPaginationControls(paginationContainerTop, totalFilteredItems, currentPage);
        createPaginationControls(paginationContainerBottom, totalFilteredItems, currentPage);

        if (updateUrl) {
            updateURLFromCurrentFilters();
        }

        if (initiatingButton) {
            toggleButtonLoading(initiatingButton, false);
        } else {
            toggleButtonLoading(sortByNameButton, false);
            toggleButtonLoading(sortByViewsButton, false);
            toggleButtonLoading(randomSearchButton, false);
            toggleButtonLoading(clearFiltersButton, false);
        }
        loadingIndicator.classList.add('hidden');

    }, searchNomeInput === document.activeElement ? 300 : 200);
}

function handleSortByNameClick() {
    toggleButtonLoading(sortByNameButton, true);
    if (currentSortType === 'name') {
        currentSortDirectionForName = currentSortDirectionForName === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortType = 'name';
        currentSortDirectionForName = 'asc';
    }
    sortByNameButton.querySelector('.btn-text').textContent = `Ordenar por Nome (${currentSortDirectionForName === 'asc' ? 'A-Z' : 'Z-A'})`;
    currentPage = 1;
    applyFiltersAndSort(sortByNameButton);
}

function handleSortByViewsClick() {
    toggleButtonLoading(sortByViewsButton, true);
    currentSortType = 'views';
    currentSortDirectionForName = 'asc';
    sortByNameButton.querySelector('.btn-text').textContent = `Ordenar por Nome (A-Z)`;
    currentPage = 1;
    applyFiltersAndSort(sortByViewsButton);
}

function resetAllFilterStates() {
    searchNomeInput.value = '';
    filterCategoriaSelect.value = '';

    document.querySelectorAll('input[name="sexo"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[name="tipo"]').forEach(cb => cb.checked = false);

    currentSortType = 'default';
    currentSortDirectionForName = 'asc';
    sortByNameButton.querySelector('.btn-text').textContent = `Ordenar por Nome (A-Z)`;
    currentPage = 1;
}

function handleRandomSearchClick() {
    toggleButtonLoading(randomSearchButton, true);
    resetAllFilterStates();

    if (fantasias.length > 0) {
        const randomIndex = Math.floor(Math.random() * fantasias.length);
        const randomCostume = fantasias[randomIndex];
        searchNomeInput.value = randomCostume.nome === "." ? "" : randomCostume.nome;
    }
    applyFiltersAndSort(randomSearchButton);
}


function clearFiltersButtonClickHandler() {
    toggleButtonLoading(clearFiltersButton, true);
    resetAllFilterStates();
    applyFiltersAndSort(clearFiltersButton);
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

    if (!initialFilters.categoria && !initialFilters.sexo && !initialFilters.tipo && !initialFilters.busca) {
        const vitrineOption = Array.from(filterCategoriaSelect.options).find(opt => opt.value.toLowerCase() === "vitrine");
        if (vitrineOption) {
            filterCategoriaSelect.value = vitrineOption.value;
        }
    }

    applyFiltersAndSort(null, true);
    loadingIndicator.classList.add('hidden');

    filterCategoriaSelect.addEventListener('change', () => { currentPage = 1; applyFiltersAndSort(null); });
    searchNomeInput.addEventListener('input', () => { currentPage = 1; applyFiltersAndSort(null); });
    clearFiltersButton.addEventListener('click', clearFiltersButtonClickHandler);
    sortByNameButton.addEventListener('click', handleSortByNameClick);
    sortByViewsButton.addEventListener('click', handleSortByViewsClick);
    randomSearchButton.addEventListener('click', handleRandomSearchClick);

    modalCloseButton.addEventListener('click', closeCostumeModal);
    costumeModal.addEventListener('click', (event) => {
        if (event.target === costumeModal) {
            closeCostumeModal();
        }
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && costumeModal.classList.contains('active')) {
            closeCostumeModal();
        }
    });

    window.addEventListener('popstate', (event) => {
        const filtersFromURL = getFiltersFromURL();
        setFiltersFromStateObject(filtersFromURL);
        currentPage = filtersFromURL.pagina || 1;
        applyFiltersAndSort(null, false); // Não atualiza a URL de novo, pois o estado já mudou
    });
}

document.addEventListener('DOMContentLoaded', fetchFantasias);

