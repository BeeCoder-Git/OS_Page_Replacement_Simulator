// Chart instances
let comparisonChartInstance = null;
let beladyChartInstance = null;
let hitRatioChartInstance = null;

function runSimulation() {
    const errorBox = document.getElementById('error-box');
    const resultsContainer = document.getElementById('results');
    const chartsArea = document.getElementById('charts-area');

    // Get Inputs
    const lenInput = parseInt(document.getElementById('input-length').value);
    const refInput = document.getElementById('reference-string').value.trim();
    const frameInput = parseInt(document.getElementById('frame-count').value);

    // Reset UI
    errorBox.style.display = 'none';
    resultsContainer.innerHTML = '';
    chartsArea.style.display = 'none';

    // --- VALIDATION ---

    // 1. Check Length Limit
    if (isNaN(lenInput) || lenInput < 1 || lenInput > 20) {
        return showError("String length must be between 1 and 20.");
    }

    // 2. Check Reference String
    if (!refInput) return showError("Please enter a reference string.");
    const pages = refInput.split(/[\s,]+/).map(num => parseInt(num));

    if (pages.some(isNaN)) {
        return showError("Reference string must only contain numbers.");
    }

    // 3. Match Length vs String
    if (pages.length !== lenInput) {
        return showError(`Mismatch! You set length to ${lenInput}, but entered ${pages.length} numbers.`);
    }

    // 4. Check Frames
    if (isNaN(frameInput) || frameInput < 1 || frameInput > 7) {
        return showError("Frames must be between 1 and 7.");
    }

    // --- COMPUTATION ---
    const fifoResult = simulateFIFO(pages, frameInput);
    const lruResult = simulateLRU(pages, frameInput);
    const optResult = simulateOPTIMAL(pages, frameInput);

    // --- RENDERING ---
    chartsArea.style.display = 'grid';

    renderCharts(fifoResult, lruResult, optResult, pages);

    renderTable("FIFO (First-In-First-Out)", fifoResult, frameInput);
    renderTable("LRU (Least Recently Used)", lruResult, frameInput);
    renderTable("OPTIMAL", optResult, frameInput);
}

function showError(msg) {
    const box = document.getElementById('error-box');
    box.innerText = "Error: " + msg;
    box.style.display = 'block';
}
// --- DEMO LOADER Button ---
function loadBeladyDemo() {
    document.getElementById('input-length').value = "12";
    document.getElementById('reference-string').value = "1 2 3 4 1 2 5 1 2 3 4 5";
    document.getElementById('frame-count').value = "3";
    runSimulation();
    alert("Loaded Belady's Demo.\n\nNotice:\n1. FIFO Faults at 3 Frames = 9\n2. Look at the 'Anomaly Curve' chart.\n3. Change Frames to 4 and Simulate again to see Faults increase to 10.");
}

// --- ALGORITHMS ---
// FIFO:
function simulateFIFO(pages, capacity) {
    let frames = [];
    let steps = [];
    let faults = 0;
    let hits = 0;
    let queueIndex = 0;

    pages.forEach(page => {
        let status = frames.includes(page) ? "Hit" : "Fault";
        if (status === "Hit") {
            hits++;
        } else {
            faults++;
            if (frames.length < capacity) {
                frames.push(page);
            } else {
                frames[queueIndex] = page;
                queueIndex = (queueIndex + 1) % capacity;
            }
        }
        steps.push({
            page,
            frames: [...frames],
            status
        });
    });
    return {
        steps,
        faults,
        hits,
        ratio: ((hits / pages.length) * 100).toFixed(2)
    };
}

// LRU:
function simulateLRU(pages, capacity) {
    let frames = [];
    let steps = [];
    let faults = 0;
    let hits = 0;

    pages.forEach(page => {
        let index = frames.indexOf(page);
        let status = index !== -1 ? "Hit" : "Fault";

        if (status === "Hit") {
            hits++;
            frames.splice(index, 1);
            frames.push(page);
        } else {
            faults++;
            if (frames.length >= capacity) frames.shift();
            frames.push(page);
        }
        steps.push({
            page,
            frames: [...frames],
            status
        });
    });
    return {
        steps,
        faults,
        hits,
        ratio: ((hits / pages.length) * 100).toFixed(2)
    };
}

