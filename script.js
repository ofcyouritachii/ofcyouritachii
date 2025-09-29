// --- Configuration ---
const CONFIG = {
    DISCORD_USER_ID: '1282292887878369358',
    LANYARD_WS_URL: 'wss://api.lanyard.rest/socket',
    LANYARD_HTTP_URL: 'https://api.lanyard.rest/v1/users/',
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 3000,
    REFRESH_INTERVAL: 30000,
    TIMEOUT: 15000,
    FALLBACK_AVATAR: 'https://cdn.discordapp.com/embed/avatars/0.png',
    CACHE_KEY: 'discord_status_cache',
    CACHE_EXPIRY: 30000
};

// --- State and Helpers ---
let retryCount = 0;
let refreshInterval = null;
let isConnected = false;
let lastFetchTime = 0;
let websocket = null;
let wsRetryCount = 0;

const fileTypeIcons = {
    'html': { icon: 'fab fa-html5', color: '#e34c26' },
    'css': { icon: 'fab fa-css3-alt', color: '#1572b6' },
    'js': { icon: 'fab fa-js-square', color: '#f7df1e' },
    'py': { icon: 'fab fa-python', color: '#3776ab' },
    'default': { icon: 'fas fa-file', color: '#6c757d' }
};

/** Utility: Debounces a function call */
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/** Utility: Safely loads an image, using a fallback on error */
function safeImageLoad(img, src, fallback) {
    return new Promise((resolve) => {
        const tempImg = new Image();
        tempImg.onload = () => {
            img.src = src;
            resolve(true);
        };
        tempImg.onerror = () => {
            img.src = fallback;
            resolve(false);
        };
        tempImg.src = src;
    });
}

