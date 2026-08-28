// Beige Station 93 - A Space Station Game
// Copyright (c) 2024
// Licensed under the Hyphen License 1.0 (HLv1.0).

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const airText = document.getElementById('airText');
const airFill = document.getElementById('airFill');
const chatBox = document.getElementById('chatBox');
const chatInput = document.getElementById('chatInput');

// Tile types
const TILE_SPACE = 0;
const TILE_FLOOR = 1;
const TILE_WALL = 2;
const TILE_DOOR = 3;
const TILE_SPAWN = 4;

// Tile colors
const COLORS = {
    [TILE_SPACE]: '#000000',
    [TILE_FLOOR]: '#d2b48c',
    [TILE_WALL]: '#8b7355',
    [TILE_DOOR]: '#e8d4b8',
    player: '#4a7c4e'
};

// Station dimensions
const STATION_WIDTH = 64;
const STATION_HEIGHT = 64;
const TILE_SIZE = 16;

// Canvas size - more zoomed in
const VIEWPORT_WIDTH = 480;
const VIEWPORT_HEIGHT = 480;

canvas.width = VIEWPORT_WIDTH;
canvas.height = VIEWPORT_HEIGHT;

// Map and door state
let map = [];
let doors = {};

// Parse map from string
const mapRows = [
"0000000000000000000000000000000000000000000000000000000000000000",
"0000000000000000000000000000000022222200000000000000000000000000",
"0000000000000000000000000000000021411200000000000000000000000000",
"0000000000000000000000000000000011111100000000000000000000000000",
"0000000000000000000000000000000021111200000000000000000000000000",
"0000000000000000000000000000000021111200000000000000000000000000",
"0000000000000000000000000000000011111100000000000000000000000000",
"0000000000000000000000000000000021111200000000000000000000000000",
"0000000002222222222222222222222211112222222222222222222200000000",
"0000000002111111111111111111111111111111111111111111111200000000",
"0000000002111111111111111111111111111111111111111111111200000000",
"0000000002322223222232222322222222222233322223332222333220000000",
"0000000002111121111211112111120000211111111111111111111200000000",
"0000000002111121111211112111120000211111111111111111111200000000",
"0000000002111121111211112111120000211111111111111111111200000000",
"0000000002111121111211112111120000211111111111111111111200000000",
"0000000002222322223222232222320000211111111111111111111200000000",
"0000000000021120211202112021120000211111111111122222222200000000",
"0000000000021120211202112021120000211111111111121111111200000000",
"0000000000021120211202112021120000211111111111131111111200000000",
"0000000002222222222222222222222200002222222222222222222220000000",
"0000000002000000000000000000000000000000000000000000000000000000",
"0000000000000000000000000000000000000000000000000000000000000000",
"0000000000000000000000000000000000000000000000000000000000000000",
"0000000000000000000000000000000000000000000000000000000000000000",
"0000000000000000000000000000000000000000000000000000000000000000",
"0000000000000000000000000000000000000000000000000000000000000000",
"0000000000000000000000000000000000000000000000000000000000000000",
"0000000000000000000000000000000000000000000000000000000000000000",
"0000000000000000000000000000000000000000000000000000000000000000",
"000000000"
];

// Fill remaining rows with space
for (let i = mapRows.length; i < STATION_HEIGHT; i++) {
    mapRows.push("0".repeat(STATION_WIDTH));
}

function parseMap() {
    for (let y = 0; y < STATION_HEIGHT; y++) {
        map[y] = [];
        const row = mapRows[y] || "";
        for (let x = 0; x < STATION_WIDTH; x++) {
            const ch = row[x] || '0';
            let tile = parseInt(ch) || 0;
            if (tile === TILE_DOOR) {
                doors[`${x},${y}`] = { open: false, timer: null };
            }
            // Treat spawn as floor for collision
            if (tile === TILE_SPAWN) tile = TILE_FLOOR;
            map[y][x] = tile;
        }
    }
}

// Find spawn point
function findSpawn() {
    for (let y = 0; y < STATION_HEIGHT; y++) {
        for (let x = 0; x < STATION_WIDTH; x++) {
            const row = mapRows[y] || "";
            if (row[x] === '4') {
                return { x: x * TILE_SIZE, y: y * TILE_SIZE };
            }
        }
    }
    return { x: 32 * TILE_SIZE, y: 32 * TILE_SIZE };
}

