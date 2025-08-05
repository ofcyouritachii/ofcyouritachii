const CONFIG = {
    DISCORD_USER_ID: '1282292887878369358',
    LANYARD_API_URL: 'https://api.lanyard.rest/v1/users/',
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 2000,
    REFRESH_INTERVAL: 30000,
    TIMEOUT: 10000
};

let retryCount = 0;
let refreshInterval = null;
let isConnected = false;

const fileTypeIcons = {
    'html': { icon: 'fab fa-html5', color: '#e34c26' },
    'htm': { icon: 'fab fa-html5', color: '#e34c26' },
    'css': { icon: 'fab fa-css3-alt', color: '#1572b6' },
    'js': { icon: 'fab fa-js-square', color: '#f7df1e' },
    'jsx': { icon: 'fab fa-react', color: '#61dafb' },
    'ts': { icon: 'devicon-typescript-plain', color: '#3178c6' },
    'tsx': { icon: 'fab fa-react', color: '#61dafb' },
    'vue': { icon: 'fab fa-vuejs', color: '#4fc08d' },
    'svelte': { icon: 'devicon-svelte-plain', color: '#ff3e00' },
    'py': { icon: 'fab fa-python', color: '#3776ab' },
    'java': { icon: 'fab fa-java', color: '#ed8b00' },
    'cpp': { icon: 'devicon-cplusplus-plain', color: '#00599c' },
    'c': { icon: 'devicon-c-plain', color: '#a8b9cc' },
    'cs': { icon: 'devicon-csharp-plain', color: '#239120' },
    'php': { icon: 'fab fa-php', color: '#777bb4' },
    'rb': { icon: 'devicon-ruby-plain', color: '#cc342d' },
    'go': { icon: 'devicon-go-plain', color: '#00add8' },
    'rs': { icon: 'devicon-rust-plain', color: '#000000' },
    'swift': { icon: 'fab fa-swift', color: '#fa7343' },
    'kt': { icon: 'devicon-kotlin-plain', color: '#7f52ff' },
    'json': { icon: 'devicon-json-plain', color: '#000000' },
    'xml': { icon: 'fas fa-code', color: '#ff6600' },
    'yaml': { icon: 'fas fa-file-code', color: '#cb171e' },
    'yml': { icon: 'fas fa-file-code', color: '#cb171e' },
    'toml': { icon: 'fas fa-file-code', color: '#9c4221' },
    'ini': { icon: 'fas fa-cog', color: '#6c757d' },
    'sql': { icon: 'fas fa-database', color: '#336791' },
    'db': { icon: 'fas fa-database', color: '#336791' },
    'sqlite': { icon: 'devicon-sqlite-plain', color: '#003b57' },
    'md': { icon: 'fab fa-markdown', color: '#000000' },
    'txt': { icon: 'fas fa-file-alt', color: '#6c757d' },
    'pdf': { icon: 'fas fa-file-pdf', color: '#dc3545' },
    'doc': { icon: 'fas fa-file-word', color: '#2b579a' },
    'docx': { icon: 'fas fa-file-word', color: '#2b579a' },
    'png': { icon: 'fas fa-file-image', color: '#17a2b8' },
    'jpg': { icon: 'fas fa-file-image', color: '#17a2b8' },
    'jpeg': { icon: 'fas fa-file-image', color: '#17a2b8' },
    'gif': { icon: 'fas fa-file-image', color: '#17a2b8' },
    'svg': { icon: 'fas fa-file-image', color: '#ff9500' },
    'default': { icon: 'fas fa-file', color: '#6c757d' }
};

function log(message, type = 'info') {
    const emoji = { info: '🔄', success: '✅', error: '❌', warning: '⚠️' };
    console.log(`${emoji[type]} ${message}`);
}

function safeImageLoad(img, src, fallback) {
    return new Promise((resolve) => {
        const tempImg = new Image();
        tempImg.onload = () => {
            img.src = src;
            resolve(true);
        };
        tempImg.onerror = () => {
            if (fallback) img.src = fallback;
            resolve(false);
        };
        tempImg.src = src;
    });
}

