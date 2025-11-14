document.addEventListener('DOMContentLoaded', () => {
    const championGrid = document.getElementById('champion-grid');
    const searchInput = document.getElementById('championSearch');
    const blockedChampionsList = document.getElementById('blocked-champions-list');
    const blockReasonModalEl = document.getElementById('blockReasonModal');
    const blockReasonModal = new bootstrap.Modal(blockReasonModalEl);
    const blockReasonInput = document.getElementById('blockReason');
    const saveBlockReasonBtn = document.getElementById('saveBlockReason');

    let champions = {};
    let blockedChampions = JSON.parse(localStorage.getItem('blockedChampions')) || {};
    let selectedChampion = null;

    const DDragonVersion = '14.10.1'; // It's good practice to use a specific version

    // Fetch champion data from Data Dragon
    async function getChampions() {
        try {
            const response = await fetch(`https://ddragon.leagueoflegends.com/cdn/${DDragonVersion}/data/en_US/champion.json`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            champions = data.data;
            displayChampions(champions);
            displayBlockedChampions();
            setupAutocomplete();
        } catch (error) {
            console.error("Could not fetch champion data:", error);
            championGrid.innerHTML = `<p class="text-danger">Failed to load champion data. Please check the console for details.</p>`;
        }
    }

    // Display all champions in the main grid
    function displayChampions(championsToDisplay) {
        championGrid.innerHTML = '';
        const sortedChampionKeys = Object.keys(championsToDisplay).sort();

        for (const key of sortedChampionKeys) {
            const champion = championsToDisplay[key];
            const championId = champion.id;

            const col = document.createElement('div');
            col.className = 'col-6 col-sm-4 col-md-3 col-lg-2';
            col.innerHTML = `
                <div class="champion-portrait" data-champion-id="${championId}" title="${champion.name}">
                    <img src="https://ddragon.leagueoflegends.com/cdn/${DDragonVersion}/img/champion/${champion.image.full}" alt="${champion.name}" class="img-fluid rounded">
                    ${blockedChampions[championId] ? '<div class="blocked-overlay"></div>' : ''}
                </div>
            `;
            championGrid.appendChild(col);
        }
    }

    // Display only blocked champions in the top list
    function displayBlockedChampions() {
        blockedChampionsList.innerHTML = '';
        if (Object.keys(blockedChampions).length === 0) {
            blockedChampionsList.innerHTML = '<p class="text-muted">No champions are currently blocked.</p>';
            return;
        }

        const sortedBlockedKeys = Object.keys(blockedChampions).sort();

        for (const championId of sortedBlockedKeys) {
            const champion = champions[championId];
            if (champion) {
                const reason = blockedChampions[championId].reason;
                const col = document.createElement('div');
                col.className = 'col-6 col-sm-4 col-md-3 col-lg-2 text-center';
                col.innerHTML = `
                    <div class="champion-portrait" data-champion-id="${championId}" title="Click to unblock ${champion.name}">
                        <img src="https://ddragon.leagueoflegends.com/cdn/${DDragonVersion}/img/champion/${champion.image.full}" alt="${champion.name}" class="img-fluid rounded">
                        <div class="blocked-overlay"></div>
                    </div>
                    <small class="text-muted fst-italic">${reason ? reason : 'No reason given'}</small>
                `;
                blockedChampionsList.appendChild(col);
            }
        }
    }

    // Handle clicks on both grids
    document.body.addEventListener('click', (event) => {
        const portrait = event.target.closest('.champion-portrait');
        if (!portrait) return;

        selectedChampion = portrait.dataset.championId;

        if (blockedChampions[selectedChampion]) {
            // Unblock champion
            unblockChampion(selectedChampion);
        } else {
            // Show block reason modal
            blockReasonInput.value = '';
            const championName = champions[selectedChampion].name;
            document.getElementById('blockReasonModalLabel').textContent = `Block ${championName}`;
            blockReasonModal.show();
        }
    });

    // Save block reason
    saveBlockReasonBtn.addEventListener('click', () => {
        if (selectedChampion) {
            blockChampion(selectedChampion, blockReasonInput.value);
            blockReasonModal.hide();
        }
    });
    
    function blockChampion(championId, reason) {
        blockedChampions[championId] = { reason: reason || '' };
        saveBlockedChampions();
        updateChampionDisplay(championId);
        displayBlockedChampions();
    }

    function unblockChampion(championId) {
        delete blockedChampions[championId];
        saveBlockedChampions();
        updateChampionDisplay(championId);
        displayBlockedChampions();
    }

    function saveBlockedChampions() {
        localStorage.setItem('blockedChampions', JSON.stringify(blockedChampions));
    }

    function updateChampionDisplay(championId) {
        const portraitInGrid = championGrid.querySelector(`[data-champion-id="${championId}"]`);
        if (!portraitInGrid) return;
        
        let overlay = portraitInGrid.querySelector('.blocked-overlay');

        if (blockedChampions[championId]) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'blocked-overlay';
                portraitInGrid.appendChild(overlay);
            }
        } else {
            if (overlay) {
                overlay.remove();
            }
        }
    }

    function setupAutocomplete() {
        const championDataForAutocomplete = Object.values(champions).map(champion => {
            return {
                name: champion.name,
                id: champion.id,
                icon: `https://ddragon.leagueoflegends.com/cdn/${DDragonVersion}/img/champion/${champion.image.full}`
            };
        });

        new autoComplete({
            selector: "#championSearch",
            placeHolder: "Search and block a champion...",
            data: {
                src: championDataForAutocomplete,
                keys: ["name"],
                cache: true,
            },
            resultsList: {
                element: (list, data) => {
                    if (!data.results.length) {
                        const message = document.createElement("div");
                        message.setAttribute("class", "no_result p-2");
                        message.innerHTML = `<span>Found no results for "${data.query}"</span>`;
                        list.prepend(message);
                    }
                },
                noResults: true,
            },
            resultItem: {
                element: (item, data) => {
                    item.style = "display: flex; align-items: center;";
                    item.innerHTML = `
                    <img src="${data.value.icon}" style="width: 32px; height: 32px; margin-right: 10px;">
                    <span style="flex-grow: 1;">${data.match}</span>
                    `;
                },
                highlight: true,
            },
            events: {
                input: {
                    selection: (event) => {
                        const selection = event.detail.selection.value;
                        searchInput.value = ''; // Clear input after selection
                        
                        selectedChampion = selection.id;

                        if (blockedChampions[selectedChampion]) {
                             unblockChampion(selectedChampion);
                        } else {
                            blockReasonInput.value = '';
                            const championName = champions[selectedChampion].name;
                            document.getElementById('blockReasonModalLabel').textContent = `Block ${championName}`;
                            blockReasonModal.show();
                        }
                    }
                }
            }
        });
    }

    // Initial load
    getChampions();
});
