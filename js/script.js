const STORAGE_KEY = 'sntrueAvailabilityData';

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
        return data;
    } catch (error) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
        return JSON.parse(JSON.stringify(defaultData));
    }
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[character];
    });
}

async function loadAvailability() {
    const response = await fetch('/data/availability.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Impossible de charger les disponibilités du dépôt.');

    const data = await response.json();
    if (!data || !Array.isArray(data.logements) || !Array.isArray(data.vehicules)) {
        throw new Error('Le fichier de disponibilités du dépôt est invalide.');
    }

    saveData(data);
}

async function persistData(data) {
    const response = await fetch('/api/availability', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    const result = response.status === 204 ? {} : await response.json();
    if (!response.ok) throw new Error(result.error || 'La mise à jour GitHub a échoué.');

    saveData(data);
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
                                                `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy">` :
                                                `<span aria-hidden="true">${escapeHtml(item.emoji || '🏠')}</span>`;
        return `
      <article class="card">
                <div class="image">${image}</div>
        <div class="body">
          <div class="meta">
                        <span class="badge">${escapeHtml(item.category || 'Disponibilité')}</span>
                        <span class="price">${escapeHtml(item.price || 'Sur demande')}</span>
          </div>
                    <h3>${escapeHtml(item.name)}</h3>
                    <p>${escapeHtml(item.description || 'Disponibilité mise à jour.')}</p>
          <div class="card-row">
                        <small>${escapeHtml(item.availability || 'Disponible')}</small>
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
                        <strong>${escapeHtml(item.name)}</strong>
                        <span>${escapeHtml(item.availability)}</span>
          </div>
          <div class="mini-actions">
                        <button type="button" class="mini-btn edit" data-edit="${escapeHtml(item.id)}">Modifier</button>
                        <button type="button" class="mini-btn delete" data-delete="${escapeHtml(item.id)}">Supprimer</button>
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
                button.addEventListener('click', async function() {
                const id = button.getAttribute('data-delete');
                const dataSet = getData();
                dataSet[selectedType] = (dataSet[selectedType] || []).filter(function(item) { return item.id !== id; });
                    try {
                        await persistData(dataSet);
                    } catch (error) {
                        document.getElementById('save-status').textContent = error.message;
                        return;
                    }
                renderDashboardList();
                renderCatalog(selectedType);
                    document.getElementById('save-status').textContent = 'Suppression commitée dans GitHub.';
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
        form.addEventListener('submit', async function(event) {
            event.preventDefault();

            const selectedTypeList = typeField.value === 'logements' ? 'logements' : 'vehicules';
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
            const saveStatus = document.getElementById('save-status');
            saveStatus.textContent = 'Enregistrement dans GitHub…';
            try {
                await persistData(data);
            } catch (error) {
                saveStatus.textContent = error.message;
                return;
            }
            renderCatalog(selectedTypeList);
            renderDashboardList();
            form.reset();
            hiddenId.value = '';
            formTitle.textContent = 'Ajouter une disponibilité';
            saveStatus.textContent = 'Modifications commitées dans GitHub.';
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', async function() {
            const saveStatus = document.getElementById('save-status');
            saveStatus.textContent = 'Restauration des données par défaut dans GitHub…';
            try {
                await persistData(JSON.parse(JSON.stringify(defaultData)));
            } catch (error) {
                saveStatus.textContent = error.message;
                return;
            }
            renderCatalog('logements');
            renderCatalog('vehicules');
            renderDashboardList();
            resetForm();
            saveStatus.textContent = 'Données par défaut restaurées dans GitHub.';
        });
    }

    if (typeField) {
        typeField.addEventListener('change', renderDashboardList);
    }

    renderDashboardList();
}

async function hasDashboardAccess() {
    const response = await fetch('/api/availability', {
        method: 'POST'
    });
    return response.ok;
}

function initDashboardAccess() {
    const login = document.getElementById('dashboard-login-form');
    const loginStatus = document.getElementById('login-status');
    const loginPanel = document.getElementById('dashboard-login');
    const dashboard = document.getElementById('dashboard-content');
    const logoutButton = document.getElementById('logout-btn');
    const authStatus = new URLSearchParams(window.location.search).get('auth');

    async function unlockDashboard() {
        loginStatus.textContent = 'Vérification de l’accès…';
        try {
            if (!await hasDashboardAccess()) throw new Error('Connectez-vous avec un compte autorisé à modifier ce dépôt.');
            loginPanel.hidden = true;
            dashboard.hidden = false;
            logoutButton.hidden = false;
            initDashboard();
        } catch (error) {
            if (authStatus === 'forbidden') {
                loginStatus.textContent = 'Ce compte GitHub ne peut pas modifier ce dépôt.';
            } else if (authStatus === 'denied') {
                loginStatus.textContent = 'La connexion GitHub a échoué ou a été annulée.';
            } else {
                loginStatus.textContent = error.message;
            }
        }
    }

    logoutButton.addEventListener('click', async function() {
        await fetch('/api/auth', { method: 'POST' });
        window.location.href = '/dashboard';
    });

    unlockDashboard();
}

async function initPage() {
    const page = document.body.dataset.page;

    try {
        await loadAvailability();
    } catch (error) {
        console.error(error);
    }

    if (page === 'logements') {
        renderCatalog('logements');
    }

    if (page === 'vehicules') {
        renderCatalog('vehicules');
    }

    if (page === 'dashboard') {
        initDashboardAccess();
    }
}

document.addEventListener('DOMContentLoaded', initPage);