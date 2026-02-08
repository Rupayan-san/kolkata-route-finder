const svg = document.getElementById("map");
const sourceSelect = document.getElementById("source");
const destSelect = document.getElementById("destination");
const output = document.getElementById("output");

/* --- Theme Colors --- */
const colors = {
    accent: "#4fd1c5",
    nodeCore: "#2d3748",
    nodeGlow: "rgba(79, 209, 197, 0.2)",
    roadLine: "#e2e8f0",
    text: "#718096"
};

/* --- Nodes (Stations) --- */
let nodes = {
    Howrah: { x: 80, y: 280 },
    Esplanade: { x: 260, y: 230 },
    Victoria: { x: 200, y: 260 },
    Maidan: { x: 240, y: 300 },
    ParkStreet: { x: 310, y: 270 },
    Sealdah: { x: 330, y: 210 },
    CollegeStreet: { x: 300, y: 180 },
    ScienceCity: { x: 420, y: 300 },
    SaltLake: { x: 520, y: 240 },
    NewTown: { x: 620, y: 190 },
    EcoPark: { x: 650, y: 240 },
    Airport: { x: 700, y: 140 }
};

let graph = {};
let isPlacingNode = false;
let pendingNodeName = "";

/* --- Add Node --- */
function addNode() {
    const name = document.getElementById("nodeName").value.trim();
    if (!name) return alert("Enter node name");
    if (nodes[name]) return alert("Node already exists");

    pendingNodeName = name;
    isPlacingNode = true;
    output.innerHTML = `Click on map to place <b>${name}</b>`;
    document.getElementById("nodeName").value = "";
}

svg.addEventListener("click", e => {
    if (!isPlacingNode) return;

    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 800;
    const y = ((e.clientY - rect.top) / rect.height) * 500;

    nodes[pendingNodeName] = { x: Math.round(x), y: Math.round(y) };
    graph[pendingNodeName] = {};

    isPlacingNode = false;
    pendingNodeName = "";

    updateDropdowns();
    drawMap();
    output.innerHTML = "✅ Node added";
});

/* --- Draw Map --- */
function drawMap() {
    svg.innerHTML = "";

    for (let u in graph) {
        for (let v in graph[u]) {
            if (u < v) drawLine(u, v);
        }
    }

    for (let n in nodes) {
        const { x, y } = nodes[n];

        const glow = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        glow.setAttribute("cx", x);
        glow.setAttribute("cy", y);
        glow.setAttribute("r", 12);
        glow.setAttribute("fill", colors.nodeGlow);
        svg.appendChild(glow);

        const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("cx", x);
        c.setAttribute("cy", y);
        c.setAttribute("r", 5);
        c.setAttribute("fill", colors.nodeCore);
        svg.appendChild(c);

        const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
        t.setAttribute("x", x + 10);
        t.setAttribute("y", y + 4);
        t.textContent = n;
        t.setAttribute("font-size", "11");
        t.setAttribute("fill", colors.text);
        svg.appendChild(t);
    }

    updateStartMarker();
}

function drawLine(u, v) {
    const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
    l.setAttribute("x1", nodes[u].x);
    l.setAttribute("y1", nodes[u].y);
    l.setAttribute("x2", nodes[v].x);
    l.setAttribute("y2", nodes[v].y);
    l.setAttribute("stroke", colors.roadLine);
    l.setAttribute("stroke-width", "2");
    svg.appendChild(l);
}

function updateStartMarker() {
    const s = sourceSelect.value;
    if (!nodes[s]) return;

    const old = document.getElementById("start-marker");
    if (old) old.remove();

    const m = document.createElementNS("http://www.w3.org/2000/svg", "text");
    m.setAttribute("id", "start-marker");
    m.setAttribute("x", nodes[s].x - 10);
    m.setAttribute("y", nodes[s].y - 10);
    m.setAttribute("font-size", "20");
    m.textContent = "📍";
    svg.appendChild(m);
}

/* --- Path Finding --- */
function findPath() {
    const src = sourceSelect.value;
    const dst = destSelect.value;
    if (src === dst) {
        output.innerHTML = "Already there";
        return;
    }

    const res = dijkstra(src, dst);

    if (!res.path.length) {
        output.innerHTML = "No route found";
        return;
    }

    // ✅ SHOW FULL ROUTE NAMES HERE
    output.innerHTML = `Route: ${res.path.join(" → ")}`;

    document.getElementById("distance-val").innerText =
        `${res.distance} km`;

    animateRoute(res.path);
}