/** Utility: Formats elapsed time for Discord activity */
function formatTimestamp(timestamp) {
    if (!timestamp) return 'Just started';
    const elapsed = Date.now() - timestamp;
    const minutes = Math.floor(elapsed / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h elapsed`;
    if (hours > 0) return `${hours}h ${minutes % 60}m elapsed`;
    return `${minutes}m elapsed`;
}

/** Utility: Gets the file icon based on extension */
function getFileTypeIcon(filename) {
    const extension = filename?.split('.').pop()?.toLowerCase() || 'default';
    return fileTypeIcons[extension] || fileTypeIcons.default;
}

/** Utility: Checks for cached Lanyard data */
function getCachedData() {
    const cached = localStorage.getItem(CONFIG.CACHE_KEY);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CONFIG.CACHE_EXPIRY) {
        return data;
    }
    localStorage.removeItem(CONFIG.CACHE_KEY);
    return null;
}

/** Utility: Caches Lanyard data */
function setCachedData(data) {
    localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
    }));
}

// --- DOM Manipulation Functions ---

/** Creates animated background particles */
function createParticles() {
    if (window.innerWidth <= 768) return;
    const particlesContainer = document.getElementById('particles');
    particlesContainer.innerHTML = '';
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 20 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 15) + 's';
        particlesContainer.appendChild(particle);
    }
}

/** Updates the Discord user's status dot and text */
function updateStatus(status) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    if (statusDot && statusText) {
        statusDot.className = 'status-dot';
        switch (status) {
            case 'online':
                statusText.textContent = 'Online';
                statusDot.classList.add('online');
                break;
            case 'idle':
                statusText.textContent = 'Away';
                statusDot.classList.add('idle');
                break;
            case 'dnd':
                statusText.textContent = 'Do Not Disturb';
                statusDot.classList.add('dnd');
                break;
            default:
                statusText.textContent = 'Offline';
                statusDot.classList.add('offline');
                break;
        }
    }
}

/** Updates the user's custom status (if any) */
function updateCustomStatus(activities) {
    const customStatus = document.getElementById('customStatus');
    const unifiedCard = document.querySelector('.unified-status-card');

    const customActivity = activities.find(activity => activity.type === 4 && activity.state);
    if (customActivity && customActivity.state) {
        customStatus.textContent = customActivity.state;
        customStatus.style.display = 'block';
        unifiedCard.classList.add('custom-activity');
    } else {
        customStatus.style.display = 'none';
        unifiedCard.classList.remove('custom-activity');
    }
}

/** Updates the user's main activity (Game/Spotify) */
function updateActivities(activities) {
    const activitySection = document.getElementById('activitySection');
    const unifiedCard = document.querySelector('.unified-status-card');

    const priorityActivity = activities.find(activity => activity.type === 0 || activity.type === 2);

    if (!priorityActivity || window.innerWidth <= 768 && !document.getElementById('home').classList.contains('active')) {
        activitySection.style.display = 'none';
        unifiedCard.classList.remove('spotify-activity', 'game-activity');
        return;
    }

    activitySection.style.display = 'block';
    unifiedCard.classList.remove('spotify-activity', 'game-activity');

    const { activityHeader, activityHeaderText, activityName, activityFileInfo, fileTypeIcon, activityDetails, activityDetailsNoFile, activityState, activityTimestamp } = getDOMActivityElements();

    if (priorityActivity.type === 2) { // Spotify
        unifiedCard.classList.add('spotify-activity');
        activityHeaderText.textContent = 'Listening to Spotify';
        activityHeader.querySelector('i').className = 'fab fa-spotify';
        activityName.textContent = priorityActivity.details || 'Unknown Track';
        activityDetailsNoFile.textContent = `by ${priorityActivity.state || 'Unknown Artist'}`;
        activityState.textContent = `on ${priorityActivity.assets?.large_text || 'Spotify'}`;
        activityFileInfo.style.display = 'none';
    } else if (priorityActivity.type === 0) { // Game/App
        unifiedCard.classList.add('game-activity');
        activityHeaderText.textContent = priorityActivity.assets?.large_text || 'Current Activity';
        activityHeader.querySelector('i').className = 'fas fa-gamepad';
        activityName.textContent = priorityActivity.name || 'Unknown Activity';

        // Check for file-related details (VSCode)
        const fileExtension = priorityActivity.details?.split('.').pop()?.toLowerCase();
        if (fileExtension && fileTypeIcons[fileExtension]) {
            const fileIcon = getFileTypeIcon(priorityActivity.details);
            fileTypeIcon.className = `file-type-icon ${fileIcon.icon}`;
            fileTypeIcon.style.color = fileIcon.color;
            activityDetails.textContent = priorityActivity.details || '';
            activityFileInfo.style.display = 'flex';
            activityDetailsNoFile.textContent = '';
        } else {
            activityFileInfo.style.display = 'none';
            activityDetailsNoFile.textContent = priorityActivity.details || '';
        }
        activityState.textContent = priorityActivity.state || '';
    }

    activityTimestamp.textContent = priorityActivity.timestamps?.start
        ? formatTimestamp(priorityActivity.timestamps.start)
        : 'Just started';
}

function getDOMActivityElements() {
    return {
        activityHeader: document.getElementById('activityHeader'),
        activityHeaderText: document.getElementById('activityHeaderText'),
        activityName: document.getElementById('activityName'),
        activityFileInfo: document.getElementById('activityFileInfo'),
        fileTypeIcon: document.getElementById('fileTypeIcon'),
        activityDetails: document.getElementById('activityDetails'),
        activityDetailsNoFile: document.getElementById('activityDetailsNoFile'),
        activityState: document.getElementById('activityState'),
        activityTimestamp: document.getElementById('activityTimestamp')
    };
}


/** Updates all Discord profile elements from Lanyard data */
function updateDiscordProfile(userData) {
    const avatar = document.getElementById('avatar');
    const username = document.getElementById('username');
    const discriminator = document.getElementById('discriminator');
    const userId = userData.discord_user?.id || CONFIG.DISCORD_USER_ID;
    
    const avatarUrl = userData.discord_user?.avatar
        ? `https://cdn.discordapp.com/avatars/${userId}/${userData.discord_user.avatar}.png?size=128`
        : CONFIG.FALLBACK_AVATAR;

    safeImageLoad(avatar, avatarUrl, CONFIG.FALLBACK_AVATAR).then((success) => {
        avatar.classList.toggle('error', !success);
    });

    username.textContent = userData.discord_user?.username || 'yokaimsi';
    discriminator.textContent = `@${userData.discord_user?.username || 'yokaimsi'}`;
    avatar.alt = `${userData.discord_user?.username || 'yokaimsi'}'s avatar`;

    updateStatus(userData.discord_status || 'offline');
    updateCustomStatus(userData.activities || []);
    updateActivities(userData.activities || []);
}

/** Sets the profile to a default offline state */
function showOfflineState() {
    const avatar = document.getElementById('avatar');
    const username = document.getElementById('username');
    const discriminator = document.getElementById('discriminator');

    safeImageLoad(avatar, CONFIG.FALLBACK_AVATAR, CONFIG.FALLBACK_AVATAR).then((success) => {
        avatar.classList.add('error', !success);
    });

    username.textContent = 'yokaimsi';
    discriminator.textContent = '@yokaimsi';
    avatar.alt = 'yokaimsi\'s avatar';
    updateStatus('offline');
    updateCustomStatus([]);
    updateActivities([]);
}

// --- Data Fetching and Connection ---

/** Fallback HTTP fetch for Discord status (used if WebSocket fails) */
async function fetchDiscordStatusFallback() {
    const loadingContainer = document.getElementById('loading');
    const profileContainer = document.getElementById('profile');
    const errorDetails = document.getElementById('errorDetails');
    const setupNotice = document.getElementById('setupNotice');

    try {
        const cachedData = getCachedData();
        if (cachedData && Date.now() - lastFetchTime < CONFIG.REFRESH_INTERVAL) {
            isConnected = true;
            loadingContainer.style.display = 'none';
            profileContainer.style.display = 'block';
            setupNotice.style.display = 'none';
            errorDetails.style.display = 'none';
            updateDiscordProfile(cachedData);
            return;
        }

        loadingContainer.style.display = 'flex';
        profileContainer.style.display = 'none';
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
        const response = await fetch(`${CONFIG.LANYARD_HTTP_URL}${CONFIG.DISCORD_USER_ID}`, {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('User not found. Check ID and Lanyard setup.');
            }
            throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error?.message || 'Unknown Lanyard API error');
        }

        // Success
        isConnected = true;
        retryCount = 0;
        lastFetchTime = Date.now();
        setCachedData(data.data);
        loadingContainer.style.display = 'none';
        profileContainer.style.display = 'block';
        setupNotice.style.display = 'none';
        errorDetails.style.display = 'none';
        updateDiscordProfile(data.data);

    } catch (error) {
        retryCount++;
        let errorMessage = error.message || 'An unknown error occurred';
        if (error.name === 'AbortError') {
            errorMessage = 'Request timed out';
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Network error: Failed to connect to Lanyard API';
        }

        if (retryCount < CONFIG.RETRY_ATTEMPTS) {
            setTimeout(fetchDiscordStatusFallback, CONFIG.RETRY_DELAY);
            return;
        }

        // Final fail state
        const cachedData = getCachedData();
        if (cachedData) {
            isConnected = true;
            loadingContainer.style.display = 'none';
            profileContainer.style.display = 'block';
            setupNotice.style.display = 'none';
            errorDetails.style.display = 'none';
            updateDiscordProfile(cachedData);
            return;
        }

        loadingContainer.style.display = 'none';
        profileContainer.style.display = 'block';
        errorDetails.style.display = 'block';
        errorDetails.textContent = `Error: ${errorMessage}. Falling back to offline state.`;
        if (errorMessage.includes('User not found')) {
            setupNotice.style.display = 'block';
        }
        showOfflineState();
    }
}

