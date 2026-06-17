document.addEventListener('DOMContentLoaded', () => {
  // Application State
  let releaseNotes = [];
  let selectedNote = null;
  let activeFilter = 'all';
  let searchQuery = '';

  // Elements
  const feedList = document.getElementById('feed-list');
  const feedTitleMeta = document.getElementById('feed-title-meta');
  const searchInput = document.getElementById('search-input');
  const btnRefresh = document.getElementById('btn-refresh');
  const refreshIcon = document.getElementById('refresh-icon');
  const spinnerLoader = document.getElementById('spinner-loader');
  const cacheStatus = document.getElementById('cache-status');

  // Filter Buttons
  const filterBtns = {
    all: document.getElementById('filter-all'),
    Feature: document.getElementById('filter-feature'),
    Deprecation: document.getElementById('filter-deprecation'),
    Issue: document.getElementById('filter-issue'),
    Change: document.getElementById('filter-change'),
    Announcement: document.getElementById('filter-announcement')
  };

  // Filter Counts
  const filterCounts = {
    all: document.getElementById('count-all'),
    Feature: document.getElementById('count-feature'),
    Deprecation: document.getElementById('count-deprecation'),
    Issue: document.getElementById('count-issue'),
    Change: document.getElementById('count-change'),
    Announcement: document.getElementById('count-announcement')
  };

  // Composer Elements
  const composerPlaceholder = document.getElementById('composer-placeholder');
  const composerActive = document.getElementById('composer-active');
  const selectedType = document.getElementById('selected-type');
  const selectedDate = document.getElementById('selected-date');
  const selectedPreviewText = document.getElementById('selected-preview-text');
  const tweetInput = document.getElementById('tweet-input');
  const charNum = document.getElementById('char-num');
  const charCounter = document.getElementById('char-counter');
  const btnTweet = document.getElementById('btn-tweet');
  const suggestionBtns = document.querySelectorAll('.btn-suggestion');

  // SVG Progress Ring calculations
  const circle = document.querySelector('.progress-ring__circle');
  const radius = circle.r.baseVal.value;
  const circumference = radius * 2 * Math.PI;
  circle.style.strokeDasharray = `${circumference} ${circumference}`;
  circle.style.strokeDashoffset = circumference;

  // Initialize: Fetch Notes
  fetchNotes();

  // Event Listeners
  btnRefresh.addEventListener('click', () => fetchNotes(true));
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderFeed();
  });

  // Wire up category filters
  Object.keys(filterBtns).forEach(key => {
    if (filterBtns[key]) {
      filterBtns[key].addEventListener('click', () => {
        // Clear active classes
        Object.values(filterBtns).forEach(btn => btn.classList.remove('active'));
        // Set new active
        filterBtns[key].classList.add('active');
        activeFilter = key;
        renderFeed();
      });
    }
  });

  // Character counter in textarea
  tweetInput.addEventListener('input', updateCharCount);

  // Quick template suggestion buttons
  suggestionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const templateId = btn.getAttribute('data-template-id');
      applyTweetTemplate(templateId);
    });
  });

  // Post Tweet Button (opens Twitter web intent)
  btnTweet.addEventListener('click', () => {
    if (!tweetInput.value || tweetInput.value.length > 280) return;
    const tweetText = encodeURIComponent(tweetInput.value);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  });

  // Fetch Notes Function
  async function fetchNotes(force = false) {
    toggleLoadingState(true);
    try {
      const response = await fetch(`/api/notes${force ? '?force=true' : ''}`);
      const data = await response.json();
      if (data.success) {
        releaseNotes = data.notes;
        
        // Show cache state indicator
        if (data.cached) {
          cacheStatus.textContent = 'Cached';
          cacheStatus.style.background = 'rgba(255, 255, 255, 0.03)';
          cacheStatus.style.color = 'var(--text-secondary)';
        } else {
          cacheStatus.textContent = 'Live Feed';
          cacheStatus.style.background = 'rgba(16, 185, 129, 0.1)';
          cacheStatus.style.color = 'var(--color-feature)';
        }

        updateFilterCounts();
        renderFeed();
      } else {
        showErrorState(data.error || 'Failed to fetch release notes.');
      }
    } catch (err) {
      showErrorState(err.message || 'An error occurred while contacting the server.');
    } finally {
      toggleLoadingState(false);
    }
  }

  // Toggle visual loading indicator
  function toggleLoadingState(isLoading) {
    if (isLoading) {
      btnRefresh.disabled = true;
      refreshIcon.style.display = 'none';
      spinnerLoader.classList.add('active');
    } else {
      btnRefresh.disabled = false;
      refreshIcon.style.display = 'inline-block';
      spinnerLoader.classList.remove('active');
    }
  }

  // Render Error Message in list
  function showErrorState(message) {
    feedList.innerHTML = `
      <div class="feed-state-message" style="color: var(--color-issue);">
        <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
        <h3>Connection Error</h3>
        <p>${message}</p>
        <button onclick="location.reload()" class="btn-refresh" style="margin-top: 1rem;">Retry Now</button>
      </div>
    `;
    feedTitleMeta.textContent = 'Error loading feed';
  }

  // Compute number of updates for each category
  function updateFilterCounts() {
    // Total count
    filterCounts.all.textContent = releaseNotes.length;
    
    // Individual counts
    const counts = {
      Feature: 0,
      Deprecation: 0,
      Issue: 0,
      Change: 0,
      Announcement: 0
    };

    releaseNotes.forEach(note => {
      const type = note.type;
      if (counts[type] !== undefined) {
        counts[type]++;
      }
    });

    Object.keys(counts).forEach(key => {
      if (filterCounts[key]) {
        filterCounts[key].textContent = counts[key];
      }
    });
  }

  // Render notes with current filtering & search query
  function renderFeed() {
    // Filter logic
    let filteredNotes = releaseNotes;

    if (activeFilter !== 'all') {
      filteredNotes = filteredNotes.filter(note => note.type === activeFilter);
    }

    if (searchQuery) {
      filteredNotes = filteredNotes.filter(note => 
        note.plain_text.toLowerCase().includes(searchQuery) ||
        note.date.toLowerCase().includes(searchQuery) ||
        note.type.toLowerCase().includes(searchQuery)
      );
    }

    // Update metadata label
    feedTitleMeta.textContent = `Showing ${filteredNotes.length} update${filteredNotes.length !== 1 ? 's' : ''}`;

    if (filteredNotes.length === 0) {
      feedList.innerHTML = `
        <div class="feed-state-message">
          <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <h3>No Updates Found</h3>
          <p>Try modifying your search or choosing a different filter.</p>
        </div>
      `;
      return;
    }

    // Populate UI cards
    feedList.innerHTML = '';
    filteredNotes.forEach(note => {
      const card = document.createElement('article');
      card.className = `note-card ${selectedNote && selectedNote.id === note.id ? 'selected' : ''}`;
      card.setAttribute('data-id', note.id);
      
      // Map badge styles
      let badgeClass = 'badge-unknown';
      const typeLower = note.type.toLowerCase();
      if (typeLower.includes('feature')) badgeClass = 'badge-feature';
      else if (typeLower.includes('deprecation')) badgeClass = 'badge-deprecation';
      else if (typeLower.includes('issue') || typeLower.includes('fix') || typeLower.includes('bug')) badgeClass = 'badge-issue';
      else if (typeLower.includes('change')) badgeClass = 'badge-change';
      else if (typeLower.includes('announcement')) badgeClass = 'badge-announcement';

      card.innerHTML = `
        <div class="note-header">
          <div class="note-date-type">
            <span class="badge ${badgeClass}">${note.type}</span>
            <span class="note-date">${note.date}</span>
          </div>
        </div>
        <div class="note-body">
          ${note.html}
        </div>
        <div class="note-footer">
          <button class="btn-select-action" aria-label="Select update to Tweet">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
            </svg>
            <span>${selectedNote && selectedNote.id === note.id ? 'Selected' : 'Select to Tweet'}</span>
          </button>
        </div>
      `;

      // Card selection event listener
      card.addEventListener('click', (e) => {
        // Prevent click if clicking a link inside body
        if (e.target.tagName === 'A' || e.target.closest('a')) return;
        
        selectNote(note);
      });

      feedList.appendChild(card);
    });
  }

  // Update selected card state and display composer pane
  function selectNote(note) {
    selectedNote = note;
    
    // Highlight correct card in listing
    document.querySelectorAll('.note-card').forEach(c => {
      if (c.getAttribute('data-id') === note.id) {
        c.classList.add('selected');
        c.querySelector('.btn-select-action span').textContent = 'Selected';
      } else {
        c.classList.remove('selected');
        c.querySelector('.btn-select-action span').textContent = 'Select to Tweet';
      }
    });

    // Populate composer preview
    selectedType.textContent = note.type;
    // Reset classes
    selectedType.className = 'badge';
    const typeLower = note.type.toLowerCase();
    if (typeLower.includes('feature')) selectedType.classList.add('badge-feature');
    else if (typeLower.includes('deprecation')) selectedType.classList.add('badge-deprecation');
    else if (typeLower.includes('issue') || typeLower.includes('fix')) selectedType.classList.add('badge-issue');
    else if (typeLower.includes('change')) selectedType.classList.add('badge-change');
    else if (typeLower.includes('announcement')) selectedType.classList.add('badge-announcement');
    else selectedType.classList.add('badge-unknown');

    selectedDate.textContent = note.date;
    selectedPreviewText.textContent = note.plain_text;

    // Show Composer, Hide Placeholder
    composerPlaceholder.style.display = 'none';
    composerActive.style.display = 'flex';

    // Populate Composer text with default (Short Announcement) template
    applyTweetTemplate('short');
  }

  // Load a preset template text based on active selection
  function applyTweetTemplate(templateId) {
    if (!selectedNote) return;

    const typeEmoji = {
      'Feature': '🚀',
      'Deprecation': '⚠️',
      'Issue': '🐛',
      'Change': '🔄',
      'Announcement': '📢'
    }[selectedNote.type] || '⚡';

    const cleanDesc = limitString(selectedNote.plain_text, 160);
    const hashtag = '#BigQuery';
    const link = selectedNote.link;

    let templateText = '';

    switch(templateId) {
      case 'short':
        templateText = `${typeEmoji} Google Cloud BigQuery Update (${selectedNote.date}):\n\n"${cleanDesc}"\n\nRead more details here:\n${link}\n\n${hashtag} #GoogleCloud`;
        break;
      case 'detailed':
        templateText = `${typeEmoji} [BigQuery Release Note - ${selectedNote.type}]\nDate: ${selectedNote.date}\n\nUpdate details: ${limitString(selectedNote.plain_text, 120)}\n\nCheck official documentation:\n${link}\n\n#GCP #DataPlatform #Cloud`;
        break;
      case 'question':
        templateText = `Thoughts on the new BigQuery ${selectedNote.type.toLowerCase()} update?\n\n"${cleanDesc}"\n\nHow will this affect your data workflow? 🤔\n\nFull notes:\n${link}\n\n#DataEngineering #Database`;
        break;
    }

    tweetInput.value = templateText;
    updateCharCount();
  }

  // Update visual character countdown and validation
  function updateCharCount() {
    const len = tweetInput.value.length;
    const remaining = 280 - len;
    
    charNum.textContent = remaining;

    // Handle warning/error visual states
    charCounter.className = 'char-counter';
    if (remaining < 0) {
      charCounter.classList.add('error');
      btnTweet.disabled = true;
    } else if (remaining < 40) {
      charCounter.classList.add('warning');
      btnTweet.disabled = false;
    } else {
      btnTweet.disabled = false;
    }

    // Update circular ring
    const percentage = Math.min(len / 280, 1);
    const strokeOffset = circumference - (percentage * circumference);
    circle.style.strokeDashoffset = strokeOffset;
    
    // Change circle color based on usage
    if (remaining < 0) {
      circle.style.stroke = 'var(--color-issue)';
    } else if (remaining < 40) {
      circle.style.stroke = 'var(--color-deprecation)';
    } else {
      circle.style.stroke = '#1d9bf0';
    }
  }

  // Clean truncate string helper
  function limitString(str, length) {
    if (str.length <= length) return str;
    return str.substring(0, length - 3) + '...';
  }
});
