const STORAGE_KEY = 'sntrueAvailabilityData';
const DEFAULT_DATA_VERSION_KEY = STORAGE_KEY + ':defaults-version';
// Incrémenter cette version après avoir ajouté des annonces à defaultData.
const DEFAULT_DATA_VERSION = 1;
const DASHBOARD_TOKEN = 'sky-location';
const LEGACY_DASHBOARD_TOKENS = ['sky-admin', 'sky-admin.', 'sky-admin-2026', 'sntrue-admin-2026', 'SKYlocation-admin-2026'];

// Ajouter les annonces ici et placer chaque image dans le dossier images/ du dépôt.
const defaultData = {
    logements: [{
            id: 'villa-riviera',
            name: 'Villa Riviera',
            category: 'Villa',
            price: '120€/j',
            image: 'images/logements/villa-riviera.svg',
            emoji: '🏡',
            availability: 'Disponible 2 jours',
            description: '3 chambres, vue mer, piscine privée, idéal pour un séjour en famille ou un week-end premium.'
        },
        {
            id: 'appartement-centre',
            name: 'Appartement Centre',
            category: 'Appartement',
            price: '75€/j',
            image: 'images/logements/appartement-centre.svg',
            emoji: '🏘️',
            availability: 'Disponible aujourd\'hui',
            description: '2 chambres, cuisine équipée, très bien situé pour les déplacements professionnels et touristiques.'
        },
        {
            id: 'residence-palmier',
            name: 'Résidence Palmier',
            category: 'Résidence',
            price: '95€/j',
            image: 'images/logements/residence-palmier.svg',
            emoji: '🌴',
            availability: 'Disponible 5 jours',
            description: 'Confort moderne, jardin, parking privé et accès rapide aux services de la ville.'
        }
    ],
    vehicules: [{
            id: 'renault-clio',
            name: 'Renault Clio',
            category: 'Citadine',
            price: '35€/j',
            image: 'images/vehicules/renault-clio.svg',
            emoji: '🚘',
            availability: 'Disponible aujourd\'hui',
            description: 'Économique et maniable, idéale pour les trajets urbains et les petites escapades.'
        },
        {
            id: 'ford-suv',
            name: 'Ford SUV',
            category: 'SUV',
            price: '58€/j',
            image: 'images/vehicules/ford-suv.svg',
            emoji: '🚙',
            availability: 'Disponible 3 jours',
            description: 'Confort, espace et sécurité pour les déplacements famille ou les voyages plus longs.'
        },
        {
            id: 'bmw-serie-1',
            name: 'BMW Série 1',
            category: 'Berline',
            price: '48€/j',
            image: 'images/vehicules/bmw-serie-1.svg',
            emoji: '🚗',
            availability: 'Disponible 2 jours',
            description: 'Confort premium, conduite agréable et design élégant pour les trajets professionnels.'
        }
    ]
};

function getData() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        const data = savedData ? JSON.parse(savedData) : JSON.parse(JSON.stringify(defaultData));
        if (!data.logements || !data.vehicules) {
            data.logements = JSON.parse(JSON.stringify(defaultData.logements));
            data.vehicules = JSON.parse(JSON.stringify(defaultData.vehicules));
        }

        const savedVersion = Number(localStorage.getItem(DEFAULT_DATA_VERSION_KEY)) || 0;
        if (savedVersion < DEFAULT_DATA_VERSION) {
            ['logements', 'vehicules'].forEach(function(type) {
                const items = Array.isArray(data[type]) ? data[type] : [];
                defaultData[type].forEach(function(defaultItem) {
                    const existingItem = items.find(function(item) { return item.id === defaultItem.id; });
                    if (!existingItem) {
                        items.push(Object.assign({}, defaultItem));
                    } else if (!existingItem.image && defaultItem.image) {
                        existingItem.image = defaultItem.image;
                    }
                });
                data[type] = items;
            });
            saveData(data);
            localStorage.setItem(DEFAULT_DATA_VERSION_KEY, String(DEFAULT_DATA_VERSION));
        }

        return data;
    } catch (error) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
        return JSON.parse(JSON.stringify(defaultData));
    }
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function refreshPublicPagesFromStorage() {
    const page = document.body && document.body.dataset && document.body.dataset.page;
    if (page === 'logements') {
        renderCatalog('logements');
    }
    if (page === 'vehicules') {
        renderCatalog('vehicules');
    }
}

window.addEventListener('storage', function(event) {
    if (event.key === STORAGE_KEY) {
        refreshPublicPagesFromStorage();
    }
});

function renderCatalog(type) {
    const catalogNode = document.querySelector('[data-catalog="' + type + '"]');
    if (!catalogNode) return;

    const data = getData();
    const items = data[type] || [];
    const reservationPage = type === 'logements' ? 'logements.html#reservation' : 'vehicules.html#reservation';

    if (!items.length) {
        catalogNode.innerHTML = '<div class="empty-state">Aucune disponibilité enregistrée pour le moment.</div>';
        return;
    }

    catalogNode.innerHTML = items.map(function(item) {
                const image = item.image ?
                        `<img src="${item.image}" alt="${item.name}" loading="lazy">` :
                        `<span aria-hidden="true">${item.emoji || '🏠'}</span>`;
        return `
      <article class="card">
                <div class="image">${image}</div>
        <div class="body">
          <div class="meta">
            <span class="badge">${item.category || 'Disponibilité'}</span>
            <span class="price">${item.price || 'Sur demande'}</span>
          </div>
          <h3>${item.name}</h3>
          <p>${item.description || 'Disponibilité mise à jour.'}</p>
          <div class="card-row">
            <small>${item.availability || 'Disponible'}</small>
            <a href="${reservationPage}" class="btn btn-primary" style="padding:10px 16px; font-size:0.8rem;">Réserver</a>
          </div>
        </div>
      </article>
    `;
    }).join('');
}

