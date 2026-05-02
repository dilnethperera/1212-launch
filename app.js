// =============================
//  12:12 — ALBUM LAUNCH VOTE APP
// =============================

const SONGS = [
  { id: 1, title: "නිසල නිමේෂය", image: "Images/song-01.jpeg", producer: "Shimron Thomas" },
  { id: 2, title: "ස්නේහේ නුරා", image: "Images/song-02.jpeg", producer: "Saniru Perera" },
  { id: 3, title: "නුඹ සුළඟක් වෙලා", image: "Images/song-03.jpeg", producer: "Viraj Schinthja" },
  { id: 4, title: "නොසන්සුන් එක මොහොතක්", image: "Images/song-04.jpeg", producer: "Sithum Sanjana" },
  { id: 5, title: "තව වෙලාවක්", image: "Images/song-05.jpeg", producer: "Chathura Prabashwara" },
  { id: 6, title: "නුඹ රැගෙන යාවී", image: "Images/song-06.jpeg", producer: "Ishan Madushaka" },
  { id: 7, title: "Let me Go", image: "Images/song-07.jpeg", producer: "Aloka Jayawardhana" },
  { id: 8, title: "ගිණියම් (The burnt soul)", image: "Images/song-08.jpeg", producer: "Kashmi Adeesha" },
  { id: 9, title: "රිදුම් දැල්", image: "Images/song-09.jpeg", producer: "Sudheera Madushanka" },
  { id: 10, title: "දෙව්දුවේ", image: "Images/song-10.jpeg", producer: "Himan Perera" },
  { id: 11, title: "ආදරියේ", image: "Images/song-11.jpeg", producer: "Nisula Omindha" },
  { id: 12, title: "හීනෙන් මං ඈත් වී", image: "Images/song-12.jpeg", producer: "Himadu Thamuditha" },
];
const DEFAULT_SONG_IMAGE = 'logo.jpeg';
const SCORE_FIELDS = [
  { key: 'musicProduction', inputId: 'scoreMusicProduction', label: 'Quality of Music Production' },
  { key: 'storytelling', inputId: 'scoreStorytelling', label: 'Quality of Storytelling' },
  { key: 'eventPlanning', inputId: 'scoreEventPlanning', label: 'Event Planning and Organization' },
  { key: 'coordination', inputId: 'scoreCoordination', label: 'Coordination Among Team Members' },
  { key: 'creativity', inputId: 'scoreCreativity', label: 'Creativity and Originality' },
];

// ---- STATE ----
let appData = createEmptyData();
let userRatings = createEmptyRatings();

function createEmptyData() {
  const init = {
    ratings: {},
    sectionScores: {},
    comments: []
  };
  SONGS.forEach((song) => {
    init.ratings[song.id] = { avg: 0, count: 0 };
  });
  SCORE_FIELDS.forEach((field) => {
    init.sectionScores[field.key] = { total: 0, count: 0, avg: 0 };
  });
  return init;
}

function createEmptyRatings() {
  const map = {};
  SONGS.forEach((song) => {
    map[song.id] = 0;
  });
  return map;
}

async function fetchData() {
  const res = await fetch('/api/data');
  if (!res.ok) {
    throw new Error('Could not load vote data');
  }
  const payload = await res.json();
  appData = {
    ratings: payload.ratings || {},
    sectionScores: payload.sectionScores || {},
    comments: payload.comments || []
  };
}

function ratedCount() {
  return Object.values(userRatings).filter((v) => Number(v) > 0).length;
}

function canSubmitRatings() {
  return true;
}

function updateRatingStatus() {
  const title = document.getElementById('selTitle');
  const btn = document.getElementById('submitBtn');
  if (!title || !btn) return;

  const done = ratedCount();
  title.textContent = done === 0
    ? `— song ratings are optional —`
    : `Rated ${done} track${done !== 1 ? 's' : ''}`;

  btn.disabled = !canSubmitRatings();
}

