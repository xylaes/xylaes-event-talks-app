// App state management
const state = {
    allReleases: [],
    filteredReleases: [],
    selectedId: null,
    activeTypeFilter: 'All',
    searchQuery: '',
    cachedAt: null
};

// DOM Elements
const el = {
    // Header
    lastUpdatedTime: document.getElementById('lastUpdatedTime'),
    refreshBtn: document.getElementById('refreshBtn'),
    refreshIcon: document.getElementById('refreshIcon'),
    
    // Filters & Metrics
    filterCardAll: document.getElementById('filterCardAll'),
    filterCardFeature: document.getElementById('filterCardFeature'),
    filterCardChange: document.getElementById('filterCardChange'),
    filterCardDeprecation: document.getElementById('filterCardDeprecation'),
    filterCardIssue: document.getElementById('filterCardIssue'),
    
    countAll: document.getElementById('countAll'),
    countFeature: document.getElementById('countFeature'),
    countChange: document.getElementById('countChange'),
    countDeprecation: document.getElementById('countDeprecation'),
    countIssue: document.getElementById('countIssue'),
    
    // Search
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    activeFiltersRow: document.getElementById('activeFiltersRow'),
    activeFiltersBadges: document.getElementById('activeFiltersBadges'),
    clearAllFiltersBtn: document.getElementById('clearAllFiltersBtn'),
    
    // List states
    listLoadingState: document.getElementById('listLoadingState'),
    listErrorState: document.getElementById('listErrorState'),
    listErrorMessage: document.getElementById('listErrorMessage'),
    retryFetchBtn: document.getElementById('retryFetchBtn'),
    listEmptyState: document.getElementById('listEmptyState'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    cardsContainer: document.getElementById('cardsContainer'),
    
    // Detail Pane
    detailSection: document.getElementById('detailSection'),
    noSelectionState: document.getElementById('noSelectionState'),
    detailContentContainer: document.getElementById('detailContentContainer'),
    detailDate: document.getElementById('detailDate'),
    detailTypeBadge: document.getElementById('detailTypeBadge'),
    detailTitle: document.getElementById('detailTitle'),
    detailDocLink: document.getElementById('detailDocLink'),
    detailHtmlContent: document.getElementById('detailHtmlContent'),
    
    // Tweet Composer
    tweetTextarea: document.getElementById('tweetTextarea'),
    tweetCharCounter: document.getElementById('tweetCharCounter'),
    tweetCharBar: document.getElementById('tweetCharBar'),
    suggestTweetBtn: document.getElementById('suggestTweetBtn'),
    tweetBtn: document.getElementById('tweetBtn'),
    tweetWarningMessage: document.getElementById('tweetWarningMessage')
};

// Main Initialization
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    fetchReleases(false);
});

// Event Listeners Registration
function initEventListeners() {
    // Refresh Button
    el.refreshBtn.addEventListener('click', () => fetchReleases(true));
    el.retryFetchBtn.addEventListener('click', () => fetchReleases(true));
    
    // Search Bar Input
    el.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        el.clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
        applyFilters();
    });
    
    // Clear Search Button
    el.clearSearchBtn.addEventListener('click', () => {
        el.searchInput.value = '';
        state.searchQuery = '';
        el.clearSearchBtn.style.display = 'none';
        applyFilters();
    });

    // Metric Filter Cards
    el.filterCardAll.addEventListener('click', () => setTypeFilter('All'));
    el.filterCardFeature.addEventListener('click', () => setTypeFilter('Feature'));
    el.filterCardChange.addEventListener('click', () => setTypeFilter('Change'));
    el.filterCardDeprecation.addEventListener('click', () => setTypeFilter('Deprecation'));
    el.filterCardIssue.addEventListener('click', () => setTypeFilter('Issue'));
    
    // Reset Filters Buttons
    el.resetFiltersBtn.addEventListener('click', resetAllFilters);
    el.clearAllFiltersBtn.addEventListener('click', resetAllFilters);
    
    // Tweet Composer Input
    el.tweetTextarea.addEventListener('input', updateTweetCharacterCount);
    
    // Suggest Tweet / Reset Draft
    el.suggestTweetBtn.addEventListener('click', () => {
        const selectedRelease = state.allReleases.find(r => r.id === state.selectedId);
        if (selectedRelease) {
            generateDefaultTweetDraft(selectedRelease);
        }
    });
    
    // Launch Tweet Intent
    el.tweetBtn.addEventListener('click', launchTweetIntent);
}

