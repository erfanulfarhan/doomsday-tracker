/* =============================================================
   ROAD TO DOOMSDAY — catalogue
   -------------------------------------------------------------
   Edit this file to change the list. Nothing else needs to know.

   Each entry:
     id       stable slug — CHANGING IT RESETS THAT ROW for everyone
     title    display name
     year     release year (number)
     kind     'film' | 'series' | 'special'
     mins     approximate total runtime in minutes
     eps      episode count (series only)
     phase    grouping key, must exist in PHASES below
     path     'core'       = the essential road
              'full'       = MCU completionist
              'multiverse' = Fox-era X-Men / Fantastic Four
              'street'     = Netflix Defenders saga
     chrono   sort key for in-universe order (approximate)
     earth    optional universe badge
     note     one honest line on why it matters
     upcoming true if not out yet
   ============================================================= */

const RELEASE = {
  title: 'Avengers: Doomsday',
  // Studio-announced theatrical date. Change here if it moves again.
  date: '2026-12-18T00:00:00',
  dateLabel: 'December 18, 2026',
};

const PHASES = [
  { key: 'fox',   name: 'The Fox Era',      sub: 'Earth-10005 · the universe Doomsday is raiding' },
  { key: 'p1',    name: 'Phase One',        sub: '2008–2012 · assembling' },
  { key: 'p2',    name: 'Phase Two',        sub: '2013–2015 · widening' },
  { key: 'p3',    name: 'Phase Three',      sub: '2016–2019 · the Infinity Saga ends' },
  { key: 'p4',    name: 'Phase Four',       sub: '2021–2022 · the multiverse cracks open' },
  { key: 'p5',    name: 'Phase Five',       sub: '2023–2025 · incursions begin' },
  { key: 'p6',    name: 'Phase Six',        sub: '2025–2026 · the road ends' },
  { key: 'street',name: 'Street Level',     sub: 'Optional · the Defenders saga' },
];