function animateRoute(path) {
    svg.querySelectorAll("#animPath,.temp").forEach(e => e.remove());

    let d = `M ${nodes[path[0]].x} ${nodes[path[0]].y}`;
    for (let i = 1; i < path.length; i++) {
        d += ` L ${nodes[path[i]].x} ${nodes[path[i]].y}`;
    }

    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("id", "animPath");
    p.setAttribute("d", d);
    p.setAttribute("fill", "none");
    p.setAttribute("stroke", colors.accent);
    p.setAttribute("stroke-width", "4");
    svg.appendChild(p);

    const car = document.createElementNS("http://www.w3.org/2000/svg", "text");
    car.textContent = "🚗";
    car.setAttribute("font-size", "20");
    car.setAttribute("class", "temp");

    const anim = document.createElementNS("http://www.w3.org/2000/svg", "animateMotion");
    anim.setAttribute("dur", "2s");
    anim.setAttribute("fill", "freeze");

    const mp = document.createElementNS("http://www.w3.org/2000/svg", "mpath");
    mp.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#animPath");

    anim.appendChild(mp);
    car.appendChild(anim);
    svg.appendChild(car);
}

/* --- Dijkstra --- */
function dijkstra(start, end) {
    const dist = {}, prev = {}, vis = new Set();
    Object.keys(nodes).forEach(n => dist[n] = Infinity);
    dist[start] = 0;

    while (true) {
        let u = null, min = Infinity;
        for (let n in dist) {
            if (!vis.has(n) && dist[n] < min) {
                min = dist[n];
                u = n;
            }
        }
        if (!u || u === end) break;
        vis.add(u);

        for (let v in graph[u]) {
            let alt = dist[u] + graph[u][v];
            if (alt < dist[v]) {
                dist[v] = alt;
                prev[v] = u;
            }
        }
    }

    const path = [];
    let cur = end;
    while (cur) {
        path.unshift(cur);
        cur = prev[cur];
    }

    return { distance: dist[end], path: dist[end] === Infinity ? [] : path };
}

/* --- Dropdowns --- */
function updateDropdowns() {
    sourceSelect.innerHTML = "";
    destSelect.innerHTML = "";
    Object.keys(nodes).sort().forEach(n => {
        sourceSelect.add(new Option(n, n));
        destSelect.add(new Option(n, n));
    });
    sourceSelect.value = "Howrah";
    destSelect.value = "Airport";
}

sourceSelect.addEventListener("change", updateStartMarker);

/* --- Add Edge --- */
function addEdge() {
    const from = document.getElementById("fromNode").value.trim();
    const to = document.getElementById("toNode").value.trim();
    const w = parseInt(document.getElementById("weight").value);

    if (!nodes[from] || !nodes[to]) return alert("Invalid node");
    if (!w || w <= 0) return alert("Invalid distance");

    graph[from][to] = w;
    graph[to][from] = w;

    drawMap();
    output.innerHTML = `Connected ${from} ↔ ${to}`;
}

/* --- INIT WITH DENSE MAP --- */
function init() {
    for (let n in nodes) graph[n] = {};

    const connections = [
        ["Howrah","Esplanade"],["Howrah","Victoria"],
        ["Esplanade","Victoria"],["Esplanade","Sealdah"],["Esplanade","ParkStreet"],
        ["Victoria","Maidan"],
        ["Maidan","ParkStreet"],["ParkStreet","ScienceCity"],
        ["Sealdah","CollegeStreet"],["Sealdah","ScienceCity"],["Sealdah","NewTown"],
        ["ScienceCity","SaltLake"],
        ["SaltLake","NewTown"],["SaltLake","EcoPark"],
        ["NewTown","EcoPark"],["NewTown","Airport"],["EcoPark","Airport"]
    ];

    connections.forEach(([a,b]) => {
        const d = Math.round(
            Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y) / 10
        );
        graph[a][b] = d;
        graph[b][a] = d;
    });

    updateDropdowns();
    drawMap();
}

init();
