
const CURATED_PAGES = [
    "Shrek", "Red", "Moon", "Computer_science", "Coffee", "Basketball", "Pyramid",
    "Albert_Einstein", "Dinosaur", "Piano", "Chocolate", "Japan", "Renaissance",
    "Submarine", "Photography", "Electricity", "Violin", "Bermuda_Triangle",
    "Volcano", "Internet", "Penguin", "Architecture", "Chess", "Super_Mario",
    "Telescope", "DNA", "Bicycle", "Eiffel_Tower", "Socrates", "Avocado",
    "Mars", "Olympic_Games", "Microscope", "Honeybee", "Mount_Everest"
];

const elements = {
    sidebar: document.getElementById('sidebar'),
    mobileMenuToggle: document.getElementById('mobileMenuToggle'),
    helpBtn: document.getElementById('helpBtn'),
    statsBtn: document.getElementById('statsBtn'),
    modeDailyBtn: document.getElementById('modeDailyBtn'),
    modePracticeBtn: document.getElementById('modePracticeBtn'),
    badgeDateText: document.getElementById('badgeDateText'),
    badgeStatus: document.getElementById('badgeStatus'),
    timerDisplay: document.getElementById('timerDisplay'),
    clicksDisplay: document.getElementById('clicksDisplay'),
    startTitle: document.getElementById('startTitle'),
    targetTitle: document.getElementById('targetTitle'),
    undoBtn: document.getElementById('undoBtn'),
    restartBtn: document.getElementById('restartBtn'),
    pathContainer: document.getElementById('pathContainer'),
    pathCount: document.getElementById('pathCount'),
    currentArticleTitle: document.getElementById('currentArticleTitle'),
    wikiContentView: document.getElementById('wikiContentView'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingText: document.getElementById('loadingText'),
    errorState: document.getElementById('errorState'),
    errorMessage: document.getElementById('errorMessage'),
    retryBtn: document.getElementById('retryBtn'),
    giveUpBtn: document.getElementById('giveUpBtn'),
    articleScrollArea: document.getElementById('articleScrollArea'),
    onboardingModal: document.getElementById('onboardingModal'),
    challengeIntroModal: document.getElementById('challengeIntroModal'),
    challengeStartImage: document.getElementById('challengeStartImage'),
    challengeStartTitle: document.getElementById('challengeStartTitle'),
    challengeTargetImage: document.getElementById('challengeTargetImage'),
    challengeTargetTitle: document.getElementById('challengeTargetTitle'),
    beginChallengeBtn: document.getElementById('beginChallengeBtn'),
    closeOnboardingBtn: document.getElementById('closeOnboardingBtn'),
    startPlayingBtn: document.getElementById('startPlayingBtn'),
    victoryModal: document.getElementById('victoryModal'),
    modalFinalTime: document.getElementById('modalFinalTime'),
    modalFinalClicks: document.getElementById('modalFinalClicks'),
    modalPathList: document.getElementById('modalPathList'),
    shareBtn: document.getElementById('shareBtn'),
    shareCopiedAlert: document.getElementById('shareCopiedAlert'),
    closeVictoryModalBtn: document.getElementById('closeVictoryModalBtn'),
    statsModal: document.getElementById('statsModal'),
    closeStatsBtn: document.getElementById('closeStatsBtn'),
    statDailyTime: document.getElementById('statDailyTime'),
    statWins: document.getElementById('statWins'),
    statStreak: document.getElementById('statStreak'),
    statBestTime: document.getElementById('statBestTime'),
    countdownTimer: document.getElementById('countdownTimer'),
    victoryStatDailyTime: document.getElementById('victoryStatDailyTime'),
    victoryStatWins: document.getElementById('victoryStatWins'),
    victoryStatStreak: document.getElementById('victoryStatStreak'),
    victoryStatBestTime: document.getElementById('victoryStatBestTime'),
    victoryCountdownTimer: document.getElementById('victoryCountdownTimer')
};

const state = {
    mode: 'daily',
    dailyDateStr: '',
    startArticle: '',
    targetArticle: '',
    currentArticle: '',
    pathHistory: [],
    startTime: null,
    elapsedSeconds: 0,
    timerInterval: null,
    isCompleted: false,
    stats: {
        played: 0,
        wins: 0,
        streak: 0,
        bestTimeSec: null,
        lastCompletedDate: '',
        dailyTimeSec: null,
        dailyTimeDate: '',
        streakVersion: 2
    }
};

let articleRequestId = 0;
let challengePreviewRequestId = 0;
const articlePreviewCache = new Map();
let shouldShowFirstRunHelp = false;

function getDailyDateString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getCalendarDayNumber(dateString) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString || '');
    if (!match) return NaN;

    const [, year, month, day] = match.map(Number);
    const timestamp = Date.UTC(year, month - 1, day);
    const date = new Date(timestamp);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        return NaN;
    }
    return timestamp / 86400000;
}

