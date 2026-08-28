// Beige Station 93 - A Space Station Game
// Copyright (c) 2026
// Licensed under the Hyphen License 1.0 (HLv1.0).

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const airText = document.getElementById('airText');
const airFill = document.getElementById('airFill');

// Tile types
const TILE_SPACE = 0;   // Black - vacuum, slow movement, air loss
const TILE_FLOOR = 1;   // Beige - normal floor
const TILE_WALL = 2;    // Dark beige - walls

// Tile colors
const COLORS = {
    [TILE_SPACE]: '#000000',
    [TILE_FLOOR]: '#d2b48c',
    [TILE_WALL]: '#8b7355',
    player: '#4a7c4e'
};

// Station dimensions (in tiles)
const STATION_WIDTH = 50;
const STATION_HEIGHT = 50;
const TILE_SIZE = 16;

// Canvas size (viewport)
const VIEWPORT_WIDTH = 800;
const VIEWPORT_HEIGHT = 600;

canvas.width = VIEWPORT_WIDTH;
canvas.height = VIEWPORT_HEIGHT;

// Generate station map
function generateStation() {
    const map = [];
    
    for (let y = 0; y < STATION_HEIGHT; y++) {
        map[y] = [];
        for (let x = 0; x < STATION_WIDTH; x++) {
            // Default to space
            map[y][x] = TILE_SPACE;
        }
    }
    
    // Create a basic station layout with rooms and corridors
    // Central corridor
    for (let x = 5; x < STATION_WIDTH - 5; x++) {
        for (let y = Math.floor(STATION_HEIGHT / 2) - 2; y <= Math.floor(STATION_HEIGHT / 2) + 2; y++) {
            map[y][x] = TILE_FLOOR;
        }
    }
    
    // Vertical corridor
    for (let y = 5; y < STATION_HEIGHT - 5; y++) {
        for (let x = Math.floor(STATION_WIDTH / 2) - 2; x <= Math.floor(STATION_WIDTH / 2) + 2; x++) {
            map[y][x] = TILE_FLOOR;
        }
    }
    
    // Add some rooms
    const rooms = [
        { x: 5, y: 5, w: 8, h: 8 },
        { x: STATION_WIDTH - 13, y: 5, w: 8, h: 8 },
        { x: 5, y: STATION_HEIGHT - 13, w: 8, h: 8 },
        { x: STATION_WIDTH - 13, y: STATION_HEIGHT - 13, w: 8, h: 8 },
        { x: 15, y: 10, w: 6, h: 6 },
        { x: STATION_WIDTH - 21, y: 10, w: 6, h: 6 },
        { x: 15, y: STATION_HEIGHT - 16, w: 6, h: 6 },
        { x: STATION_WIDTH - 21, y: STATION_HEIGHT - 16, w: 6, h: 6 },
    ];
    
    rooms.forEach(room => {
        for (let y = room.y; y < room.y + room.h; y++) {
            for (let x = room.x; x < room.x + room.w; x++) {
                if (y >= 0 && y < STATION_HEIGHT && x >= 0 && x < STATION_WIDTH) {
                    map[y][x] = TILE_FLOOR;
                }
            }
        }
        
        // Add walls around rooms
        for (let y = room.y - 1; y <= room.y + room.h; y++) {
            for (let x = room.x - 1; x <= room.x + room.w; x++) {
                if (y >= 0 && y < STATION_HEIGHT && x >= 0 && x < STATION_WIDTH) {
                    if (map[y][x] === TILE_SPACE) {
                        map[y][x] = TILE_WALL;
                    }
                }
            }
        }
    });
    
    // Add outer walls
    for (let x = 0; x < STATION_WIDTH; x++) {
        if (map[0][x] === TILE_FLOOR) map[0][x] = TILE_WALL;
        if (map[STATION_HEIGHT-1][x] === TILE_FLOOR) map[STATION_HEIGHT-1][x] = TILE_WALL;
    }
    for (let y = 0; y < STATION_HEIGHT; y++) {
        if (map[y][0] === TILE_FLOOR) map[y][0] = TILE_WALL;
        if (map[y][STATION_WIDTH-1] === TILE_FLOOR) map[y][STATION_WIDTH-1] = TILE_WALL;
    }
    
    return map;
}

// Player object
const player = {
    x: STATION_WIDTH * TILE_SIZE / 2,
    y: STATION_HEIGHT * TILE_SIZE / 2,
    vx: 0,
    vy: 0,
    air: 100,
    maxAir: 100,
    speed: 3,
    inSpace: false
};

// Camera
const camera = {
    x: 0,
    y: 0
};

// Input handling
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    // Prevent scrolling with arrow keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Check if position is walkable
function isWalkable(x, y) {
    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);
    
    if (tileX < 0 || tileX >= STATION_WIDTH || tileY < 0 || tileY >= STATION_HEIGHT) {
        return false;
    }
    
    return map[tileY][tileX] !== TILE_WALL;
}

