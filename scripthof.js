// --- 1. CONFIGURATION & IDS ---
const shelf404Ids = ["456699600154263555", "306976202755801091", "1420390943517048923", "246408830068588547"]; 
const starShelfIds = ["1231035322108874795", "810573992746024980", "642783529419407374", "748544305706041385", "898231654466846760", "769880845179682826"]; 
const memberShelfIds = ["1231035322108874795", "810573992746024980", "642783529419407374", "748544305706041385"];

const allUniqueIds = [...new Set([...shelf404Ids, ...starShelfIds, ...memberShelfIds])];

const userMapping = {
    "1420390943517048923": "migo",
    "1231035322108874795": "shoti",
    "810573992746024980": "saeki",
    "456699600154263555": "jrpf",
    "306976202755801091": "spaggy",
    "642783529419407374": "yema",
    "246408830068588547": "thati",
    "748544305706041385": "juls",
    "898231654466846760": "aid",
    "769880845179682826": "nath"
};

const fallbackNames = {
    "1420390943517048923": "_mig0",
    "1231035322108874795": "Shoti",
    "810573992746024980": "Saeki",
    "456699600154263555": "J.rpf",
    "306976202755801091": "Spaggy",
    "642783529419407374": "yema",
    "246408830068588547": "thati",
    "748544305706041385": "juls",
    "898231654466846760": "aid",
    "769880845179682826": "nath"
};

const statusColors = { 
    online: 'var(--status-online)', 
    idle: 'var(--status-idle)', 
    dnd: 'var(--status-dnd)', 
    offline: 'var(--status-offline)' 
};

// --- 2. WEBSOCKET LOGIC (LANYARD) ---
let socket;
let heartbeatInterval;
let globalDataMap = {};

function connectLanyard() {
    socket = new WebSocket('wss://api.lanyard.rest/socket');

    socket.onopen = () => console.log('Lanyard Connected');

    socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        // Opcode 1: Hello - Start Heartbeat and Initialize
        if (msg.op === 1) {
            heartbeatInterval = setInterval(() => {
                socket.send(JSON.stringify({ op: 3 }));
            }, msg.d.heartbeat_interval);

            socket.send(JSON.stringify({
                op: 2,
                d: { subscribe_to_ids: allUniqueIds }
            }));
        }

        // Opcode 0: Event
        if (msg.op === 0) {
            if (msg.t === 'INIT_STATE') {
                globalDataMap = msg.d;
                initializeUI();
            } else if (msg.t === 'PRESENCE_UPDATE') {
                const userId = msg.d.discord_user.id;
                globalDataMap[userId] = msg.d;
                updateUserUI(userId, msg.d);
            }
        }
    };

    socket.onclose = () => {
        clearInterval(heartbeatInterval);
        setTimeout(connectLanyard, 5000);
    };
}

// --- 3. CUSTOM CURSOR & DUST ---
const cursor = document.getElementById('custom-cursor');
let lastDustTime = 0;

document.addEventListener('mousemove', (e) => {
    cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    const now = Date.now();
    if (now - lastDustTime > 40) {
        createDust(e.clientX, e.clientY);
        lastDustTime = now;
    }
});

function createDust(x, y) {
    const dust = document.createElement('div');
    dust.className = 'dust';
    const size = Math.random() * 3 + 2;
    dust.style.width = size + 'px'; 
    dust.style.height = size + 'px';
    dust.style.left = x + 'px'; 
    dust.style.top = y + 'px';
    dust.style.setProperty('--dx', (Math.random() - 0.5) * 60 + 'px');
    dust.style.setProperty('--dy', (Math.random() * 60 + 20) + 'px');
    dust.style.setProperty('--dr', (Math.random() * 360) + 'deg');
    document.body.appendChild(dust);
    setTimeout(() => dust.remove(), 1200);
}

// --- 4. UI RENDERING ---
function initializeUI() {
    const staffRow = document.getElementById('staff-row');
    const starRow = document.getElementById('star-row');
    const memberRow = document.getElementById('member-row');

    if (staffRow) staffRow.innerHTML = '';
    if (starRow) starRow.innerHTML = '';
    if (memberRow) memberRow.innerHTML = '';

    let loadCount = 0;
    shelf404Ids.forEach(id => renderUserCard(id, globalDataMap[id], 'staff-row', loadCount++));
    starShelfIds.forEach(id => renderUserCard(id, globalDataMap[id], 'star-row', loadCount++));
    memberShelfIds.forEach(id => renderUserCard(id, globalDataMap[id], 'member-row', loadCount++));
}

const profCard = document.getElementById('profileCard');
let profileTimeout;
let currentProfileId = null;

function renderUserCard(id, userData, containerId, delayIndex) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const card = document.createElement('div');
    card.className = 'user-card';
    card.id = `card-${id}`;
    
    const username = userData ? userData.discord_user.username : (fallbackNames[id] || "unknown");
    const status = userData ? userData.discord_status : "offline";
    const avatar = userData?.discord_user?.avatar 
        ? `https://cdn.discordapp.com/avatars/${id}/${userData.discord_user.avatar}.png?size=256`
        : `https://cdn.discordapp.com/embed/avatars/0.png`;

    card.innerHTML = `
        <div class="avatar-wrapper">
            <img src="${avatar}" class="user-avatar" id="avatar-${id}" alt="${username}">
            <div class="status-dot" id="dot-${id}" style="background: ${statusColors[status]}"></div>
        </div>
        <div class="user-name">${username.toLowerCase()}</div>
    `;

    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
        const slug = userMapping[id];
        if (slug) window.location.href = `${slug}.html`;
    });

    card.addEventListener('mouseenter', (e) => {
        clearTimeout(profileTimeout);
        currentProfileId = id;
        openProfile(id, globalDataMap[id], e.clientX, e.clientY);
    });

    card.addEventListener('mouseleave', () => {
        profileTimeout = setTimeout(() => {
            profCard.classList.remove('active');
            currentProfileId = null;
        }, 150);
    });

    container.appendChild(card);
    setTimeout(() => card.classList.add('show'), delayIndex * 150);
}

