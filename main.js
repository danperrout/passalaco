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

    // console.log(`${(currentTime - entry.lastEventTime) / 1000} seconds since last event for costume ${costumeId}.`);

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
        const response = await fetch('output/fantasias.json');
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
    modalViewCount.textContent = viewInfo.count; // View count no modal é o total atual
    modalClickCount.textContent = clickInfoCount; // Click count no modal é o total atual

    // Atualiza o contador de cliques no card, se o card ainda estiver visível/existir
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
    imageWrapper.className = 'image-wrapper'; // Estilos definidos no CSS (altura, position relative, etc.)
    imageWrapper.addEventListener('click', () => openCostumeModal(fantasia));

    const miniLoader = document.createElement('div');
    miniLoader.className = 'mini-loader';

    const imgElement = document.createElement('img');
    imgElement.dataset.src = fantasia.imgUrl;
    imgElement.alt = `[Imagem de ${displayName}]`;
    // A classe 'loaded' será adicionada no onload

    const placeholderText = document.createElement('div');
    placeholderText.className = 'image-placeholder-text hidden';
    placeholderText.textContent = 'Imagem não disponível';

    imageWrapper.appendChild(miniLoader);
    imageWrapper.appendChild(imgElement);
    imageWrapper.appendChild(placeholderText);

    const initialViewInfo = getCostumeDataFromStorage(costumeViewDataKey, fantasia._id);
    const initialClickInfo = getCostumeDataFromStorage(costumeImageClickDataKey, fantasia._id);

    // ID no canto superior esquerdo da imagem
    const idElement = document.createElement('div');
    // Usando classes Tailwind para posicionamento e a classe CSS para aparência
    idElement.className = 'absolute top-1.5 left-1.5 card-info-on-image';
    idElement.textContent = `ID: ${fantasia._id}`;
    imageWrapper.appendChild(idElement);

    // Contadores de Visualizações e Cliques no canto inferior direito da imagem
    const statsElement = document.createElement('div');
    statsElement.className = 'absolute bottom-1.5 right-1.5 card-info-on-image'; // flex e items-center já estão no CSS
    statsElement.innerHTML = `
        <span class="mr-0.5">👁️</span> <span id="view-count-${fantasia._id}">${initialViewInfo.count}</span>
        <span class="ml-1.5 mr-0.5">📸</span> <span id="card-click-count-${fantasia._id}">${initialClickInfo.count}</span>
    `;
    imageWrapper.appendChild(statsElement);

    imgElement.onload = () => {
        imgElement.classList.add('loaded');
        miniLoader.style.display = 'none';

        // Atualiza a contagem de visualizações DO CARD (não confundir com modal)
        // O evento de visualização do card é contado aqui, quando a imagem carrega e se torna visível
        const updatedViewCount = handleCostumeEvent(costumeViewDataKey, fantasia._id);
        const viewCountSpan = card.querySelector(`#view-count-${fantasia._id}`); // Busca o span dentro do card
        if (viewCountSpan) {
            viewCountSpan.textContent = updatedViewCount;
        }
    };
    imgElement.onerror = () => {
        miniLoader.style.display = 'none';
        placeholderText.classList.remove('hidden');
        imgElement.style.display = 'none'; // Esconde o ícone de imagem quebrada
    };

    const textContentDiv = document.createElement('div');
    // Usando classes Tailwind para padding e layout de texto compacto
    textContentDiv.className = 'p-3 flex-grow flex flex-col'; // p-3 = padding 0.75rem
    textContentDiv.innerHTML = `
        <h3 class="text-base font-semibold text-gray-800 mb-1 truncate" title="${displayName}">${displayName}</h3>
        <p class="text-xs text-gray-600 mb-0.5"><span class="font-medium">Cat:</span> ${fantasia.categoriaNome}</p>
        <p class="text-xs text-gray-600 mb-0.5"><span class="font-medium">Sex:</span> ${fantasia.sexo}</p>
        <p class="text-xs text-gray-600"><span class="font-medium">Tipo:</span> ${fantasia.tipo}</p>
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
                if (img && !img.src) { // Verifica se a imagem já não foi carregada
                    img.src = img.dataset.src;
                    // Não desobserve imediatamente aqui se quiser recontar views se o card sair e voltar à tela
                    // Mas para lazy loading simples, desobservar é bom para performance.
                    // Para a contagem de views no card ao se tornar visível, o img.onload já trata.
                    // observer.unobserve(entry.target); // Removido para permitir que o onload sempre dispare se a img.src for resetada
                }
            }
        });
    }, options);
    cardsToObserve.forEach(cardEl => {
        const img = cardEl.querySelector('img[data-src]');
        if (img && !img.src) { // Observe apenas se a imagem ainda não foi carregada
            imageObserver.observe(cardEl); // Observa o card (ou a imageWrapper)
        }
    });
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
        activeFilters.push(`Categoria: ${catOption ? catOption.textContent.split(' (')[0] : selectedCategoriaValue}`);
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
        if (textSpan) textSpan.style.display = 'none'; // Esconde o texto
        if (loaderSpan) {
            loaderSpan.classList.add('btn-loader'); // Adiciona a classe para animação
            loaderSpan.style.display = 'inline-block'; // Mostra o loader
        }
    } else {
        button.disabled = false;
        if (textSpan) textSpan.style.display = 'inline'; // Mostra o texto
        if (loaderSpan) {
            loaderSpan.classList.remove('btn-loader'); // Remove a classe de animação
            loaderSpan.style.display = 'none'; // Esconde o loader
        }
    }
}


function createPaginationControls(container, totalItems, page) {
    container.innerHTML = '';
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages <= 1) {
        // Não mostra paginação se houver 0 ou 1 página
        // A contagem de resultados já é atualizada em applyFiltersAndSort
        return;
    }

    const pageButton = (pageNum, text, isDisabled = false, isActive = false) => {
        const button = document.createElement('button');
        const textSpan = document.createElement('span');
        textSpan.className = 'btn-text';
        textSpan.textContent = text || pageNum;
        const loaderSpan = document.createElement('span');
        loaderSpan.className = 'btn-loader-icon hidden'; // Mantém hidden inicialmente

        button.appendChild(textSpan);
        button.appendChild(loaderSpan);
        button.className = 'pagination-button';

        if (isActive) button.classList.add('active');
        button.disabled = isDisabled;
        button.addEventListener('click', function () {
            if (this.disabled || this.classList.contains('active')) return; // Não faz nada se desabilitado ou já ativo
            toggleButtonLoading(this, true); // Mostra loader no botão clicado
            currentPage = pageNum;
            applyFiltersAndSort(this); // Passa o botão para desativar o loader depois
            // Scroll para o topo do container de fantasias
            window.scrollTo({ top: costumeContainer.offsetTop - 100, behavior: 'smooth' });
        });
        return button;
    };

    // Botão "Anterior"
    container.appendChild(pageButton(page - 1, 'Anterior', page === 1));

    // Lógica para exibir números de página (simplificada para exemplo)
    const maxPagesToShow = 5; // Total de botões de página (excluindo prev/next)
    let startPageNum = 1;
    let endPageNum = totalPages;

    if (totalPages > maxPagesToShow) {
        let middle = Math.ceil(maxPagesToShow / 2);
        if (page > middle) {
            startPageNum = Math.min(page - middle + 1, totalPages - maxPagesToShow + 1);
        }
        endPageNum = Math.min(startPageNum + maxPagesToShow - 1, totalPages);
        startPageNum = Math.max(1, endPageNum - maxPagesToShow + 1); // Recalcula startPage para garantir maxPagesToShow

        if (startPageNum > 1) {
            container.appendChild(pageButton(1, '1', false, 1 === page));
            if (startPageNum > 2) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                dots.className = 'px-2 py-1';
                container.appendChild(dots);
            }
        }
    }

    for (let i = startPageNum; i <= endPageNum; i++) {
        container.appendChild(pageButton(i, null, false, i === page));
    }

    if (totalPages > maxPagesToShow && endPageNum < totalPages) {
        if (endPageNum < totalPages - 1) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.className = 'px-2 py-1';
            container.appendChild(dots);
        }
        container.appendChild(pageButton(totalPages, totalPages, false, totalPages === page));
    }


    // Botão "Próxima"
    container.appendChild(pageButton(page + 1, 'Próxima', page === totalPages));
}

// Funções para URL
function getFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);
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
    else filterCategoriaSelect.value = "";

    if (filters.busca) searchNomeInput.value = filters.busca;
    else searchNomeInput.value = "";


    document.querySelectorAll('input[name="sexo"]').forEach(cb => {
        cb.checked = filters.sexo ? filters.sexo.includes(cb.value) : false;
    });
    document.querySelectorAll('input[name="tipo"]').forEach(cb => {
        cb.checked = filters.tipo ? filters.tipo.includes(cb.value) : false;
    });

    currentSortType = filters.ordem || 'default';
    currentSortDirectionForName = filters.dir || 'asc';


    if (currentSortType === 'name') {
        sortByNameButton.querySelector('.btn-text').textContent = `Ordenar por Nome (${currentSortDirectionForName === 'asc' ? 'A-Z' : 'Z-A'})`;
    } else {
        sortByNameButton.querySelector('.btn-text').textContent = `Ordenar por Nome (A-Z)`; // Reset visual
    }
    // Visualmente desativa outros botões de ordenação se um estiver ativo (opcional)
    // sortByViewsButton.classList.toggle('active-sort', currentSortType === 'views');
    // sortByNameButton.classList.toggle('active-sort', currentSortType === 'name');
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
    const currentQueryString = window.location.search.substring(1); // Remove o '?'

    // Só atualiza se a URL realmente mudou para evitar loops com popstate e entradas desnecessárias no histórico
    if (newQueryString !== currentQueryString) {
        const newURL = `${window.location.pathname}${newQueryString ? '?' + newQueryString : ''}`;
        history.pushState({ path: newURL, filters: getCurrentFiltersStateForHistory() }, '', newURL);
    }
}

function getCurrentFiltersStateForHistory() {
    // Helper para pegar o estado atual dos filtros para o history.pushState
    return {
        categoria: filterCategoriaSelect.value,
        sexo: getSelectedCheckboxValues('sexo'),
        tipo: getSelectedCheckboxValues('tipo'),
        busca: searchNomeInput.value.trim(),
        pagina: currentPage,
        ordem: currentSortType,
        dir: currentSortDirectionForName
    };
}


let filterTimeout;
function applyFiltersAndSort(initiatingButton = null, updateUrl = true) {
    if (!fantasias) return;

    // Mostra o loader principal apenas se não for uma ação de botão específico (que tem seu próprio loader)
    if (!initiatingButton) {
        loadingIndicator.classList.remove('hidden');
        costumeContainer.innerHTML = ''; // Limpa resultados antigos para mostrar loader
        paginationContainerTop.innerHTML = '';
        paginationContainerBottom.innerHTML = '';
        resultsCountContainer.textContent = 'Carregando...';
    }
    noResultsMessage.classList.add('hidden');


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
                const nameA = a.nome === "." ? "zzzzzz" : a.nome.toLowerCase(); // "zzzzzz" para "Sem Nome" ir para o fim em ASC
                const nameB = b.nome === "." ? "zzzzzz" : b.nome.toLowerCase();
                if (nameA < nameB) return currentSortDirectionForName === 'asc' ? -1 : 1;
                if (nameA > nameB) return currentSortDirectionForName === 'asc' ? 1 : -1;
                return 0;
            });
        } else if (currentSortType === 'views') {
            filteredAndSortedFantasias.sort((a, b) => {
                // É importante que getCostumeDataFromStorage não modifique os dados aqui, apenas leia
                const viewsA = getCostumeDataFromStorage(costumeViewDataKey, a._id).count;
                const viewsB = getCostumeDataFromStorage(costumeViewDataKey, b._id).count;
                return viewsB - viewsA; // Mais vistas primeiro
            });
        }
        // Se currentSortType === 'default', mantém a ordem original do JSON (ou do filtro anterior)

        const totalFilteredItems = filteredAndSortedFantasias.length;
        const totalPages = Math.ceil(totalFilteredItems / itemsPerPage);
        currentPage = Math.max(1, Math.min(currentPage, totalPages || 1)); // Garante que a página seja válida

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const itemsForCurrentPage = filteredAndSortedFantasias.slice(startIndex, endIndex);

        costumeContainer.innerHTML = ''; // Limpa o container antes de adicionar novos cards
        const currentCardsOnPage = [];

        if (itemsForCurrentPage.length === 0 && fantasias.length > 0) {
            noResultsMessage.classList.remove('hidden');
        } else {
            itemsForCurrentPage.forEach(fantasia => {
                const cardElement = createCostumeCard(fantasia);
                currentCardsOnPage.push(cardElement); // Adiciona o elemento DOM do card
                costumeContainer.appendChild(cardElement);
            });
            // Reconfigura o observer para os novos cards na página
            if (currentCardsOnPage.length > 0) {
                setupImageObserver(currentCardsOnPage);
            }
        }

        const startItemNum = totalFilteredItems > 0 ? startIndex + 1 : 0;
        const endItemNum = Math.min(endIndex, totalFilteredItems);
        resultsCountContainer.textContent = `Exibindo ${startItemNum}-${endItemNum} de ${totalFilteredItems} fantasias. (Total no catálogo: ${fantasias.length})`;

        updateActiveFiltersDisplay();
        createPaginationControls(paginationContainerTop, totalFilteredItems, currentPage);
        createPaginationControls(paginationContainerBottom, totalFilteredItems, currentPage);

        if (updateUrl) {
            updateURLFromCurrentFilters();
        }

        // Desativa o loader do botão que iniciou a ação (se houver)
        if (initiatingButton) {
            toggleButtonLoading(initiatingButton, false);
        }
        // Desativa o loader principal
        loadingIndicator.classList.add('hidden');

    }, searchNomeInput === document.activeElement || initiatingButton ? 150 : 50); // Delay menor se for interação direta
}

function handleSortByNameClick() {
    const button = sortByNameButton;
    toggleButtonLoading(button, true);
    if (currentSortType === 'name') {
        currentSortDirectionForName = currentSortDirectionForName === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortType = 'name';
        currentSortDirectionForName = 'asc'; // Padrão para ASC ao mudar para ordenação por nome
    }
    button.querySelector('.btn-text').textContent = `Ordenar por Nome (${currentSortDirectionForName === 'asc' ? 'A-Z' : 'Z-A'})`;
    currentPage = 1;
    applyFiltersAndSort(button);
}

function handleSortByViewsClick() {
    const button = sortByViewsButton;
    toggleButtonLoading(button, true);
    currentSortType = 'views';
    // Reset visual do botão de nome
    sortByNameButton.querySelector('.btn-text').textContent = `Ordenar por Nome (A-Z)`;
    currentSortDirectionForName = 'asc'; // Reset direção do nome
    currentPage = 1;
    applyFiltersAndSort(button);
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
    const button = randomSearchButton;
    toggleButtonLoading(button, true);
    resetAllFilterStates();

    if (fantasias.length > 0) {
        const randomIndex = Math.floor(Math.random() * fantasias.length);
        const randomCostume = fantasias[randomIndex];
        // Preenche o campo de busca com o nome da fantasia aleatória (ou ID se nome for '.')
        searchNomeInput.value = randomCostume.nome === "." ? String(randomCostume._id) : randomCostume.nome;
    }
    applyFiltersAndSort(button);
}


function clearFiltersButtonClickHandler() {
    const button = clearFiltersButton;
    toggleButtonLoading(button, true);
    resetAllFilterStates();
    applyFiltersAndSort(button); // Atualiza a exibição e a URL
}

function initializeApp() {
    populateFilters();

    const initialFilters = getFiltersFromURL();
    setFiltersFromStateObject(initialFilters); // Aplica filtros da URL aos campos
    currentPage = initialFilters.pagina || 1;  // Define a página da URL ou padrão 1

    // Handler para checkboxes (precisa ser definido após populateFilters)
    const checkboxChangeHandler = () => { currentPage = 1; applyFiltersAndSort(null); };
    document.querySelectorAll('#filterSexoCheckboxes input, #filterTipoCheckboxes input').forEach(cb => {
        // Remove listener antigo para evitar duplicação se initializeApp for chamado novamente
        cb.removeEventListener('change', checkboxChangeHandler);
        cb.addEventListener('change', checkboxChangeHandler);
    });

    // Se nenhum filtro principal estiver na URL, define "Vitrine" como padrão se existir
    if (!initialFilters.categoria && !initialFilters.sexo && !initialFilters.tipo && !initialFilters.busca) {
        const vitrineOption = Array.from(filterCategoriaSelect.options).find(opt => opt.value.toLowerCase() === "vitrine");
        if (vitrineOption) {
            filterCategoriaSelect.value = vitrineOption.value;
            // Não precisa setar na URL aqui, applyFiltersAndSort fará isso se updateUrl for true
        }
    }

    applyFiltersAndSort(null, true); // Aplica filtros (da URL ou padrão Vitrine) e atualiza a URL
    loadingIndicator.classList.add('hidden'); // Esconde o loader principal após a carga inicial

    // Event Listeners principais
    filterCategoriaSelect.addEventListener('change', () => { currentPage = 1; applyFiltersAndSort(null); });
    searchNomeInput.addEventListener('input', () => { currentPage = 1; applyFiltersAndSort(null); });
    clearFiltersButton.addEventListener('click', clearFiltersButtonClickHandler);
    sortByNameButton.addEventListener('click', handleSortByNameClick);
    sortByViewsButton.addEventListener('click', handleSortByViewsClick);
    randomSearchButton.addEventListener('click', handleRandomSearchClick);

    // Modal listeners
    modalCloseButton.addEventListener('click', closeCostumeModal);
    costumeModal.addEventListener('click', (event) => {
        if (event.target === costumeModal) { // Fecha se clicar no overlay
            closeCostumeModal();
        }
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && costumeModal.classList.contains('active')) {
            closeCostumeModal();
        }
    });

    // Listener para botões de navegação do navegador (voltar/avançar)
    window.addEventListener('popstate', (event) => {
        const state = event.state;
        if (state && state.filters) { // Se o estado tiver nossos filtros salvos
            setFiltersFromStateObject(state.filters);
            currentPage = state.filters.pagina || 1;
        } else { // Se não houver estado salvo, pega da URL (fallback)
            const filtersFromURL = getFiltersFromURL();
            setFiltersFromStateObject(filtersFromURL);
            currentPage = filtersFromURL.pagina || 1;
        }
        applyFiltersAndSort(null, false); // Aplica filtros do estado/URL, mas não atualiza a URL de novo
    });

    // Salva o estado inicial no histórico para que o botão voltar funcione corretamente desde o início
    if (!history.state || !history.state.filters) {
        history.replaceState({ path: window.location.href, filters: getCurrentFiltersStateForHistory() }, '', window.location.href);
    }
}

// Inicia o aplicativo quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', fetchFantasias);