// Fetch Release Notes
async function fetchReleases(forceRefresh = false) {
    // Set UI to loading state
    setLoadingState(true, forceRefresh);
    
    try {
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            state.allReleases = data.updates;
            state.cachedAt = data.cached_at;
            
            // Update last updated info
            updateCacheTimeDisplay();
            
            // Calculate stats
            calculateStats();
            
            // Apply current filters
            applyFilters();
            
            // Auto-select first item if details are empty and we have entries (mainly for desktop screens)
            if (state.filteredReleases.length > 0 && !state.selectedId) {
                // Check if screen is desktop width to avoid forcing selection on mobile scroll
                if (window.innerWidth > 768) {
                    selectRelease(state.filteredReleases[0].id);
                }
            }
        } else {
            throw new Error(data.error || "Failed to load release notes");
        }
    } catch (err) {
        console.error("Error fetching release notes:", err);
        showFetchError(err.message || "Could not load release notes. Please check your internet connection.");
    } finally {
        setLoadingState(false, forceRefresh);
    }
}

// Show Fetch Error State
function showFetchError(message) {
    el.listLoadingState.style.display = 'none';
    el.cardsContainer.style.display = 'none';
    el.listEmptyState.style.display = 'none';
    el.listErrorState.style.display = 'flex';
    el.listErrorMessage.textContent = message;
}

// Loading UI toggles
function setLoadingState(isLoading, isRefreshing) {
    if (isLoading) {
        if (isRefreshing) {
            // Spinning on the header button
            el.refreshIcon.classList.add('fa-spin-fast');
            el.refreshBtn.disabled = true;
        } else {
            // Main list loading state
            el.listLoadingState.style.display = 'flex';
            el.cardsContainer.style.display = 'none';
            el.listErrorState.style.display = 'none';
            el.listEmptyState.style.display = 'none';
        }
    } else {
        el.refreshIcon.classList.remove('fa-spin-fast');
        el.refreshBtn.disabled = false;
        el.listLoadingState.style.display = 'none';
    }
}

// Update Last Updated Timestamp
function updateCacheTimeDisplay() {
    if (!state.cachedAt) {
        el.lastUpdatedTime.textContent = 'Never fetched';
        return;
    }
    
    const date = new Date(state.cachedAt);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    el.lastUpdatedTime.textContent = `Cached: ${dateStr} at ${timeStr}`;
}

// Calculate Metrics / Stats
function calculateStats() {
    const counts = {
        All: state.allReleases.length,
        Feature: 0,
        Change: 0,
        Deprecation: 0,
        Issue: 0
    };
    
    state.allReleases.forEach(r => {
        const type = r.type;
        if (type === 'Feature') counts.Feature++;
        else if (type === 'Change') counts.Change++;
        else if (type === 'Deprecation') counts.Deprecation++;
        else if (type === 'Issue') counts.Issue++;
        // Map other types (e.g. Bug Fixes) to Issue or leave as Announcement count (captured in 'All')
    });
    
    el.countAll.textContent = counts.All;
    el.countFeature.textContent = counts.Feature;
    el.countChange.textContent = counts.Change;
    el.countDeprecation.textContent = counts.Deprecation;
    el.countIssue.textContent = counts.Issue;
}

// Set Type Filter
function setTypeFilter(type) {
    state.activeTypeFilter = type;
    
    // Update active class on cards
    const cardMap = {
        'All': el.filterCardAll,
        'Feature': el.filterCardFeature,
        'Change': el.filterCardChange,
        'Deprecation': el.filterCardDeprecation,
        'Issue': el.filterCardIssue
    };
    
    Object.keys(cardMap).forEach(k => {
        const activeClass = `active-filter-${k.toLowerCase()}`;
        if (k === type) {
            cardMap[k].classList.add(activeClass);
        } else {
            cardMap[k].classList.remove(activeClass);
        }
    });
    
    applyFilters();
}