/** Initializes and manages the WebSocket connection to Lanyard */
function initWebSocket() {
    const errorDetails = document.getElementById('errorDetails');
    const loadingContainer = document.getElementById('loading');
    const profileContainer = document.getElementById('profile');
    const setupNotice = document.getElementById('setupNotice');

    try {
        websocket = new WebSocket(CONFIG.LANYARD_WS_URL);

        websocket.onopen = () => {
            wsRetryCount = 0;
            isConnected = true;
            loadingContainer.style.display = 'none';
            profileContainer.style.display = 'block';
            errorDetails.style.display = 'none';
            setupNotice.style.display = 'none';
            // Send request to subscribe to the user ID
            websocket.send(JSON.stringify({ op: 2, d: { subscribe_to_id: CONFIG.DISCORD_USER_ID } }));
            // Start heartbeat
            setInterval(() => {
                if (websocket.readyState === WebSocket.OPEN) {
                    websocket.send(JSON.stringify({ op: 3 }));
                }
            }, 30000);
        };

        websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.op === 0 && (data.t === 'INIT_STATE' || data.t === 'PRESENCE_UPDATE')) {
                lastFetchTime = Date.now();
                setCachedData(data.d);
                updateDiscordProfile(data.d);
            }
        };

        websocket.onerror = () => {
            console.error('WebSocket Error');
            if (wsRetryCount < CONFIG.RETRY_ATTEMPTS) {
                wsRetryCount++;
                setTimeout(initWebSocket, CONFIG.RETRY_DELAY);
            } else {
                fetchDiscordStatusFallback();
            }
        };

        websocket.onclose = () => {
            console.warn('WebSocket Closed');
            if (wsRetryCount < CONFIG.RETRY_ATTEMPTS) {
                wsRetryCount++;
                setTimeout(initWebSocket, CONFIG.RETRY_DELAY);
            } else {
                fetchDiscordStatusFallback();
            }
        };
    } catch (e) {
        errorDetails.style.display = 'block';
        errorDetails.textContent = 'Error: WebSocket initialization failed. Falling back to HTTP.';
        fetchDiscordStatusFallback();
    }
}