// OPTIMAL:
function simulateOPTIMAL(pages, capacity) {
    let frames = [];
    let steps = [];
    let faults = 0;
    let hits = 0;

    for (let i = 0; i < pages.length; i++) {
        let page = pages[i];
        let status = frames.includes(page) ? "Hit" : "Fault";

        if (status === "Hit") {
            hits++;
        } else {
            faults++;
            if (frames.length < capacity) {
                frames.push(page);
            } else {
                let victimIdx = -1,
                    farthest = -1;
                for (let f = 0; f < frames.length; f++) {
                    let nextUse = -1;
                    for (let j = i + 1; j < pages.length; j++) {
                        if (pages[j] === frames[f]) {
                            nextUse = j;
                            break;
                        }
                    }
                    if (nextUse === -1) {
                        victimIdx = f;
                        break;
                    }
                    if (nextUse > farthest) {
                        farthest = nextUse;
                        victimIdx = f;
                    }
                }
                frames[victimIdx] = page;
            }
        }
        steps.push({
            page,
            frames: [...frames],
            status
        });
    }
    return {
        steps,
        faults,
        hits,
        ratio: ((hits / pages.length) * 100).toFixed(2)
    };
}

// --- VISUALIZATION ---

function renderTable(algoName, result, frameCount) {
    const container = document.getElementById('results');
    let html = `
            <div class="algo-card">
                <div class="algo-header">
                    <h2>${algoName}</h2>
                    <div class="stats">
                        <span style="color: var(--fault-text)">Faults: ${result.faults}</span>
                        <span style="color: var(--hit-text)">Hits: ${result.hits}</span>
                        <span style="background: #e0f2fe; color: #0369a1;">Hit Ratio: ${result.ratio}%</span>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr><th>Ref</th>${result.steps.map(s => `<th class="current-page-header">${s.page}</th>`).join('')}</tr>
                    </thead>
                    <tbody>`;

    for (let i = 0; i < frameCount; i++) {
        html += `<tr><td>Frame ${i + 1}</td>`;
        result.steps.forEach(step => {
            html += `<td>${step.frames[i] !== undefined ? step.frames[i] : '-'}</td>`;
        });
        html += `</tr>`;
    }

    html += `<tr><td>Status</td>${result.steps.map(s => 
            `<td class="${s.status === 'Hit' ? 'status-hit' : 'status-fault'}">${s.status.charAt(0)}</td>`
        ).join('')}</tr></tbody></table></div>`;

    container.innerHTML += html;
}

function renderCharts(fifo, lru, opt, pages) {
    // 1. Hit Ratio Chart (Doughnut)
    const ctxRatio = document.getElementById('hitRatioChart').getContext('2d');
    if (hitRatioChartInstance) hitRatioChartInstance.destroy();
    hitRatioChartInstance = new Chart(ctxRatio, {
        type: 'doughnut',
        data: {
            labels: ['FIFO', 'LRU', 'OPTIMAL'],
            datasets: [{
                data: [fifo.ratio, lru.ratio, opt.ratio],
                backgroundColor: ['#ef4444', '#f59e0b', '#22a7c5ff'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                }
            }
        }
    });

    // 2. Comparison Chart (Bar)
    const ctxComp = document.getElementById('comparisonChart').getContext('2d');
    if (comparisonChartInstance) comparisonChartInstance.destroy();
    comparisonChartInstance = new Chart(ctxComp, {
        type: 'bar',
        data: {
            labels: ['FIFO', 'LRU', 'OPTIMAL'],
            datasets: [{
                    label: 'Faults',
                    data: [fifo.faults, lru.faults, opt.faults],
                    backgroundColor: '#ef4444'
                },
                {
                    label: 'Hits',
                    data: [fifo.hits, lru.hits, opt.hits],
                    backgroundColor: '#22c55e'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // 3. Belady's Anomaly Chart (FIFO Line)
    const beladyData = [];
    const labels = [];
    for (let i = 1; i <= 7; i++) {
        let res = simulateFIFO(pages, i);
        beladyData.push(res.faults);
        labels.push(i);
    }

    const ctxBelady = document.getElementById('beladyChart').getContext('2d');
    if (beladyChartInstance) beladyChartInstance.destroy();
    beladyChartInstance = new Chart(ctxBelady, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'FIFO Faults',
                data: beladyData,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                tension: 0,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Faults'
                    },
                    beginAtZero: true
                },
                x: {
                    title: {
                        display: true,
                        text: 'Frame Size'
                    }
                }
            }
        }
    });
}