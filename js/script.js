const STORAGE_KEY = 'sntrueAvailabilityData';
const defaultData = window.SKY_LISTINGS;

function getData() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        const saved = savedData ? JSON.parse(savedData) : {};
        return {
            logements: defaultData.logements.map(function(item) {
                const savedItem = (saved.logements || []).find(function(entry) { return entry.id === item.id; });
                return Object.assign({}, item, savedItem || {});
            }),
            vehicules: defaultData.vehicules.map(function(item) {
                const savedItem = (saved.vehicules || []).find(function(entry) { return entry.id === item.id; });
                return Object.assign({}, item, savedItem || {});
            })
        };
    } catch (error) {
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

    }

    function resetForm() {
        const selectedType = typeField.value;
        form.reset();
        typeField.value = selectedType;
        hiddenId.value = '';
        formTitle.textContent = 'Modifier une disponibilité';
    }

    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();

            if (!hiddenId.value) {
                document.getElementById('save-status').textContent = 'Sélectionnez un élément existant.';
                return;
            }

            const selectedTypeList = typeField.value === 'logements' ? 'logements' : 'vehicules';
            const data = getData();
            const itemId = hiddenId.value;
            const currentList = data[selectedTypeList] || [];
            const itemIndex = currentList.findIndex(function(item) { return item.id === itemId; });
            if (itemIndex < 0) return;

            currentList[itemIndex] = Object.assign({}, currentList[itemIndex], {
                name: document.getElementById('name').value.trim(),
                category: document.getElementById('category').value.trim() || 'Disponibilité',
                price: document.getElementById('price').value.trim() || 'Sur demande',
                emoji: document.getElementById('emoji').value.trim() || '🏠',
                availability: document.getElementById('availability').value.trim() || 'Disponible',
                description: document.getElementById('description').value.trim() || 'Disponibilité mise à jour.'
            });

            data[selectedTypeList] = currentList;
            saveData(data);
            renderCatalog(selectedTypeList);
            resetForm();
            renderDashboardList();
            document.getElementById('save-status').textContent = 'Modifications enregistrées dans ce navigateur.';
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            localStorage.removeItem(STORAGE_KEY);
            renderCatalog('logements');
            renderCatalog('vehicules');
            renderDashboardList();
            resetForm();
            document.getElementById('save-status').textContent = 'Valeurs du code source restaurées.';
        });
    }

    if (typeField) {
        typeField.addEventListener('change', function() {
            resetForm();
            renderDashboardList();
        });
    }

    renderDashboardList();
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
        initDashboard();
    }
}

document.addEventListener('DOMContentLoaded', initPage);