// ---- RENDER SONGS GRID ----
function renderSongs() {
  const grid = document.getElementById('songsGrid');
  grid.innerHTML = '';

  SONGS.forEach(song => {
    const card = document.createElement('div');
    card.className = 'song-card';
    card.dataset.id = song.id;

    const currentRating = userRatings[song.id] || 0;
    const stars = Array.from({ length: 5 }, (_, i) => {
      const value = i + 1;
      const active = value <= currentRating;
      return `<button class="star-btn${active ? ' active' : ''}" type="button" aria-label="Rate ${value} star" data-star="${value}">★</button>`;
    }).join('');

    card.innerHTML = `
      <div class="song-media">
        <img class="song-cover" src="${song.image || DEFAULT_SONG_IMAGE}" alt="${escapeHtml(song.title)} cover" loading="lazy" onerror="this.onerror=null;this.src='${DEFAULT_SONG_IMAGE}'" />
        <!-- <span class="song-heart">❤</span> -->
      </div>
      <div class="song-content">
        <span class="song-number">TRACK ${String(song.id).padStart(2,'0')}</span>
        <div class="song-title">${song.title}</div>
        <div class="song-producer">Producer: ${escapeHtml(song.producer || 'Unknown')}</div>
        <div class="song-rating" role="group" aria-label="Star rating">${stars}</div>
        <div class="song-votes">${Number(appData.ratings?.[song.id]?.avg || 0).toFixed(1)} ★ • ${appData.ratings?.[song.id]?.count || 0} rating${(appData.ratings?.[song.id]?.count || 0) !== 1 ? 's' : ''}</div>
      </div>
      <div class="song-check">✓</div>
    `;

    card.addEventListener('click', (e) => {
      const btn = e.target?.closest?.('.star-btn');
      if (!btn) return;
      const star = Number(btn.dataset.star);
      if (!Number.isFinite(star) || star < 1 || star > 5) return;
      userRatings[song.id] = star;
      renderSongs();
    });
    grid.appendChild(card);
  });

  renderVoteForm();
  updateRatingStatus();
}

// ---- RENDER VOTE FORM ----
function renderVoteForm() {
  // Keep the form always visible/submittable.
}

function setupSectionScorePickers() {
  document.querySelectorAll('.score-picker').forEach((picker) => {
    const hidden = picker.closest('.form-group')?.querySelector('input[type="hidden"]');
    if (!hidden) return;
    picker.addEventListener('click', (e) => {
      const btn = e.target?.closest?.('.score-btn');
      if (!btn) return;
      const score = Number(btn.dataset.score);
      if (!Number.isFinite(score) || score < 1 || score > 10) return;
      hidden.value = String(score);
      picker.querySelectorAll('.score-btn').forEach((b) => {
        b.classList.toggle('active', Number(b.dataset.score) === score);
      });
    });
  });
}

// ---- CHAR COUNTERS ----
function setupCharCounters() {
  const pairs = [
    ['projectComment', 'projCharCount'],
  ];
  pairs.forEach(([inputId, countId]) => {
    const el = document.getElementById(inputId);
    const ct = document.getElementById(countId);
    if (!el || !ct) return;
    el.addEventListener('input', () => {
      ct.textContent = `${el.value.length} / 300`;
    });
  });
}

// ---- SUBMIT ----
function setupSubmit() {
  const btn = document.getElementById('submitBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const projectEl = document.getElementById('projectComment');
    const projectComment = projectEl ? projectEl.value.trim() : '';
    const nameEl = document.getElementById('voterName');
    const name = (nameEl && nameEl.value.trim()) ? nameEl.value.trim().slice(0, 50) : 'Anonymous';

    const sectionScores = {};
    for (const field of SCORE_FIELDS) {
      const input = document.getElementById(field.inputId);
      const raw = input ? String(input.value).trim() : '';
      const value = raw === '' ? NaN : Number(raw);
      if (!Number.isFinite(value) || value < 1 || value > 10) {
        alert(`Please choose a score from 1–10 for "${field.label}".`);
        return;
      }
      sectionScores[field.key] = value;
    }

    try {
      btn.disabled = true;
      const payload = {
        ratings: userRatings,
        sectionScores,
        name,
        comments: {
          project: projectComment,
        }
      };

      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Vote failed');
      }

      appData = {
        ratings: result.ratings || {},
        sectionScores: result.sectionScores || {},
        comments: result.comments || []
      };

      // Show modal
      const modal = document.getElementById('modalOverlay');
      document.getElementById('modalMsg').textContent =
        `Your ratings are locked in. Thank you for being part of 12:12.`;
      modal.classList.add('active');

      // Refresh UI
      renderSongs();
      renderResults();
      renderSectionScores();
      renderComments();
      btn.disabled = false;
    } catch (err) {
      alert(err.message || 'Could not submit your vote. Try again.');
      btn.disabled = false;
    }
  });
}