// Apply Search & Type Filters
function applyFilters() {
    let list = state.allReleases;
    
    // 1. Filter by category
    if (state.activeTypeFilter !== 'All') {
        list = list.filter(r => r.type === state.activeTypeFilter);
    }
    
    // 2. Filter by search query
    if (state.searchQuery.trim()) {
        const q = state.searchQuery.toLowerCase();
        list = list.filter(r => 
            r.date.toLowerCase().includes(q) ||
            r.type.toLowerCase().includes(q) ||
            r.description.toLowerCase().includes(q)
        );
    }
    
    state.filteredReleases = list;
    
    // Update active filter badge row
    renderFilterBadges();
    
    // Render list
    renderCards();
}

// Render Filter Badges Helper
function renderFilterBadges() {
    const showSearchBadge = !!state.searchQuery.trim();
    const showTypeBadge = state.activeTypeFilter !== 'All';
    
    if (!showSearchBadge && !showTypeBadge) {
        el.activeFiltersRow.style.display = 'none';
        return;
    }
    
    el.activeFiltersRow.style.display = 'flex';
    el.activeFiltersBadges.innerHTML = '';
    
    if (showTypeBadge) {
        const badge = document.createElement('div');
        badge.className = 'badge-active-filter';
        badge.innerHTML = `Category: ${state.activeTypeFilter} <i class="fa-solid fa-xmark" onclick="setTypeFilter('All')"></i>`;
        el.activeFiltersBadges.appendChild(badge);
    }
    
    if (showSearchBadge) {
        const badge = document.createElement('div');
        badge.className = 'badge-active-filter';
        const displayQuery = state.searchQuery.length > 15 ? state.searchQuery.slice(0, 15) + '...' : state.searchQuery;
        badge.innerHTML = `Search: "${displayQuery}" <i class="fa-solid fa-xmark" id="removeSearchBadgeBtn"></i>`;
        el.activeFiltersBadges.appendChild(badge);
        
        // Add event listener to the clear icon inside badge
        document.getElementById('removeSearchBadgeBtn').addEventListener('click', () => {
            el.searchInput.value = '';
            state.searchQuery = '';
            el.clearSearchBtn.style.display = 'none';
            applyFilters();
        });
    }
}

// Reset All Filters
function resetAllFilters() {
    el.searchInput.value = '';
    state.searchQuery = '';
    el.clearSearchBtn.style.display = 'none';
    setTypeFilter('All');
}

// Render Cards List
function renderCards() {
    el.cardsContainer.innerHTML = '';
    
    if (state.filteredReleases.length === 0) {
        el.cardsContainer.style.display = 'none';
        el.listErrorState.style.display = 'none';
        el.listEmptyState.style.display = 'flex';
        return;
    }
    
    el.listEmptyState.style.display = 'none';
    el.listErrorState.style.display = 'none';
    el.cardsContainer.style.display = 'flex';
    
    state.filteredReleases.forEach(r => {
        const card = document.createElement('article');
        card.className = `release-card ${state.selectedId === r.id ? 'selected' : ''}`;
        card.id = `card-${r.id}`;
        card.setAttribute('aria-selected', state.selectedId === r.id ? 'true' : 'false');
        card.setAttribute('role', 'option');
        
        const badgeClass = `badge-${r.type.toLowerCase()}`;
        
        card.innerHTML = `
            <div class="card-header">
                <span class="card-date">${r.date}</span>
                <span class="badge ${badgeClass}">${r.type}</span>
            </div>
            <p class="card-preview">${escapeHtml(r.description)}</p>
        `;
        
        card.addEventListener('click', () => selectRelease(r.id));
        el.cardsContainer.appendChild(card);
    });
}

