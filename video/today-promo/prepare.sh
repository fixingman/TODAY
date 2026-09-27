#!/bin/sh
# TODAY promo — stage assets/ from the raw captures (gitignored, reproducible).
# Run after `npm run capture && npm run audio` in video/.
#   sh prepare.sh
# Each clip is trimmed to its action, cropped to the app's 720px column,
# and speed-baked where the storyboard needs it.
set -e
cd "$(dirname "$0")"
CAP=../captures/desktop
mkdir -p assets/fonts assets/audio

# name  source  in  out  speed  crop(w:h:x:y)
# Captures are 1440×900; the column crop (720×900) shows ~1:1 in the 680px window.
clip() {
  ffmpeg -y -loglevel error -ss "$3" -to "$4" -i "$CAP/$2.mp4" \
    -vf "crop=$6,scale=720:900:flags=lanczos,setpts=PTS/$5,fps=30" \
    -an -c:v libx264 -pix_fmt yuv420p -crf 14 -movflags +faststart "assets/$1.mp4"
  echo "  ✓ $1.mp4"
}
COL=720:900:360:0
clip add       add-tasks     1.8  7.3  1.5 $COL
clip complete  complete      1.25 5.38 1   $COL
clip focus     focus         0.95 3.15 1   $COL
clip poem      poem          5.5  7.6  1   720:900:40:0
clip idle      idle          5.0  7.5  1   240:300:1200:600
clip triage    triage        2.3  8.8  1   $COL
clip reward    empty-evening 0.9  6.0  1   $COL
# Held last frames (Frames 5 and 6 hold after their clips end).
for c in triage reward; do
  ffmpeg -y -loglevel error -sseof -0.05 -i assets/$c.mp4 -frames:v 1 -update 1 assets/$c-hold.jpg
done

cp "../../fonts/syne/syne-v24-latin_latin-ext-700.woff2" assets/fonts/syne-700.woff2
cp "../../fonts/syne/syne-v24-latin_latin-ext-800.woff2" assets/fonts/syne-800.woff2
cp "../../fonts/DM Mono/dm-mono-v16-latin-regular.woff2" assets/fonts/dm-mono-400.woff2
cp "../../fonts/DM Mono/dm-mono-v16-latin-500.woff2"     assets/fonts/dm-mono-500.woff2
cp ../audio/*.wav assets/audio/
echo "  ✓ fonts, audio"

# Stills for storyboard.html (the sketch sheet) — key moments, cropped to the column.
mkdir -p .sketch
for s in add-tasks:9 complete:5.5 focus:6 idle:9 triage:5.2 empty-evening:8.5; do
  n=${s%%:*}; t=${s#*:}
  ffmpeg -y -loglevel error -ss "$t" -i "$CAP/$n.mp4" -frames:v 1 -vf "crop=720:900:360:0,scale=576:-1" -q:v 3 ".sketch/$n.jpg"
done
ffmpeg -y -loglevel error -ss 9 -i "$CAP/poem.mp4" -frames:v 1 -vf "crop=720:900:20:0,scale=576:-1" -q:v 3 .sketch/poem.jpg
echo "  ✓ .sketch/ stills"