function formatTimestamp(timestamp) {
    const now = Date.now();
    const elapsed = now - timestamp;
    const minutes = Math.floor(elapsed / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m elapsed`;
    else if (minutes > 0) return `${minutes}m elapsed`;
    return 'Just started';
}

function getFileTypeIcon(filename) {
    const extension = filename?.split('.').pop()?.toLowerCase() || 'default';
    return fileTypeIcons[extension] || fileTypeIcons.default;
}

function createParticles() {
    const particlesContainer = document.getElementById('particles');
    const particleCount = 50;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        particlesContainer.appendChild(particle);
    }
}

function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');
    const indicator = document.getElementById('navIndicator');

    updateIndicatorPosition();

    navLinks.forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = link.getAttribute('data-page');
            navLinks.forEach(nl => nl.classList.remove('active'));
            pages.forEach(page => page.classList.remove('active'));
            link.classList.add('active');
            document.getElementById(targetPage).classList.add('active');
            updateIndicatorPosition();
            document.body.style.overflow = targetPage === 'home' ? 'hidden' : 'auto';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    function updateIndicatorPosition() {
        const activeLink = document.querySelector('.nav-link.active');
        if (activeLink) {
            const left = activeLink.offsetLeft;
            const width = activeLink.offsetWidth;
            indicator.style.left = left + 'px';
            indicator.style.width = width + 'px';
        }
    }

    window.addEventListener('resize', updateIndicatorPosition);
    document.body.style.overflow = 'hidden';
}

function disableDevTools() {
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || (e.ctrlKey && e.key === 'u')) {
            e.preventDefault();
            return false;
        }
    });
    document.addEventListener('DOMContentLoaded', () => {
        setInterval(() => {
            if (window.outerWidth - window.innerWidth > 100 || window.outerHeight - window.innerHeight > 100) {
                window.location.reload();
            }
        }, 100);
    });
}

async function fetchDiscordStatus() {
    log('Attempting to fetch Discord status...');
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
        const response = await fetch(`${CONFIG.LANYARD_API_URL}${CONFIG.DISCORD_USER_ID}`, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const data = await response.json();
        if (!data.success || !data.data) throw new Error('Invalid API response structure');
        log('Discord data received successfully', 'success');
        updateDiscordProfile(data.data);
        isConnected = true;
        retryCount = 0;
        document.getElementById('setupNotice').style.display = 'none';
    } catch (error) {
        log(`Error fetching Discord status: ${error.message}`, 'error');
        handleDiscordError(error);
    }
}

function handleDiscordError(error) {
    const errorDetails = document.getElementById('errorDetails');
    const setupNotice = document.getElementById('setupNotice');
    let errorMessage = 'Unknown error occurred';
    let showSetupNotice = false;
    if (error.message.includes('404')) {
        errorMessage = 'Discord user not found in Lanyard database. Join the Lanyard Discord server first.';
        showSetupNotice = true;
    } else if (error.message.includes('timeout') || error.message.includes('Failed to fetch')) {
        errorMessage = 'Network connection failed. Check your internet.';
    } else if (error.message.includes('CORS')) {
        errorMessage = 'CORS error. Try refreshing the page.';
    } else {
        errorMessage = error.message;
    }
    errorDetails.textContent = `Error: ${errorMessage}`;
    errorDetails.style.display = 'block';
    if (showSetupNotice) setupNotice.style.display = 'block';
    showOfflineState();
    if (retryCount < CONFIG.RETRY_ATTEMPTS && !showSetupNotice) {
        retryCount++;
        log(`Retrying in ${CONFIG.RETRY_DELAY/1000}s... (${retryCount}/${CONFIG.RETRY_ATTEMPTS})`, 'warning');
        setTimeout(fetchDiscordStatus, CONFIG.RETRY_DELAY);
    } else {
        log('Max retry attempts reached or setup required', 'error');
        showOfflineState();
    }
}

function showOfflineState() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('profile').style.display = 'block';
    const avatar = document.getElementById('avatar');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const activitySection = document.getElementById('activitySection');
    const unifiedCard = document.querySelector('.unified-status-card');
    avatar.classList.add('error');
    statusDot.className = 'status-dot offline';
    statusText.textContent = 'Offline';
    activitySection.style.display = 'none';
    unifiedCard.className = 'glass-card unified-status-card';
}

function updateDiscordProfile(userData) {
    log('Updating profile with Discord data...');
    const avatar = document.getElementById('avatar');
    avatar.classList.remove('error');
    if (userData.discord_user.avatar) {
        const avatarUrl = `https://cdn.discordapp.com/avatars/${userData.discord_user.id}/${userData.discord_user.avatar}.${userData.discord_user.avatar.startsWith('a_') ? 'gif' : 'png'}?size=256`;
        safeImageLoad(avatar, avatarUrl);
    }
    const username = document.getElementById('username');
    const discriminator = document.getElementById('discriminator');
    if (userData.discord_user.discriminator === '0') {
        username.textContent = userData.discord_user.display_name || userData.discord_user.username;
        discriminator.textContent = `@${userData.discord_user.username}`;
    } else {
        username.textContent = userData.discord_user.username;
        discriminator.textContent = `#${userData.discord_user.discriminator}`;
    }
    updateStatus(userData.discord_status);
    updateCustomStatus(userData.activities);
    updateActivities(userData.activities);
    document.getElementById('loading').style.display = 'none';
    document.getElementById('profile').style.display = 'block';
    document.getElementById('errorDetails').style.display = 'none';
    log('Profile updated successfully', 'success');
}