function initDashboard() {
    const form = document.getElementById('availability-form');
    const typeField = document.getElementById('type');
    const itemList = document.getElementById('item-list');
    const resetBtn = document.getElementById('reset-btn');
    const formTitle = document.getElementById('form-title');
    const hiddenId = document.getElementById('item-id');

    function renderDashboardList() {
        const data = getData();
        const selectedType = typeField.value;
        const items = data[selectedType] || [];

        itemList.innerHTML = items.map(function(item) {
            return `
        <li>
          <div>
            <strong>${item.name}</strong>
            <span>${item.availability}</span>
          </div>
          <div class="mini-actions">
            <button type="button" class="mini-btn edit" data-edit="${item.id}">Modifier</button>
            <button type="button" class="mini-btn delete" data-delete="${item.id}">Supprimer</button>
          </div>
        </li>
      `;
        }).join('') || '<li class="empty-list">Aucune disponibilité enregistrée.</li>';

        document.querySelectorAll('[data-edit]').forEach(function(button) {
            button.addEventListener('click', function() {
                const id = button.getAttribute('data-edit');
                const dataSet = getData();
                const selected = (dataSet[selectedType] || []).find(function(item) { return item.id === id; });
                if (!selected) return;

                formTitle.textContent = 'Modifier une disponibilité';
                hiddenId.value = selected.id;
                document.getElementById('name').value = selected.name;
                document.getElementById('category').value = selected.category;
                document.getElementById('price').value = selected.price;
                document.getElementById('emoji').value = selected.emoji;
                document.getElementById('availability').value = selected.availability;
                document.getElementById('description').value = selected.description;
            });
        });

        document.querySelectorAll('[data-delete]').forEach(function(button) {
            button.addEventListener('click', function() {
                const id = button.getAttribute('data-delete');
                const dataSet = getData();
                dataSet[selectedType] = (dataSet[selectedType] || []).filter(function(item) { return item.id !== id; });
                saveData(dataSet);
                renderDashboardList();
                renderCatalog(selectedType);
            });
        });
    }

    function resetForm() {
        form.reset();
        hiddenId.value = '';
        formTitle.textContent = 'Ajouter une disponibilité';
        document.getElementById('type').value = 'logements';
    }

    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();

            const typeValue = typeField.value;
            const selectedTypeList = typeValue === 'logements' ? 'logements' : 'vehicules';
            const data = getData();
            const itemId = hiddenId.value || (document.getElementById('name').value + '-' + Date.now()).toLowerCase().replace(/[^a-z0-9-]+/g, '-');
            const existingItem = (data[selectedTypeList] || []).find(function(item) { return item.id === itemId; });
            const values = {
                id: itemId,
                name: document.getElementById('name').value.trim(),
                category: document.getElementById('category').value.trim() || 'Disponibilité',
                price: document.getElementById('price').value.trim() || 'Sur demande',
                image: existingItem ? existingItem.image : '',
                emoji: document.getElementById('emoji').value.trim() || '🏠',
                availability: document.getElementById('availability').value.trim() || 'Disponible',
                description: document.getElementById('description').value.trim() || 'Disponibilité mise à jour.'
            };

            if (!values.name) return;

            const currentList = data[selectedTypeList] || [];
            const itemIndex = currentList.findIndex(function(item) { return item.id === values.id; });

            if (itemIndex >= 0) {
                currentList[itemIndex] = values;
            } else {
                currentList.push(values);
            }

            data[selectedTypeList] = currentList;
            saveData(data);
            renderCatalog(selectedTypeList);
            renderDashboardList();
            form.reset();
            hiddenId.value = '';
            formTitle.textContent = 'Ajouter une disponibilité';
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            saveData(JSON.parse(JSON.stringify(defaultData)));
            renderCatalog('logements');
            renderCatalog('vehicules');
            renderDashboardList();
            resetForm();
        });
    }

    if (typeField) {
        typeField.addEventListener('change', renderDashboardList);
    }

    renderDashboardList();
}

function isDashboardAuthorized() {
    const params = new URLSearchParams(window.location.search);
    const providedToken = params.get('token');
    return providedToken === DASHBOARD_TOKEN || LEGACY_DASHBOARD_TOKENS.includes(providedToken);
}

function initPage() {
    const page = document.body.dataset.page;

    if (page === 'logements') {
        renderCatalog('logements');
    }

    if (page === 'vehicules') {
        renderCatalog('vehicules');
    }

    if (page === 'dashboard') {
        if (!isDashboardAuthorized()) {
            const dashboardContent = document.getElementById('dashboard-content');
            if (dashboardContent) {
                dashboardContent.innerHTML = `
                    <div class="wrap" style="padding-top:80px; padding-bottom:80px;">
                        <div class="panel" style="max-width:640px; margin:0 auto; text-align:center;">
                            <h2 style="margin-bottom:12px;">Accès restreint</h2>
                            <p class="muted" style="margin-bottom:18px;">Cette page est réservée à l’administration.</p>
                            <a href="index.html" class="btn btn-primary">Retour au site</a>
                        </div>
                    </div>
                `;
            }
            return;
        }
        initDashboard();
    }
}

document.addEventListener('DOMContentLoaded', initPage);