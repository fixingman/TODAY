// TODAY — daily poem corpus
// Human-written, public-domain poems about living this day.
// Curated by hand in chat (accept/reject rounds) — never AI-generated.
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
    text: 'The hand writes on. Once written,\nno prayer or wit recalls it—\nno tears wash out a word.\nWhat\'s done is done.',
    author: 'Omar Khayyám',
    season: null,
    source: 'Rubáiyát — modern rendering after FitzGerald',
  },
  {
    text: 'The bird of life is singing in the sun,\nShort is his song, nor only just begun,—\nA call, a trill, a rapture, then—so soon!—\nA silence, and the song is done—is done.',
    author: 'Omar Khayyám',
    season: null,
    source: 'Rubáiyát, trans. Richard Le Gallienne, 1897 (Wikisource; Le Gallienne d.1947)',
  },
  {
    text: 'Heed not To-morrow, heed not Yesterday;\nthe magic words of life are Here and Now.',
    author: 'Omar Khayyám',
    season: null,
    source: 'Rubáiyát, trans. Le Gallienne, 1897 — core two lines, stanza trimmed',
  },
  {
    text: 'Awake! for Morning in the Bowl of Night\nHas flung the Stone that puts the Stars to Flight:\nAnd Lo! the Hunter of the East has caught\nThe Sultan\'s Turret in a Noose of Light.',
    author: 'Omar Khayyám',
    season: null,
    source: "Rubáiyát I, trans. FitzGerald (1st ed. 1859), Gutenberg #246 (FitzGerald d. 1883)",
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
  //    copyright in life+70 countries until the 2030s. App is US-hosted.
  //    Cherry-pick decision 2026-07-19: these five kept permanently (Frost ×3,
  //    Yang-ti, Po Chü-i 'After Lunch'); six purged (WCW, Sandburg, H.D.,
  //    Lu Yün, 'Winter Night', 'Ease'). Category closed — no new US-PD-only
  //    additions; worldwide PD is the bar for all future poems. ──────────────
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

  // ── Round 12 (Jul 2026) ────────────────────────────────────────────────────
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
  {
    text: 'Sunbeams through twinkling pinewoods cast\nTheir shadows on my window screen.\nA night of clouds and rain is past\nAnd, newly blue and freshly green,\nThe Dawn rebuilds my world at last.\nAnd children\'s happy voices rouse the street.',
    author: 'Wen T\'ung (trans. L. Cranmer-Byng)',
    season: 'spring',
    source: "'Morning', A Feast of Lanterns (1916), verified vs archive.org in.ernet.dli.2015.282424 scan (Cranmer-Byng d. 1945)",
  },

  // ── Round 16 (Jul 2026) ────────────────────────────────────────────────────
  {
    text: 'Thanks for today,\nplease for tomorrow.',
    author: 'Mother Askani',
    season: null,
    source: 'original',
  },

  // ── Round 18 (Jul 2026) — Seneca via Gummere ───────────────────────────────
  {
    text: 'There are more things, Lucilius, likely to frighten us\nthan there are to crush us;\nwe suffer more often in imagination than in reality.',
    author: 'Seneca (trans. Richard Mott Gummere)',
    season: null,
    source: "Moral Letters to Lucilius, Letter XIII §4, trans. Richard Mott Gummere (1917), Loeb Classical Library vol. 1 (Gummere d. 1922) — verified vs en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_13",
  },

  // ── Round 17 (Jul 2026) — Seneca via Aubrey Stewart ───────────────────────
  {
    text: 'We do not receive a short life,\nbut we make it a short one,\nand we are not poor in days,\nbut wasteful of them.',
    author: 'Seneca (trans. Aubrey Stewart)',
    season: null,
    source: "'On the Shortness of Life' I.1, trans. Aubrey Stewart (1889), Bohn's Classical Library (Stewart d. 1918) — verified vs archive.org/details/seneca-dialogues-aubrey-stewart",
  },
  {
    text: 'Why do you hesitate,\nwhy do you stand back?\nUnless you seize it, it will have fled;\nand even if you do seize it,\nit will still fly.',
    author: 'Seneca (trans. Aubrey Stewart)',
    season: null,
    source: "'On the Shortness of Life', trans. Aubrey Stewart (1889), Bohn's Classical Library (Stewart d. 1918) — verified vs archive.org/details/seneca-dialogues-aubrey-stewart; 'says he,' (Seneca citing Virgil, narrative aside) omitted editorially",
  },

  // ── Round 20 (Jul 2026) — Chamberlain 1902 ───────────────────────────────
  {
    text: 'Aye! New Year\'s day, with a clear sky,\nAnd conversation among the sparrows!',
    author: 'Ransetsu',
    season: 'winter',
    source: 'Chamberlain 1902, no. 103 (archive.org/details/basho-and-the-japanses-poetical-epigram; Ransetsu d. 1707, Chamberlain d. 1935)',
  },
  {
    text: 'The daylight dawns, and, like a flower,\nOpen the gates of Paradise.',
    author: 'Seibu',
    season: null,
    source: 'Chamberlain 1902, no. 64 — poet\'s death song (archive.org/details/basho-and-the-japanses-poetical-epigram; Seibu d. 1678, Chamberlain d. 1935)',
  },

  // ── Round 21 (Jul 2026) — Chamberlain 1902 + Dickinson ───────────────────
  {
    text: 'The end of autumn, and some rooks\nAre perched upon a withered branch.',
    author: 'Bashō',
    season: 'autumn',
    source: 'Chamberlain 1902, no. 37 (archive.org basho-and-the-japanses-poetical-epigram; Bashō d. 1694, Chamberlain d. 1935)',
  },
  {
    text: 'A single river, stretching far\nAcross the moorland swathed in snow.',
    author: 'Bonchō',
    season: 'winter',
    source: "Chamberlain 1902, no. 1 (archive.org basho-and-the-japanses-poetical-epigram; Bonchō d. 1714, Chamberlain d. 1935 — '[swathed]' is Chamberlain's supplied word)",
  },
  {
    text: "The morns are meeker than they were,\nThe nuts are getting brown;\nThe berry's cheek is plumper,\nThe rose is out of town.\n\nThe maple wears a gayer scarf,\nThe field a scarlet gown.\nLest I should be old-fashioned,\nI'll put a trinket on.",
    author: 'Emily Dickinson',
    season: 'autumn',
    source: "'Autumn', Poems (1890), Wikisource (d. 1886 — PD worldwide)",
  },

  // ── Round 19 (Jul 2026) ────────────────────────────────────────────────────
  {
    text: 'To make a prairie it takes a clover and one bee,\nOne clover, and a bee,\nAnd revery.\nThe revery alone will do,\nIf bees are few.',
    author: 'Emily Dickinson',
    season: null,
    source: "'To Make a Prairie', Poems (1896), Wikisource (d. 1886 — PD worldwide)",
  },
  {
    text: 'I stood beside a hill\nSmooth with new-laid snow,\nA single star looked out\nFrom the cold evening glow.\n\nThere was no other creature\nThat saw what I could see—\nI stood and watched the evening star\nAs long as it watched me.',
    author: 'Sara Teasdale',
    season: 'winter',
    source: "'February Twilight', Dark of the Moon (1926) (d. 1933 — PD worldwide) — verified verbatim vs archive.org/details/darkofmoon0000sara",
  },
  {
    text: 'Seek not that the things which happen should happen as you wish;\nbut wish the things which happen to be as they are,\nand you will have a tranquil flow of life.',
    author: 'Epictetus (trans. George Long)',
    season: null,
    source: "Encheiridion §8, trans. George Long (d. 1879), Gutenberg #10661 — verified verbatim",
  },

  // ── Round 22 (Jul 2026) — Publilius Syrus ────────────────────────────────
  {
    text: 'It is an unhappy lot which finds no enemies.\nIt is an unhappy lot which an enemy does not envy.',
    author: 'Publilius Syrus (trans. Darius Lyman)',
    season: null,
    source: "The Moral Sayings of Publius Syrus, A Roman Slave, trans. Darius Lyman (1856), maxims 499–500, Wikisource (Lyman d. 1884 — PD worldwide) — verified verbatim",
  },

  // ── Round 25 (Aug 2026) — Hyakunin Isshu (trans. William N. Porter, 1909) ──
  // Four tanka on spring blossoms. Porter d. 1917; all poets d. pre-1200 — PD worldwide.
  // Verified verbatim from Wikisource: A_Hundred_Verses_from_Old_Japan/Poem_N
  {
    text: 'The spring has come, and once again\nThe sun shines in the sky;\nSo gently smile the heavens, that\nIt almost makes me cry,\nWhen blossoms droop and die.',
    author: 'Ki no Tomonori',
    season: 'spring',
    source: "Hyakunin Isshu 33, A Hundred Verses from Old Japan, trans. William N. Porter (1909) — verified Wikisource (Porter d. 1917, Ki no Tomonori d. c. 905)",
  },
  {
    text: 'The village of my youth is gone,\nNew faces meet my gaze;\nBut still the blossoms at thy gate,\nWhose perfume scents the ways,\nRecall my childhood\'s days.',
    author: 'Ki no Tsurayuki',
    season: 'spring',
    source: "Hyakunin Isshu 35, A Hundred Verses from Old Japan, trans. William N. Porter (1909) — verified Wikisource (Porter d. 1917, Ki no Tsurayuki d. 946)",
  },
  {
    text: 'The double cherry trees, which grew\nAt Nara in past days,\nNow beautify this Palace, and\nTheir blossoms all ablaze\nPerfume the royal ways.',
    author: 'Ise no Taifu',
    season: 'spring',
    source: "Hyakunin Isshu 61, A Hundred Verses from Old Japan, trans. William N. Porter (1909) — verified Wikisource (Porter d. 1917, Ise no Taifu fl. c. 1000)",
  },
  {
    text: 'The cherry trees are blossoming\nOn Takasago\'s height;\nOh may no mountain mist arise,\nNo clouds so soft and white,\nTo hide them from our sight.',
    author: 'Ōe no Masafusa',
    season: 'spring',
    source: "Hyakunin Isshu 73, A Hundred Verses from Old Japan, trans. William N. Porter (1909) — verified Wikisource (Porter d. 1917, Ōe no Masafusa d. 1111)",
  },

  // ── Round 23 (Jul 2026) — Sara Teasdale, Stars To-night ──────────────────
  {
    text: 'Stars over snow,\nAnd in the west a planet\nSwinging below a star—\nLook for a lovely thing and you will find it,\nIt is not far—\nIt never will be far.',
    author: 'Sara Teasdale',
    season: 'winter',
    source: "'Night', Stars To-night (1930) (d. 1933 — PD worldwide) — verified verbatim vs archive.org/details/starstonightvers0000sara",
  },
  {
    text: 'Snow-dust driven over the snow\nIn glittering light,\n\nLow hills, far as the eye can go,\nWhite on white;\n\nBlue as a blue jay, shadows run\nDue north from every tree—\n\nChipmunk, do you like the sun,\nThe blowing snow and me?',
    author: 'Sara Teasdale',
    season: 'winter',
    source: "'Winter Noon', Stars To-night (1930) (d. 1933 — PD worldwide) — verified verbatim vs archive.org/details/starstonightvers0000sara",
  },
  {
    text: 'Evening, and all the birds\nIn a chorus of shimmering sound\nAre easing their hearts of joy\nFor miles around.\n\nThe air is still and sweet,\nThe few first stars are white,—\nOh let me like the birds\nSing before night.',
    author: 'Sara Teasdale',
    season: 'summer',
    source: "'Summer Evening', Stars To-night (1930) (d. 1933 — PD worldwide) — verified verbatim vs archive.org/details/starstonightvers0000sara",
  },

  // ── Round 24 (Aug 2026) — Latin American, Blackwell anthology ───────────
  {
    text: 'All things climb a starry stair,\nBy a law that no man knows.\nWhat was yesterday a thorn\nShall tomorrow be a rose.\n\nWhat was once a chrysalid\nSoon shall soar, free fluttering;\nWhat was yesterday a wish\nWill tomorrow be a wing!',
    author: 'Luis G. Urbina',
    season: 'spring',
    source: "'Ascension' (trans. Alice Stone Blackwell), Some Spanish-American Poets (1929), p. 70 — Urbina d. 1934, Blackwell d. 1950, both PD worldwide — verified verbatim vs archive.org/details/somespanishamerica00blac",
  },
  {
    text: 'Upon an arch in the prison has fallen a small snowflake.\nIt is a little dove, white as a dream.\n\nShe comes from the turquoise sky, opens her rosy beak\nand says to me tenderly: "She is kind, and thinks of thee!"',
    author: 'Rufino Blanco Fombona',
    season: 'winter',
    source: "'A Little Messenger Dove' / 'Palomita Mensajera' (trans. Alice Stone Blackwell), Some Spanish-American Poets (1929), p. 434–435 — Blanco Fombona d. 1944, Blackwell d. 1950, both PD worldwide — verified verbatim vs archive.org/details/somespanishamerica00blac",
  },

  // ── Round 33 (Aug 2026) — Syria, Persia, Armenia ───────────────────────
  {
    text: 'The thunder hath a grandeur, but the rains,\nWithout the thunder, quench the thirst of Earth.',
    author: 'Abu al-Ala al-Ma\'arri (trans. Ameen Rihani)',
    season: null,
    source: "'The Luzumiyat of Abu'l-Ala', quatrain LXIX (closing couplet), trans. Ameen Rihani (1920) — al-Ma'arri d. 1057, Rihani d. 1940, both PD worldwide — verified verbatim vs Wikisource proofread edition",
  },
  {
    text: 'Roses are a wandering scent from heaven.\nRose-seller, why do you sell your roses?\nFor silver? But with the silver from your roses\nWhat can you buy so precious as your roses?',
    author: 'Abu-Yshac (trans. E. Powys Mathers)',
    season: null,
    source: "'The Roses', The Garden of Bright Waters, trans. E. Powys Mathers (1920) — Abu-Yshac, tenth century; Mathers d. 1939, both PD worldwide — verified verbatim vs Project Gutenberg #9920",
  },
  {
    text: 'Let the wind blow cold, let it beat my face,\nLet the clouds above heavy snow-flakes fling,\nLet the north wind blow, raging all it will,—\nYet I live in hope soon or late comes spring.\n\nLet the heavy clouds make the clear sky dark,\nLet the dense fogs cover the earth from sight,\nLet the elements be together mixed,\nYet I know the sun will again be bright.',
    author: 'Raphael Patkanian (trans. Alice Stone Blackwell)',
    season: 'winter',
    source: "'The Sure Hope' (first two of three stanzas), Armenian Poems, Rendered into English Verse, trans. Alice Stone Blackwell (1917), p. 250 — Patkanian d. 1892, Blackwell d. 1950, both PD worldwide — verified verbatim vs Internet Archive/Wikimedia scan",
  },

  // ── Round 34 (Aug 2026) — Jamaica, Spain ───────────────────────────────
  {
    text: 'But oh! for the woods, the flowers\nOf natural, sweet perfume,\nThe heartening, summer showers\nAnd the smiling shrubs in bloom,\nDust-free, dew-tinted at morn,\nThe fresh and life-giving air,\nThe billowing waves of corn\nAnd the birds’ notes rich and clear:—\nFor a man-machine toil-tired\nMay crave beauty too—though he’s hired.',
    author: 'Claude McKay',
    season: 'summer',
    source: "'Joy in the Woods' (closing stanza), Workers' Dreadnought, 10 April 1920 (signed 'Hugh Hope') — McKay d. 1948, PD worldwide — verified verbatim vs the Workers' Dreadnought scan and Academy of American Poets",
  },
  {
    text: 'Learn how to hope, to wait the proper tide—\nAs on the coast a bark—then part without a care;\nHe who knows how to wait wins victory for bride;\nFor life is long and art a plaything there.\n\nBut should your life prove short\nAnd never come a tide,\nWait still, unsailing, hope is on your side—\nArt may be long or, else, of no import.',
    author: 'Antonio Machado (trans. Thomas Walsh)',
    season: null,
    source: "'Counsels', Hispanic Anthology, trans. Thomas Walsh (G. P. Putnam's Sons, 1920), p. 663 — Machado d. 1939, Walsh d. 1928, both PD worldwide — verified verbatim vs the Internet Archive scan",
  },

  // ── Round 32 (Aug 2026) — !kun oral tradition ──────────────────────────
  {
    text: 'Tell me of something.\nHail, hail!\nWhen the sun rises,\nThou must speak to me,\nThat I may eat something.\nThou must speak to me about a little thing,\nThat I may eat.\nHail, hail,\nYoung Moon!',
    author: 'Traditional !kun (recited by !nanni)',
    season: null,
    source: "'Prayer to the Young Moon' (closing excerpt), recited by !nanni from his father's prayer and recorded by L.C. Lloyd on 8 June 1880, Specimens of Bushman Folklore (1911) — anonymous !kun oral tradition, Lloyd d. 1914, PD worldwide — verified verbatim vs sacred-texts.com/afr/sbf/sbf85.htm and Digital Bleek & Lloyd story 1040",
  },

  // ── Round 31 (Aug 2026) — Chinese (trans. L. Cranmer-Byng 1909) ─────────
  {
    text: 'The Lady Moon is my lover,\nMy friends are the oceans four,\nThe heavens have roofed me over,\nAnd the dawn is my golden door\nI would liefer follow the condor\nOr the seagull, soaring from ken,\nThan bury my godhead yonder\nIn the dust of the whirl of men.',
    author: 'Chang Chih-ho (Chinese, Tang dynasty, trans. L. Cranmer-Byng)',
    season: null,
    source: 'A Lute of Jade, L. Cranmer-Byng (1909), Gutenberg #390 (Chang Chih-ho c. 750, Cranmer-Byng d. 1945 — PD worldwide — verified verbatim)',
  },

  // ── Round 30 (Aug 2026) — Chinese (trans. H.A. Giles 1898) + Sappho (trans. Bliss Carman 1904) ──
  {
    text: 'The bright moon shining overhead,\nThe stream beneath the breeze\'s touch,\nAre pure and perfect joys indeed, —\nBut few are they who think them such.',
    author: 'Anonymous (Chinese, Tang dynasty, trans. Herbert Giles)',
    season: null,
    source: 'Chinese Poetry in English Verse, H.A. Giles (1898), "True Pleasures" (archive.org ChinesePoetryInEnglishVerse; anon. Tang poet, Giles d. 1935, PD worldwide — verified verbatim)',
  },
  {
    text: 'If death be good,\nWhy do the gods not die?\nIf life be ill,\nWhy do the gods still live?\nIf love be naught,\nWhy do the gods still love?\nIf love be all,\nWhat should men do but love?',
    author: 'Sappho (trans. Bliss Carman)',
    season: null,
    source: 'Sappho: One Hundred Lyrics, LXXIV, Bliss Carman (1904), Gutenberg #12389 (Carman d. 1929 — PD worldwide — verified verbatim)',
  },

  // ── Round 29 (Aug 2026) — Japanese (trans. B.H. Chamberlain 1902) ──────────
  {
    text: '\'Tis a toad\'s croak. Come! hop away\nFrom underneath the fancier\'s house.',
    author: 'Bashō',
    season: null,
    source: "Chamberlain 1902, no. 34 (archive.org/details/basho-and-the-japanses-poetical-epigram; Bashō d. 1694, Chamberlain d. 1935, both PD worldwide — verified verbatim)",
  },
  {
    text: 'How cool the air! and through a shower\nThe radiance of the setting sun.',
    author: 'Anonymous (Japanese, trans. B.H. Chamberlain)',
    season: 'summer',
    source: "Chamberlain 1902, no. 2 (archive.org/details/basho-and-the-japanses-poetical-epigram; anonymous Edo-period poem, Chamberlain d. 1935, PD worldwide — verified verbatim)",
  },
  {
    text: 'A change of garments, and the spring\nGoes into hiding in the chest.',
    author: 'Anonymous (Japanese, Danrin school, trans. B.H. Chamberlain)',
    season: 'spring',
    source: "Chamberlain 1902 essay example, Danrin school (archive.org/details/basho-and-the-japanses-poetical-epigram; anonymous 17th-c. Japanese, Chamberlain d. 1935, PD worldwide — verified verbatim)",
  },

  // ── Round 28 (Aug 2026) — Tamil (Tirukkural, trans. Pope 1886) ──────────────
  {
    text: 'The loveless to themselves belong alone;\nThe loving men are others\' to the very bone.',
    author: 'Thiruvalluvar (trans. G. U. Pope)',
    season: null,
    source: "'Possession of Love', kural 72, Tirukkural (Clarendon Press, Oxford, 1886) — Thiruvalluvar ~300 CE (classical Tamil), Pope d. 1908, both PD worldwide — verified verbatim",
  },
  {
    text: 'The loveless soul, the very joys of life may know,\nWhen flowers, in barren soil, on sapless trees, shall blow.',
    author: 'Thiruvalluvar (trans. G. U. Pope)',
    season: null,
    source: "'Possession of Love', kural 78, Tirukkural (Clarendon Press, Oxford, 1886) — Thiruvalluvar ~300 CE (classical Tamil), Pope d. 1908, both PD worldwide — verified verbatim",
  },
  {
    text: 'Love without hatred is ripened fruit;\nWithout some lesser strife, fruit immature.',
    author: 'Thiruvalluvar (trans. G. U. Pope)',
    season: null,
    source: "'Pouting', kural 1306, Tirukural (trans. G. U. Pope, Clarendon Press, 1886) — Thiruvalluvar ~300 CE (classical Tamil), Pope d. 1908, both PD worldwide — verified verbatim",
  },
  {
    text: 'One day we silent sulked; he sneezed: The reason well I knew;\nHe thought that I, to speak well pleased, Would say, \'Long life to you!\'',
    author: 'Thiruvalluvar (trans. G. U. Pope)',
    season: null,
    source: "'Feigned Anger', kural 1312, Tirukural (trans. G. U. Pope, Clarendon Press, 1886) — Thiruvalluvar ~300 CE (classical Tamil), Pope d. 1908, both PD worldwide — verified verbatim",
  },

  // ── Round 27 (Aug 2026) — Arabic (Carlyle 1796) ───────────────────────────
  {
    text: 'Come, Leila, fill the goblet up,\nReach round the rosy wine,\nThink not that we will take the cup\nFrom any hand but thine.\n\nA draught like this \'twere vain to seek,\nNo grape can such supply;\nIt steals its tint from Leila\'s cheek,\nIts brightness from her eye.',
    author: 'Abd Alsalam Ben Raghib',
    season: null,
    source: "'To a Female Cupbearer' (trans. J. D. Carlyle), Specimens of Arabian Poetry (Cambridge, 1796); repr. Clouston, Arabian Poetry for English Readers (Glasgow, 1881) — classical Arabic poet, Carlyle d. 1804, both PD worldwide — verified verbatim",
  },

  // ── Round 26 (Aug 2026) — Arabic (Carlyle 1796) + Korea Review 1906 ──────
  {
    text: 'Not always wealth, not always force,\nA splendid destiny commands;\nThe lordly vulture gnaws the corse\nThat rots upon yon barren sands.\n\nNor want nor weakness still conspires\nTo bind us to a sordid state;\nThe fly, that with a touch expires,\nSips honey from the royal plate.',
    author: 'Imam Al-Shafi\'i',
    season: null,
    source: "'On Fatalism' (trans. J. D. Carlyle), Specimens of Arabian Poetry (Cambridge, 1796); repr. Clouston, Arabian Poetry for English Readers (Glasgow, 1881) — Al-Shafi'i d. 820 CE, Carlyle d. 1804, both PD worldwide — verified verbatim",
  },
  {
    text: 'The rivulets of spring o\'erflow with sudden showers,\nIn the distant summer cloud a magic mountain towers,\nAbove the autumn night the frosty moon shines clear,\nLone on a wintry hill a pine-tree standeth drear.',
    author: 'John Mikson',
    season: null,
    source: "'The Seasons', Korea Review Vol. 6, No. 1 (January 1906), p. 1, trans. from Korean — PD in US (pre-1929) — verified verbatim vs anthony.sogang.ac.kr/KoreaReview/KoreaReviewVolume6FullText.html",
  },
];