function updateStatus(status) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    statusDot.className = 'status-dot';
    switch (status) {
        case 'online': statusText.textContent = 'Online'; break;
        case 'idle': statusText.textContent = 'Away'; statusDot.classList.add('idle'); break;
        case 'dnd': statusText.textContent = 'Do Not Disturb'; statusDot.classList.add('dnd'); break;
        case 'offline': default: statusText.textContent = 'Offline'; statusDot.classList.add('offline'); break;
    }
}

function updateCustomStatus(activities) {
    const customStatusElement = document.getElementById('customStatus');
    const customActivity = activities.find(activity => activity.type === 4);
    if (customActivity && customActivity.state) {
        customStatusElement.textContent = `"${customActivity.state}"`;
        customStatusElement.style.display = 'block';
    } else {
        customStatusElement.style.display = 'none';
    }
}

function updateActivities(activities) {
    const activitySection = document.getElementById('activitySection');
    const unifiedCard = document.querySelector('.unified-status-card');
    const mainActivities = activities.filter(activity => activity.type !== 4);
    if (mainActivities.length === 0) {
        activitySection.style.display = 'none';
        unifiedCard.className = 'glass-card unified-status-card';
        return;
    }
    const activity = mainActivities[0];
    unifiedCard.className = 'glass-card unified-status-card';
    switch (activity.type) {
        case 0: updateGameActivity(activity); unifiedCard.classList.add('game-activity'); break;
        case 2: updateSpotifyActivity(activity); unifiedCard.classList.add('spotify-activity'); break;
        case 3: updateWatchingActivity(activity); unifiedCard.classList.add('custom-activity'); break;
        case 5: updateCompetingActivity(activity); unifiedCard.classList.add('custom-activity'); break;
        default: updateGenericActivity(activity); unifiedCard.classList.add('custom-activity'); break;
    }
    activitySection.style.display = 'block';
}

function updateGameActivity(activity) {
    const activityHeaderText = document.getElementById('activityHeaderText');
    const activityName = document.getElementById('activityName');
    const activityFileInfo = document.getElementById('activityFileInfo');
    const activityDetails = document.getElementById('activityDetails');
    const activityDetailsNoFile = document.getElementById('activityDetailsNoFile');
    const activityState = document.getElementById('activityState');
    const activityTimestamp = document.getElementById('activityTimestamp');
    const fileTypeIcon = document.getElementById('fileTypeIcon');
    const headerIcon = document.querySelector('#activityHeader i');
    headerIcon.className = 'fas fa-gamepad';
    activityHeaderText.textContent = 'Playing';
    activityName.textContent = activity.name;
    const isCodeEditor = activity.name.toLowerCase().includes('visual studio code') || activity.name.toLowerCase().includes('vscode') || activity.name.toLowerCase().includes('code');
    if (isCodeEditor && activity.details && activity.details.includes('.')) {
        const filename = activity.details.replace('Editing ', '').replace('Working on ', '');
        const fileIcon = getFileTypeIcon(filename);
        activityFileInfo.style.display = 'flex';
        activityDetailsNoFile.style.display = 'none';
        fileTypeIcon.className = fileIcon.icon;
        fileTypeIcon.style.color = fileIcon.color;
        activityDetails.textContent = activity.details;
    } else {
        activityFileInfo.style.display = 'none';
        activityDetailsNoFile.style.display = 'block';
        activityDetailsNoFile.textContent = activity.details || '';
    }
    activityState.textContent = activity.state || '';
    if (activity.timestamps && activity.timestamps.start) {
        activityTimestamp.textContent = formatTimestamp(activity.timestamps.start);
        activityTimestamp.style.display = 'block';
    } else {
        activityTimestamp.style.display = 'none';
    }
}