// --- Initialization and Event Handlers ---

/** Initializes the site navigation */
function initNavigation() {
    const nav = document.querySelector('.nav');
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.querySelectorAll('.nav-link');
    const navLinksContainer = document.querySelector('.nav-links');
    const pages = document.querySelectorAll('.page');
    const indicator = document.getElementById('navIndicator');

    nav.style.visibility = 'visible';
    nav.style.opacity = '1';

    function updateIndicatorPosition() {
        if (window.innerWidth > 768) {
            indicator.style.display = 'block';
            const activeLink = document.querySelector('.nav-link.active');
            if (activeLink) {
                const left = activeLink.offsetLeft;
                const width = activeLink.offsetWidth;
                indicator.style.left = left + 'px';
                indicator.style.width = width + 'px';
            }
        } else {
            indicator.style.display = 'none';
        }
    }

    hamburger.addEventListener('click', () => {
        navLinksContainer.classList.toggle('active');
        const isExpanded = navLinksContainer.classList.contains('active');
        hamburger.setAttribute('aria-expanded', isExpanded);
        hamburger.querySelector('i').className = isExpanded ? 'fas fa-times' : 'fas fa-bars';
    });

    navLinks.forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = link.getAttribute('data-page');

            navLinks.forEach(nl => {
                nl.classList.remove('active');
                nl.removeAttribute('aria-current');
            });
            pages.forEach(page => page.classList.remove('active'));

            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
            document.getElementById(targetPage).classList.add('active');

            updateIndicatorPosition();
            window.scrollTo({ top: 0, behavior: 'smooth' });

            if (window.innerWidth <= 768) {
                navLinksContainer.classList.remove('active');
                hamburger.setAttribute('aria-expanded', 'false');
                hamburger.querySelector('i').className = 'fas fa-bars';
            }
            
            // Re-render activities if home is active (for mobile view)
            if (targetPage === 'home') {
                 // Force a re-run of activity update logic (using cached data)
                 const cachedData = getCachedData();
                 if (cachedData) {
                    updateActivities(cachedData.activities || []);
                 }
            }
        });
    });

    // Check URL hash for initial page
    const initialHash = window.location.hash.substring(1) || 'home';
    const initialLink = document.querySelector(`.nav-link[data-page="${initialHash}"]`);
    if (initialLink) {
        initialLink.click();
    } else {
        document.querySelector('.nav-link[data-page="home"]').click();
    }

    window.addEventListener('resize', debounce(() => {
        updateIndicatorPosition();
        createParticles();
        // Hide mobile menu on desktop resize
        if (window.innerWidth > 768) {
            navLinksContainer.classList.remove('active');
            hamburger.setAttribute('aria-expanded', 'false');
            hamburger.querySelector('i').className = 'fas fa-bars';
        }
        // Force an activity update for dynamic mobile visibility
        const cachedData = getCachedData();
        if (cachedData) {
           updateActivities(cachedData.activities || []);
        }
    }, 200));

    updateIndicatorPosition();
}

/** Uses IntersectionObserver to trigger entry animations */
function lazyLoadCards() {
    const cards = document.querySelectorAll('.project-card-new, .skill-card');
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.setAttribute('data-visible', 'true');
                observer.unobserve(entry.target); // Stop observing once visible
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }); // Load a bit early
    
    cards.forEach(card => observer.observe(card));
}


/** Main application bootstrapper */
document.addEventListener('DOMContentLoaded', () => {
    try {
        createParticles();
        initNavigation();
        lazyLoadCards();
        initWebSocket();
    } catch (e) {
        document.getElementById('errorDetails').style.display = 'block';
        document.getElementById('errorDetails').textContent = 'Error: Failed to initialize page elements.';
    }
});

/** Cleanup on page exit */
window.addEventListener('beforeunload', () => {
    if (websocket) {
        websocket.close();
    }
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});

// A small accessibility/security enhancement (optional)
document.addEventListener('contextmenu', (e) => e.preventDefault());