const CATALOGUE = [
  /* ---------- Fox era ---------- */
  { id: 'xmen-1', title: 'X-Men', year: 2000, kind: 'film', mins: 104, phase: 'fox', path: 'multiverse', chrono: 2000, earth: '10005',
    note: 'Where this cast of mutants begins.' },
  { id: 'x2', title: 'X2: X-Men United', year: 2003, kind: 'film', mins: 134, phase: 'fox', path: 'multiverse', chrono: 2003, earth: '10005' },
  { id: 'x3', title: 'X-Men: The Last Stand', year: 2006, kind: 'film', mins: 104, phase: 'fox', path: 'multiverse', chrono: 2006, earth: '10005' },
  { id: 'ff-2005', title: 'Fantastic Four', year: 2005, kind: 'film', mins: 106, phase: 'fox', path: 'multiverse', chrono: 2005, earth: '121698',
    note: 'The first live-action Doom. Skippable, but it is the reference point.' },
  { id: 'first-class', title: 'X-Men: First Class', year: 2011, kind: 'film', mins: 132, phase: 'fox', path: 'multiverse', chrono: 1962, earth: '10005' },
  { id: 'the-wolverine', title: 'The Wolverine', year: 2013, kind: 'film', mins: 126, phase: 'fox', path: 'multiverse', chrono: 2013, earth: '10005' },
  { id: 'dofp', title: 'X-Men: Days of Future Past', year: 2014, kind: 'film', mins: 132, phase: 'fox', path: 'multiverse', chrono: 1973, earth: '10005',
    note: 'The Fox timeline gets rewritten — and the template for a multiversal team-up.' },
  { id: 'apocalypse', title: 'X-Men: Apocalypse', year: 2016, kind: 'film', mins: 144, phase: 'fox', path: 'multiverse', chrono: 1983, earth: '10005' },
  { id: 'logan', title: 'Logan', year: 2017, kind: 'film', mins: 137, phase: 'fox', path: 'multiverse', chrono: 2029, earth: '10005' },
  { id: 'dark-phoenix', title: 'Dark Phoenix', year: 2019, kind: 'film', mins: 113, phase: 'fox', path: 'multiverse', chrono: 1992, earth: '10005' },

  /* ---------- Phase One ---------- */
  { id: 'iron-man', title: 'Iron Man', year: 2008, kind: 'film', mins: 126, phase: 'p1', path: 'core', chrono: 2010, earth: '616',
    note: 'The whole thing starts here.' },
  { id: 'hulk', title: 'The Incredible Hulk', year: 2008, kind: 'film', mins: 112, phase: 'p1', path: 'full', chrono: 2011, earth: '616' },
  { id: 'iron-man-2', title: 'Iron Man 2', year: 2010, kind: 'film', mins: 124, phase: 'p1', path: 'full', chrono: 2011.2, earth: '616' },
  { id: 'thor', title: 'Thor', year: 2011, kind: 'film', mins: 115, phase: 'p1', path: 'core', chrono: 2011.4, earth: '616',
    note: 'Introduces Loki, who is load-bearing for everything multiversal.' },
  { id: 'first-avenger', title: 'Captain America: The First Avenger', year: 2011, kind: 'film', mins: 124, phase: 'p1', path: 'core', chrono: 1943, earth: '616',
    note: 'Steve, Bucky, the Tesseract.' },
  { id: 'avengers', title: 'The Avengers', year: 2012, kind: 'film', mins: 143, phase: 'p1', path: 'core', chrono: 2012, earth: '616',
    note: 'The Battle of New York — the branch point Loki keeps returning to.' },

  /* ---------- Phase Two ---------- */
  { id: 'iron-man-3', title: 'Iron Man 3', year: 2013, kind: 'film', mins: 130, phase: 'p2', path: 'full', chrono: 2012.9, earth: '616' },
  { id: 'dark-world', title: 'Thor: The Dark World', year: 2013, kind: 'film', mins: 112, phase: 'p2', path: 'full', chrono: 2013.5, earth: '616' },
  { id: 'winter-soldier', title: 'Captain America: The Winter Soldier', year: 2014, kind: 'film', mins: 136, phase: 'p2', path: 'core', chrono: 2014, earth: '616',
    note: 'Bucky becomes a person again. Directly feeds the Doomsday cast.' },
  { id: 'gotg', title: 'Guardians of the Galaxy', year: 2014, kind: 'film', mins: 121, phase: 'p2', path: 'core', chrono: 2014.3, earth: '616' },
  { id: 'ultron', title: 'Avengers: Age of Ultron', year: 2015, kind: 'film', mins: 141, phase: 'p2', path: 'core', chrono: 2015, earth: '616',
    note: 'Wanda, Vision, and the fracture that makes Civil War.' },
  { id: 'ant-man', title: 'Ant-Man', year: 2015, kind: 'film', mins: 117, phase: 'p2', path: 'core', chrono: 2015.5, earth: '616',
    note: 'The Quantum Realm — the MCU’s back door between realities.' },

  /* ---------- Phase Three ---------- */
  { id: 'civil-war', title: 'Captain America: Civil War', year: 2016, kind: 'film', mins: 147, phase: 'p3', path: 'core', chrono: 2016, earth: '616',
    note: 'The team breaks. Doomsday is the repair bill.' },
  { id: 'doctor-strange', title: 'Doctor Strange', year: 2016, kind: 'film', mins: 115, phase: 'p3', path: 'core', chrono: 2016.8, earth: '616' },
  { id: 'gotg-2', title: 'Guardians of the Galaxy Vol. 2', year: 2017, kind: 'film', mins: 136, phase: 'p3', path: 'full', chrono: 2014.4, earth: '616' },
  { id: 'homecoming', title: 'Spider-Man: Homecoming', year: 2017, kind: 'film', mins: 133, phase: 'p3', path: 'core', chrono: 2016.4, earth: '616' },
  { id: 'ragnarok', title: 'Thor: Ragnarok', year: 2017, kind: 'film', mins: 130, phase: 'p3', path: 'core', chrono: 2017.5, earth: '616' },
  { id: 'black-panther', title: 'Black Panther', year: 2018, kind: 'film', mins: 134, phase: 'p3', path: 'core', chrono: 2016.2, earth: '616' },
  { id: 'infinity-war', title: 'Avengers: Infinity War', year: 2018, kind: 'film', mins: 149, phase: 'p3', path: 'core', chrono: 2018.1, earth: '616' },
  { id: 'ant-man-2', title: 'Ant-Man and the Wasp', year: 2018, kind: 'film', mins: 118, phase: 'p3', path: 'full', chrono: 2018, earth: '616' },
  { id: 'captain-marvel', title: 'Captain Marvel', year: 2019, kind: 'film', mins: 123, phase: 'p3', path: 'core', chrono: 1995, earth: '616' },
  { id: 'endgame', title: 'Avengers: Endgame', year: 2019, kind: 'film', mins: 181, phase: 'p3', path: 'core', chrono: 2018.2, earth: '616',
    note: 'The time heist creates branched timelines. Everything after is cleanup.' },
  { id: 'ffh', title: 'Spider-Man: Far From Home', year: 2019, kind: 'film', mins: 129, phase: 'p3', path: 'core', chrono: 2024.7, earth: '616' },

  /* ---------- Phase Four ---------- */
  { id: 'wandavision', title: 'WandaVision', year: 2021, kind: 'series', eps: 9, mins: 350, phase: 'p4', path: 'core', chrono: 2023.5, earth: '616',
    note: 'Wanda’s grief, and the Darkhold.' },
  { id: 'fatws', title: 'The Falcon and the Winter Soldier', year: 2021, kind: 'series', eps: 6, mins: 300, phase: 'p4', path: 'core', chrono: 2024, earth: '616',
    note: 'Sam takes the shield. He leads the new team.' },
  { id: 'loki-1', title: 'Loki — Season 1', year: 2021, kind: 'series', eps: 6, mins: 290, phase: 'p4', path: 'core', chrono: 2023.1, earth: '616',
    note: 'The TVA, the Sacred Timeline, and the man behind it. Non-negotiable.' },
  { id: 'black-widow', title: 'Black Widow', year: 2021, kind: 'film', mins: 134, phase: 'p4', path: 'full', chrono: 2016.1, earth: '616',
    note: 'Introduces Yelena and Red Guardian.' },
  { id: 'what-if-1', title: 'What If…? — Season 1', year: 2021, kind: 'series', eps: 9, mins: 280, phase: 'p4', path: 'full', chrono: 2023.2, earth: 'multi' },
  { id: 'shang-chi', title: 'Shang-Chi and the Legend of the Ten Rings', year: 2021, kind: 'film', mins: 132, phase: 'p4', path: 'core', chrono: 2024.1, earth: '616' },
  { id: 'eternals', title: 'Eternals', year: 2021, kind: 'film', mins: 156, phase: 'p4', path: 'full', chrono: 2024.2, earth: '616' },
  { id: 'hawkeye', title: 'Hawkeye', year: 2021, kind: 'series', eps: 6, mins: 260, phase: 'p4', path: 'full', chrono: 2024.9, earth: '616' },
  { id: 'nwh', title: 'Spider-Man: No Way Home', year: 2021, kind: 'film', mins: 148, phase: 'p4', path: 'core', chrono: 2024.95, earth: '616',
    note: 'The multiverse stops being theoretical.' },
  { id: 'moon-knight', title: 'Moon Knight', year: 2022, kind: 'series', eps: 6, mins: 290, phase: 'p4', path: 'full', chrono: 2025, earth: '616' },
  { id: 'mom', title: 'Doctor Strange in the Multiverse of Madness', year: 2022, kind: 'film', mins: 126, phase: 'p4', path: 'core', chrono: 2025.05, earth: '616',
    note: 'Incursions, the Illuminati, and what happens to a universe that loses.' },
  { id: 'ms-marvel', title: 'Ms. Marvel', year: 2022, kind: 'series', eps: 6, mins: 280, phase: 'p4', path: 'full', chrono: 2025.1, earth: '616' },
  { id: 'love-thunder', title: 'Thor: Love and Thunder', year: 2022, kind: 'film', mins: 118, phase: 'p4', path: 'full', chrono: 2025.15, earth: '616' },
  { id: 'she-hulk', title: 'She-Hulk: Attorney at Law', year: 2022, kind: 'series', eps: 9, mins: 300, phase: 'p4', path: 'full', chrono: 2025.5, earth: '616' },
  { id: 'werewolf', title: 'Werewolf by Night', year: 2022, kind: 'special', mins: 52, phase: 'p4', path: 'full', chrono: 2025.6, earth: '616' },
  { id: 'wakanda-forever', title: 'Black Panther: Wakanda Forever', year: 2022, kind: 'film', mins: 161, phase: 'p4', path: 'full', chrono: 2025.3, earth: '616' },
  { id: 'gotg-holiday', title: 'The Guardians of the Galaxy Holiday Special', year: 2022, kind: 'special', mins: 44, phase: 'p4', path: 'full', chrono: 2025.7, earth: '616' },

  /* ---------- Phase Five ---------- */
  { id: 'quantumania', title: 'Ant-Man and the Wasp: Quantumania', year: 2023, kind: 'film', mins: 124, phase: 'p5', path: 'core', chrono: 2025.8, earth: '616',
    note: 'The Council. The scale of the threat lands here.' },
  { id: 'gotg-3', title: 'Guardians of the Galaxy Vol. 3', year: 2023, kind: 'film', mins: 150, phase: 'p5', path: 'full', chrono: 2025.9, earth: '616' },
  { id: 'secret-invasion', title: 'Secret Invasion', year: 2023, kind: 'series', eps: 6, mins: 290, phase: 'p5', path: 'full', chrono: 2026.0, earth: '616' },
  { id: 'loki-2', title: 'Loki — Season 2', year: 2023, kind: 'series', eps: 6, mins: 300, phase: 'p5', path: 'core', chrono: 2023.15, earth: '616',
    note: 'Loki takes the throne of the multiverse. The single most important lead-in.' },
  { id: 'marvels', title: 'The Marvels', year: 2023, kind: 'film', mins: 105, phase: 'p5', path: 'core', chrono: 2025.2, earth: '616',
    note: 'A hole punched between universes — and a post-credits scene aimed straight at Doomsday.' },
  { id: 'what-if-2', title: 'What If…? — Season 2', year: 2023, kind: 'series', eps: 9, mins: 270, phase: 'p5', path: 'full', chrono: 2023.25, earth: 'multi' },
  { id: 'echo', title: 'Echo', year: 2024, kind: 'series', eps: 5, mins: 230, phase: 'p5', path: 'full', chrono: 2025.45, earth: '616' },
  { id: 'deadpool-wolverine', title: 'Deadpool & Wolverine', year: 2024, kind: 'film', mins: 128, phase: 'p5', path: 'core', chrono: 2024.5, earth: '10005',
    note: 'The Fox universe is canon now, and the TVA says so out loud.' },
  { id: 'agatha', title: 'Agatha All Along', year: 2024, kind: 'series', eps: 9, mins: 320, phase: 'p5', path: 'full', chrono: 2026.2, earth: '616' },
  { id: 'what-if-3', title: 'What If…? — Season 3', year: 2024, kind: 'series', eps: 8, mins: 230, phase: 'p5', path: 'full', chrono: 2023.3, earth: 'multi' },

  /* ---------- Phase Six ---------- */
  { id: 'brave-new-world', title: 'Captain America: Brave New World', year: 2025, kind: 'film', mins: 118, phase: 'p6', path: 'core', chrono: 2026.3, earth: '616',
    note: 'Sam as Cap, on his own, against a government.' },
  { id: 'daredevil-born-again', title: 'Daredevil: Born Again — Season 1', year: 2025, kind: 'series', eps: 9, mins: 430, phase: 'p6', path: 'full', chrono: 2026.1, earth: '616' },
  { id: 'thunderbolts', title: 'Thunderbolts*', year: 2025, kind: 'film', mins: 127, phase: 'p6', path: 'core', chrono: 2026.4, earth: '616',
    note: 'The asterisk is the point. Watch through the credits.' },
  { id: 'ironheart', title: 'Ironheart', year: 2025, kind: 'series', eps: 6, mins: 290, phase: 'p6', path: 'full', chrono: 2026.35, earth: '616' },
  { id: 'fantastic-four', title: 'The Fantastic Four: First Steps', year: 2025, kind: 'film', mins: 115, phase: 'p6', path: 'core', chrono: 1964, earth: '828',
    note: 'A separate universe, a separate decade. They arrive in ours by the end.' },
  { id: 'wonder-man', title: 'Wonder Man', year: 2026, kind: 'series', eps: 8, mins: 240, phase: 'p6', path: 'full', chrono: 2026.45, earth: '616', upcoming: true },
  { id: 'brand-new-day', title: 'Spider-Man: Brand New Day', year: 2026, kind: 'film', mins: 130, phase: 'p6', path: 'core', chrono: 2026.5, earth: '616', upcoming: true,
    note: 'The last stop before Doomsday.' },

  /* ---------- Street level ---------- */
  { id: 'dd-1', title: 'Daredevil — Season 1', year: 2015, kind: 'series', eps: 13, mins: 700, phase: 'street', path: 'street', chrono: 2015.1, earth: '616' },
  { id: 'jessica-jones-1', title: 'Jessica Jones — Season 1', year: 2015, kind: 'series', eps: 13, mins: 700, phase: 'street', path: 'street', chrono: 2015.2, earth: '616' },
  { id: 'dd-2', title: 'Daredevil — Season 2', year: 2016, kind: 'series', eps: 13, mins: 700, phase: 'street', path: 'street', chrono: 2016.5, earth: '616' },
  { id: 'defenders', title: 'The Defenders', year: 2017, kind: 'series', eps: 8, mins: 400, phase: 'street', path: 'street', chrono: 2017.2, earth: '616' },
  { id: 'punisher-1', title: 'The Punisher — Season 1', year: 2017, kind: 'series', eps: 13, mins: 700, phase: 'street', path: 'street', chrono: 2017.4, earth: '616' },
  { id: 'dd-3', title: 'Daredevil — Season 3', year: 2018, kind: 'series', eps: 13, mins: 700, phase: 'street', path: 'street', chrono: 2018.5, earth: '616' },
];

const ROUTES = {
  essential: { label: 'Essentials',  paths: ['core'],                            blurb: 'The shortest honest path.' },
  mcu:       { label: 'Full MCU',    paths: ['core', 'full'],                    blurb: 'Every film and series, Iron Man onward.' },
  complete:  { label: 'Everything',  paths: ['core', 'full', 'multiverse', 'street'], blurb: 'Fox era and the Defenders included.' },
};