function updateSpotifyActivity(activity) {
    const activityHeaderText = document.getElementById('activityHeaderText');
    const activityName = document.getElementById('activityName');
    const activityFileInfo = document.getElementById('activityFileInfo');
    const activityDetailsNoFile = document.getElementById('activityDetailsNoFile');
    const activityState = document.getElementById('activityState');
    const activityTimestamp = document.getElementById('activityTimestamp');
    const headerIcon = document.querySelector('#activityHeader i');
    headerIcon.className = 'fab fa-spotify';
    activityHeaderText.textContent = 'Listening to Spotify';
    activityName.textContent = activity.details;
    activityFileInfo.style.display = 'none';
    activityDetailsNoFile.style.display = 'block';
    activityDetailsNoFile.textContent = `by ${activity.state}`;
    activityState.textContent = `on ${activity.assets?.large_text || 'Spotify'}`;
    if (activity.timestamps && activity.timestamps.start && activity.timestamps.end) {
        const current = Date.now() - activity.timestamps.start;
        const total = activity.timestamps.end - activity.timestamps.start;
        const currentMin = Math.floor(current / 60000);
        const currentSec = Math.floor((current % 60000) / 1000);
        const totalMin = Math.floor(total / 60000);
        const totalSec = Math.floor((total % 60000) / 1000);
        activityTimestamp.textContent = `${currentMin}:${String(currentSec).padStart(2, '0')} / ${totalMin}:${String(totalSec).padStart(2, '0')}`;
        activityTimestamp.style.display = 'block';
    } else {
        activityTimestamp.style.display = 'none';
    }
}

function updateWatchingActivity(activity) {
    const activityHeaderText = document.getElementById('activityHeaderText');
    const headerIcon = document.querySelector('#activityHeader i');
    headerIcon.className = 'fas fa-eye';
    activityHeaderText.textContent = 'Watching';
    updateGenericActivityContent(activity);
}

function updateCompetingActivity(activity) {
    const activityHeaderText = document.getElementById('activityHeaderText');
    const headerIcon = document.querySelector('#activityHeader i');
    headerIcon.className = 'fas fa-trophy';
    activityHeaderText.textContent = 'Competing in';
    updateGenericActivityContent(activity);
}

function updateGenericActivityContent(activity) {
    const activityName = document.getElementById('activityName');
    const activityFileInfo = document.getElementById('activityFileInfo');
    const activityDetails = document.getElementById('activityDetails');
    const activityDetailsNoFile = document.getElementById('activityDetailsNoFile');
    const activityState = document.getElementById('activityState');
    const activityTimestamp = document.getElementById('activityTimestamp');
    const fileTypeIcon = document.getElementById('fileTypeIcon');
    activityName.textContent = activity.name;
    if (activity.details && activity.details.includes('.')) {
        const filename = activity.details.replace('Editing ', '').replace('Working on ', '');
        const fileIcon = getFileTypeIcon(filename);
        activityFileInfo.style.display = 'flex';
        activityDetailsNoFile.style.display = 'none';
        fileTypeIcon.className = fileIcon.icon;
        fileTypeIcon.style.color = fileIcon.color;
        activityDetails.textContent = activity.details;
    } else {
        activityFileInfo.style.display = 'none';
        activityDetailsNoFile.style.display = 'block';
        activityDetailsNoFile.textContent = activity.details || '';
    }
    activityState.textContent = activity.state || '';
    if (activity.timestamps && activity.timestamps.start) {
        activityTimestamp.textContent = formatTimestamp(activity.timestamps.start);
        activityTimestamp.style.display = 'block';
    } else {
        activityTimestamp.style.display = 'none';
    }
}

function retryDiscordConnection() {
    log('Manual retry initiated', 'info');
    retryCount = 0;
    document.getElementById('errorDetails').style.display = 'none';
    document.getElementById('loading').style.display = 'flex';
    document.getElementById('profile').style.display = 'none';
    fetchDiscordStatus();
}

document.addEventListener('DOMContentLoaded', function() {
    log('DOM loaded, initializing yokai app...', 'info');
    createParticles();
    initNavigation();
    disableDevTools();
    fetchDiscordStatus();
    refreshInterval = setInterval(() => {
        if (isConnected) fetchDiscordStatus();
    }, CONFIG.REFRESH_INTERVAL);
    log('Yokai portfolio initialized successfully', 'success');
});

window.addEventListener('beforeunload', () => {
    if (refreshInterval) clearInterval(refreshInterval);
});