// Get tile at position
function getTile(x, y) {
    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);
    
    if (tileX < 0 || tileX >= STATION_WIDTH || tileY < 0 || tileY >= STATION_HEIGHT) {
        return TILE_SPACE;
    }
    
    return map[tileY][tileX];
}

// Collision detection
function checkCollision(newX, newY) {
    const margin = 2;
    const size = TILE_SIZE - margin * 2;
    
    // Check all four corners
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

// Update game state
function update() {
    // Movement input
    let dx = 0;
    let dy = 0;
    
    if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) dx += 1;
    
    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len;
        dy /= len;
    }
    
    // Check if in space
    const centerTile = getTile(player.x + TILE_SIZE / 2, player.y + TILE_SIZE / 2);
    player.inSpace = centerTile === TILE_SPACE;
    
    // Apply movement modifiers for space
    let moveSpeed = player.speed;
    let friction = 0.8;
    
    if (player.inSpace) {
        moveSpeed *= 0.5;  // Slower movement in space
        friction = 0.95;   // Floatier (less friction) in space
        
        // Lose air when in space
        player.air -= 0.3;
        if (player.air <= 0) {
            player.air = 0;
            // Suffocation effect - could add game over logic here
        }
    } else {
        // Regain air when not in space
        player.air += 0.5;
        if (player.air > player.maxAir) {
            player.air = player.maxAir;
        }
    }
    
    // Apply velocity
    if (dx !== 0 || dy !== 0) {
        player.vx = dx * moveSpeed;
        player.vy = dy * moveSpeed;
    } else {
        player.vx *= friction;
        player.vy *= friction;
    }
    
    // Move with collision detection
    const newX = player.x + player.vx;
    const newY = player.y + player.vy;
    
    if (!checkCollision(newX, player.y)) {
        player.x = newX;
    }
    if (!checkCollision(player.x, newY)) {
        player.y = newY;
    }
    
    // Keep player in bounds
    player.x = Math.max(0, Math.min(player.x, STATION_WIDTH * TILE_SIZE - TILE_SIZE));
    player.y = Math.max(0, Math.min(player.y, STATION_HEIGHT * TILE_SIZE - TILE_SIZE));
    
    // Update camera to follow player
    camera.x = player.x - VIEWPORT_WIDTH / 2;
    camera.y = player.y - VIEWPORT_HEIGHT / 2;
    
    // Clamp camera to station bounds
    camera.x = Math.max(0, Math.min(camera.x, STATION_WIDTH * TILE_SIZE - VIEWPORT_WIDTH));
    camera.y = Math.max(0, Math.min(camera.y, STATION_HEIGHT * TILE_SIZE - VIEWPORT_HEIGHT));
    
    // Update UI
    airText.textContent = Math.floor(player.air) + '%';
    airFill.style.width = player.air + '%';
}

// Render the game
function render() {
    // Clear screen
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Calculate visible tile range
    const startTileX = Math.floor(camera.x / TILE_SIZE);
    const startTileY = Math.floor(camera.y / TILE_SIZE);
    const endTileX = Math.ceil((camera.x + VIEWPORT_WIDTH) / TILE_SIZE);
    const endTileY = Math.ceil((camera.y + VIEWPORT_HEIGHT) / TILE_SIZE);
    
    // Draw tiles
    for (let y = startTileY; y <= endTileY; y++) {
        for (let x = startTileX; x <= endTileX; x++) {
            if (y >= 0 && y < STATION_HEIGHT && x >= 0 && x < STATION_WIDTH) {
                const tile = map[y][x];
                const screenX = Math.floor(x * TILE_SIZE - camera.x);
                const screenY = Math.floor(y * TILE_SIZE - camera.y);
                
                ctx.fillStyle = COLORS[tile];
                ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
                
                // Add subtle grid lines
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
                ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            }
        }
    }
    
    // Draw player
    const playerScreenX = player.x - camera.x;
    const playerScreenY = player.y - camera.y;
    
    ctx.fillStyle = COLORS.player;
    ctx.fillRect(playerScreenX, playerScreenY, TILE_SIZE, TILE_SIZE);
    
    // Add player outline
    ctx.strokeStyle = '#2d5a3d';
    ctx.lineWidth = 2;
    ctx.strokeRect(playerScreenX, playerScreenY, TILE_SIZE, TILE_SIZE);
    
    // Draw suffocation warning
    if (player.air < 30) {
        ctx.fillStyle = `rgba(255, 0, 0, ${0.3 * (1 - player.air / 30)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

// Game loop
const map = generateStation();

function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop();

console.log('Beige Station 93 loaded! Use WASD or Arrow keys to move.');
