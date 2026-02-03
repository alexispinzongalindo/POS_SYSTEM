# Video Generation Runbook

This runbook provides step-by-step instructions for generating promotional and training videos for IslaPOS using automated workflows.

## Overview

The video generation system creates professional videos by combining:
- Slide images (static screenshots or designs)
- AI-generated voiceover (using ElevenLabs Text-to-Speech)
- Subtitles (.srt files)

Videos are generated in both English and Spanish for tour and training content.

## Prerequisites

Before running the video generation workflow, you'll need:

1. **GitHub Repository Access**: Admin or maintainer permissions
2. **ElevenLabs API Key**: For text-to-speech generation
3. **Slide Images**: Prepared slides in `public/slides/` directories
4. **Script Files**: Text scripts in `scripts/video/` (already included)

## Step 1: Add Required Secrets

Secrets are securely stored credentials that the workflow needs to function.

### Adding the ElevenLabs API Key (Required)

1. Go to your GitHub repository
2. Click **Settings** (top menu bar)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Fill in the details:
   - **Name**: `ELEVENLABS_API_KEY`
   - **Value**: Your ElevenLabs API key (starts with "sk_...")
6. Click **Add secret**

### Adding Optional Secrets

#### VIDEO_SOURCE_URL (Optional)
If you have a video hosted elsewhere that you want to download:
- **Name**: `VIDEO_SOURCE_URL`
- **Value**: Full URL to the video file (can include authentication tokens)

#### Other Optional Secrets
- `SUPABASE_URL`: If your workflow needs database access
- `SUPABASE_ANON_KEY`: Supabase authentication key
- `RENDER_API_KEY`: If you want to trigger deployment after video generation

## Step 2: Prepare Slides

Ensure slide images are ready in the correct directories:

```
public/slides/tour/        # Tour video slides
public/slides/training/    # Training video slides
```

**Slide Requirements:**
- Resolution: 1920x1080 (Full HD)
- Format: PNG or JPG
- Naming: `slide_001.png`, `slide_002.png`, etc.
- Recommended: 8-10 slides per video

See [Video Slides Guide](./video_slides.md) for detailed instructions on creating slides.

## Step 3: Review Script Files

Script files contain the text that will be converted to speech:

- `scripts/video/script_tour_en.txt` - English tour script
- `scripts/video/script_tour_es.txt` - Spanish tour script
- `scripts/video/script_training_en.txt` - English training script
- `scripts/video/script_training_es.txt` - Spanish training script

**Review these files** before running the workflow. You can edit them to customize the narration.

## Step 4: Run the Workflow Manually

### From GitHub Web Interface

1. Go to your repository on GitHub
2. Click the **Actions** tab (top menu)
3. In the left sidebar, find **Video Generation** workflow
4. Click the **Run workflow** button (right side)
5. Select options:
   - **Branch**: Choose your branch (usually `main` or `copilot/featurevideo-automation`)
   - **Video type**: Choose `all`, `tour`, or `training`
6. Click **Run workflow** (green button)

### Monitoring Progress

1. The workflow will appear in the list with a yellow dot (in progress)
2. Click on the workflow run to see detailed logs
3. Watch the steps execute:
   - ✅ Checkout code
   - ✅ Setup Node.js
   - ✅ Install dependencies
   - ✅ Install ffmpeg
   - ✅ Generate TTS audio
   - ✅ Create videos
   - ✅ Upload artifacts
4. When complete, the dot turns green (success) or red (failed)

### If the Workflow Fails

Common issues and solutions:

**Error: ELEVENLABS_API_KEY not found**
- Solution: Add the secret (see Step 1)

**Error: No slides found**
- Solution: Add slide images to `public/slides/tour/` and `public/slides/training/`

**Error: ffmpeg not found**
- Solution: This shouldn't happen on GitHub Actions. Check the workflow logs.

**Error: ElevenLabs API error (401)**
- Solution: Your API key is invalid or expired. Generate a new one.

**Error: ElevenLabs API error (429)**
- Solution: Rate limit exceeded. Wait a few minutes and try again.

## Step 5: Download Generated Videos

Once the workflow completes successfully:

1. Scroll to the bottom of the workflow run page
2. Find the **Artifacts** section
3. Click **generated-videos** to download a ZIP file
4. Extract the ZIP file to access:
   - `out/videos/tour_en.mp4` - English tour video
   - `out/videos/tour_es.mp4` - Spanish tour video
   - `out/videos/training_en.mp4` - English training video
   - `out/videos/training_es.mp4` - Spanish training video
   - `out/videos/*.srt` - Subtitle files
   - `out/audio/*.mp3` - Generated audio files

**Note**: Artifacts are stored for 30 days by default.

## Step 6: Review Generated Videos

1. Download and extract the artifact ZIP
2. Review each video for quality:
   - Audio clarity and timing
   - Slide transitions
   - Subtitle accuracy
   - Overall presentation
3. If changes are needed:
   - Update script files or slides
   - Re-run the workflow

## Step 7: Use or Publish Videos

Once satisfied with the videos:

- Upload to YouTube, Vimeo, or your website
- Embed in documentation or training materials
- Share with team members
- Include in marketing materials

## Alternative: Generate TTS Locally

If you prefer to generate audio files locally before running the full workflow:

### Install Node.js Dependencies

```bash
npm install
```

### Set Environment Variable

```bash
export ELEVENLABS_API_KEY="your_api_key_here"
```

### Run TTS Generation

```bash
node scripts/video/generate_tts.mjs
```

This will create MP3 files in `out/audio/` directory.

### Test Video Generation

```bash
# Dry run (test configuration)
node scripts/video/generate_videos.mjs --dry-run

# Generate all videos
node scripts/video/generate_videos.mjs --type=all

# Generate only tour videos
node scripts/video/generate_videos.mjs --type=tour

# Generate only training videos
node scripts/video/generate_videos.mjs --type=training
```

## Troubleshooting

### ElevenLabs API Issues

**Problem**: Character limit exceeded
- **Solution**: ElevenLabs has monthly character limits. Split longer scripts or upgrade your plan.

**Problem**: Voice ID not found
- **Solution**: Check that the voice IDs in `generate_tts.mjs` are valid. You can find available voices in your ElevenLabs dashboard.

### Video Quality Issues

**Problem**: Video looks pixelated
- **Solution**: Ensure slide images are exactly 1920x1080 resolution.

**Problem**: Audio and video out of sync
- **Solution**: The system calculates timing automatically. Ensure you have the correct number of slides for your script length.

**Problem**: Subtitles appear too fast/slow
- **Solution**: The system splits subtitle timing evenly. For better control, you can manually edit the .srt files.

### Workflow Issues

**Problem**: Workflow stuck in pending
- **Solution**: GitHub Actions may have a queue. Wait a few minutes or check GitHub status page.

**Problem**: Workflow fails on push but not manual run
- **Solution**: Check that your branch name matches the workflow trigger configuration.

## Getting Help

If you encounter issues not covered in this runbook:

1. Check the [Video Slides Guide](./video_slides.md)
2. Review workflow logs in GitHub Actions
3. Check ElevenLabs API status and documentation
4. Open an issue in the repository with:
   - Workflow run URL
   - Error messages from logs
   - Steps you've already tried

## Updating This Runbook

This runbook is a living document. If you:
- Discover new issues and solutions
- Find better workflows
- Add new features

Please update this file and commit the changes.

## See Also

- [Video Slides Guide](./video_slides.md) - How to create slides
- [Slide Template](../scripts/video/slides_template.txt) - Slide-by-slide outline
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [ElevenLabs API Documentation](https://docs.elevenlabs.io/)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
