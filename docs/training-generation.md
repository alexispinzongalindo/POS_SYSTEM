# Training Asset Generation

This flow generates the full **Training** slideshow and videos in English and Spanish.

## Quick start (saved workflow)

1) One-time setup:

```bash
cp .env.training.example .env.training.local
```

Edit `.env.training.local` with real credentials/keys.

2) Run everything with one command:

```bash
npm run training:full
```

Optional shortcuts:

```bash
npm run training:full:en
npm run training:full:es
npm run training:capture:all
npm run training:build:all
```

## 1) Required environment variables

Set these for capture from a live app session:

```bash
export RECORD_BASE_URL="https://pos-system-wiy1.onrender.com"
export RECORD_EMAIL="<admin-email>"
export RECORD_PASSWORD="<admin-password>"
```

Set this for ElevenLabs audio generation:

```bash
export ELEVENLABS_API_KEY="<your-elevenlabs-key>"
```

Optional:

```bash
export RECORD_HEADLESS="true"
export RECORD_BROWSER="chromium"
export TRAINING_TOTAL_SECONDS="180"
export TRAINING_SPEECH_RATE="0.90"
```

## 2) Capture Training slides

```bash
npm run capture:training:slides:en
npm run capture:training:slides:es
```

Generated files:

- `public/islapos-training/en/*.png`
- `public/islapos-training/en/slides.json`
- `public/islapos-training/es/*.png`
- `public/islapos-training/es/slides.json`

## 3) Build Training voice + videos

```bash
npm run build:training:en
npm run build:training:es
```

To slow down narration while keeping sync exact:

```bash
TRAINING_SPEECH_RATE=0.90 npm run build:training:en
TRAINING_SPEECH_RATE=0.90 npm run build:training:es
```

Generated files:

- `public/videos/islapos-training-en.mp4`
- `public/videos/islapos-training-en.mp3`
- `public/videos/islapos-training-es.mp4`
- `public/videos/islapos-training-es.mp3`

## 4) Update scripts (if needed)

Narration script files:

- `scripts/video/script_training_en.txt`
- `scripts/video/script_training_es.txt`

Training slideshow player:

- `src/app/admin/training/slides/page.tsx`

Training slide manifests:

- `public/islapos-training/en/slides.json`
- `public/islapos-training/es/slides.json`
