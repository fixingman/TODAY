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
    text: 'But for its voice, the heron were\nA line of snow, and nothing more.',
    author: 'Sōkan',
    season: 'winter',
    source: 'Chamberlain 1902, no. 16',
  },
  {
    text: 'When from the skies that winter shrouds\nThe blossoms flutter round my head,\nSurely the spring its light must shed\nOn lands that lie beyond the clouds.',
    author: 'Kiyohara no Fukayabu',
    season: 'winter',
    source: 'Kokinshū tanka, trans. Chamberlain 1902 — the "blossoms" are snowflakes',
  },
  {
    text: "A rough sea, and the Milky Way\nStretching across to Sado's isle.",
    author: 'Bashō',
    season: 'autumn',
    source: 'Chamberlain 1902, no. 84 — the Milky Way is an autumn kigo',
  },
  {
    text: 'A stem of grass, whereon in vain\nA dragon-fly essayed to light!',
    author: 'Bashō',
    season: 'autumn',
    source: 'Chamberlain 1902, no. 47 (attribution marked uncertain by Chamberlain)',
  },

  // ── English originals ─────────────────────────────────────────────────────
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
    text: 'When icicles hang by the wall,\nAnd Dick the shepherd blows his nail,\nAnd Tom bears logs into the hall,\nAnd milk comes frozen home in pail.',
    author: 'William Shakespeare',
    season: 'winter',
    source: "winter song, Love's Labour's Lost, c. 1595",
  },
  {
    text: 'Fall, leaves, fall; die, flowers, away;\nLengthen night and shorten day;\nEvery leaf speaks bliss to me\nFluttering from the autumn tree.',
    author: 'Emily Brontë',
    season: 'autumn',
    source: 'c. 1838, posthumous',
  },
  {
    text: 'And what is so rare as a day in June?\nThen, if ever, come perfect days;\nThen Heaven tries earth if it be in tune,\nAnd over it softly her warm ear lays.',
    author: 'James Russell Lowell',
    season: 'summer',
    source: "'The Vision of Sir Launfal', 1848",
  },
  {
    text: "'Summer is coming, summer is coming.\nI know it, I know it, I know it.\nLight again, leaf again, life again, love again,'\nYes, my wild little Poet.",
    author: 'Alfred, Lord Tennyson',
    season: 'summer',
    source: "'The Throstle', 1889",
  },
  {
    text: 'Grief melts away\nLike snow in May,\nAs if there were no such cold thing.',
    author: 'George Herbert',
    season: 'spring',
    source: "'The Flower', 1633",
  },
  {
    text: 'My heart leaps up when I behold\nA rainbow in the sky:\nSo was it when my life began;\nSo is it now I am a man.',
    author: 'William Wordsworth',
    season: null,
    source: "'My Heart Leaps Up', 1802",
  },

  // ── Early moderns (all died pre-1956 → PD worldwide) ─────────────────────
  {
    text: "Life has loveliness to sell,\nAll beautiful and splendid things,\nBlue waves whitened on a cliff,\nSoaring fire that sways and sings,\nAnd children's faces looking up\nHolding wonder like a cup.",
    author: 'Sara Teasdale',
    season: null,
    source: "'Barter', 1917 (d. 1933)",
  },
  {
    text: 'Spend all you have for loveliness,\nBuy it and never count the cost;\nFor one white singing hour of peace\nCount many a year of strife well lost,\nAnd for a breath of ecstasy\nGive all you have been, or could be.',
    author: 'Sara Teasdale',
    season: null,
    source: "'Barter', closing stanza, 1917 (d. 1933)",
  },
  {
    text: 'These I have loved:\nWhite plates and cups, clean-gleaming,\nRinged with blue lines; and feathery, faery dust;\nWet roofs, beneath the lamp-light; the strong crust\nOf friendly bread; and many-tasting food.',
    author: 'Rupert Brooke',
    season: null,
    source: "'The Great Lover', 1914 (d. 1915)",
  },
  {
    text: 'And for that minute a blackbird sang\nClose by, and round him, mistier,\nFarther and farther, all the birds\nOf Oxfordshire and Gloucestershire.',
    author: 'Edward Thomas',
    season: 'summer',
    source: "'Adlestrop', written 1915 (d. 1917) — a train's unscheduled minute of stillness in late June",
  },
  {
    text: 'Glory be to God for dappled things—\nFor skies of couple-colour as a brinded cow;\nFor rose-moles all in stipple upon trout that swim.',
    author: 'Gerard Manley Hopkins',
    season: null,
    source: "'Pied Beauty', 1877 (d. 1889)",
  },
  {
    text: 'Greatly shining,\nThe Autumn moon floats in the thin sky;\nAnd the fish-ponds shake their backs and flash their dragon scales\nAs she passes over them.',
    author: 'Amy Lowell',
    season: 'autumn',
    source: "'Wind and Silver', 1919 (d. 1925)",
  },
  {
    text: 'Who has seen the wind?\nNeither I nor you:\nBut when the leaves hang trembling,\nThe wind is passing through.',
    author: 'Christina Rossetti',
    season: null,
    source: "Sing-Song, 1872 (d. 1894)",
  },
];
