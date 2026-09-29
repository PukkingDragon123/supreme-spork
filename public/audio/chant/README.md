# Chant recordings (เสียงสวดมนต์)

Put real chant audio here and the prayer stages will use it as the guide
voice. The karaoke highlight then follows the recording.

With no files here the game still has a guide: the device's Thai speech
voice, or a hummed syllable voice, over a drone and a wood-block beat.

## 1. Drop the file

    public/audio/chant/<chantId>.mp3      (or .m4a, .ogg, .wav)

- Use one file per chant. Record the whole chant once, from the first line
  to the last, in the same order as the text in `src/game/data/chants.ts`.
- mp3 or m4a (AAC) play on every browser. ogg does not play on older iPhones.
- Mono at 64–128 kbps is plenty. Keep each file under about 10 MB.
- Leave about half a second of quiet before the first line. A clear pause
  between lines helps the automatic timing.

The game finds a file by its name. To skip that lookup (and the 404s it
causes on some hosts), list the file in `manifest.json` and set
`"probe": false`:

```json
{
  "probe": false,
  "chants": {
    "namo": { "file": "namo.mp3", "timing": "namo.json" },
    "itipiso": "itipiso.m4a"
  }
}
```

`node scripts/chant-audio-manifest.mjs` writes this list for you from the
files in this folder.

## 2. Line timing (optional but best)

`<chantId>.json` holds the second at which each line starts, plus when the
chanting ends:

```json
{ "chant": "namo", "lines": [0.8, 8.9, 17.1], "end": 24.2 }
```

- `lines` must have exactly one entry per text line, and each must be larger
  than the one before. A `(กราบ)` marker is part of its line.
- `end` is optional. Without it, the file length is used.
- Optional: `"words": [[0.8, 1.6, 2.4, 4.1, 5.9], null, …]` gives word
  start times for a line. A `null` line is spread by syllables.

You do not have to type this by hand:

- **No timing file:** the game finds the pauses between lines on its own
  (auto-align).
- **Tap tool:** in the game, open เมนู → บทสวด (the chant book), open a chant,
  then tap **ตั้งจังหวะ**. Press play and tap the big button each time a line
  starts, and once more when the chanting ends. **บันทึก** saves the timing
  on the device. **คัดลอก JSON** or **ดาวน์โหลด** gives you the file to put
  here as `<chantId>.json`.

## 3. Players can import their own recording

In the chant book, **นำเข้าเสียงสวด** lets a player pick an audio file from
their phone for any chant. The file is kept on that device in IndexedDB, not
uploaded anywhere. An imported file is used before a bundled one. The same
timing tools work on it.

## Chant ids

| id | chant | lines |
|---|---|---|
| `triple_gem` | บทกราบพระรัตนตรัย (อะระหัง สัมมา…) | 6 |
| `namo` | นะโม ๓ จบ | 3 |
| `refuge` | ไตรสรณคมน์ | 9 |
| `itipiso` | พุทธคุณ (อิติปิโส) | 4 |
| `dhamma` | ธรรมคุณ (สวากขาโต) | 3 |
| `sangha` | สังฆคุณ (สุปะฏิปันโน) | 8 |
| `metta_self` | แผ่เมตตาให้ตนเอง | 3 |
| `metta_all` | แผ่เมตตาให้สรรพสัตว์ | 3 |
| `sila5` | สมาทานศีล ๕ | 5 |
| `ganesha` | คาถาบูชาพระพิฆเนศ | 3 |
| `guanyin` | บทสวดเจ้าแม่กวนอิม | 3 |
| `lakshmi` | คาถาบูชาพระแม่ลักษมี | 3 |
| `jinabanchara` | ชินบัญชร (๔ บทแรก) | 8 |
| `bahum` | พาหุง (บทที่ ๑) | 4 |
| `yatha` | ยะถา (อนุโมทนา) | 5 |

Boss stages use longer sets. A set uses its own file when there is one.
Otherwise it plays its parts' files one after another, but only when every
part has a file with timing (or auto-align works on it). If any part is
missing, the set falls back to the synthesized guide.

| id | set | lines |
|---|---|---|
| `wai_set` | `namo` + `refuge` | 12 |
| `deva_set` | `ganesha` + `guanyin` + `lakshmi` | 9 |
| `itipiso_full` | `itipiso` + `dhamma` + `sangha` | 15 |

## Stage notes

- Some stages sing only part of a chant, for example `wat-1` (the first line
  of `namo`) or `mountain-2` and `mountain-3` (the halves of
  `jinabanchara`). They play just that part of the file, so they need line
  timing. Auto-align or the tap tool provides it.
- Faster stages speed the recording up gently, keeping its pitch: at most
  ×1.3, and never slower than ×0.85.
- Memory stages (ท่องจำ) mute the guide voice on purpose. The beat and the
  timing still come from the recording.