function updateUserUI(id, data) {
    // Update Grid Elements
    const dot = document.getElementById(`dot-${id}`);
    if (dot) dot.style.background = statusColors[data.discord_status || 'offline'];

    // Update Profile Card if it's currently showing this user
    if (currentProfileId === id && profCard.classList.contains('active')) {
        updateProfileCardContent(id, data);
    }
}

function openProfile(id, data, x, y) {
    updateProfileCardContent(id, data);
    
    const cardWidth = 300;
    const cardHeight = 350;
    let posX = x + 15; 
    let posY = y - (cardHeight / 2);

    if (posX + cardWidth > window.innerWidth) posX = x - cardWidth - 15;
    if (posY + cardHeight > window.innerHeight) posY = window.innerHeight - cardHeight - 15;
    if (posY < 15) posY = 15;

    profCard.style.left = posX + 'px';
    profCard.style.top = posY + 'px'; 
    profCard.classList.add('active');
}

function updateProfileCardContent(id, data) {
    const avatarImg = document.getElementById('profAvatar');
    const avatarUrl = data?.discord_user?.avatar 
        ? `https://cdn.discordapp.com/avatars/${id}/${data.discord_user.avatar}.png?size=256` 
        : `https://cdn.discordapp.com/embed/avatars/0.png`;
    
    avatarImg.src = avatarUrl;
    document.getElementById('profUsername').textContent = data ? data.discord_user.username : (fallbackNames[id] || "USER");
    document.getElementById('profDot').style.background = statusColors[data?.discord_status || 'offline'];
    
    const discordLink = document.getElementById('profLink');
    discordLink.href = `https://discord.com/users/${id}`;

    avatarImg.onclick = () => {
        const slug = userMapping[id];
        if (slug) window.location.href = `${slug}.html`;
    };

    let activityHtml = `<div class="status-text-item" style="color: #666;">No current activity</div>`;
    if (data?.activities?.length > 0) {
        const custom = data.activities.find(a => a.type === 4);
        const game = data.activities.find(a => a.type === 0);
        const spotify = data.spotify; // Use Lanyard's specific spotify object

        if (custom) activityHtml = `<div class="status-text-item">${custom.state || custom.name}</div>`;
        else if (game) activityHtml = `<div class="status-text-item">Playing <b>${game.name}</b></div>`;
        else if (spotify) activityHtml = `<div class="status-text-item">Listening to <b>${spotify.song}</b></div>`;
    }
    document.getElementById('profActivity').innerHTML = activityHtml;
}

profCard.addEventListener('mouseenter', () => clearTimeout(profileTimeout));
profCard.addEventListener('mouseleave', () => {
    profCard.classList.remove('active');
    currentProfileId = null;
});

// --- 5. MINI PLAYER LOGIC ---
const bgMusic = document.getElementById('bgMusic');
const playBtn = document.getElementById('playBtn');
const progressBg = document.getElementById('progressBg');
const progress = document.getElementById('progress');
const currTimeEl = document.getElementById('currTime');
const totTimeEl = document.getElementById('totTime');
const volumeSlider = document.getElementById('volumeSlider');

const formatTime = (seconds) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
};

bgMusic.addEventListener('loadedmetadata', () => {
    totTimeEl.textContent = formatTime(bgMusic.duration);
});

playBtn.onclick = () => {
    if(bgMusic.paused) { 
        bgMusic.play(); 
        playBtn.innerHTML = '<i class="fas fa-pause"></i>'; 
    } else { 
        bgMusic.pause(); 
        playBtn.innerHTML = '<i class="fas fa-play"></i>'; 
    }
};

bgMusic.ontimeupdate = () => {
    if (bgMusic.duration) {
        progress.style.width = (bgMusic.currentTime / bgMusic.duration) * 100 + '%';
        currTimeEl.textContent = formatTime(bgMusic.currentTime);
    }
};

progressBg.onclick = (e) => {
    const rect = progressBg.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    bgMusic.currentTime = (clickX / rect.width) * bgMusic.duration;
};

volumeSlider.oninput = (e) => { bgMusic.volume = e.target.value; };

document.addEventListener('click', () => {
    if (bgMusic.paused && bgMusic.currentTime === 0) {
        bgMusic.play().catch(() => {});
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }
}, { once: true });

// --- 6. CAROUSEL AUTO-SCROLL LOGIC ---
function setupCarousel(viewportId, trackId) {
    const viewport = document.getElementById(viewportId);
    const track = document.getElementById(trackId);
    if (!viewport || !track) return;

    let currentX = 0;
    let isHovered = false;
    const scrollSpeed = 0.6; 

    viewport.addEventListener('mouseenter', () => isHovered = true);
    viewport.addEventListener('mouseleave', () => isHovered = false);

    function animate() {
        if (!isHovered && track.children.length > 0) {
            currentX -= scrollSpeed;
            track.style.transform = `translateX(${currentX}px)`;

            const firstCard = track.firstElementChild;
            if (firstCard) {
                const cardTotalWidth = firstCard.offsetWidth + 30; 
                if (Math.abs(currentX) >= cardTotalWidth) {
                    track.appendChild(firstCard);
                    currentX += cardTotalWidth;
                    track.style.transform = `translateX(${currentX}px)`;
                }
            }
        }
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
}

// --- 7. INITIALIZE ---
connectLanyard();
setupCarousel('starViewport', 'star-row');