// Multiplayer simulation (other players)
const otherPlayers = [
    { id: 1, name: "Alice", x: 200, y: 200, color: '#5a8c5e' },
    { id: 2, name: "Bob", x: 300, y: 250, color: '#6a9c6e' },
    { id: 3, name: "Charlie", x: 350, y: 300, color: '#7aac7e' }
];

// Local player
const player = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    air: 100,
    maxAir: 100,
    speed: 3,
    inSpace: false
};

// Camera
const camera = { x: 0, y: 0 };

// Input
const keys = {};
let chatActive = false;

// Parse map on load
parseMap();
const spawn = findSpawn();
player.x = spawn.x;
player.y = spawn.y;

document.addEventListener('keydown', (e) => {
    if (chatActive) {
        if (e.code === 'Enter') {
            const msg = chatInput.value.trim();
            if (msg) {
                addChatMessage("You", msg);
                // Simulate response from nearby players
                simulateResponse(msg);
            }
            chatInput.value = '';
            chatActive = false;
            chatInput.style.display = 'none';
            chatInput.blur();
        } else if (e.code === 'Escape') {
            chatActive = false;
            chatInput.value = '';
            chatInput.style.display = 'none';
            chatInput.blur();
        }
        return;
    }
    
    keys[e.code] = true;
    
    // Open chat with Enter when not typing
    if (e.code === 'Enter') {
        const nearbyPlayers = getNearbyPlayers(8 * TILE_SIZE);
        if (nearbyPlayers.length > 0) {
            chatActive = true;
            chatInput.style.display = 'block';
            chatInput.focus();
        }
    }
    
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Click to open doors
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left + camera.x;
    const clickY = e.clientY - rect.top + camera.y;
    const tileX = Math.floor(clickX / TILE_SIZE);
    const tileY = Math.floor(clickY / TILE_SIZE);
    
    const key = `${tileX},${tileY}`;
    if (doors[key] && !doors[key].open) {
        openDoor(tileX, tileY);
    }
});

function openDoor(x, y) {
    const key = `${x},${y}`;
    const door = doors[key];
    if (!door) return;
    
    door.open = true;
    map[y][x] = TILE_FLOOR;
    
    // Clear existing timer
    if (door.timer) clearTimeout(door.timer);
    
    // Close after 2 seconds if no one is standing in it
    door.timer = setTimeout(() => {
        const playerTileX = Math.floor((player.x + TILE_SIZE/2) / TILE_SIZE);
        const playerTileY = Math.floor((player.y + TILE_SIZE/2) / TILE_SIZE);
        
        if (playerTileX !== x || playerTileY !== y) {
            door.open = false;
            map[y][x] = TILE_DOOR;
        }
    }, 2000);
}

function getNearbyPlayers(range) {
    const result = [];
    for (const p of otherPlayers) {
        const dx = p.x - player.x;
        const dy = p.y - player.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist <= range) {
            result.push(p);
        }
    }
    return result;
}

function addChatMessage(name, text) {
    const line = document.createElement('div');
    line.textContent = `${name}: ${text}`;
    chatBox.appendChild(line);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    // Keep only last 50 messages
    while (chatBox.children.length > 50) {
        chatBox.removeChild(chatBox.firstChild);
    }
}

function simulateResponse(playerMsg) {
    const nearby = getNearbyPlayers(8 * TILE_SIZE);
    if (nearby.length === 0) return;
    
    const responses = [
        "Interesting!",
        "I see what you mean.",
        "Nice station, right?",
        "Watch out for space!",
        "The air runs out fast out there."
    ];
    
    setTimeout(() => {
        const responder = nearby[Math.floor(Math.random() * nearby.length)];
        const resp = responses[Math.floor(Math.random() * responses.length)];
        addChatMessage(responder.name, resp);
    }, 500 + Math.random() * 1000);
}

function isWalkable(x, y) {
    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);
    
    if (tileX < 0 || tileX >= STATION_WIDTH || tileY < 0 || tileY >= STATION_HEIGHT) {
        return false;
    }
    
    const tile = map[tileY][tileX];
    return tile !== TILE_WALL;
}

function getTile(x, y) {
    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);
    
    if (tileX < 0 || tileX >= STATION_WIDTH || tileY < 0 || tileY >= STATION_HEIGHT) {
        return TILE_SPACE;
    }
    
    return map[tileY][tileX];
}

function checkCollision(newX, newY) {
    const margin = 2;
    const corners = [
        { x: newX + margin, y: newY + margin },
        { x: newX + TILE_SIZE - margin, y: newY + margin },
        { x: newX + margin, y: newY + TILE_SIZE - margin },
        { x: newX + TILE_SIZE - margin, y: newY + TILE_SIZE - margin }
    ];
    
    for (const corner of corners) {
        const tile = getTile(corner.x, corner.y);
        if (tile === TILE_WALL) {
            return true;
        }
    }
    
    return false;
}

