#!/bin/sh
# TODAY onboarding — stage assets/ from the raw captures (gitignored, reproducible).
# Run after `npm run capture && npm run audio` in video/.
#   sh prepare.sh
set -e
cd "$(dirname "$0")"
CAP=../captures/desktop
mkdir -p assets/fonts assets/audio

# name  source  in  out  crop(w:h:x:y) — captures are 1440×900; the column is 720×900.
clip() {
  ffmpeg -y -loglevel error -ss "$3" -to "$4" -i "$CAP/$2.mp4" \
    -vf "crop=$5,scale=720:900:flags=lanczos,fps=30" \
    -an -c:v libx264 -pix_fmt yuv420p -crf 14 -movflags +faststart "assets/$1.mp4"
  echo "  ✓ $1.mp4"
}
COL=720:900:360:0
clip morning  poem          1.0 8.0   720:900:40:0
clip add      add-tasks     1.4 10.4  $COL
clip order    reorder       0.4 7.4   $COL
clip focus    focus         0.6 9.6   $COL
clip done     complete      0.2 6.53  $COL
clip habits   habits        0.8 8.83  $COL
clip evening  evening       1.2 11.73 $COL
clip zones    zones         0   7.93  $COL
clip noticed  noticed       0.5 5.27  $COL
clip tomorrow empty-evening 0.9 6.0   $COL

# Held last frames for clips shorter than their scene.
for c in done evening zones noticed tomorrow; do
  ffmpeg -y -loglevel error -sseof -0.05 -i assets/$c.mp4 -frames:v 1 -update 1 assets/$c-hold.jpg
done

cp "../../fonts/syne/syne-v24-latin_latin-ext-700.woff2" assets/fonts/syne-700.woff2
cp "../../fonts/syne/syne-v24-latin_latin-ext-800.woff2" assets/fonts/syne-800.woff2
cp "../../fonts/DM Mono/dm-mono-v16-latin-regular.woff2" assets/fonts/dm-mono-400.woff2
cp ../audio/bed-80.wav ../audio/sfx-*.wav assets/audio/
echo "  ✓ fonts, audio"
