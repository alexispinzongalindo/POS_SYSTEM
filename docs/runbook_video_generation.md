# Video Generation Runbook

A non-technical guide to generating tour videos for IslaPOS using GitHub Actions.

## Overview

This system automatically generates professional tour videos with:
- AI-powered voiceover narration (ElevenLabs)
- Synchronized subtitles (.srt files)
- Support for English and Spanish
- Automated frame extraction from source videos

## Prerequisites

Before running the workflow, you need to configure two secrets in your GitHub repository.

### Required Secrets

#### 1. ELEVENLABS_API_KEY (Required)
This is your ElevenLabs API key for generating AI voiceovers.

**How to get it:**
1. Sign up at [ElevenLabs](https://elevenlabs.io/)
2. Go to your profile settings
3. Copy your API key

**How to add it to GitHub:**
1. Go to your repository on GitHub
2. Click **Settings** (top menu)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Name: `ELEVENLABS_API_KEY`
6. Value: Paste your ElevenLabs API key
7. Click **Add secret**

#### 2. VIDEO_SOURCE_URL (Optional)
A direct download link to your source MP4 video (e.g., from Dropbox).

**For Dropbox links:**
- Make sure the link ends with `?dl=1` for direct download
- Example: `https://www.dropbox.com/scl/fi/[your-file-id]/video.mp4?rlkey=[key]&dl=1`

**How to add it to GitHub:**
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `VIDEO_SOURCE_URL`
4. Value: Paste your direct download link
5. Click **Add secret**

**Note:** You can skip this secret and instead provide the URL when manually triggering the workflow.

## Running the Workflow

### Step 1: Navigate to Actions
1. Go to your repository on GitHub
2. Click the **Actions** tab

### Step 2: Select the Workflow
1. In the left sidebar, click **Video Generation**

### Step 3: Start the Workflow
1. Click **Run workflow** (button on the right)
2. You'll see options:
   - **Branch**: Usually `main` or your working branch
   - **Dry run**: Check this box to validate scripts without generating videos
   - **Video URL**: Optionally paste a direct video URL (overrides the `VIDEO_SOURCE_URL` secret)

### Step 4: Monitor Progress
1. Click on the running workflow to see live logs
2. The workflow has three jobs:
   - **setup**: Installs tools (Node.js, ffmpeg)
   - **lint-check**: Validates scripts
   - **generate-tour**: Creates the videos (skipped if dry-run is enabled)

### Step 5: Download Results
Once the workflow completes successfully:

1. Scroll to the bottom of the workflow run page
2. Under **Artifacts**, you'll see:
   - **tour-videos**: Contains the generated MP4 and SRT files
   - **video-scripts**: Contains the scripts used
3. Click on an artifact to download it
4. Extract the ZIP file to access your videos

## Generated Files

After a successful run, you'll get:

- `tour_en.mp4` - English tour video
- `tour_en.srt` - English subtitles
- `tour_es.mp4` - Spanish tour video
- `tour_es.srt` - Spanish subtitles

## Using the Videos

### Uploading to Your Site
1. Download the artifacts
2. Upload the MP4 files to your hosting (e.g., Netlify, Vercel)
3. Update your site to link to the new videos

### Adding Subtitles
Most video players support SRT subtitle files:
- In HTML5 video: Use the `<track>` element
- On YouTube: Upload the SRT file when uploading the video
- On Vimeo: Use the captions upload feature

## Changing TTS Provider

Currently, the system uses ElevenLabs for text-to-speech. To use a different provider in the future:

### Switching to None (Silent Audio)
If you want to skip TTS and add voiceover manually later:

1. Go to the workflow file: `.github/workflows/video-generation.yml`
2. Find the `env` section in the `generate-tour` job
3. Change `TTS_PROVIDER: elevenlabs` to `TTS_PROVIDER: none`
4. Commit and push the change

### Customizing Voice Selection
By default, the system uses the same multilingual voice (Rachel) for both languages. To use different voices:

1. Go to ElevenLabs and select voices for each language
2. Copy the voice IDs
3. Add optional secrets in GitHub:
   - `ELEVENLABS_VOICE_ID_EN` - Voice ID for English
   - `ELEVENLABS_VOICE_ID_ES` - Voice ID for Spanish
4. The system will use these instead of the default

### Adding Google Cloud TTS or AWS Polly
These providers are planned for future versions. When implemented:

1. Add the provider's API key as a new secret (e.g., `GOOGLE_TTS_API_KEY`)
2. Update the workflow file to pass the secret
3. Set `TTS_PROVIDER` to `google` or `aws`

## Triggering a Render Deploy (Optional)

If you host your application on Render and want to deploy after generating videos:

### Manual Deploy
1. Log in to Render.com
2. Go to your service dashboard
3. Click **Manual Deploy** → **Deploy latest commit**

### Automatic Deploy
Render can auto-deploy when you push to your main branch:
1. Ensure your Render service is connected to GitHub
2. After downloading and adding videos to your repo, commit and push
3. Render will automatically deploy the changes

## Troubleshooting

### Error: "ELEVENLABS_API_KEY environment variable is required"
- **Cause**: The API key secret is not set
- **Solution**: Add `ELEVENLABS_API_KEY` as described above

### Error: "Failed to download source video"
- **Cause**: Invalid or inaccessible video URL
- **Solution**: Check that the URL is a direct download link (ends with `?dl=1` for Dropbox)

### Error: "Script not found"
- **Cause**: Missing tour script files
- **Solution**: Ensure `scripts/video/script_tour_en.txt` and `script_tour_es.txt` exist in the repository

### Workflow doesn't start
- **Cause**: The workflow file may not be on the correct branch
- **Solution**: Ensure the workflow file is merged to the branch you're running from

### Videos are too long/short
- **Cause**: TTS narration length doesn't match expectations
- **Solution**: Edit the script files in `scripts/video/` to adjust narration length

## Best Practices

1. **Test with Dry-Run First**: Always run with the dry-run option enabled before generating videos
2. **Use High-Quality Source Videos**: Provide 1080p source videos for best results
3. **Review Scripts**: Edit the tour scripts before generating to ensure accuracy
4. **Version Control**: Keep generated videos in a separate storage location (not in the repo)
5. **Security**: Never commit API keys to the repository

## Safety Notes

⚠️ **Important Security Rules:**

- **Never** commit API keys directly to your code
- **Never** hardcode secrets in workflow files
- **Always** use GitHub Secrets for sensitive data
- **Never** share your ElevenLabs API key publicly
- Review generated videos before publishing them

## Getting Help

If you encounter issues:

1. Check the workflow logs in the Actions tab
2. Review the error messages carefully
3. Verify all secrets are configured correctly
4. Ensure ffmpeg and Node.js versions are compatible

For technical documentation:
- See `docs/video_slides.md` for slide preparation
- See workflow file at `.github/workflows/video-generation.yml`

## Future Enhancements

Planned features:
- Training video generation (currently placeholder only)
- Multiple TTS provider support (Google, AWS)
- Custom voice selection
- Automated YouTube upload
- Video quality presets (720p, 1080p, 4K)
- Thumbnail generation

---

**Last Updated**: 2026-02-03
**Maintained By**: IslaPOS Development Team