function update() {
    let dx = 0, dy = 0;
    
    if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) dx += 1;
    
    if (dx !== 0 && dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len;
        dy /= len;
    }
    
    const centerTile = getTile(player.x + TILE_SIZE / 2, player.y + TILE_SIZE / 2);
    player.inSpace = centerTile === TILE_SPACE;
    
    let moveSpeed = player.speed;
    let friction = 0.8;
    
    if (player.inSpace) {
        moveSpeed *= 0.5;
        friction = 0.95;
        player.air -= 0.3;
        if (player.air <= 0) player.air = 0;
    } else {
        player.air += 0.5;
        if (player.air > player.maxAir) player.air = player.maxAir;
    }
    
    if (dx !== 0 || dy !== 0) {
        player.vx = dx * moveSpeed;
        player.vy = dy * moveSpeed;
    } else {
        player.vx *= friction;
        player.vy *= friction;
    }
    
    const newX = player.x + player.vx;
    const newY = player.y + player.vy;
    
    if (!checkCollision(newX, player.y)) player.x = newX;
    if (!checkCollision(player.x, newY)) player.y = newY;
    
    player.x = Math.max(0, Math.min(player.x, STATION_WIDTH * TILE_SIZE - TILE_SIZE));
    player.y = Math.max(0, Math.min(player.y, STATION_HEIGHT * TILE_SIZE - TILE_SIZE));
    
    // Camera follows player more closely
    camera.x = player.x - VIEWPORT_WIDTH / 2 + TILE_SIZE / 2;
    camera.y = player.y - VIEWPORT_HEIGHT / 2 + TILE_SIZE / 2;
    
    camera.x = Math.max(0, Math.min(camera.x, STATION_WIDTH * TILE_SIZE - VIEWPORT_WIDTH));
    camera.y = Math.max(0, Math.min(camera.y, STATION_HEIGHT * TILE_SIZE - VIEWPORT_HEIGHT));
    
    airText.textContent = Math.floor(player.air) + '%';
    airFill.style.width = player.air + '%';
}

function render() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const startTileX = Math.floor(camera.x / TILE_SIZE);
    const startTileY = Math.floor(camera.y / TILE_SIZE);
    const endTileX = Math.ceil((camera.x + VIEWPORT_WIDTH) / TILE_SIZE);
    const endTileY = Math.ceil((camera.y + VIEWPORT_HEIGHT) / TILE_SIZE);
    
    for (let y = startTileY; y <= endTileY; y++) {
        for (let x = startTileX; x <= endTileX; x++) {
            if (y >= 0 && y < STATION_HEIGHT && x >= 0 && x < STATION_WIDTH) {
                const tile = map[y][x];
                const screenX = Math.floor(x * TILE_SIZE - camera.x);
                const screenY = Math.floor(y * TILE_SIZE - camera.y);
                
                ctx.fillStyle = COLORS[tile] || COLORS[TILE_SPACE];
                ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
                
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
                ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            }
        }
    }
    
    // Draw other players
    for (const p of otherPlayers) {
        const screenX = p.x - camera.x;
        const screenY = p.y - camera.y;
        
        if (screenX > -TILE_SIZE && screenX < VIEWPORT_WIDTH && screenY > -TILE_SIZE && screenY < VIEWPORT_HEIGHT) {
            ctx.fillStyle = p.color;
            ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = '#2d5a3d';
            ctx.lineWidth = 2;
            ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            
            // Name tag
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px sans-serif';
            ctx.fillText(p.name, screenX, screenY - 4);
        }
    }
    
    // Draw local player
    const playerScreenX = player.x - camera.x;
    const playerScreenY = player.y - camera.y;
    
    ctx.fillStyle = COLORS.player;
    ctx.fillRect(playerScreenX, playerScreenY, TILE_SIZE, TILE_SIZE);
    
    ctx.strokeStyle = '#2d5a3d';
    ctx.lineWidth = 2;
    ctx.strokeRect(playerScreenX, playerScreenY, TILE_SIZE, TILE_SIZE);
    
    // Suffocation warning
    if (player.air < 30) {
        ctx.fillStyle = `rgba(255, 0, 0, ${0.3 * (1 - player.air / 30)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

gameLoop();
console.log('Beige Station 93 loaded! Use WASD or Arrow keys to move. Click doors to open them.');
