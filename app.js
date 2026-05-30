document.addEventListener('DOMContentLoaded', async () => {
    // 1. Fetch data
    let data;
    try {
        const response = await fetch('characters_network.json?v=' + Date.now());
        data = await response.json();
    } catch (error) {
        console.error('Error loading JSON:', error);
        return;
    }

    // Helper to convert hex colors to RGBA with opacity
    function hexToRgba(hex, alpha) {
        hex = hex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Helper to translate relationship types to Croatian
    function translateRelationType(type) {
        const translations = {
            'Family': 'Obitelj',
            'Romance': 'Romantika',
            'Friend': 'Prijatelj',
            'Enemy': 'Neprijatelj',
            'Work': 'Kolega',
            'School': 'Škola'
        };
        return translations[type] || type;
    }

    // Helper to identify collective/plural groups that should be excluded
    function isGroupOrCollective(name, category) {
        const n = name.toLowerCase();
        const c = (category || '').toLowerCase();
        
        const explicitGroups = [
            'the boys', 'the boys (preschool)', 'the boys (prototype)',
            'the boys churchwear (red hot catholic love)', 'live-action boys (grounded vindaloop)',
            'metrosexual boys', 'laundromat boys', 'obese world of warcraft boys',
            'hardly boys', 'back dorm boys', 'coon and friends', 'freedom pals',
            'the whites', 'the broflovskis', 'the marshes', 'the cartmans', 'the mccormicks',
            'jonas brothers', 'adams county pee-wee hockey team', 'park county pee-wee hockey team',
            'chinese dodgeball players', 'chinese mafia', 'emo kids', 'goth kids',
            'harley riders', 'hippies', 'hollywood elites', 'jew scouts', 'legion of doom',
            'pleases and sparkles club', 'qanon', 'tutornon', 'therapy kids',
            'pc babies', 'jewbots', 'underpants gnomes', 'vampire kids', 'raisins girls',
            'woodland critters', 'memberberries', 'sixth graders', 'fifth graders',
            'fourth graders', 'third graders', 'kindergarteners', 'preschoolers'
        ];
        
        if (explicitGroups.includes(n)) return true;
        
        const groupWords = [
            ' boys', ' girls', ' kids', ' brothers', ' sisters', ' twins', ' parents',
            ' goths', ' vampires', ' hippies', ' zombies', ' ghosts', ' aliens', ' cows',
            ' team', ' band', ' club', ' clique', ' followers', ' owners', ' players',
            ' characters', ' people', ' community', ' society', ' mafia', ' elites',
            ' force', ' troop', ' group', ' friends', ' scouts', ' riders', ' trolls',
            ' babies', ' bots', ' gnomes', ' critters', ' memberberries', ' graders'
        ];
        if (groupWords.some(word => n.includes(word))) return true;
        
        const groupCategories = ['groups', 'teams', 'bands', 'cliques', 'followers', 'owners', 'government', 'administration', 'community'];
        if (groupCategories.some(word => c.includes(word))) {
            const singularEntities = [
                'barack obama', 'george w. bush', 'bill clinton', 'hillary clinton', 
                'michelle obama', 'laura bush', 'caitlyn jenner', 'queen of canada', 
                'allison', 'big gay al', 'calvin'
            ];
            if (singularEntities.includes(n)) return false;
            return true;
        }
        
        if (n.startsWith('the ') && n.endsWith('s')) {
            if (n !== 'the boss') return true;
        }
        
        return false;
    }

    // 1.5 Pre-pass to calculate total connections (incoming + outgoing)
    const nodeDegree = new Map();
    
    // Map names to categories for fast lookup during pre-pass
    const nameToCat = new Map();
    data.forEach(char => {
        if (char.name) nameToCat.set(char.name, char.category || '');
    });

    data.forEach(char => {
        if (!char.name || isGroupOrCollective(char.name, char.category)) return;
        if (!nodeDegree.has(char.name)) nodeDegree.set(char.name, 0);
        
        if (char.relationships) {
            char.relationships.forEach(rel => {
                const targetCat = nameToCat.get(rel.target) || '';
                if (isGroupOrCollective(rel.target, targetCat)) return;
                
                nodeDegree.set(char.name, nodeDegree.get(char.name) + 1);
                nodeDegree.set(rel.target, (nodeDegree.get(rel.target) || 0) + 1);
            });
        }
    });

    // 2. Process data for Cytoscape
    const elements = [];
    const categories = new Set();
    const nameToId = new Map();

    // First pass: create nodes
    data.forEach(char => {
        if (!char.name) return;
        if (isGroupOrCollective(char.name, char.category)) return;
        
        const totalRels = nodeDegree.get(char.name) || 0;
        // Skip characters with NO relationships (incoming or outgoing) to avoid floating dots
        if (totalRels === 0) return;
        
        categories.add(char.category);
        const id = char.name.replace(/[^a-zA-Z0-9]/g, '_');
        nameToId.set(char.name, id);
        
        // Importance score from preprocessing, or fallback based on total connections
        const importance = char.importance || (1 + totalRels);

        // Determine image (fallback if not available)
        let imgUrl = char.fandom_image;
        if (!imgUrl && char.image_url) {
            // Upgrade http to https to prevent mixed-content blocking
            imgUrl = char.image_url.replace('http://', 'https://');
        }
        if (!imgUrl) {
            // Generate initials as fallback
            imgUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(char.name)}&background=1e293b&color=f8fafc&size=128`;
        }

        elements.push({
            data: {
                id: id,
                name: char.name,
                category: char.category,
                image: imgUrl,
                importance: importance,
                details: char.details || {}
            }
        });
    });

    // Second pass: create edges
    const edgeColors = {
        'Family': '#10b981',    // Green
        'Romance': '#ec4899',   // Pink
        'Friend': '#3b82f6',    // Blue
        'Enemy': '#eab308',     // Yellow
        'Work': '#8b5cf6',      // Purple
        'School': '#f97316'     // Orange
    };

    data.forEach(char => {
        if (!char.relationships) return;
        const sourceId = nameToId.get(char.name);
        
        char.relationships.forEach(rel => {
            const targetId = nameToId.get(rel.target);
            if (sourceId && targetId) {
                // Avoid duplicates (A->B and B->A)
                const edgeId = [sourceId, targetId].sort().join('-');
                // We only push if it doesn't already exist
                if (!elements.find(e => e.data.id === edgeId)) {
                    elements.push({
                        data: {
                            id: edgeId,
                            source: sourceId,
                            target: targetId,
                            type: rel.type,
                            color: edgeColors[rel.type] || '#64748b'
                        }
                    });
                }
            }
        });
    });
    // 2.5 Find the largest connected component (LCC) to filter out isolated islands
    const adjacencyList = new Map();
    elements.forEach(el => {
        if (el.data.source && el.data.target) {
            const s = el.data.source;
            const t = el.data.target;
            if (!adjacencyList.has(s)) adjacencyList.set(s, []);
            if (!adjacencyList.has(t)) adjacencyList.set(t, []);
            adjacencyList.get(s).push(t);
            adjacencyList.get(t).push(s);
        }
    });

    const visited = new Set();
    const components = [];
    const nodes = elements.filter(el => !el.data.source && !el.data.target).map(el => el.data.id);

    nodes.forEach(nodeId => {
        if (!visited.has(nodeId)) {
            const component = [];
            const queue = [nodeId];
            visited.add(nodeId);

            while (queue.length > 0) {
                const current = queue.shift();
                component.push(current);

                const neighbors = adjacencyList.get(current) || [];
                neighbors.forEach(neighbor => {
                    if (!visited.has(neighbor)) {
                        visited.add(neighbor);
                        queue.push(neighbor);
                    }
                });
            }
            components.push(component);
        }
    });

    // Find the largest component
    let largestComponent = [];
    components.forEach(comp => {
        if (comp.length > largestComponent.length) {
            largestComponent = comp;
        }
    });

    const lccSet = new Set(largestComponent);

    // We display all elements (including separate components/islands)
    const displayElements = elements;

    // 3. Initialize Cytoscape
    const cy = cytoscape({
        container: document.getElementById('cy'),
        elements: displayElements,
        style: [
            {
                selector: 'node',
                style: {
                    'width': 'mapData(importance, 10, 120, 40, 110)',
                    'height': 'mapData(importance, 10, 120, 40, 110)',
                    'background-image': 'data(image)',
                    'background-fit': 'cover',
                    'background-position-x': '50%',
                    'background-position-y': '10%',
                    'background-color': '#fff',
                    'border-width': 2,
                    'border-color': '#38bdf8',
                    'label': '',
                    'color': '#f8fafc',
                    'font-family': 'Inter',
                    'font-size': '12px',
                    'text-valign': 'bottom',
                    'text-margin-y': 5,
                    'text-outline-width': 2,
                    'text-outline-color': '#0f172a',
                    'z-index-compare': 'manual',
                    'z-index': 10
                }
            },
            {
                selector: 'node.hovered',
                style: {
                    'label': 'data(name)',
                    'z-index': 20000
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 4,
                    'line-color': 'data(color)',
                    'curve-style': 'bezier',
                    'control-point-step-size': 0,
                    'opacity': 0.5,
                    'events': 'no',
                    'z-index-compare': 'manual',
                    'z-index': 1
                }
            },
            {
                selector: ':selected',
                style: {
                    'border-width': 4,
                    'border-color': '#ef4444',
                    'line-color': '#ef4444',
                    'z-index': 999
                }
            }
        ],
        layout: {
            name: 'null'
        },
        wheelSensitivity: 0.2 // Smoother zooming
    });

    // Run layout excluding School edges so hidden relations don't pull nodes together
    cy.elements().not('edge[type="School"]').layout({
        name: 'cose',
        idealEdgeLength: 100,
        nodeOverlap: 20,
        refresh: 20,
        fit: true,
        padding: 30,
        randomize: false,
        componentSpacing: 100,
        nodeRepulsion: 400000,
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0
    }).run();

    // Calculate global centrality metrics once (excluding School edges to keep metrics meaningful)
    const centralityElements = cy.elements().not('edge[type="School"]');
    
    // Custom undirected PageRank implementation to prevent alphabetical bias
    const nodesList = cy.nodes().map(n => n.id());
    const adjList = {};
    nodesList.forEach(id => adjList[id] = []);
    
    centralityElements.edges().forEach(edge => {
        const s = edge.source().id();
        const t = edge.target().id();
        if (adjList[s] && adjList[t]) {
            adjList[s].push(t);
            adjList[t].push(s);
        }
    });
    
    const N_nodes = nodesList.length;
    let prScores = {};
    nodesList.forEach(id => prScores[id] = 1.0 / N_nodes);
    const damping = 0.85;
    
    for (let iter = 0; iter < 100; iter++) {
        const nextPrScores = {};
        nodesList.forEach(id => nextPrScores[id] = (1.0 - damping) / N_nodes);
        
        nodesList.forEach(u => {
            const neighbors = adjList[u];
            const deg = neighbors.length;
            if (deg === 0) {
                nodesList.forEach(v => nextPrScores[v] += damping * prScores[u] / N_nodes);
            } else {
                neighbors.forEach(v => nextPrScores[v] += damping * prScores[u] / deg);
            }
        });
        prScores = nextPrScores;
    }

    const bc = centralityElements.betweennessCentrality({ directed: false });
    const cc = centralityElements.closenessCentralityNormalized({ directed: false });

    let maxPR = 0;
    let maxBC = 0;
    let maxCC = 0;

    cy.nodes().forEach(n => {
        const nid = n.id();
        const prVal = prScores[nid] || 0;
        const bcVal = bc.betweenness(n) || 0;
        const ccVal = cc.closeness(n) || 0;

        if (prVal > maxPR) maxPR = prVal;
        if (bcVal > maxBC) maxBC = bcVal;
        if (ccVal > maxCC) maxCC = ccVal;
    });

    buildLeaderboard();

    // Prevent default context menu
    document.getElementById('cy').addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });

    // Custom Right-Click Panning
    let isRightClick = false;
    let rightClickDragged = false;

    cy.on('cxttapstart', function(e) {
        isRightClick = true;
        rightClickDragged = false;
    });

    cy.on('cxtdrag', function(e) {
        if (isRightClick) {
            rightClickDragged = true;
            const oe = e.originalEvent;
            // Use movementX and movementY for delta
            if (oe.movementX !== undefined && oe.movementY !== undefined) {
                cy.panBy({ x: oe.movementX, y: oe.movementY });
            }
        }
    });

    cy.on('cxttapend', function(e) {
        isRightClick = false;
    });

    cy.on('cxttap', function(evt) {
        if (compareModeActive && !rightClickDragged) {
            clearCompareSelections();
        }
    });

    // 4. UI Interactions
    let compareModeActive = false;
    let nodeA = null;
    let nodeB = null;

    const sidebar = document.getElementById('sidebar');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    
    // Elements to update
    const elImage = document.getElementById('char-image');
    const elName = document.getElementById('char-name');
    const elCategory = document.getElementById('char-category');
    const elAge = document.getElementById('char-age');
    const elGender = document.getElementById('char-gender');
    const elOccupation = document.getElementById('char-occupation');
    const elFirst = document.getElementById('char-first');
    let lastTappedNode = null;
    let lastTapTime = 0;

    cy.on('tap', 'node', function(evt){
        clearSearch();
        resetGroupFilter();
        const node = evt.target;
        const d = node.data();
        const now = Date.now();
        
        lastTappedNode = node;
        lastTapTime = now;
        
        if (compareModeActive) {
            handleCompareSelection(node);
            return;
        }
        
        elImage.src = d.image;
        elName.textContent = d.name;
        elCategory.textContent = d.category;
        
        elAge.textContent = d.details.Age || 'Unknown';
        elGender.textContent = d.details.Gender || 'Unknown';
        elOccupation.textContent = d.details.Occupation || 'Unknown';
        elFirst.textContent = d.details['First Appearance'] || 'Unknown';
        
        // --- Calculate and Display Network Profile Statistics ---
        
        // 1. Calculate Rank based on importance descending, then name alphabetically
        const allNodes = cy.nodes().map(n => n.data());
        allNodes.sort((a, b) => {
            if (b.importance !== a.importance) {
                return b.importance - a.importance;
            }
            return a.name.localeCompare(b.name);
        });
        const rankIndex = allNodes.findIndex(n => n.id === d.id);
        const rank = rankIndex !== -1 ? rankIndex + 1 : '-';
        document.getElementById('char-rank').textContent = `#${rank} od ${allNodes.length} (${d.importance} bod)`;

        // 2. Connections count (Degree)
        const degree = node.degree();
        
        function getConnectionsLabel(count) {
            const lastDigit = count % 10;
            const lastTwoDigits = count % 100;
            if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
                return `${count} aktivnih veza`;
            }
            if (lastDigit === 1) {
                return `${count} aktivna veza`;
            }
            if (lastDigit >= 2 && lastDigit <= 4) {
                return `${count} aktivne veze`;
            }
            return `${count} aktivnih veza`;
        }
        
        document.getElementById('char-connections').textContent = getConnectionsLabel(degree);

        // 3. Top Connection (adjacent node with highest importance)
        const neighbors = node.openNeighborhood().nodes();
        let topConnName = 'Nema';
        if (neighbors.length > 0) {
            let maxImportance = -1;
            let topConnNode = null;
            neighbors.forEach(n => {
                const imp = n.data('importance') || 0;
                if (imp > maxImportance) {
                    maxImportance = imp;
                    topConnNode = n;
                }
            });
            if (topConnNode) {
                topConnName = `${topConnNode.data('name')} (${maxImportance} bod)`;
            }
        }
        document.getElementById('char-top-conn').textContent = topConnName;

        // 3.5 Calculate and render Social Centrality Metrics
        const nodePR = prScores[node.id()] || 0;
        const nodeBC = bc.betweenness(node) || 0;
        const nodeCC = cc.closeness(node) || 0;

        const prPct = maxPR > 0 ? Math.round((nodePR / maxPR) * 100) : 0;
        const bcPct = maxBC > 0 ? Math.round((nodeBC / maxBC) * 100) : 0;
        const ccPct = maxCC > 0 ? Math.round((nodeCC / maxCC) * 100) : 0;

        document.getElementById('centrality-pagerank-val').textContent = `${prPct}%`;
        document.getElementById('centrality-pagerank-fill').style.width = `${prPct}%`;

        document.getElementById('centrality-betweenness-val').textContent = `${bcPct}%`;
        document.getElementById('centrality-betweenness-fill').style.width = `${bcPct}%`;

        document.getElementById('centrality-closeness-val').textContent = `${ccPct}%`;
        document.getElementById('centrality-closeness-fill').style.width = `${ccPct}%`;

        // 4. Relationship type breakdown
        const edges = node.connectedEdges();
        const counts = {};
        const colors = {};
        edges.forEach(e => {
            const type = e.data('type') || 'Unknown';
            const color = e.data('color') || '#64748b';
            counts[type] = (counts[type] || 0) + 1;
            colors[type] = color;
        });

        const sortedTypes = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
        const breakdownList = document.getElementById('char-breakdown');
        breakdownList.innerHTML = '';
        sortedTypes.forEach(type => {
            const pill = document.createElement('span');
            pill.className = 'breakdown-pill';
            const hexColor = colors[type];
            pill.style.backgroundColor = hexToRgba(hexColor, 0.12);
            pill.style.color = hexColor;
            pill.style.borderColor = hexToRgba(hexColor, 0.25);
            pill.innerHTML = `
                <span class="breakdown-pill-dot" style="background-color: ${hexColor}"></span>
                ${translateRelationType(type)}: ${counts[type]}
            `;
            breakdownList.appendChild(pill);
        });

        // 5. Interactive neighbors list grouped by relationship type
        const neighborsGrouped = {};
        const relationColors = {};
        neighbors.forEach(neighbor => {
            const edge = node.edgesWith(neighbor).first();
            if (edge.length > 0) {
                const type = edge.data('type') || 'Unknown';
                const color = edge.data('color') || '#64748b';
                if (!neighborsGrouped[type]) {
                    neighborsGrouped[type] = [];
                }
                relationColors[type] = color;
                neighborsGrouped[type].push({
                    id: neighbor.data('id'),
                    name: neighbor.data('name')
                });
            }
        });

        // Sort names alphabetically
        Object.keys(neighborsGrouped).forEach(type => {
            neighborsGrouped[type].sort((a, b) => a.name.localeCompare(b.name));
        });

        const neighborsList = document.getElementById('char-neighbors');
        neighborsList.innerHTML = '';

        const priorityOrder = ['Romance', 'Family', 'Friend', 'Enemy', 'Work', 'School'];
        const typesToDisplay = Object.keys(neighborsGrouped).sort((a, b) => {
            let indexA = priorityOrder.indexOf(a);
            let indexB = priorityOrder.indexOf(b);
            if (indexA === -1) indexA = 99;
            if (indexB === -1) indexB = 99;
            return indexA - indexB;
        });

        if (typesToDisplay.length === 0) {
            neighborsList.innerHTML = '<div style="font-size: 0.75rem; color: var(--text-secondary);">Nema izravnih veza</div>';
        } else {
            typesToDisplay.forEach(type => {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'neighbor-group';
                
                const title = document.createElement('span');
                title.className = 'neighbor-group-title';
                title.style.color = relationColors[type];
                title.style.borderLeft = `2px solid ${relationColors[type]}`;
                title.textContent = translateRelationType(type);
                groupDiv.appendChild(title);

                const tagsDiv = document.createElement('div');
                tagsDiv.className = 'neighbor-tags';

                neighborsGrouped[type].forEach(neigh => {
                    const tag = document.createElement('span');
                    tag.className = 'neighbor-tag';
                    tag.textContent = neigh.name;
                    
                    const hexColor = relationColors[type];
                    tag.style.setProperty('--hover-color', hexColor);
                    tag.style.setProperty('--hover-bg', hexToRgba(hexColor, 0.12));
                    
                    tag.addEventListener('click', () => {
                        const targetNode = cy.getElementById(neigh.id);
                        if (targetNode.length > 0) {
                            cy.animate({
                                center: { eles: targetNode },
                                zoom: 1.2
                            }, {
                                duration: 600
                            });
                            targetNode.trigger('tap');
                        }
                    });

                    tagsDiv.appendChild(tag);
                });

                groupDiv.appendChild(tagsDiv);
                neighborsList.appendChild(groupDiv);
            });
        }

        sidebar.classList.remove('hidden');
        
        // Highlight connected edges and fade others
        cy.elements().removeClass('highlighted faded');
        cy.elements().addClass('faded'); // Fade everything first
        
        node.addClass('highlighted');
        node.removeClass('faded');
        
        const neighborhood = node.neighborhood();
        neighborhood.removeClass('faded').addClass('highlighted');
    });

    // Hover events to show/hide labels
    cy.on('mouseover', 'node', function(evt) {
        evt.target.addClass('hovered');
    });

    cy.on('mouseout', 'node', function(evt) {
        evt.target.removeClass('hovered');
    });

    closeSidebarBtn.addEventListener('click', () => {
        if (compareModeActive) {
            exitCompareMode();
        } else {
            sidebar.classList.add('hidden');
            cy.elements().removeClass('highlighted faded');
        }
        resetGroupFilter();
    });

    cy.on('tap', function(evt) {
        if (evt.target === cy) {
            clearSearch();
            // Clicked on background: Reset view
            if (compareModeActive) {
                exitCompareMode();
            } else {
                sidebar.classList.add('hidden');
                cy.elements().removeClass('highlighted faded');
            }
            resetGroupFilter();
        }
    });

    // Add extra style for highlighted state
    cy.style()
        .selector('edge.highlighted').style({
            'display': 'element',
            'opacity': 1,
            'width': 4,
            'z-index': 9999
        })
        .selector('node.highlighted').style({
            'border-width': 4,
            'border-color': '#fff',
            'label': 'data(name)',
            'z-index': 10000
        })
        .selector('node.highlight-group').style({
            'border-width': 4,
            'border-color': '#fff',
            'label': 'data(name)',
            'z-index': 12000
        })
        .selector('node.highlight-Family').style({
            'border-width': 6,
            'border-color': '#10b981',
            'label': 'data(name)',
            'z-index': 12000
        })
        .selector('node.highlight-Romance').style({
            'border-width': 6,
            'border-color': '#ec4899',
            'label': 'data(name)',
            'z-index': 12000
        })
        .selector('node.highlight-Friend').style({
            'border-width': 6,
            'border-color': '#3b82f6',
            'label': 'data(name)',
            'z-index': 12000
        })
        .selector('node.highlight-Enemy').style({
            'border-width': 6,
            'border-color': '#eab308',
            'label': 'data(name)',
            'z-index': 12000
        })
        .selector('node.highlight-Work').style({
            'border-width': 6,
            'border-color': '#8b5cf6',
            'label': 'data(name)',
            'z-index': 12000
        })
        .selector('node.highlight-School').style({
            'border-width': 8,
            'border-color': '#f97316',
            'label': 'data(name)',
            'z-index': 12000
        })
        .selector('node.faded').style({
            'opacity': 0.4,
            'z-index': 10
        })
        .selector('node.search-match').style({
            'label': 'data(name)',
            'z-index': 15000
        })
        .selector('edge.faded').style({
            'opacity': 0.05,
            'z-index': 1
        })
        .selector('node.selected-a').style({
            'border-width': 6,
            'border-color': '#3b82f6',
            'z-index': 18000
        })
        .selector('node.selected-b').style({
            'border-width': 6,
            'border-color': '#ec4899',
            'z-index': 18000
        })
        .selector('edge.path-highlight-edge').style({
            'display': 'element',
            'opacity': 1.0,
            'width': 6,
            'line-color': '#0d9488',
            'z-index': 9990
        })
        .selector('node.path-highlight-node').style({
            'border-width': 4,
            'border-color': '#fff',
            'z-index': 15000,
            'label': 'data(name)'
        })
        .update();

    const searchInput = document.getElementById('search');

    // Helper to clear search
    function clearSearch() {
        if (searchInput && searchInput.value) {
            searchInput.value = '';
            applyFilters();
        }
    }

    // Function to apply search filter and fit
    function applyFilters() {
        const searchVal = searchInput.value.toLowerCase();

        cy.nodes().removeClass('search-match');
        cy.elements().removeClass('highlighted faded');

        // If search filter is not active, reset to show everything
        if (!searchVal) {
            cy.fit(cy.nodes(), 50);
            return;
        }

        // Find nodes that match the search query
        const matchedNodes = cy.nodes().filter(function(ele) {
            return ele.data('name').toLowerCase().includes(searchVal);
        });

        // Mark matching nodes to show their labels during search
        matchedNodes.addClass('search-match');

        // Fade everything first
        cy.elements().addClass('faded');

        // Highlight matched nodes and their neighbors
        matchedNodes.removeClass('faded').addClass('highlighted');
        
        const neighbors = matchedNodes.neighborhood();
        neighbors.removeClass('faded').addClass('highlighted');

        // Zoom/fit to the matched nodes and their neighborhood so the entire network is visible
        if (matchedNodes.length > 0) {
            cy.fit(matchedNodes.union(neighbors), 50); // padding 50
        }
    }

    // Kids/Adults Filter logic
    const btnKids = document.getElementById('btn-filter-kids');
    const btnAdults = document.getElementById('btn-filter-adults');

    const kidsList = [
        "Heidi Turner", "Timmy Burch", "Jimmy Valmer", "Kenny McCormick", "Wendy Testaburger", 
        "Craig Tucker", "Stan Marsh", "Scott Malkinson", "Butters Stotch", "Bebe Stevens", 
        "Tweek Tweak", "Tolkien Black", "Clyde Donovan", "Kyle Broflovski", "Eric Cartman", 
        "Red McArthur", "Lola", "Nichole Daniels", "Karen McCormick", "Ike Broflovski", 
        "Tricia Tucker", "Kevin McCormick", "Shelley Marsh"
    ];

    const schoolMembers = [
        "Stan Marsh", "Kyle Broflovski", "Eric Cartman", "Kenny McCormick",
        "Butters Stotch", "Scott Malkinson", "Craig Tucker", "Clyde Donovan",
        "Tolkien Black", "Tweek Tweak", "Wendy Testaburger", "Red McArthur",
        "Nichole Daniels", "Bebe Stevens", "Lola", "Heidi Turner",
        "Timmy Burch", "Jimmy Valmer",
        "Chef", "Herbert Garrison", "Principal Victoria", "Diane Choksondik",
        "Mr. Mackey", "Mr. Slave", "PC Principal", "Veronica Crabtree",
        "Vice Principal Strong Woman"
    ];

    function isChildNode(node) {
        return kidsList.includes(node.data('name'));
    }

    let activeFilter = null; // 'kids', 'adults', 'Family', 'Romance', 'Friend', 'Enemy', 'Work', 'School', or null

    function resetGroupFilter() {
        if (!activeFilter) return;
        
        // Remove active class from all buttons
        btnKids.classList.remove('active');
        btnAdults.classList.remove('active');
        document.querySelectorAll('.legend-item').forEach(btn => btn.classList.remove('active'));
        
        cy.elements().removeClass('faded highlight-group highlight-Family highlight-Romance highlight-Friend highlight-Enemy highlight-Work highlight-School highlighted');
        activeFilter = null;
    }

    function applyGroupFilter(filterType) {
        clearSearch();
        // Hide sidebar since we're highlighting a group, not a single node
        sidebar.classList.add('hidden');
        cy.elements().removeClass('highlighted');

        const isRelation = ['Family', 'Romance', 'Friend', 'Enemy', 'Work', 'School'].includes(filterType);

        if (activeFilter === filterType) {
            resetGroupFilter();
            return;
        }

        resetGroupFilter();
        
        activeFilter = filterType;
        
        // Set correct button active state
        if (filterType === 'kids') {
            btnKids.classList.add('active');
        } else if (filterType === 'adults') {
            btnAdults.classList.add('active');
        } else if (isRelation) {
            const btn = document.querySelector(`.legend-item[data-relation="${filterType}"]`);
            if (btn) btn.classList.add('active');
        }

        cy.batch(() => {
            cy.elements().removeClass('faded highlight-group highlighted');

            if (isRelation) {
                // Relationship filter
                const activeEdges = cy.edges().filter(edge => edge.data('type') === filterType);
                const activeNodes = activeEdges.connectedNodes();

                // Fade everything first
                cy.elements().addClass('faded');

                // Un-fade and highlight active nodes and edges
                activeNodes.removeClass('faded').addClass(`highlight-${filterType}`);
                activeEdges.removeClass('faded').addClass('highlighted');
            } else {
                // Kids/Adults filter
                cy.nodes().forEach(node => {
                    const child = isChildNode(node);
                    const shouldHighlight = (filterType === 'kids' && child) || (filterType === 'adults' && !child);

                    if (shouldHighlight) {
                        node.addClass('highlight-group');
                    } else {
                        node.addClass('faded');
                    }
                });

                cy.edges().forEach(edge => {
                    const s = edge.source();
                    const t = edge.target();
                    const sHighlight = (filterType === 'kids' && isChildNode(s)) || (filterType === 'adults' && !isChildNode(s));
                    const tHighlight = (filterType === 'kids' && isChildNode(t)) || (filterType === 'adults' && !isChildNode(t));

                    if (sHighlight && tHighlight) {
                        edge.addClass('highlighted');
                    } else {
                        edge.addClass('faded');
                    }
                });
            }
        });
    }

    if (btnKids && btnAdults) {
        btnKids.addEventListener('click', () => applyGroupFilter('kids'));
        btnAdults.addEventListener('click', () => applyGroupFilter('adults'));
    }

    // Bind click handlers to legend items for relation-based filtering
    document.querySelectorAll('.legend-item').forEach(btn => {
        const relType = btn.getAttribute('data-relation');
        if (relType) {
            btn.addEventListener('click', () => applyGroupFilter(relType));
        }
    });

    // Search logic
    searchInput.addEventListener('input', () => {
        resetGroupFilter();
        applyFilters();
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = searchInput.value.trim().toLowerCase();
            if (!query) return;

            const matches = cy.nodes().filter(n => n.data('name').toLowerCase().includes(query));
            if (matches.length > 0) {
                // Find exact match first, else use the first match
                let targetNode = matches.filter(n => n.data('name').toLowerCase() === query).first();
                if (targetNode.length === 0) {
                    targetNode = matches.first();
                }

                // Clear search and reset visibility filter
                searchInput.value = '';
                applyFilters();

                // Animate and select
                cy.animate({
                    center: { eles: targetNode },
                    zoom: 1.2
                }, {
                    duration: 600
                });
                targetNode.trigger('tap');
            }
        }
    });

    // --- Compare Mode Implementation ---
    const btnCompareMode = document.getElementById('btn-compare-mode');
    const characterInfo = document.getElementById('character-info');
    const comparisonInfo = document.getElementById('comparison-info');

    if (btnCompareMode) {
        btnCompareMode.addEventListener('click', () => {
            clearSearch();
            resetGroupFilter();
            
            // Toggle active state
            compareModeActive = !compareModeActive;
            
            if (compareModeActive) {
                btnCompareMode.classList.add('active');
                
                // Hide single view, show compare view
                characterInfo.classList.add('hidden');
                comparisonInfo.classList.remove('hidden');
                
                // Clear single highlights
                cy.elements().removeClass('highlighted faded');
                
                // Reset compare state and UI
                clearCompareSelections();
                
                // Make sure sidebar is visible
                sidebar.classList.remove('hidden');
            } else {
                exitCompareMode();
            }
        });
    }

    function handleCompareSelection(node) {
        if (nodeA && nodeA.id() === node.id()) {
            if (nodeB) {
                nodeB.removeClass('selected-b');
                nodeB = null;
                resetCompareBUI();
            }
            return;
        }
        if (nodeB && nodeB.id() === node.id()) {
            nodeB.removeClass('selected-b');
            nodeB = null;
            resetCompareBUI();
            return;
        }

        if (!nodeA) {
            nodeA = node;
            nodeA.addClass('selected-a');
            updateCompareAUI(node);
        } else if (!nodeB) {
            nodeB = node;
            nodeB.addClass('selected-b');
            updateCompareBUI(node);
            calculateAndDisplayComparison();
        } else {
            clearCompareSelections();
            nodeA = node;
            nodeA.addClass('selected-a');
            updateCompareAUI(node);
        }
    }

    function updateCompareAUI(node) {
        const d = node.data();
        const elCharA = document.getElementById('compare-char-a');
        elCharA.querySelector('.compare-avatar').src = d.image;
        elCharA.querySelector('.compare-name').textContent = d.name;
    }

    function updateCompareBUI(node) {
        const d = node.data();
        const elCharB = document.getElementById('compare-char-b');
        elCharB.querySelector('.compare-avatar').src = d.image;
        elCharB.querySelector('.compare-name').textContent = d.name;
    }

    function resetCompareAUI() {
        const elCharA = document.getElementById('compare-char-a');
        elCharA.querySelector('.compare-avatar').src = 'https://ui-avatars.com/api/?name=%3F&background=1e293b&color=f8fafc&size=128';
        elCharA.querySelector('.compare-name').textContent = 'Odaberi lika A';
        resetComparisonResultsUI();
    }

    function resetCompareBUI() {
        const elCharB = document.getElementById('compare-char-b');
        elCharB.querySelector('.compare-avatar').src = 'https://ui-avatars.com/api/?name=%3F&background=1e293b&color=f8fafc&size=128';
        elCharB.querySelector('.compare-name').textContent = 'Odaberi lika B';
        resetComparisonResultsUI();
    }

    function resetComparisonResultsUI() {
        document.getElementById('compare-path-chain').innerHTML = '<div class="path-placeholder">Odaberi dva lika za prikaz najkraće putanje.</div>';
        document.getElementById('compare-mutual-list').innerHTML = '<div class="path-placeholder">Nema zajedničkih veza.</div>';
        
        document.getElementById('compare-pr-a').style.width = '0%';
        document.getElementById('compare-pr-b').style.width = '0%';
        document.getElementById('compare-pr-a-val').textContent = '0%';
        document.getElementById('compare-pr-b-val').textContent = '0%';

        document.getElementById('compare-bc-a').style.width = '0%';
        document.getElementById('compare-bc-b').style.width = '0%';
        document.getElementById('compare-bc-a-val').textContent = '0%';
        document.getElementById('compare-bc-b-val').textContent = '0%';

        document.getElementById('compare-cc-a').style.width = '0%';
        document.getElementById('compare-cc-b').style.width = '0%';
        document.getElementById('compare-cc-a-val').textContent = '0%';
        document.getElementById('compare-cc-b-val').textContent = '0%';

        document.getElementById('compare-deg-a').style.width = '0%';
        document.getElementById('compare-deg-b').style.width = '0%';
        document.getElementById('compare-deg-a-val').textContent = '0';
        document.getElementById('compare-deg-b-val').textContent = '0';

        cy.elements().removeClass('path-highlight-node path-highlight-edge faded');
    }

    function clearCompareSelections() {
        if (nodeA) nodeA.removeClass('selected-a');
        if (nodeB) nodeB.removeClass('selected-b');
        nodeA = null;
        nodeB = null;
        resetCompareAUI();
        resetCompareBUI();
    }

    function calculateAndDisplayComparison() {
        if (!nodeA || !nodeB) return;

        const dijkstraElements = cy.elements().not('edge[type="School"]');
        const dijkstra = dijkstraElements.dijkstra(nodeA, undefined, false);
        const path = dijkstra.pathTo(nodeB);

        cy.elements().removeClass('path-highlight-node path-highlight-edge faded');

        const pathNodes = path.nodes();
        const pathEdges = path.edges();

        if (pathNodes.length > 0) {
            cy.elements().addClass('faded');
            pathNodes.removeClass('faded').addClass('path-highlight-node');
            pathEdges.removeClass('faded').addClass('path-highlight-edge');

            const pathChain = document.getElementById('compare-path-chain');
            pathChain.innerHTML = '';

            pathNodes.forEach((n, idx) => {
                const nd = n.data();
                const nodeDiv = document.createElement('div');
                nodeDiv.className = 'path-node';
                nodeDiv.innerHTML = `
                    <img class="path-avatar" src="${nd.image}">
                    <span class="path-name">${nd.name}</span>
                `;
                nodeDiv.addEventListener('click', () => {
                    cy.animate({
                        center: { eles: n },
                        zoom: 1.2
                    }, {
                        duration: 600
                    });
                });
                pathChain.appendChild(nodeDiv);

                if (idx < pathNodes.length - 1) {
                    const arrowSpan = document.createElement('span');
                    arrowSpan.className = 'path-arrow';
                    arrowSpan.innerHTML = '&rarr;';
                    pathChain.appendChild(arrowSpan);
                }
            });
        } else {
            document.getElementById('compare-path-chain').innerHTML = '<div class="path-placeholder" style="color: #ef4444;">Nema poveznice (izolirani čvorovi).</div>';
        }

        const neighborsA = nodeA.openNeighborhood().nodes();
        const neighborsB = nodeB.openNeighborhood().nodes();
        const idSetB = new Set(neighborsB.map(n => n.id()));
        const mutualNodes = neighborsA.filter(n => idSetB.has(n.id()));

        const mutualList = document.getElementById('compare-mutual-list');
        mutualList.innerHTML = '';

        if (mutualNodes.length > 0) {
            mutualNodes.forEach(n => {
                const nd = n.data();
                const tag = document.createElement('span');
                tag.className = 'neighbor-tag';
                tag.style.setProperty('--hover-color', 'var(--accent)');
                tag.style.setProperty('--hover-bg', 'rgba(56, 189, 248, 0.12)');
                tag.textContent = nd.name;
                tag.addEventListener('click', () => {
                    cy.animate({
                        center: { eles: n },
                        zoom: 1.2
                    }, {
                        duration: 600
                    });
                });
                mutualList.appendChild(tag);
            });
        } else {
            mutualList.innerHTML = '<div class="path-placeholder">Nema zajedničkih veza.</div>';
        }

        const prA = prScores[nodeA.id()] || 0;
        const prB = prScores[nodeB.id()] || 0;
        const prPctA = maxPR > 0 ? Math.round((prA / maxPR) * 100) : 0;
        const prPctB = maxPR > 0 ? Math.round((prB / maxPR) * 100) : 0;

        document.getElementById('compare-pr-a').style.width = `${prPctA}%`;
        document.getElementById('compare-pr-b').style.width = `${prPctB}%`;
        document.getElementById('compare-pr-a-val').textContent = `${prPctA}%`;
        document.getElementById('compare-pr-b-val').textContent = `${prPctB}%`;

        const bcA = bc.betweenness(nodeA) || 0;
        const bcB = bc.betweenness(nodeB) || 0;
        const bcPctA = maxBC > 0 ? Math.round((bcA / maxBC) * 100) : 0;
        const bcPctB = maxBC > 0 ? Math.round((bcB / maxBC) * 100) : 0;

        document.getElementById('compare-bc-a').style.width = `${bcPctA}%`;
        document.getElementById('compare-bc-b').style.width = `${bcPctB}%`;
        document.getElementById('compare-bc-a-val').textContent = `${bcPctA}%`;
        document.getElementById('compare-bc-b-val').textContent = `${bcPctB}%`;

        const ccA = cc.closeness(nodeA) || 0;
        const ccB = cc.closeness(nodeB) || 0;
        const ccPctA = maxCC > 0 ? Math.round((ccA / maxCC) * 100) : 0;
        const ccPctB = maxCC > 0 ? Math.round((ccB / maxCC) * 100) : 0;

        document.getElementById('compare-cc-a').style.width = `${ccPctA}%`;
        document.getElementById('compare-cc-b').style.width = `${ccPctB}%`;
        document.getElementById('compare-cc-a-val').textContent = `${ccPctA}%`;
        document.getElementById('compare-cc-b-val').textContent = `${ccPctB}%`;

        const degA = nodeA.degree();
        const degB = nodeB.degree();
        const maxDeg = Math.max(...cy.nodes().map(n => n.degree()));
        const degPctA = maxDeg > 0 ? Math.round((degA / maxDeg) * 100) : 0;
        const degPctB = maxDeg > 0 ? Math.round((degB / maxDeg) * 100) : 0;

        document.getElementById('compare-deg-a').style.width = `${degPctA}%`;
        document.getElementById('compare-deg-b').style.width = `${degPctB}%`;
        document.getElementById('compare-deg-a-val').textContent = `${degA}`;
        document.getElementById('compare-deg-b-val').textContent = `${degB}`;
    }

    function exitCompareMode() {
        compareModeActive = false;
        if (btnCompareMode) btnCompareMode.classList.remove('active');
        
        characterInfo.classList.remove('hidden');
        comparisonInfo.classList.add('hidden');
        
        clearCompareSelections();
        
        sidebar.classList.add('hidden');
        cy.elements().removeClass('highlighted faded path-highlight-node path-highlight-edge selected-a selected-b');
    }

    // --- Leaderboard Implementation ---
    const leaderboardSidebar = document.getElementById('leaderboard-sidebar');
    const toggleLeaderboardBtn = document.getElementById('toggle-leaderboard');
    const closeLeaderboardBtn = document.getElementById('close-leaderboard');

    toggleLeaderboardBtn.addEventListener('click', () => {
        leaderboardSidebar.classList.toggle('hidden');
    });

    closeLeaderboardBtn.addEventListener('click', () => {
        leaderboardSidebar.classList.add('hidden');
    });

    // --- Sidebar Tabs Logic ---
    const sidebarTabBtns = document.querySelectorAll('.sidebar-tab-btn');
    sidebarTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sidebar-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.sidebar-tab-content').forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });

    function buildLeaderboard() {
        const leaderboardList = document.getElementById('leaderboard-list');
        if (!leaderboardList) return;

        // Filter for node data only (exclude edge data)
        const nodes = elements.filter(el => !el.data.source && !el.data.target)
                              .map(el => el.data);

        // Sort by importance descending, then alphabetically by name
        nodes.sort((a, b) => {
            if (b.importance !== a.importance) {
                return b.importance - a.importance;
            }
            return a.name.localeCompare(b.name);
        });

        leaderboardList.innerHTML = '';

        nodes.forEach((nodeData, idx) => {
            const rank = idx + 1;
            let rankClass = '';
            if (rank === 1) rankClass = 'top-1';
            else if (rank === 2) rankClass = 'top-2';
            else if (rank === 3) rankClass = 'top-3';

            const row = document.createElement('div');
            row.className = 'leaderboard-row';
            row.dataset.nodeId = nodeData.id;

            // Cap or normalize progress relative to max importance of 120
            const progressPct = Math.min((nodeData.importance / 120) * 100, 100);

            row.innerHTML = `
                <div class="rank-num ${rankClass}">${rank}</div>
                <img class="leaderboard-avatar" src="${nodeData.image}" alt="${nodeData.name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(nodeData.name)}&background=1e293b&color=f8fafc&size=128'">
                <div class="leaderboard-info">
                    <div class="leaderboard-name-score">
                        <span class="leaderboard-name">${nodeData.name}</span>
                        <span class="leaderboard-score">${nodeData.importance} pts</span>
                    </div>
                    <div class="leaderboard-progress-bg">
                        <div class="leaderboard-progress-fill" style="width: ${progressPct}%"></div>
                    </div>
                </div>
            `;

            row.addEventListener('click', () => {
                const targetNode = cy.getElementById(nodeData.id);
                if (targetNode.length > 0) {
                    // Smoothly animate Cytoscape viewport to center and zoom on the character node
                    cy.animate({
                        center: { eles: targetNode },
                        zoom: 1.2
                    }, {
                        duration: 600
                    });

                    // Programmatically trigger the tap handler on the node to open detail sidebar and highlight connections
                    targetNode.trigger('tap');
                }
            });

            leaderboardList.appendChild(row);
        });
    }
});
