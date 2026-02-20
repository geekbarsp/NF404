const shelf404Ids = ["456699600154263555", "306976202755801091", "1420390943517048923", "246408830068588547"]; 
const starShelfIds = ["1231035322108874795", "810573992746024980", "642783529419407374"]; 

// --- NEW: REDIRECT MAPPING ---
const userMapping = {
    "1420390943517048923": "migo",
    "1231035322108874795": "shoti",
    "810573992746024980": "saeki",
    "456699600154263555": "jrpf",
    "306976202755801091": "spaggy",
    "642783529419407374": "yema",
    "246408830068588547": "thati"
};

const fallbackNames = {
    "1420390943517048923": "_mig0",
    "1231035322108874795": "Shoti",
    "810573992746024980": "Saeki",
    "456699600154263555": "J.rpf",
    "306976202755801091": "Spaggy",
    "642783529419407374": "yema",
    "246408830068588547": "thati"
};

const statusColors = { 
    online: 'var(--status-online)', 
    idle: 'var(--status-idle)', 
    dnd: 'var(--status-dnd)', 
    offline: 'var(--status-offline)' 
};

const cursor = document.getElementById('custom-cursor');
const profCard = document.getElementById('profileCard');

// --- CURSOR & DUST ---
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

// --- DATA FETCHING ---
async function initializeHallOfFame() {
    const allIds = [...shelf404Ids, ...starShelfIds];
    const fetchPromises = allIds.map(id => 
        fetch(`https://api.lanyard.rest/v1/users/${id}`)
            .then(res => res.json())
            .then(data => ({ id, data: data.success ? data.data : null }))
            .catch(() => ({ id, data: null }))
    );

    const usersData = await Promise.all(fetchPromises);
    let loadCount = 0;

    usersData.forEach(({ id, data }) => {
        const containerId = shelf404Ids.includes(id) ? 'staff-row' : 'member-row';
        renderUserCard(id, data, containerId, loadCount);
        loadCount++;
    });
}

let profileTimeout;

function renderUserCard(id, userData, containerId, delayIndex) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const card = document.createElement('div');
    card.className = 'user-card';
    
    const username = userData ? userData.discord_user.username : (fallbackNames[id] || "unknown");
    const status = userData ? userData.discord_status : "offline";
    const avatar = userData?.discord_user?.avatar 
        ? `https://cdn.discordapp.com/avatars/${id}/${userData.discord_user.avatar}.png?size=256`
        : `https://cdn.discordapp.com/embed/avatars/0.png`;

    card.innerHTML = `
        <div class="avatar-wrapper">
            <img src="${avatar}" class="user-avatar" alt="${username}">
            <div class="status-dot" style="background: ${statusColors[status]}"></div>
        </div>
        <div class="user-name">${username.toLowerCase()}</div>
    `;

    // --- REDIRECT ON MAIN GRID CLICK FOR EVERYONE ---
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
        const slug = userMapping[id];
        if (slug) window.location.href = `${slug}.html`;
    });

    card.addEventListener('mouseenter', (e) => {
        clearTimeout(profileTimeout);
        openProfile(id, userData, e.clientX, e.clientY);
    });

    card.addEventListener('mouseleave', () => {
        profileTimeout = setTimeout(() => {
            profCard.classList.remove('active');
        }, 150);
    });

    container.appendChild(card);
    setTimeout(() => card.classList.add('show'), delayIndex * 150);
}

profCard.addEventListener('mouseenter', () => clearTimeout(profileTimeout));
profCard.addEventListener('mouseleave', () => profCard.classList.remove('active'));

function openProfile(id, data, x, y) {
    const avatarImg = document.getElementById('profAvatar');
    const avatarUrl = data?.discord_user?.avatar 
        ? `https://cdn.discordapp.com/avatars/${id}/${data.discord_user.avatar}.png?size=256` 
        : `https://cdn.discordapp.com/embed/avatars/0.png`;
    
    avatarImg.src = avatarUrl;
    document.getElementById('profUsername').textContent = data ? data.discord_user.username : fallbackNames[id];
    document.getElementById('profDot').style.background = statusColors[data?.discord_status || 'offline'];
    
    const discordLink = document.getElementById('profLink');
    discordLink.href = `https://discord.com/users/${id}`;

    // --- REDIRECT ON POPUP CLICK FOR EVERYONE ---
    avatarImg.onclick = () => {
        const slug = userMapping[id];
        if (slug) window.location.href = `${slug}.html`;
    };

    let activityHtml = `<div class="status-text-item" style="color: #666;">No current activity</div>`;
    if (data?.activities?.length > 0) {
        const custom = data.activities.find(a => a.type === 4);
        const game = data.activities.find(a => a.type === 0);
        const spotify = data.activities.find(a => a.type === 2);
        if (custom) activityHtml = `<div class="status-text-item">${custom.state || custom.name}</div>`;
        else if (game) activityHtml = `<div class="status-text-item">Playing <b>${game.name}</b></div>`;
        else if (spotify) activityHtml = `<div class="status-text-item">Listening to <b>${spotify.details}</b></div>`;
    }
    
    document.getElementById('profActivity').innerHTML = activityHtml;
    
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

initializeHallOfFame();

// --- MINI PLAYER (KEEPING ALL YOUR ORIGINAL LOGIC) ---
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