// Select a release and open details
function selectRelease(id) {
    state.selectedId = id;
    
    // Highlight active card
    const cards = el.cardsContainer.querySelectorAll('.release-card');
    cards.forEach(c => {
        if (c.id === `card-${id}`) {
            c.classList.add('selected');
            c.setAttribute('aria-selected', 'true');
        } else {
            c.classList.remove('selected');
            c.setAttribute('aria-selected', 'false');
        }
    });
    
    const release = state.allReleases.find(r => r.id === id);
    if (!release) return;
    
    // Populate details panel
    el.detailDate.textContent = release.date;
    
    // Render type badge
    el.detailTypeBadge.className = `badge badge-${release.type.toLowerCase()}`;
    el.detailTypeBadge.textContent = release.type;
    
    el.detailTitle.textContent = `BigQuery ${release.type}`;
    el.detailDocLink.href = release.link;
    
    // Set raw HTML content safely
    el.detailHtmlContent.innerHTML = release.html_content;
    
    // Show details
    el.noSelectionState.style.display = 'none';
    el.detailContentContainer.style.display = 'flex';
    
    // Smooth scroll details panel to top on mobile
    if (window.innerWidth <= 768) {
        el.detailSection.scrollIntoView({ behavior: 'smooth' });
    } else {
        el.detailSection.scrollTop = 0;
    }
    
    // Generate tweet draft
    generateDefaultTweetDraft(release);
}

// Generate default tweet draft
function generateDefaultTweetDraft(release) {
    // Twitter URLs take 23 characters regardless of length due to t.co
    const twitterLinkCost = 23;
    const baseTemplate = `📢 BigQuery ${release.type}: \n\nRead details: `;
    const tags = `\n\n#BigQuery #GoogleCloud #DataEngineering`;
    
    // Total cost of non-customizable text
    const fixedLength = baseTemplate.length + twitterLinkCost + tags.length;
    const maxDescLength = 280 - fixedLength - 4; // -4 for ellipsis and spaces
    
    let descriptionText = release.description;
    if (descriptionText.length > maxDescLength) {
        descriptionText = descriptionText.substring(0, maxDescLength) + '...';
    }
    
    const defaultTweetText = `📢 BigQuery ${release.type}: ${descriptionText}\n\nRead details: ${release.link}${tags}`;
    
    el.tweetTextarea.value = defaultTweetText;
    updateTweetCharacterCount();
}

// Update Tweet Character Counter & Progress Bar
function updateTweetCharacterCount() {
    const text = el.tweetTextarea.value;
    
    // Accurate Twitter Character Count estimation
    // Twitter replaces links with t.co which are always 23 chars
    let twitterLength = text.length;
    
    // Regex to detect urls
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    
    urls.forEach(url => {
        twitterLength = twitterLength - url.length + 23;
    });
    
    el.tweetCharCounter.textContent = `${twitterLength} / 280`;
    
    // Progress bar width
    const percentage = Math.min((twitterLength / 280) * 100, 100);
    el.tweetCharBar.style.width = `${percentage}%`;
    
    // Progress bar and counter states
    if (twitterLength > 280) {
        el.tweetCharBar.className = 'char-limit-bar danger';
        el.tweetCharCounter.className = 'char-counter error';
        el.tweetWarningMessage.style.display = 'flex';
        el.tweetBtn.disabled = true;
    } else if (twitterLength > 240) {
        el.tweetCharBar.className = 'char-limit-bar warning';
        el.tweetCharCounter.className = 'char-counter';
        el.tweetWarningMessage.style.display = 'none';
        el.tweetBtn.disabled = false;
    } else {
        el.tweetCharBar.className = 'char-limit-bar';
        el.tweetCharCounter.className = 'char-counter';
        el.tweetWarningMessage.style.display = 'none';
        el.tweetBtn.disabled = false;
    }
}

// Launch Twitter Web Intent
function launchTweetIntent() {
    const tweetText = el.tweetTextarea.value;
    if (!tweetText) return;
    
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(url, '_blank', 'width=600,height=400,resizable=yes');
}

// Escape HTML utility
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
