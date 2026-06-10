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
    text: 'A snowy morning,—everywhere\nThe figure "2" left by the clogs.',
    author: 'Sute-jo',
    season: 'winter',
    source: 'Chamberlain 1902, no. 71 — composed by the poetess at age six',
  },
  {
    text: "Well then, we'll off to see the snow,\nFar as we can without a tumble.",
    author: 'Bashō',
    season: 'winter',
    source: 'Chamberlain 1902, no. 77',
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
    text: 'So little cause for carolings\nOf such ecstatic sound\nWas written on terrestrial things\nAfar or nigh around,\nThat I could think there trembled through\nHis happy good-night air\nSome blessed Hope, whereof he knew\nAnd I was unaware.',
    author: 'Thomas Hardy',
    season: 'winter',
    source: "'The Darkling Thrush', 31 December 1900",
  },
  {
    text: 'Fall, leaves, fall; die, flowers, away;\nLengthen night and shorten day;\nEvery leaf speaks bliss to me\nFluttering from the autumn tree.',
    author: 'Emily Brontë',
    season: 'autumn',
    source: 'c. 1838, posthumous',
  },
  {
    text: 'Season of mists and mellow fruitfulness,\nClose bosom-friend of the maturing sun;\nConspiring with him how to load and bless\nWith fruit the vines that round the thatch-eves run.',
    author: 'John Keats',
    season: 'autumn',
    source: "'To Autumn', 1819",
  },
  {
    text: "The morns are meeker than they were –\nThe nuts are getting brown –\nThe berry's cheek is plumper –\nThe Rose is out of town.\nThe maple wears a gayer scarf –\nAnd the field a scarlet gown –\nLest I should be old fashioned\nI'll put a trinket on.",
    author: 'Emily Dickinson',
    season: 'autumn',
    source: 'Poems, posthumous (d. 1886)',
  },
  {
    text: 'A touch of cold in the Autumn night—\nI walked abroad,\nAnd saw the ruddy moon lean over a hedge\nLike a red-faced farmer.\nI did not stop to speak, but nodded,\nAnd round about were the wistful stars\nWith white faces like town children.',
    author: 'T. E. Hulme',
    season: 'autumn',
    source: "'Autumn', 1908 (d. 1917)",
  },
  {
    text: "That time of year thou mayst in me behold\nWhen yellow leaves, or none, or few, do hang\nUpon those boughs which shake against the cold,\nBare ruin'd choirs, where late the sweet birds sang.",
    author: 'William Shakespeare',
    season: 'autumn',
    source: 'Sonnet 73, 1609',
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
    text: 'The Bee is not afraid of me.\nI know the Butterfly.\nThe pretty people in the Woods\nReceive me cordially —',
    author: 'Emily Dickinson',
    season: 'summer',
    source: 'Poems, posthumous (d. 1886)',
  },
  {
    text: 'A Drop fell on the Apple Tree –\nAnother – on the Roof –\nA Half a Dozen kissed the Eaves –\nAnd made the Gables laugh –',
    author: 'Emily Dickinson',
    season: 'summer',
    source: 'Poems, posthumous (d. 1886)',
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
];