function getDaysSinceCompletion(dateString, completedDate) {
    const today = getCalendarDayNumber(dateString);
    const completed = getCalendarDayNumber(completedDate);
    return Number.isFinite(today) && Number.isFinite(completed) ? today - completed : NaN;
}

function pseudoRandom(seed) {
    let value = seed + 0x6D2B79F5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
}

function stringToSeed(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = (hash << 5) - hash + value.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

function getDailyArticles(dateStr) {
    const seed = stringToSeed(dateStr);
    const first = Math.floor(pseudoRandom(seed) * CURATED_PAGES.length);
    let second = Math.floor(pseudoRandom(seed + 1) * CURATED_PAGES.length);
    if (first === second) second = (second + 1) % CURATED_PAGES.length;
    return { start: CURATED_PAGES[first], target: CURATED_PAGES[second] };
}

function getRandomArticles() {
    const first = Math.floor(Math.random() * CURATED_PAGES.length);
    let second = Math.floor(Math.random() * CURATED_PAGES.length);
    if (first === second) second = (second + 1) % CURATED_PAGES.length;
    return { start: CURATED_PAGES[first], target: CURATED_PAGES[second] };
}

function formatTitle(title) {
    try {
        return decodeURIComponent(title).replace(/_/g, ' ');
    } catch (error) {
        return title.replace(/_/g, ' ');
    }
}

function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function loadStats() {
    const saved = localStorage.getItem('wikipedle_stats');
    if (!saved) return;
    try {
        const savedStats = JSON.parse(saved);
        const hasCurrentStreak = savedStats?.streakVersion === 2;
        state.stats = { ...state.stats, ...savedStats };

        const daysSinceCompletion = getDaysSinceCompletion(getDailyDateString(), state.stats.lastCompletedDate);
        if (!hasCurrentStreak) {
            state.stats.streak = state.stats.lastCompletedDate && (daysSinceCompletion === 0 || daysSinceCompletion === 1) ? 1 : 0;
            state.stats.streakVersion = 2;
            saveStats();
        }
        if (daysSinceCompletion !== 0 && daysSinceCompletion !== 1 && state.stats.streak !== 0) {
            state.stats.streak = 0;
            saveStats();
        }
    } catch (error) {
        console.warn('Could not read saved Wikipedle stats:', error);
    }
}

function saveStats() {
    localStorage.setItem('wikipedle_stats', JSON.stringify(state.stats));
}

function updateUI() {
    const activeModeClass = 'flex-1 py-2 px-3 rounded-lg bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm transition flex items-center justify-center space-x-1.5';
    const inactiveModeClass = 'flex-1 py-2 px-3 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition flex items-center justify-center space-x-1.5';
    elements.modeDailyBtn.className = state.mode === 'daily' ? activeModeClass : inactiveModeClass;
    elements.modePracticeBtn.className = state.mode === 'practice' ? activeModeClass : inactiveModeClass;
    elements.clicksDisplay.textContent = state.pathHistory.length - 1;
    elements.undoBtn.disabled = state.pathHistory.length <= 1 || state.isCompleted;
    elements.pathCount.textContent = `${state.pathHistory.length} node${state.pathHistory.length === 1 ? '' : 's'}`;
    elements.pathContainer.replaceChildren();

    state.pathHistory.forEach((title, index) => {
        const row = document.createElement('div');
        const isCurrent = index === state.pathHistory.length - 1;
        row.className = `p-2 rounded-lg border flex items-center justify-between ${isCurrent
            ? 'bg-red-50 dark:bg-red-950/50 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 font-semibold'
            : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'}`;

        const label = document.createElement('span');
        label.className = 'truncate';
        label.textContent = `${index + 1}. ${formatTitle(title)}`;
        row.appendChild(label);

        if (isCurrent) {
            const icon = document.createElement('i');
            icon.dataset.lucide = 'compass';
            icon.className = 'w-3.5 h-3.5 text-red-500 shrink-0';
            row.appendChild(icon);
        }
        elements.pathContainer.appendChild(row);
    });

    if (window.lucide) lucide.createIcons();
}

function resetTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = null;
    state.startTime = null;
    state.elapsedSeconds = 0;
    elements.timerDisplay.textContent = '00:00';
}

