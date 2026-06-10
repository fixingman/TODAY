// TODAY — daily poem corpus
// Human-written, public-domain poems about living this day.
// Curated by hand in chat (accept/reject rounds) — never AI-generated. Target ~90.
//
// Shape: { text, author, season, source }
//   season: 'spring' | 'summer' | 'autumn' | 'winter' | null (year-round)
//   source: provenance only, never displayed. Haiku translations quoted verbatim
//           from Basil Hall Chamberlain, "Bashō and the Japanese Poetical
//           Epigram", Transactions of the Asiatic Society of Japan, 1902 (PD).
const POEMS = [

  // ── Haiku (trans. Basil Hall Chamberlain, 1902) ──────────────────────────
  {
    text: "Nothing in the cicada's voice\nGives token of a speedy death.",
    author: 'Bashō',
    season: 'summer',
    source: 'Chamberlain 1902, no. 80',
  },
  {
    text: 'The end of autumn, and some rooks\nAre perched upon a withered branch.',
    author: 'Bashō',
    season: 'autumn',
    source: 'Chamberlain 1902, no. 37',
  },
  {
    text: "Awake! awake! I'll make of thee\nMy comrade, sleeping butterfly.",
    author: 'Bashō',
    season: 'spring',
    source: 'Chamberlain 1902, no. 79',
  },
  {
    text: 'The old pond, aye! and the sound\nof a frog leaping into the water.',
    author: 'Bashō',
    season: 'spring',
    source: 'Chamberlain 1902 (rendered as one line in the original)',
  },
  {
    text: 'Granted this dewdrop world is but\nA dewdrop world,—this granted, yet…',
    author: 'Issa',
    season: null,
    source: 'Chamberlain 1902, no. 39',
  },
  {
    text: 'A single river, stretching far\nAcross the moorland swathed in snow.',
    author: 'Bonchō',
    season: 'winter',
    source: 'Chamberlain 1902, no. 1',
  },
  {
    text: 'Ah! yes, as a convolvulus\nTo-day my lifetime will appear.',
    author: 'Moritake',
    season: 'summer',
    source: "Chamberlain 1902, no. 53 — the poet's death song",
  },

  // ── English originals ─────────────────────────────────────────────────────
  {
    text: "Forever – is composed of Nows –\n'Tis not a different time –\nExcept for Infiniteness –\nAnd Latitude of Home –",
    author: 'Emily Dickinson',
    season: null,
    source: 'Poems, posthumous (d. 1886)',
  },
  {
    text: "He who binds to himself a joy\nDoes the winged life destroy;\nBut he who kisses the joy as it flies\nLives in eternity's sun rise.",
    author: 'William Blake',
    season: null,
    source: "'Eternity', notebook c. 1793",
  },
  {
    text: 'That you are here—that life exists and identity,\nThat the powerful play goes on, and you may contribute a verse.',
    author: 'Walt Whitman',
    season: null,
    source: "'O Me! O Life!', Leaves of Grass",
  },
  {
    text: 'There was never any more inception than there is now,\nNor any more youth or age than there is now,\nAnd will never be any more perfection than there is now.',
    author: 'Walt Whitman',
    season: null,
    source: "'Song of Myself', Leaves of Grass",
  },
  {
    text: 'Look to this day!\nFor it is life, the very life of life.\nFor yesterday is but a dream,\nAnd tomorrow is only a vision;\nBut today well lived makes\nevery yesterday a dream of happiness,\nAnd every tomorrow a vision of hope.',
    author: 'from the Sanskrit',
    season: null,
    source: "'Salutation of the Dawn', attr. Kālidāsa — quoted by Carnegie in How to Stop Worrying",
  },
  {
    text: "Trust no Future, howe'er pleasant!\nLet the dead Past bury its dead!\nAct,—act in the living Present!\nHeart within, and God o'erhead!",
    author: 'Henry Wadsworth Longfellow',
    season: null,
    source: "'A Psalm of Life', 1838",
  },
  {
    text: 'Come, fill the Cup, and in the fire of Spring\nYour Winter-garment of Repentance fling:\nThe Bird of Time has but a little way\nTo flutter—and the Bird is on the Wing.',
    author: 'Omar Khayyám',
    season: 'spring',
    source: 'Rubáiyát, trans. Edward FitzGerald, 1859',
  },
  {
    text: 'Ah, fill the Cup:—what boots it to repeat\nHow Time is slipping underneath our Feet:\nUnborn To-morrow, and dead Yesterday,\nWhy fret about them if To-day be sweet!',
    author: 'Omar Khayyám',
    season: null,
    source: 'Rubáiyát, trans. Edward FitzGerald, 1859',
  },
  {
    text: 'Gather ye rosebuds while ye may,\nOld Time is still a-flying;\nAnd this same flower that smiles to-day\nTo-morrow will be dying.',
    author: 'Robert Herrick',
    season: 'spring',
    source: "'To the Virgins, to Make Much of Time', 1648",
  },
  {
    text: 'What is this life if, full of care,\nWe have no time to stand and stare.',
    author: 'W. H. Davies',
    season: null,
    source: "'Leisure', 1911",
  },
  {
    text: 'Time is\nToo slow for those who Wait,\nToo swift for those who Fear,\nToo long for those who Grieve,\nToo short for those who Rejoice;\nBut for those who Love,\nTime is not.',
    author: 'Henry van Dyke',
    season: null,
    source: "'Katrina's Sun-Dial', 1901",
  },
  {
    text: "The world is so full of a number of things,\nI'm sure we should all be as happy as kings.",
    author: 'Robert Louis Stevenson',
    season: null,
    source: "'Happy Thought', A Child's Garden of Verses, 1885",
  },
];
