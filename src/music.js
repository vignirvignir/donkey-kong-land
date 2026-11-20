// Original chiptune loops (composed for this project — no existing melodies).
// Track tokens are 16th notes: note ("C4"), "." hold previous, "-" rest.

export const SONGS = {
  title: {
    tempo: 380, loop: true,
    tracks: {
      p1: `E4 . G4 . A4 . . . E4 . G4 . B4 . A4 . E4 . G4 . A4 . . . G4 . E4 . D4 . . .`,
      p2: `- - - - C3 . - - - - - - E3 . - - - - - - C3 . - - - - - - G2 . - -`,
      wave: `C2 . . . G2 . . . A2 . . . E2 . . . F2 . . . C2 . . . G2 . . . G2 . . .`,
      noise: `X - x - X - x - X - x - X - x x X - x - X - x - X - x - X - x -`,
    },
  },
  map: {
    tempo: 340, loop: true,
    tracks: {
      p1: `C4 . E4 . G4 . E4 . A4 . G4 . E4 . C4 . D4 . F4 . A4 . F4 . G4 . E4 . C4 . . .`,
      wave: `C3 . . . C3 . . . F2 . . . F2 . . . D3 . . . D3 . . . G2 . . . C3 . . .`,
      noise: `X - - - x - - - X - - - x - - - X - - - x - - - X - - - x - x -`,
    },
  },
  jungle: {
    tempo: 420, loop: true,
    tracks: {
      p1: `D4 . F4 . A4 . F4 . D4 . F4 . C5 . A4 . Bb4 . A4 . F4 . D4 . E4 . F4 . E4 . C4 .`,
      p2: `- - - - D3 . - - - - - - D3 . - - - - - - Bb2 . - - - - - - A2 . - -`,
      wave: `D2 . . D2 A2 . . . D2 . . D2 A2 . . . Bb2 . . Bb2 F2 . . . A2 . . A2 E2 . . .`,
      noise: `X - x - x - X - X - x - x - X x X - x - x - X - X - x - X - x -`,
    },
  },
  snow: {
    tempo: 330, loop: true,
    tracks: {
      p1: `A4 . . . C5 . . . B4 . A4 . E4 . . . F4 . . . A4 . . . G4 . E4 . D4 . . .`,
      wave: `A2 . . . E2 . . . F2 . . . E2 . . . D2 . . . F2 . . . E2 . . . E2 . . .`,
      noise: `x - - - x - - - x - - - x - - - x - - - x - - - x - - - x - x -`,
    },
  },
  water: {
    tempo: 300, loop: true,
    tracks: {
      p1: `G4 . . . B4 . . . D5 . . . B4 . . . C5 . . . A4 . . . B4 . G4 . E4 . . .`,
      p2: `- - D4 . - - G4 . - - F#4 . - - G4 . - - E4 . - - F#4 . - - D4 . - - B3 .`,
      wave: `G2 . . . . . . . E2 . . . . . . . C2 . . . . . . . D2 . . . D2 . . .`,
    },
  },
  temple: {
    tempo: 360, loop: true,
    tracks: {
      p1: `E4 . E4 . G4 . E4 . A4 . . . G4 . E4 . D4 . D4 . F4 . D4 . E4 . . . - - - -`,
      wave: `E2 . . . E2 . . . A2 . . . A2 . . . D2 . . . D2 . . . E2 . . . E2 . . .`,
      noise: `X - - x X - - x X - - x X - x x X - - x X - - x X - - x X - x -`,
    },
  },
  mountain: {
    tempo: 400, loop: true,
    tracks: {
      p1: `C4 . D4 . E4 . G4 . E4 . G4 . A4 . C5 . B4 . A4 . G4 . E4 . D4 . C4 . D4 . E4 .`,
      p2: `- - - - C3 . - - - - - - E3 . - - - - - - F3 . - - - - - - G3 . - -`,
      wave: `C3 . . . G2 . . . C3 . . . A2 . . . F2 . . . G2 . . . C3 . G2 . C3 . . .`,
      noise: `X - x x X - x - X - x x X - x - X - x x X - x - X - x - X x X -`,
    },
  },
  sky: {
    tempo: 350, loop: true,
    tracks: {
      p1: `G4 . A4 . B4 . D5 . B4 . A4 . G4 . . . E4 . F#4 . G4 . B4 . A4 . G4 . F#4 . . .`,
      wave: `G2 . . . . . . . C3 . . . . . . . E2 . . . . . . . D2 . . . D2 . . .`,
    },
  },
  city: {
    tempo: 440, loop: true,
    tracks: {
      p1: `A3 . C4 . E4 . A4 . G4 . E4 . C4 . E4 . F4 . A4 . C5 . A4 . G4 . E4 . D4 . E4 .`,
      p2: `A2 . - - - - - - A2 . - - - - - - F2 . - - - - - - E2 . - - E2 . - -`,
      wave: `A2 . A2 . E2 . A2 . A2 . A2 . E2 . A2 . F2 . F2 . C2 . F2 . E2 . E2 . B2 . E2 .`,
      noise: `X - x - X x x - X - x - X x x - X - x - X x x - X - x - X x X x`,
    },
  },
  boss: {
    tempo: 460, loop: true,
    tracks: {
      p1: `C4 . C4 . Eb4 . C4 . F4 . Eb4 . C4 . B3 . C4 . C4 . Eb4 . F4 . G4 . . . F#4 . G4 .`,
      p2: `C3 . - - C3 . - - C3 . - - C3 . - - C3 . - - C3 . - - D3 . - - D3 . - -`,
      wave: `C2 . C2 . C2 . C2 . C2 . C2 . C2 . C2 . C2 . C2 . C2 . C2 . G1 . G1 . G1 . G1 .`,
      noise: `X x x - X x x - X x x - X x x - X x x - X x x - X x x - X x X X`,
    },
  },
  bonus: {
    tempo: 480, loop: true,
    tracks: {
      p1: `C5 . A4 . C5 . A4 . D5 . B4 . D5 . B4 . E5 . C5 . E5 . C5 . D5 . B4 . G4 . . .`,
      wave: `C3 . . . F3 . . . G3 . . . G2 . . . C3 . . . A2 . . . D3 . G2 . C3 . . .`,
      noise: `x - x - x - x - x - x - x - x - x - x - x - x - x - x - x x x x`,
    },
  },
  clear: {
    tempo: 400, loop: false,
    tracks: {
      p1: `C4 . E4 . G4 . C5 . . . G4 . C5 . . . . . . .`,
      wave: `C2 . . . G2 . . . C2 . . . C3 . . . . . . . . .`,
    },
  },
  gameover: {
    tempo: 240, loop: false,
    tracks: {
      p1: `E4 . . . C4 . . . A3 . . . . . A3 . B3 . . . . . . . A3 . . . . . . . . .`,
      wave: `A1 . . . . . . . E1 . . . . . . . E1 . . . . . . . A1 . . . . . . . . .`,
    },
  },
  victory: {
    tempo: 360, loop: false,
    tracks: {
      p1: `G4 . G4 . G4 . E4 . A4 . A4 . G4 . . . C5 . C5 . B4 . A4 . G4 . E4 . C4 . . . . .`,
      wave: `C2 . . . C2 . . . F2 . . . C2 . . . A2 . . . F2 . . . G2 . G1 . C2 . . . . . . .`,
    },
  },
};

export const THEME_MUSIC = {
  jungle: 'jungle', snow: 'snow', ship: 'snow', temple: 'temple', reef: 'water',
  mountain: 'mountain', sky: 'sky', city: 'city',
};