function startTimer() {
    if (state.timerInterval) return;
    state.startTime = Date.now() - state.elapsedSeconds * 1000;
    state.timerInterval = setInterval(() => {
        state.elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
        elements.timerDisplay.textContent = formatTime(state.elapsedSeconds);
    }, 1000);
}

function stopTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = null;
    if (state.startTime !== null) {
        state.elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
        elements.timerDisplay.textContent = formatTime(state.elapsedSeconds);
    }
}

function initGame(mode = 'daily') {
    state.mode = mode;
    state.dailyDateStr = getDailyDateString();
    loadStats();

    const articles = mode === 'daily' ? getDailyArticles(state.dailyDateStr) : getRandomArticles();
    elements.badgeDateText.textContent = mode === 'daily' ? `Daily Puzzle (${state.dailyDateStr})` : 'Practice Mode';
    elements.badgeStatus.textContent = mode === 'daily'
        ? (state.stats.lastCompletedDate === state.dailyDateStr ? 'COMPLETED' : 'IN PROGRESS')
        : 'RANDOM';
    elements.badgeStatus.className = mode === 'daily'
        ? (state.stats.lastCompletedDate === state.dailyDateStr
            ? 'px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold'
            : 'px-2 py-0.5 rounded-full bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200 text-[10px] font-bold')
        : 'px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 text-[10px] font-bold';

    state.startArticle = articles.start;
    state.targetArticle = articles.target;
    state.currentArticle = articles.start;
    state.pathHistory = [articles.start];
    state.isCompleted = false;
    resetTimer();

    elements.startTitle.textContent = formatTitle(articles.start);
    elements.targetTitle.textContent = formatTitle(articles.target);
    elements.victoryModal.classList.add('hidden');
    updateUI();
    showChallengeIntro(articles);
    loadArticleContent(articles.start);
}

function showChallengeIntro(articles) {
    const requestId = ++challengePreviewRequestId;
    elements.challengeStartTitle.textContent = formatTitle(articles.start);
    elements.challengeTargetTitle.textContent = formatTitle(articles.target);
    setChallengePreviewImage(elements.challengeStartImage, null, articles.start);
    setChallengePreviewImage(elements.challengeTargetImage, null, articles.target);
    elements.challengeIntroModal.classList.remove('hidden');

    Promise.all([
        getArticlePreviewImage(articles.start),
        getArticlePreviewImage(articles.target)
    ]).then(([startImage, targetImage]) => {
        if (requestId !== challengePreviewRequestId) return;
        setChallengePreviewImage(elements.challengeStartImage, startImage, articles.start);
        setChallengePreviewImage(elements.challengeTargetImage, targetImage, articles.target);
    });
}

function getArticlePreviewImage(title) {
    if (!articlePreviewCache.has(title)) {
        const request = fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
            .then((response) => {
                if (!response.ok) throw new Error(`Wikipedia preview request failed (${response.status})`);
                return response.json();
            })
            .then((article) => article.thumbnail?.source || article.originalimage?.source || null)
            .catch((error) => {
                articlePreviewCache.delete(title);
                console.warn(`Could not load preview image for ${formatTitle(title)}:`, error);
                return null;
            });
        articlePreviewCache.set(title, request);
    }
    return articlePreviewCache.get(title);
}

function setChallengePreviewImage(image, src, title) {
    image.alt = `${formatTitle(title)} article preview`;
    if (!src) {
        image.removeAttribute('src');
        image.hidden = true;
        return;
    }

    image.onload = () => {
        image.hidden = false;
    };
    image.onerror = () => {
        image.hidden = true;
    };
    image.src = src;
}

async function loadArticleContent(title) {
    const requestId = ++articleRequestId;
    elements.loadingOverlay.classList.remove('hidden');
    elements.errorState.classList.add('hidden');
    elements.loadingText.textContent = `Loading "${formatTitle(title)}"...`;
    elements.currentArticleTitle.textContent = formatTitle(title);

    try {
        const url = `https://en.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(title)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Wikipedia response failed (${response.status})`);
        const html = await response.text();
        if (requestId !== articleRequestId) return;

        processAndRenderWikiHtml(html);
        elements.articleScrollArea.scrollTop = 0;
        checkVictoryCondition(title);
    } catch (error) {
        if (requestId !== articleRequestId) return;
        console.error('Wikipedia article load failed:', error);
        elements.errorMessage.textContent = `Could not load Wikipedia page: ${formatTitle(title)}. Make sure you are connected to the internet.`;
        elements.errorState.classList.remove('hidden');
    } finally {
        if (requestId === articleRequestId) elements.loadingOverlay.classList.add('hidden');
    }
}

function processAndRenderWikiHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('a').forEach((link) => {
        const href = link.getAttribute('href');
        let title = null;
        if (href && href.startsWith('./')) {
            title = href.slice(2).split(/[?#]/)[0];
        } else if (href && href.startsWith('/wiki/')) {
            title = href.slice('/wiki/'.length).split(/[?#]/)[0];
        }

        if (title && !title.includes(':')) {
            link.dataset.wikiTitle = title;
            link.href = `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
            link.classList.add('wikipedle-link');
        } else {
            link.removeAttribute('href');
            link.style.cursor = 'default';
            link.style.color = 'inherit';
            link.style.textDecoration = 'none';
        }
    });

    doc.querySelectorAll('img').forEach((image) => {
        const src = image.getAttribute('src');
        if (src && src.startsWith('//')) image.src = `https:${src}`;
        image.loading = 'lazy';
        image.decoding = 'async';
    });

    elements.wikiContentView.replaceChildren();
    const body = doc.querySelector('body');
    if (body) {
        elements.wikiContentView.appendChild(body);
    } else {
        elements.wikiContentView.innerHTML = html;
    }
}

function navigateToPage(title) {
    if (state.isCompleted) return;
    if (state.startTime === null) startTimer();
    state.currentArticle = title;
    state.pathHistory.push(title);
    updateUI();
    loadArticleContent(title);
}

function undoNavigation() {
    if (state.pathHistory.length <= 1 || state.isCompleted) return;
    state.pathHistory.pop();
    state.currentArticle = state.pathHistory[state.pathHistory.length - 1];
    updateUI();
    loadArticleContent(state.currentArticle);
}

function checkVictoryCondition(title) {
    const normalize = (value) => formatTitle(value).toLowerCase();
    if (normalize(title) !== normalize(state.targetArticle) || state.isCompleted) return;

    state.isCompleted = true;
    stopTimer();
    if (typeof window.confetti === 'function') {
        window.confetti({ particleCount: 250, spread: 90, startVelocity: 48, origin: { y: 0.6 } });
        window.confetti({ particleCount: 180, spread: 110, startVelocity: 40, origin: { x: 0.15, y: 0.65 } });
        window.confetti({ particleCount: 180, spread: 110, startVelocity: 40, origin: { x: 0.85, y: 0.65 } });
    }

    if (state.mode === 'daily') {
        state.stats.played += 1;
        state.stats.wins += 1;
        const daysSinceLastCompletion = getDaysSinceCompletion(state.dailyDateStr, state.stats.lastCompletedDate);
        if (daysSinceLastCompletion === 1) {
            state.stats.streak += 1;
        } else if (daysSinceLastCompletion !== 0) {
            state.stats.streak = 1;
        }
        state.stats.lastCompletedDate = state.dailyDateStr;
        state.stats.dailyTimeSec = state.elapsedSeconds;
        state.stats.dailyTimeDate = state.dailyDateStr;
        if (!state.stats.bestTimeSec || state.elapsedSeconds < state.stats.bestTimeSec) {
            state.stats.bestTimeSec = state.elapsedSeconds;
        }
        saveStats();
        elements.badgeStatus.textContent = 'COMPLETED';
        elements.badgeStatus.className = 'px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold';
    }

    updateUI();
    const completedRequestId = articleRequestId;
    setTimeout(() => {
        if (state.isCompleted && completedRequestId === articleRequestId) showVictoryModal();
    }, 600);
}

function showVictoryModal() {
    updateStatsModalUI();
    updateCountdownTimer();
    elements.modalFinalTime.textContent = formatTime(state.elapsedSeconds);
    elements.modalFinalClicks.textContent = state.pathHistory.length - 1;
    elements.modalPathList.replaceChildren();
    state.pathHistory.forEach((title, index) => {
        const row = document.createElement('div');
        row.textContent = `${index + 1}. ${formatTitle(title)}`;
        elements.modalPathList.appendChild(row);
    });
    elements.shareCopiedAlert.classList.add('hidden');
    elements.victoryModal.classList.remove('hidden');
}

function updateStatsModalUI() {
    const bestTime = state.stats.bestTimeSec ? formatTime(state.stats.bestTimeSec) : '--';
    const dailyTime = state.stats.dailyTimeDate === getDailyDateString()
        && Number.isFinite(state.stats.dailyTimeSec)
        ? formatTime(state.stats.dailyTimeSec)
        : '--';
    [
        [elements.statDailyTime, dailyTime],
        [elements.statWins, state.stats.wins],
        [elements.statStreak, state.stats.streak],
        [elements.statBestTime, bestTime],
        [elements.victoryStatDailyTime, dailyTime],
        [elements.victoryStatWins, state.stats.wins],
        [elements.victoryStatStreak, state.stats.streak],
        [elements.victoryStatBestTime, bestTime]
    ].forEach(([element, value]) => {
        element.textContent = value;
    });
}

function updateCountdownTimer() {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const seconds = Math.floor((tomorrow - now) / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainder = seconds % 60;
    const countdown = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
    elements.countdownTimer.textContent = countdown;
    elements.victoryCountdownTimer.textContent = countdown;
}

function attachEventListeners() {
    elements.wikiContentView.addEventListener('click', (event) => {
        if (!(event.target instanceof Element)) return;
        const link = event.target.closest('.wikipedle-link');
        if (!link || !elements.wikiContentView.contains(link)) return;
        event.preventDefault();
        const title = link.dataset.wikiTitle;
        if (title) navigateToPage(title);
    });

    elements.helpBtn.addEventListener('click', () => elements.onboardingModal.classList.remove('hidden'));
    elements.beginChallengeBtn.addEventListener('click', () => {
        elements.challengeIntroModal.classList.add('hidden');
        if (shouldShowFirstRunHelp) {
            shouldShowFirstRunHelp = false;
            elements.onboardingModal.classList.remove('hidden');
        }
    });
    elements.closeOnboardingBtn.addEventListener('click', () => elements.onboardingModal.classList.add('hidden'));
    elements.startPlayingBtn.addEventListener('click', () => elements.onboardingModal.classList.add('hidden'));
    elements.statsBtn.addEventListener('click', () => {
        updateStatsModalUI();
        elements.statsModal.classList.remove('hidden');
    });
    elements.closeStatsBtn.addEventListener('click', () => elements.statsModal.classList.add('hidden'));

    elements.modeDailyBtn.addEventListener('click', () => initGame('daily'));
    elements.modePracticeBtn.addEventListener('click', () => initGame('practice'));
    elements.undoBtn.addEventListener('click', undoNavigation);
    elements.restartBtn.addEventListener('click', () => initGame(state.mode));
    elements.retryBtn.addEventListener('click', () => loadArticleContent(state.currentArticle));
    elements.giveUpBtn.addEventListener('click', () => {
        if (window.confirm('Are you sure you want to give up this run?')) initGame(state.mode);
    });
    elements.mobileMenuToggle.addEventListener('click', () => elements.sidebar.classList.toggle('-translate-x-full'));
    elements.closeVictoryModalBtn.addEventListener('click', () => elements.victoryModal.classList.add('hidden'));
    elements.shareBtn.addEventListener('click', async () => {
        const text = `Wikipedle (${state.mode === 'daily' ? `Daily #${state.dailyDateStr}` : 'Practice'})\nTime: ${formatTime(state.elapsedSeconds)}\nHops: ${state.pathHistory.length - 1} clicks\n${formatTitle(state.startArticle)} -> ${formatTitle(state.targetArticle)}\nhttps://wikipedle.game`;
        try {
            await navigator.clipboard.writeText(text);
        } catch (error) {
            const input = document.createElement('textarea');
            input.value = text;
            document.body.appendChild(input);
            input.select();
            const copied = document.execCommand('copy');
            input.remove();
            if (!copied) {
                console.error('Could not copy Wikipedle results:', error);
                window.alert('Could not copy your results. Please copy them manually.');
                return;
            }
        }
        elements.shareCopiedAlert.classList.remove('hidden');
    });

    setInterval(updateCountdownTimer, 1000);
    updateCountdownTimer();
}

window.addEventListener('DOMContentLoaded', () => {
    document.documentElement.classList.remove('dark');
    if (window.lucide) lucide.createIcons();
    attachEventListeners();
    shouldShowFirstRunHelp = !localStorage.getItem('wikipedle_visited');
    if (shouldShowFirstRunHelp) localStorage.setItem('wikipedle_visited', 'true');
    initGame('daily');
});
