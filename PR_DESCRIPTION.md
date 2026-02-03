# Pull Request: Add Tour Video Automation and Helper Scripts

## 📋 Summary

This PR adds automated tour video generation with AI-powered voiceover (ElevenLabs), synchronized subtitles, and helper scripts. Training video generation is deferred and included only as placeholders for future development.

## 🎯 What This Adds

### GitHub Actions Workflow
- **File**: `.github/workflows/video-generation.yml`
- **Trigger**: Manual (`workflow_dispatch`) only - never runs automatically
- **Features**:
  - Dry-run validation mode
  - Optional video URL input (overrides secret)
  - Automated video generation for English and Spanish
  - Artifact upload for generated videos and subtitles

### Video Generation Scripts
Located in `scripts/video/`:

1. **generate_videos.mjs** - Main orchestrator
   - Processes source videos or generates slide-based videos
   - Detects and removes black frames and error segments
   - Combines slides with AI narration
   - Generates synchronized SRT subtitle files

2. **generate_tts.mjs** - ElevenLabs TTS client
   - Generates AI voiceover from text scripts
   - Supports retry logic and timeout handling
   - Configurable TTS provider (elevenlabs, none)

3. **utils.mjs** - Helper utilities
   - Shell command execution
   - File operations
   - Black frame detection
   - Error frame detection (basic heuristic)
   - Neutral slide generation
   - SRT subtitle creation

4. **script_tour_en.txt** / **script_tour_es.txt** - Tour narration scripts
   - Pre-approved tour scripts in English and Spanish
   - Ready for voiceover generation

5. **script_training_en.txt** / **script_training_es.txt** - Training placeholders
   - Placeholder files for future training video development

6. **slides_template.txt** - Slide specifications
   - Template describing 15 slides for the tour video
   - Includes suggested content and timing

### Documentation
Located in `docs/`:

1. **runbook_video_generation.md** - Non-technical runbook
   - Step-by-step guide for running the workflow
   - Secret configuration instructions
   - Troubleshooting guide
   - Safety and security best practices

2. **video_slides.md** - Slide preparation guide
   - Technical specifications (1920x1080, 16:9)
   - Naming conventions
   - Quality guidelines
   - Integration with workflow

### Updated Files
- **README.md** - Added "Video Generation" section with quick start guide
- **.gitignore** - Added exclusions for `workspace/` and `out/videos/`

## 🔐 Required Secrets

Before running the workflow, add these secrets to your GitHub repository:

### How to Add Secrets
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add each secret below

### Secret 1: ELEVENLABS_API_KEY (Required)
- **Name**: `ELEVENLABS_API_KEY`
- **Value**: Your ElevenLabs API key
- **Purpose**: Generates AI voiceover narration
- **How to get it**:
  1. Sign up at https://elevenlabs.io/
  2. Go to your profile settings
  3. Copy your API key

### Secret 2: VIDEO_SOURCE_URL (Optional)
- **Name**: `VIDEO_SOURCE_URL`
- **Value**: Direct download link to your source MP4
- **Purpose**: Provides source video for frame extraction
- **Example**: `https://www.dropbox.com/scl/fi/[id]/video.mp4?rlkey=[key]&dl=1`
- **Note**: Ensure Dropbox links end with `?dl=1` for direct download
- **Alternative**: You can provide the URL as input when running the workflow

## 🚀 How to Run the Workflow

### Step 1: Navigate to Actions
1. Go to the **Actions** tab in GitHub
2. Select **Video Generation** from the left sidebar

### Step 2: Run Workflow
1. Click **Run workflow** button
2. Configure inputs:
   - **Branch**: Select `feature/video-automation` (or merged branch)
   - **Dry run**: Check this to validate scripts without generating videos
   - **Video URL**: Optionally provide a direct video URL (overrides `VIDEO_SOURCE_URL` secret)
3. Click **Run workflow**

### Step 3: Monitor Progress
- Watch the workflow execution in real-time
- Three jobs run: `setup`, `lint-check`, `generate-tour`
- Check logs for any errors or warnings

### Step 4: Download Results
Once complete:
1. Scroll to bottom of workflow run page
2. Under **Artifacts**, download:
   - **tour-videos**: Contains MP4 and SRT files
   - **video-scripts**: Contains the scripts used
3. Extract ZIP files to access your videos

## 📦 Generated Outputs

After a successful run, you'll get:

- `tour_en.mp4` - English tour video (1920x1080, 30fps)
- `tour_en.srt` - English subtitles
- `tour_es.mp4` - Spanish tour video (1920x1080, 30fps)
- `tour_es.srt` - Spanish subtitles

## 🧪 Testing Performed

### Dry-Run Validation
```bash
✓ Node version: v20.20.0
✓ ffmpeg is installed
✓ Found: script_tour_en.txt
✓ Found: script_tour_es.txt
✓ Found: utils.mjs
✓ Found: generate_tts.mjs
✓ All dry-run checks passed
```

### Script Validation
- All tour scripts reviewed and approved
- Placeholder training scripts created for future use
- File structure validated

## 🔒 Security Considerations

### ✅ Security Features
- No API keys hardcoded in workflow or scripts
- All secrets handled via GitHub Secrets
- Video URLs never logged or exposed
- Curl uses `--silent` and `--show-error` flags
- TTS provider configurable via environment variable

### ⚠️ Important Security Notes
1. **Never** commit API keys to the repository
2. **Never** hardcode secrets in workflow files
3. **Always** use GitHub Secrets for sensitive data
4. Review generated videos before publishing
5. Rotate API keys regularly

## 📝 Files Changed

### New Files (13 total)
```
.github/workflows/video-generation.yml
docs/runbook_video_generation.md
docs/video_slides.md
scripts/video/generate_tts.mjs
scripts/video/generate_videos.mjs
scripts/video/script_tour_en.txt
scripts/video/script_tour_es.txt
scripts/video/script_training_en.txt
scripts/video/script_training_es.txt
scripts/video/slides_template.txt
scripts/video/utils.mjs
```

### Modified Files (2 total)
```
README.md (added Video Generation section)
.gitignore (added workspace/ and out/videos/)
```

## 🎬 Next Steps After Merge

1. **Add Secrets**: Configure `ELEVENLABS_API_KEY` and optionally `VIDEO_SOURCE_URL`
2. **Test Workflow**: Run with dry-run enabled first
3. **Generate Videos**: Run full workflow to create tour videos
4. **Download Artifacts**: Get generated MP4 and SRT files
5. **Review Output**: Verify video quality and narration
6. **Deploy**: Upload videos to your hosting platform

## 🔮 Future Enhancements

Deferred for later implementation:
- Training video generation (scripts are placeholders)
- Multiple TTS provider support (Google Cloud, AWS Polly)
- Custom voice selection
- Automated thumbnail generation
- Direct YouTube/Vimeo upload
- Quality presets (720p, 4K)

## 📚 Documentation

For detailed instructions, see:
- [Runbook](docs/runbook_video_generation.md) - Complete user guide
- [Slides Guide](docs/video_slides.md) - Slide preparation instructions
- [README](README.md) - Quick start and overview

## ⚠️ Do Not Merge Yet

**Please review carefully before merging:**
- Verify all secrets are properly configured
- Test the workflow with dry-run first
- Review generated videos for quality
- Ensure no sensitive data is exposed in logs

---

**Branch**: `feature/video-automation`
**PR Title**: Add tour video automation and helper scripts
**Reviewers**: Repository owner
**Labels**: enhancement, documentation

