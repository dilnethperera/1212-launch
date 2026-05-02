require('dotenv').config();
const path = require('path');
const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'launch1212';

const SONGS = [
  { id: 1, title: 'MIDNIGHT FRAMES' },
  { id: 2, title: 'STATIC LOVE' },
  { id: 3, title: 'THE CORRIDOR' },
  { id: 4, title: 'OPEN WOUNDS' },
  { id: 5, title: 'FADE TO HER' },
  { id: 6, title: 'SCENE III' },
  { id: 7, title: 'NEON SILENCE' },
  { id: 8, title: 'THE LAST HOUR' },
  { id: 9, title: 'UNCUT FILM' },
  { id: 10, title: 'CREDITS ROLL' },
  { id: 11, title: 'REWIND' },
  { id: 12, title: '12:12' }
];
const SCORE_FIELDS = [
  { key: 'musicProduction', label: 'Quality of Music Production' },
  { key: 'storytelling', label: 'Quality of Storytelling' },
  { key: 'eventPlanning', label: 'Event Planning and Organization' },
  { key: 'coordination', label: 'Coordination Among Team Members' },
  { key: 'creativity', label: 'Creativity and Originality' },
];

if (!MONGODB_URI) {
  throw new Error('Missing MONGODB_URI. Set it in your environment before starting server.');
}

let votesCollection;
let commentsCollection;
let ratingsCollection;

function normalizeVoteMap(votesMap = {}) {
  const normalized = {};
  for (const song of SONGS) {
    const count = Number(votesMap[String(song.id)] ?? votesMap[song.id] ?? 0);
    normalized[song.id] = Number.isFinite(count) ? count : 0;
  }
  return normalized;
}

function normalizeRatingsDoc(doc) {
  const out = {};
  const sums = doc?.sums || {};
  const counts = doc?.counts || {};
  for (const song of SONGS) {
    const sum = Number(sums[String(song.id)] ?? sums[song.id] ?? 0);
    const count = Number(counts[String(song.id)] ?? counts[song.id] ?? 0);
    const safeSum = Number.isFinite(sum) ? sum : 0;
    const safeCount = Number.isFinite(count) ? count : 0;
    out[song.id] = {
      avg: safeCount > 0 ? safeSum / safeCount : 0,
      count: safeCount
    };
  }
  return out;
}

function normalizeSectionScores(doc) {
  const out = {};
  const sums = doc?.sectionSums || {};
  const counts = doc?.sectionCounts || {};
  for (const field of SCORE_FIELDS) {
    const total = Number(sums[field.key] ?? 0);
    const count = Number(counts[field.key] ?? 0);
    const safeTotal = Number.isFinite(total) ? total : 0;
    const safeCount = Number.isFinite(count) ? count : 0;
    out[field.key] = {
      total: safeTotal,
      count: safeCount,
      avg: safeCount > 0 ? safeTotal / safeCount : 0,
    };
  }
  return out;
}

async function ensureSeedData() {
  const existingVotes = await votesCollection.findOne({ _id: 'global' });
  if (!existingVotes) {
    const votes = {};
    for (const song of SONGS) votes[song.id] = 0;
    await votesCollection.insertOne({
      _id: 'global',
      votes,
      updatedAt: new Date()
    });
  }

  const existingRatings = await ratingsCollection.findOne({ _id: 'global' });
  if (!existingRatings) {
    const sums = {};
    const counts = {};
    for (const song of SONGS) {
      sums[song.id] = 0;
      counts[song.id] = 0;
    }
    const sectionSums = {};
    const sectionCounts = {};
    for (const field of SCORE_FIELDS) {
      sectionSums[field.key] = 0;
      sectionCounts[field.key] = 0;
    }
    await ratingsCollection.insertOne({
      _id: 'global',
      sums,
      counts,
      sectionSums,
      sectionCounts,
      updatedAt: new Date()
    });
  } else if (!existingRatings.sectionSums || !existingRatings.sectionCounts) {
    const sectionSums = { ...(existingRatings.sectionSums || {}) };
    const sectionCounts = { ...(existingRatings.sectionCounts || {}) };
    for (const field of SCORE_FIELDS) {
      if (sectionSums[field.key] === undefined) sectionSums[field.key] = 0;
      if (sectionCounts[field.key] === undefined) sectionCounts[field.key] = 0;
    }
    await ratingsCollection.updateOne(
      { _id: 'global' },
      { $set: { sectionSums, sectionCounts, updatedAt: new Date() } }
    );
  }
}

function pickCommentAuthor(doc) {
  const raw = doc.name ?? doc.voterName ?? doc.author ?? doc.displayName ?? doc.userName;
  const s = String(raw ?? '').trim();
  return s || 'Anonymous';
}

