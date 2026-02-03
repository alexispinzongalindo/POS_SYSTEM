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

IslaPOS includes automated video generation for creating promotional tour videos and training materials. The system combines slide images with AI-generated voiceover and subtitles to produce professional videos in multiple languages.

### Features
- Automated slideshow creation from images
- AI text-to-speech using ElevenLabs
- Automatic subtitle generation
- Support for English and Spanish
- Tour and training video templates

### Quick Start

To generate videos using the GitHub Actions workflow:

1. Add required secrets in repository Settings → Secrets → Actions:
   - `ELEVENLABS_API_KEY`: Your ElevenLabs API key for text-to-speech
2. Prepare slide images in `public/slides/tour/` and `public/slides/training/`
3. Go to Actions tab → Video Generation workflow
4. Click "Run workflow" to generate videos
5. Download artifacts when complete

### Documentation

- **[Video Generation Runbook](docs/runbook_video_generation.md)**: Complete step-by-step guide for running the video generation workflow, adding secrets, and troubleshooting issues.
- **[Video Slides Guide](docs/video_slides.md)**: Instructions for creating and organizing slide images, including design guidelines and best practices.

### Local Development

Generate videos locally:

```bash
# Install dependencies
npm install

# Set API key
export ELEVENLABS_API_KEY="your_key_here"

# Generate TTS audio
node scripts/video/generate_tts.mjs

# Generate videos
node scripts/video/generate_videos.mjs --type=all
```

For more details, see the [Video Generation Runbook](docs/runbook_video_generation.md).