// ---- MODAL CLOSE ----
function setupModal() {
  document.getElementById('modalClose').addEventListener('click', () => {
    document.getElementById('modalOverlay').classList.remove('active');
  });
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove('active');
  });
}
// ---- RESULTS ----
function renderResults() {
  const grid = document.getElementById('resultsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const sorted = [...SONGS].sort((a, b) => (appData.ratings?.[b.id]?.avg || 0) - (appData.ratings?.[a.id]?.avg || 0));

  sorted.forEach((song, i) => {
    const avg = Number(appData.ratings?.[song.id]?.avg || 0);
    const count = Number(appData.ratings?.[song.id]?.count || 0);
    const pct = (avg / 5) * 100;
    const isTop = i === 0 && avg > 0;

    const row = document.createElement('div');
    row.className = 'result-bar-wrap';
    row.innerHTML = `
      <div class="result-name">${song.title}</div>
      <div class="result-bar-track">
        <div class="result-bar-fill${isTop ? ' top' : ''}" data-pct="${pct}"></div>
      </div>
      <div class="result-count">${avg.toFixed(1)}★</div>
    `;
    grid.appendChild(row);
  });

  // Animate bars after paint
  requestAnimationFrame(() => {
    document.querySelectorAll('.result-bar-fill').forEach(el => {
      el.style.width = el.dataset.pct + '%';
    });
  });
}

function renderSectionScores() {
  const wall = document.getElementById('scoresWall');
  if (!wall) return;
  wall.innerHTML = '';

  SCORE_FIELDS.forEach((field) => {
    const stats = appData.sectionScores?.[field.key] || { total: 0, count: 0, avg: 0 };
    const total = Number(stats.total || 0);
    const count = Number(stats.count || 0);
    const avg = Number(stats.avg || 0);

    const card = document.createElement('div');
    card.className = 'comment-card score-card';
    card.innerHTML = `
      <span class="comment-song-badge">${escapeHtml(field.label)}</span>
      <p class="comment-text">Average: ${avg.toFixed(2)} / 10</p>
      <span class="comment-author">Total: ${total} • Responses: ${count}</span>
    `;
    wall.appendChild(card);
  });
}
function commentWallKind(c) {
  return String(c.wallTab ?? c.type ?? c.commentWall ?? '').trim().toLowerCase();
}

function isProjectWallComment(c) {
  return commentWallKind(c) === 'project';
}

function commentDisplayName(c) {
  const raw = c?.name ?? c?.voterName ?? c?.author ?? c?.displayName;
  const s = String(raw ?? '').trim();
  return s || 'Anonymous';
}

// ---- COMMENTS WALL ----
function renderComments() {
  const wall = document.getElementById('commentsWall');
  if (!wall) return;
  wall.innerHTML = '';

  const filtered = appData.comments
    .filter(isProjectWallComment)
    .filter((c) => String(c.text ?? '').trim())
    .reverse();

  if (filtered.length === 0) {
    wall.innerHTML = '<p class="no-comments">No comments yet. Be the first to share.</p>';
    return;
  }

  filtered.forEach((c) => {
    const body = String(c.text ?? '').trim();
    const author = commentDisplayName(c);
    const card = document.createElement('div');
    card.className = 'comment-card';
    card.innerHTML = `
      ${c.song ? `<span class="comment-song-badge">♫ ${escapeHtml(String(c.song))}</span>` : ''}
      <blockquote class="comment-quote"><p class="comment-text">${escapeHtml(body)}</p></blockquote>
      <span class="comment-author">${escapeHtml(author)}</span>
    `;
    wall.appendChild(card);
  });
}

// ---- UTILS ----
function escapeHtml(str) {
  const s = str == null ? '' : String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---- INIT ----
function init() {
  fetchData()
    .then(() => {
      renderSongs();
      renderResults();
      renderSectionScores();
      renderComments();
      setupSectionScorePickers();
      setupCharCounters();
      setupSubmit();
      setupModal();
      updateRatingStatus();
    })
    .catch(() => {
      renderSongs();
      renderResults();
      renderSectionScores();
      renderComments();
      setupSectionScorePickers();
      setupCharCounters();
      setupSubmit();
      setupModal();
      updateRatingStatus();
      alert('Could not connect to the server. Please start backend and refresh.');
    });
}

document.addEventListener('DOMContentLoaded', init);
