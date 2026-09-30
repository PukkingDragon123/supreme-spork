// Bot Noi's little robot voice: beeps, boops and a happy chirp.

import { synth } from '../../engine/audio'

export const botSfx = {
  beep() {
    synth.tone(1180, 0.06, 'square', 0.05)
    synth.tone(1560, 0.07, 'square', 0.045, 0.07)
  },
  boop() {
    synth.tone(620, 0.09, 'square', 0.05, 0, undefined, 420)
  },
  chirp() {
    synth.tone(900, 0.07, 'square', 0.045, 0, undefined, 1500)
    synth.tone(1300, 0.08, 'square', 0.045, 0.08, undefined, 1900)
    synth.tone(1900, 0.1, 'triangle', 0.05, 0.17)
  },
  talk() {
    synth.tone(700 + Math.random() * 500, 0.03, 'square', 0.02)
  },
  dizzy() {
    synth.tone(900, 0.5, 'triangle', 0.05, 0, undefined, 300)
  },
  done() {
    synth.tone(988, 0.08, 'square', 0.05)
    synth.tone(1319, 0.08, 'square', 0.05, 0.09)
    synth.tone(1760, 0.16, 'triangle', 0.06, 0.18)
  },
}