function normalizeCommentWallTab(doc) {
  const raw = doc.wallTab ?? doc.type;
  const s = String(raw ?? '').trim().toLowerCase();
  if (s === 'project' || s === 'event' || s === 'song') return s;
  return '';
}

async function getAppData() {
  const ratingsDoc = await ratingsCollection.findOne({ _id: 'global' });
  const rawComments = await commentsCollection.find({}).sort({ ts: 1 }).toArray();
  const comments = rawComments.map((doc) => ({
    song: doc.song ?? '',
    text: doc.text ?? '',
    name: pickCommentAuthor(doc),
    ts: doc.ts,
    wallTab: normalizeCommentWallTab(doc),
  }));

  return {
    ratings: normalizeRatingsDoc(ratingsDoc),
    sectionScores: normalizeSectionScores(ratingsDoc),
    comments,
  };
}

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/api/data', async (_req, res) => {
  try {
    const data = await getAppData();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load data' });
  }
});

app.post('/api/vote', async (req, res) => {
  try {
    const { songId, name, comments } = req.body || {};
    const parsedSongId = Number(songId);
    if (!SONGS.some((s) => s.id === parsedSongId)) {
      return res.status(400).json({ error: 'Invalid song selected' });
    }

    const voterName = String(name || 'Anonymous').trim().slice(0, 50) || 'Anonymous';
    const song = SONGS.find((s) => s.id === parsedSongId);
    const now = Date.now();

    await votesCollection.updateOne(
      { _id: 'global' },
      {
        $inc: { [`votes.${parsedSongId}`]: 1 },
        $set: { updatedAt: new Date() }
      },
      { upsert: true }
    );

    const pendingComments = [];
    const safeComments = comments || {};
    for (const type of ['song', 'project', 'event']) {
      const rawText = String(safeComments[type] || '').trim();
      if (!rawText) continue;
      pendingComments.push({
        type,
        song: song.title,
        text: rawText.slice(0, 300),
        name: voterName,
        ts: now
      });
    }

    if (pendingComments.length > 0) {
      await commentsCollection.insertMany(pendingComments);
    }

    const data = await getAppData();
    return res.json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to submit vote' });
  }
});

app.post('/api/ratings', async (req, res) => {
  try {
    const { ratings, sectionScores, name, comments } = req.body || {};
    if (!ratings || typeof ratings !== 'object') {
      return res.status(400).json({ error: 'Missing ratings' });
    }
    if (!sectionScores || typeof sectionScores !== 'object') {
      return res.status(400).json({ error: 'Missing section scores' });
    }

    // Validate: allow partial ratings (including none)
    const ratedValues = {};
    for (const song of SONGS) {
      const raw = ratings[song.id] ?? ratings[String(song.id)];
      const value = Number(raw);
      if (raw === undefined || raw === null || raw === '' || value === 0) continue;
      if (!Number.isFinite(value) || value < 1 || value > 5) {
        return res.status(400).json({ error: 'Ratings must be between 1 and 5 stars' });
      }
      ratedValues[song.id] = value;
    }

    const inc = {};
    for (const [songId, value] of Object.entries(ratedValues)) {
      inc[`sums.${songId}`] = value;
      inc[`counts.${songId}`] = 1;
    }

    for (const field of SCORE_FIELDS) {
      const value = Number(sectionScores[field.key]);
      if (!Number.isFinite(value) || value < 1 || value > 10) {
        return res.status(400).json({ error: `${field.label} must be between 1 and 10` });
      }
      inc[`sectionSums.${field.key}`] = value;
      inc[`sectionCounts.${field.key}`] = 1;
    }

    await ratingsCollection.updateOne(
      { _id: 'global' },
      { $inc: inc, $set: { updatedAt: new Date() } },
      { upsert: true }
    );

    // Optional comments: project only
    const voterName = String(name || 'Anonymous').trim().slice(0, 50) || 'Anonymous';
    const safeComments = comments || {};
    const now = Date.now();
    const pendingComments = [];
    const projectComment = String(safeComments.project || '').trim();
    if (projectComment) {
      pendingComments.push({
        wallTab: 'project',
        type: 'project',
        song: '',
        text: projectComment.slice(0, 300),
        name: voterName,
        ts: now
      });
    }
    if (pendingComments.length > 0) {
      await commentsCollection.insertMany(pendingComments);
    }

    const data = await getAppData();
    return res.json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to submit ratings' });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

async function start() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  votesCollection = db.collection('votes');
  commentsCollection = db.collection('comments');
  ratingsCollection = db.collection('ratings');
  await ensureSeedData();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Server startup failed:', err);
  process.exit(1);
});
