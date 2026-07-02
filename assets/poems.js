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
    season: 'summer',
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

  // ── Sufi, bhakti & Stoic voices (all PD worldwide; translations verified
  //    verbatim against Gutenberg/Wikisource source texts) ───────────────────
  {
    text: 'Cup-bearer, seize to-day, nor wait\nUntil to-morrow!—or from Fate\nSome passport to felicity,\nSome written surety bring to me!',
    author: 'Hafiz',
    season: null,
    source: 'Poems from the Divan of Hafiz, trans. Gertrude Bell, 1897 (Gutenberg #74883)',
  },
  {
    text: 'I laugh when I hear that the fish\nin the water is thirsty:\nYou do not see that the Real is in your home,\nand you wander from forest to forest listlessly!',
    author: 'Kabir',
    season: null,
    source: 'Songs of Kabir I.82, trans. Rabindranath Tagore, 1915 (Gutenberg #6519)',
  },
  {
    text: 'The moon shines in my body,\nbut my blind eyes cannot see it:\nThe moon is within me, and so is the sun.',
    author: 'Kabir',
    season: null,
    source: 'Songs of Kabir I.83, trans. Rabindranath Tagore, 1915 (Gutenberg #6519)',
  },
  {
    text: 'Let life be beautiful like summer flowers\nand death like autumn leaves.',
    author: 'Rabindranath Tagore',
    season: null,
    source: 'Stray Birds 82, 1916 (Gutenberg #6524; d. 1941)',
  },
  {
    text: 'If you shed tears when you miss the sun,\nyou also miss the stars.',
    author: 'Rabindranath Tagore',
    season: null,
    source: 'Stray Birds 6, 1916 (Gutenberg #6524; d. 1941)',
  },
  {
    text: 'The butterfly counts not months but moments,\nand has time enough.',
    author: 'Rabindranath Tagore',
    season: 'summer',
    source: 'Fireflies, 1928 (d. 1941)',
  },
  {
    text: 'Neither that which is future,\nnor that which is past can hurt thee;\nbut that only which is present.',
    author: 'Marcus Aurelius',
    season: null,
    source: 'Meditations VIII, trans. Meric Casaubon, 1634 (Gutenberg #2680)',
  },
  {
    text: 'No man properly can be said to live\nmore than that which is now present,\nwhich is but a moment of time.',
    author: 'Marcus Aurelius',
    season: null,
    source: 'Meditations II, trans. Meric Casaubon, 1634 (Gutenberg #2680)',
  },

  // ── From the pages of Carnegie's How to Stop Worrying (the poems he
  //    quotes are PD even though his 1948 book is not; verified verbatim) ────
  {
    text: 'Happy the man, and happy he alone,\nHe who can call today his own;\nHe who, secure within, can say,\nTomorrow, do thy worst, for I have lived today.',
    author: 'Horace',
    season: null,
    source: "Odes III.29, trans. John Dryden, 1685 — the epigraph of Carnegie's day-tight-compartments chapter",
  },
  {
    text: 'For every evil under the sun\nThere is a remedy, or there is none;\nIf there be one, try to find it;\nIf there be none, never mind it.',
    author: 'Mother Goose',
    season: null,
    source: 'traditional rhyme, quoted in How to Stop Worrying ch. 1',
  },
  {
    text: "If you can fill the unforgiving minute\nWith sixty seconds' worth of distance run,\nYours is the Earth and everything that's in it.",
    author: 'Rudyard Kipling',
    season: null,
    source: "'If—', Rewards and Fairies, 1910 (d. 1936; Gutenberg #556)",
  },
  {
    text: 'The Moving Finger writes; and, having writ,\nMoves on: nor all thy Piety nor Wit\nShall lure it back to cancel half a Line,\nNor all thy Tears wash out a Word of it.',
    author: 'Omar Khayyám',
    season: null,
    source: 'Rubáiyát, trans. FitzGerald (Gutenberg #246) — quoted in How to Stop Worrying, "don\'t saw sawdust"',
  },
  {
    text: 'Two men look out through the same bars:\nOne sees the mud, and one the stars.',
    author: 'Frederick Langbridge',
    season: null,
    source: "'A Cluster of Quiet Thoughts', 1896 (d. 1922) — quoted in How to Stop Worrying",
  },
  {
    text: 'I had the blues\nbecause I had no shoes,\nuntil upon the street\nI met a man who had no feet.',
    author: 'traditional',
    season: null,
    source: 'old rhyme of Persian descent, quoted in How to Stop Worrying',
  },
  {
    text: 'Our main business is not to see\nwhat lies dimly at a distance,\nbut to do what lies clearly at hand.',
    author: 'Thomas Carlyle',
    season: null,
    source: 'Carlyle (d. 1881), as quoted in How to Stop Worrying ch. 1',
  },
  {
    text: 'Live in day-tight compartments.',
    author: 'Sir William Osler',
    season: null,
    source: "'A Way of Life', Yale address, 1913 (d. 1919) — the phrase Carnegie built the book on",
  },
  {
    text: 'Anyone can do his work, however hard, for one day.\nAnyone can live sweetly, patiently, lovingly, purely,\ntill the sun goes down.\nAnd this is all that life really means.',
    author: 'Robert Louis Stevenson',
    season: null,
    source: 'as quoted in How to Stop Worrying (d. 1894)',
  },

  // ── Chinese, Greek & Hebrew (all PD worldwide; verified verbatim against
  //    Gutenberg sources) ────────────────────────────────────────────────────
  {
    text: "We cannot keep the gold of yesterday;\nTo-day's dun clouds we cannot roll away.",
    author: 'Li Po',
    season: 'autumn',
    source: "'Drifting', A Lute of Jade, trans. L. Cranmer-Byng, 1909 (Gutenberg #390; d. 1945)",
  },
  {
    text: "In vain we cleave the torrent's thread with steel,\nIn vain we drink to drown the grief we feel;\nWhen man's desire with fate doth war this, this avails alone—\nTo hoist the sail and let the gale and the waters bear us on.",
    author: 'Li Po',
    season: null,
    source: "'Drifting', A Lute of Jade, trans. L. Cranmer-Byng, 1909 (Gutenberg #390)",
  },
  {
    text: 'Oh! she is good, the little rain! and well she knows our need\nWho cometh in the time of spring to aid the sun-drawn seed;\nShe wanders with a friendly wind through silent nights unseen,\nThe furrows feel her happy tears, and lo! the land is green.',
    author: 'Tu Fu',
    season: 'spring',
    source: "'The Little Rain', A Lute of Jade, trans. L. Cranmer-Byng, 1909 (Gutenberg #390)",
  },
  {
    text: 'Weeping may endure for a night,\nbut joy cometh in the morning.',
    author: 'Psalm 30',
    season: null,
    source: 'King James Version, 1611',
  },
  {
    text: 'So teach us to number our days,\nthat we may apply our hearts unto wisdom.',
    author: 'Psalm 90',
    season: null,
    source: 'King James Version, 1611',
  },

  // ── Later moderns now PD worldwide (verified verbatim, Gutenberg) ─────────
  {
    text: 'One must have a mind of winter\nTo regard the frost and the boughs\nOf the pine-trees crusted with snow;\nAnd have been cold a long time\nTo behold the junipers shagged with ice.',
    author: 'Wallace Stevens',
    season: 'winter',
    source: "'The Snow Man', Harmonium, 1923 (Gutenberg #78743; d. 1955 — PD worldwide since Jan 2026)",
  },
  {
    text: 'Listen . . .\nWith faint dry sound,\nLike steps of passing ghosts,\nThe leaves, frost-crisp’d, break from the trees\nAnd fall.',
    author: 'Adelaide Crapsey',
    season: 'autumn',
    source: "'November Night', Verse, 1915 (Gutenberg #63010; d. 1914)",
  },

  {
    text: 'Among twenty snowy mountains,\nThe only moving thing\nWas the eye of the blackbird.',
    author: 'Wallace Stevens',
    season: 'winter',
    source: "'Thirteen Ways of Looking at a Blackbird' I, Harmonium, 1923 (Gutenberg #78743)",
  },
  {
    text: 'It was evening all afternoon.\nIt was snowing\nAnd it was going to snow.\nThe blackbird sat\nIn the cedar-limbs.',
    author: 'Wallace Stevens',
    season: 'winter',
    source: "'Thirteen Ways of Looking at a Blackbird' XIII, Harmonium, 1923 (Gutenberg #78743)",
  },
  {
    text: 'You are a child of the universe\nno less than the trees and the stars;\nyou have a right to be here.\nAnd whether or not it is clear to you,\nno doubt the universe is unfolding as it should.',
    author: 'Max Ehrmann',
    season: null,
    source: "'Desiderata', 1927 (d. 1945; verified via Wikisource)",
  },

  {
    text: 'I do not know which to prefer,\nThe beauty of inflections\nOr the beauty of innuendoes,\nThe blackbird whistling\nOr just after.',
    author: 'Wallace Stevens',
    season: null,
    source: "'Thirteen Ways of Looking at a Blackbird' V, Harmonium, 1923 (Gutenberg #78743)",
  },
  {
    text: 'Why, who makes much of a miracle?\nAs to me I know of nothing else but miracles,\nWhether I walk the streets of Manhattan,\nOr dart my sight over the roofs of houses toward the sky.',
    author: 'Walt Whitman',
    season: null,
    source: "'Miracles', Leaves of Grass (Gutenberg #1322)",
  },
  {
    text: "Give me the splendid silent sun with all his beams full-dazzling,\nGive me autumnal fruit ripe and red from the orchard,\nGive me a field where the unmow'd grass grows.",
    author: 'Walt Whitman',
    season: 'summer',
    source: "'Give Me the Splendid Silent Sun', Leaves of Grass (Gutenberg #1322)",
  },
  {
    text: 'Stray birds of summer come to my window to sing and fly away.\nAnd yellow leaves of autumn, which have no songs,\nflutter and fall there with a sigh.',
    author: 'Rabindranath Tagore',
    season: 'autumn',
    source: 'Stray Birds 1, 1916 (Gutenberg #6524)',
  },

  // ── US public domain (pub. pre-1931; authors d. post-1956 → still under
  //    copyright in life+70 countries until the 2030s. Can approved inclusion
  //    knowing this — app is US-hosted.) ──────────────────────────────────────
  {
    text: 'so much depends\nupon\na red wheel\nbarrow\nglazed with rain\nwater\nbeside the white\nchickens',
    author: 'William Carlos Williams',
    season: 'spring',
    source: 'Spring and All, 1923 (d. 1963 — US PD only)',
  },
  {
    text: 'The fog comes\non little cat feet.\nIt sits looking\nover harbor and city\non silent haunches\nand then moves on.',
    author: 'Carl Sandburg',
    season: 'autumn',
    source: "'Fog', Chicago Poems, 1916 (d. 1967 — US PD only)",
  },
  {
    text: "I'm going out to clean the pasture spring;\nI'll only stop to rake the leaves away\n(And wait to watch the water clear, I may):\nI sha'n't be gone long.—You come too.",
    author: 'Robert Frost',
    season: 'spring',
    source: "'The Pasture', A Boy's Will, 1913 (d. 1963 — US PD only)",
  },
  {
    text: 'The way a crow\nShook down on me\nThe dust of snow\nFrom a hemlock tree\n\nHas given my heart\nA change of mood\nAnd saved some part\nOf a day I had rued.',
    author: 'Robert Frost',
    season: 'winter',
    source: "'Dust of Snow', New Hampshire, 1923 (d. 1963 — US PD only; verified Gutenberg #58611)",
  },
  {
    text: "Nature's first green is gold,\nHer hardest hue to hold.\nHer early leaf's a flower;\nBut only so an hour.\nThen leaf subsides to leaf.\nSo Eden sank to grief,\nSo dawn goes down to day.\nNothing gold can stay.",
    author: 'Robert Frost',
    season: null,
    source: "'Nothing Gold Can Stay', New Hampshire, 1923 (d. 1963 — US PD only; verified Gutenberg #58611)",
  },
  {
    text: 'My candle burns at both ends;\nIt will not last the night;\nBut ah, my foes, and oh, my friends—\nIt gives a lovely light!',
    author: 'Edna St. Vincent Millay',
    season: null,
    source: "'First Fig', A Few Figs from Thistles, 1920 (d. 1950 — Worldwide PD; verified Wikisource)",
  },
  {
    text: 'Whirl up, sea—\nwhirl your pointed pines,\nsplash your great pines\non our rocks,\nhurl your green over us,\ncover us with your pools of fir.',
    author: 'H.D.',
    season: null,
    source: "'Oread', Sea Garden, 1916 (d. 1961 — US PD only; verified Gutenberg #30276 'Some Imagist Poets', 1915)",
  },
  {
    text: "I'M nobody! Who are you?\nAre you nobody, too?\nThen there's a pair of us—don't tell!\nThey'd banish us, you know.\n\nHow dreary to be somebody!\nHow public, like a frog\nTo tell your name the livelong day\nTo an admiring bog!",
    author: 'Emily Dickinson',
    season: null,
    source: "Poems: Second Series (1891), poem I (d. 1886 — PD worldwide; verified Wikisource)",
  },

  // ── Early Irish (trans. Kuno Meyer, 1911) ────────────────────────────────
  {
    text: 'Ah, blackbird, thou art satisfied\nWhere thy nest is in the bush:\nHermit that clinkest no bell,\nSweet, soft, peaceful is thy note.',
    author: 'Anonymous Irish (9th c.)',
    season: null,
    source: "'The Blackbird', Selections from Ancient Irish Poetry, trans. Kuno Meyer (1911), Gutenberg #32030 (Meyer d. 1919 — PD worldwide)",
  },
  {
    text: 'A hedge of trees surrounds me,\nA blackbird\'s lay sings to me;\nAbove my lined booklet\nThe trilling birds chant to me.\n\nIn a grey mantle from the top of bushes\nThe cuckoo sings:\nVerily--may the Lord shield me!--\nWell do I write under the greenwood.',
    author: 'Anonymous Irish (9th c.)',
    season: 'spring',
    source: "'The Scribe', Selections from Ancient Irish Poetry, trans. Kuno Meyer (1911), Gutenberg #32030 (Meyer d. 1919 — PD worldwide)",
  },
  {
    text: 'My tidings for you: the stag bells,\nWinter snows, summer is gone.\n\nWind high and cold, low the sun,\nShort his course, sea running high.\n\nDeep-red the bracken, its shape all gone--\nThe wild-goose has raised his wonted cry.\n\nCold has caught the wings of birds;\nSeason of ice--these are my tidings.',
    author: 'Anonymous Irish (9th c.)',
    season: 'autumn',
    source: "'Summer Is Gone', Selections from Ancient Irish Poetry, trans. Kuno Meyer (1911), Gutenberg #32030 (Meyer d. 1919 — PD worldwide)",
  },

  // ── Sappho (trans. Bliss Carman, 1902) ──────────────────────────────────
  {
    text: 'In the apple boughs the coolness\nMurmurs, and the grey leaves flicker\nWhere sleep wanders.\n\nIn this garden all the hot noon\nI await thy fluttering footfall\nThrough the twilight.',
    author: 'Sappho (trans. Bliss Carman)',
    season: 'summer',
    source: "Sappho: One Hundred Lyrics, XVI, Bliss Carman (1902), Gutenberg #12389 (Carman d. 1929 — PD worldwide)",
  },

  // ── Chinese (trans. Arthur Waley, 1918) ─────────────────────────────────
  {
    text: 'Living in retirement beyond the World,\nSilently enjoying isolation,\nI pull the rope of my door tighter\nAnd stuff my window with roots and ferns.\nMy spirit is tuned to the Spring-season:\nAt the fall of the year there is autumn in my heart.\nThus imitating cosmic changes\nMy cottage becomes a Universe.',
    author: 'Lu Yün (4th c. AD, trans. Arthur Waley)',
    season: null,
    source: "'The Valley Wind', A Hundred and Seventy Chinese Poems, trans. Waley (1918), Gutenberg #42290 (Waley d. 1966 — US PD only)",
  },
  {
    text: 'My bed is so empty that I keep on waking up:\nAs the cold increases, the night-wind begins to blow.\nIt rustles the curtains, making a noise like the sea:\nOh that those were waves which could carry me back to you!',
    author: 'Anonymous Chinese (6th c., trans. Arthur Waley)',
    season: 'winter',
    source: "'Winter Night', A Hundred and Seventy Chinese Poems, trans. Waley (1918), Gutenberg #42290 (Waley d. 1966 — US PD only)",
  },
  {
    text: 'Lined coat, warm cap and easy felt slippers,\nIn the little tower, at the low window, sitting over the sunken brazier.\nBody at rest, heart at peace; no need to rise early.\nI wonder if the courtiers at the Western Capital know of these things, or not?',
    author: 'Po Chü-i (772–846, trans. Arthur Waley)',
    season: 'winter',
    source: "'Ease', A Hundred and Seventy Chinese Poems, trans. Waley (1918), Gutenberg #42290 (Waley d. 1966 — US PD only)",
  },
  {
    text: 'The evening river is level and motionless--\nThe spring colours just open to their full.\nSuddenly a wave carries the moon away\nAnd the tidal water comes with its freight of stars.',
    author: 'Yang-ti (605–617, trans. Arthur Waley)',
    season: 'spring',
    source: "'Flowers and Moonlight on the Spring River', A Hundred and Seventy Chinese Poems, trans. Waley (1918), Gutenberg #42290 (Waley d. 1966 — US PD only)",
  },
  {
    text: 'After lunch--one short nap:\nOn waking up--two cups of tea.\nRaising my head, I see the sun\'s light\nOnce again slanting to the south-west.\nThose who are happy regret the shortness of the day;\nThose who are sad tire of the year\'s sloth.\nBut those whose hearts are devoid of joy or sadness\nJust go on living, regardless of "short" or "long."',
    author: 'Po Chü-i (772–846, trans. Arthur Waley)',
    season: null,
    source: "'After Lunch', A Hundred and Seventy Chinese Poems, trans. Waley (1918), Gutenberg #42290 (Waley d. 1966 — US PD only)",
  },

  // ── Round 11 (Jul 2026) ────────────────────────────────────────────────────
  {
    text: "I will arise and go now, and go to Innisfree,\nAnd a small cabin build there, of clay and wattles made:\nNine bean-rows will I have there, a hive for the honey-bee,\nAnd live alone in the bee-loud glade.\n\nAnd I shall have some peace there, for peace comes dropping slow,\nDropping from the veils of the morning to where the cricket sings;\nThere midnight's all a glimmer, and noon a purple glow,\nAnd evening full of the linnet's wings.\n\nI will arise and go now, for always night and day\nI hear lake water lapping with low sounds by the shore;\nWhile I stand on the roadway, or on the pavements grey,\nI hear it in the deep heart's core.",
    author: 'W. B. Yeats',
    season: 'summer',
    source: "'The Lake Isle of Innisfree' (1890), verified against en.wikisource.org (Yeats d. 1939)",
  },
  {
    text: 'Loveliest of trees, the cherry now\nIs hung with bloom along the bough,\nAnd stands about the woodland ride\nWearing white for Eastertide.\n\nNow, of my threescore years and ten,\nTwenty will not come again,\nAnd take from seventy springs a score,\nIt only leaves me fifty more.\n\nAnd since to look at things in bloom\nFifty springs are little room,\nAbout the woodlands I will go\nTo see the cherry hung with snow.',
    author: 'A. E. Housman',
    season: 'spring',
    source: "'A Shropshire Lad' II (1896), verified against en.wikisource.org (Housman d. 1936)",
  },

  // ── Round 12 (Jul 2026) ────────────────────────────────────────────────────
  {
    text: 'The leaves fall, fall as from far,\nLike distant gardens withered in the heavens;\nThey fall with slow and lingering descent.\n\nAnd in the nights the heavy Earth, too, falls\nFrom out the stars into the Solitude.\n\nThus all doth fall. This hand of mine must fall\nAnd lo! the other one:—it is the law.\nBut there is One who holds this falling\nInfinitely softly in His hands.',
    author: 'Rainer Maria Rilke (trans. Jessie Lemont)',
    season: 'autumn',
    source: "'Autumn', Poems (1918) trans. Lemont, Gutenberg #38594, cross-checked vs archive.org poems00rilk scan (Rilke d. 1926, Lemont d. 1947)",
  },
  {
    text: "A rough sea, and the Milky Way\nStretching across to Sado's isle.",
    author: 'Bashō',
    season: 'autumn',
    source: 'Chamberlain 1902, no. 84 (archive.org basho-and-the-japanses-poetical-epigram scan)',
  },

  // ── Round 13 (Jul 2026) ────────────────────────────────────────────────────
  {
    text: 'A summer room where, lying down,\nI see the clouds as they go past.',
    author: 'Yaha',
    season: 'summer',
    source: 'Chamberlain 1902, no. 131 (archive.org basho-and-the-japanses-poetical-epigram scan; Yaha d. 1740, Chamberlain d. 1935)',
  },
  {
    text: "Sit down by this high-foliaged voiceful pine\nthat rustles her branches beneath the western breezes,\nand beside my chattering waters\nPan's pipe shall bring drowsiness down on thy enchanted eyelids.",
    author: 'Plato (trans. J. W. Mackail)',
    season: 'summer',
    source: "'Beneath the Pine', Select Epigrams from the Greek Anthology (1890), Nature V, Gutenberg #2378 (Mackail d. 1945)",
  },
  {
    text: 'Drink not here, traveller, from this warm pool in the brook,\nfull of mud stirred by the sheep at pasture;\nbut go a very little way over the ridge\nwhere the heifers are grazing;\nfor there by yonder pastoral stone-pine thou wilt find\nbubbling through the fountained rock\na spring colder than northern snow.',
    author: 'Leonidas of Tarentum (trans. J. W. Mackail)',
    season: 'summer',
    source: "'The Roadside Pool', Select Epigrams from the Greek Anthology (1890), Nature III, Gutenberg #2378 (Mackail d. 1945)",
  },

  // ── Round 14 (Jul 2026) — Stoics, trans. Farquharson ──────────────────────
  {
    text: 'Men look for retreats for themselves,\nthe country, the sea-shore, the hills;\nand you yourself, too, are peculiarly accustomed to feel the same want.\nYet all this is very unlike a philosopher,\nwhen you may at any hour you please retreat into yourself.\nFor nowhere does a man retreat into more quiet or more privacy\nthan into his own mind.',
    author: 'Marcus Aurelius (trans. A. S. L. Farquharson)',
    season: null,
    source: "Meditations IV.3, trans. Farquharson (1944), verified vs archive.org the-meditations-of-the-emperor-marcus-antoninus-1 scan (Farquharson d. 1942)",
  },
  {
    text: "At dawn of day, when you dislike being called, have this thought ready:\n'I am called to man's labour;\nwhy then do I make a difficulty\nif I am going out to do what I was born to do\nand what I was brought into the world for?\nIs it for this that I am fashioned,\nto lie in bedclothes and keep myself warm?'",
    author: 'Marcus Aurelius (trans. A. S. L. Farquharson)',
    season: null,
    source: "Meditations V.1, trans. Farquharson (1944), verified vs archive.org the-meditations-of-the-emperor-marcus-antoninus-1 scan (Farquharson d. 1942)",
  },
];
