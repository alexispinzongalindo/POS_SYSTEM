This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Video Generation

This project includes automated video generation for creating tour and training videos with AI-powered voiceover narration and subtitles.

### Features
- 🎥 Automated tour video generation from source footage or slides
- 🗣️ AI voiceover using ElevenLabs text-to-speech
- 📝 Automatic subtitle generation (.srt files)
- 🌐 Multi-language support (English and Spanish)
- 🔄 GitHub Actions workflow for easy automation

### Quick Start

1. **Configure Secrets** in your GitHub repository:
   - `ELEVENLABS_API_KEY` - Your ElevenLabs API key (required)
   - `VIDEO_SOURCE_URL` - Direct download link to source video (optional)

2. **Run the Workflow** manually from GitHub Actions:
   - Go to Actions → Video Generation
   - Click "Run workflow"
   - Optionally enable "dry run" to validate scripts first

3. **Download Results** from workflow artifacts:
   - `tour_en.mp4` / `tour_es.mp4` - Generated videos
   - `tour_en.srt` / `tour_es.srt` - Subtitle files

### Documentation

- **[Runbook](docs/runbook_video_generation.md)** - Step-by-step guide for non-technical users
- **[Slides Guide](docs/video_slides.md)** - How to prepare and organize slide images
- **[Scripts](scripts/video/)** - Tour and training narration scripts

### Local Development

Run video generation locally (requires ffmpeg):

```bash
# Dry-run validation
node scripts/video/generate_videos.mjs --dry-run

# Generate English tour video
node scripts/video/generate_videos.mjs --lang en --out ./out/tour_en.mp4

# Generate Spanish tour video  
node scripts/video/generate_videos.mjs --lang es --out ./out/tour_es.mp4
```

For detailed instructions, see the [runbook](docs/runbook_video_generation.md).
