# Video Slides Guide

This document explains how to prepare and organize slide images for the automated video generation system.

## Overview

The video generation workflow can work in two modes:
1. **Extract frames from source video**: If a source MP4 is provided, the system extracts keyframes automatically
2. **Use pre-made slides**: Place custom slide images in the correct directory

## Slide Directory Structure

```
public/
  slides/
    tour/
      slide_01.png
      slide_02.png
      ...
      slide_15.png
```

## Slide Specifications

### Technical Requirements
- **Resolution**: 1920x1080 pixels (1080p)
- **Format**: PNG or JPEG
- **Aspect Ratio**: 16:9
- **Color Space**: sRGB

### Naming Convention
- Format: `slide_XX.png` where XX is a zero-padded number (01, 02, 03, etc.)
- Example: `slide_01.png`, `slide_02.png`, `slide_03.png`

## Slide Content Guide

Based on the tour script template (`scripts/video/slides_template.txt`), create slides for the following sections:

### Tour Video Slides (15 slides)

1. **slide_01.png** - Welcome screen with IslaPOS logo
2. **slide_02.png** - Admin Dashboard overview
3. **slide_03.png** - Floor Plan management interface
4. **slide_04.png** - Real-time Orders display
5. **slide_05.png** - Reports and analytics
6. **slide_06.png** - Inventory management
7. **slide_07.png** - Reservations system
8. **slide_08.png** - Staff management and permissions
9. **slide_09.png** - Support resources
10. **slide_10.png** - Training materials
11. **slide_11.png** - POS interface
12. **slide_12.png** - Table management view
13. **slide_13.png** - Kitchen Display System
14. **slide_14.png** - Order History
15. **slide_15.png** - Thank you / closing screen

## Creating Slides

### Option 1: Screenshots
1. Run the application locally
2. Navigate to each section
3. Take high-quality screenshots at 1920x1080
4. Save with correct naming in `public/slides/tour/`

### Option 2: Design Tools
- Use Figma, Canva, or Adobe tools
- Follow the 1920x1080 template
- Export as PNG or JPEG
- Maintain consistent branding

### Option 3: Automated Extraction
- Provide a source MP4 video via the `VIDEO_SOURCE_URL` secret
- The workflow will automatically extract keyframes
- Keyframes are processed to 1920x1080 resolution

## Quality Guidelines

1. **Clarity**: Text should be readable at 1080p
2. **Consistency**: Use the same color scheme and fonts across all slides
3. **Focus**: Each slide should clearly show the relevant feature
4. **Branding**: Include IslaPOS branding where appropriate
5. **Accessibility**: Ensure sufficient contrast for readability

## Workflow Integration

When you run the video generation workflow:

1. If `VIDEO_SOURCE_URL` or `run_with_video_url` is provided:
   - The workflow downloads the MP4
   - Extracts keyframes automatically
   - Processes them to the correct resolution

2. If no source video is provided:
   - The workflow looks for slides in `public/slides/tour/`
   - Falls back to generating neutral placeholder slides with text

## Testing Your Slides

Before running the full workflow:

1. Place your slides in `public/slides/tour/`
2. Run a dry-run: `node scripts/video/generate_videos.mjs --dry-run`
3. Check that all required files are detected

## Troubleshooting

**Issue**: Slides are blurry in the final video
- **Solution**: Ensure source images are exactly 1920x1080 pixels

**Issue**: Slides don't match the narration timing
- **Solution**: The system automatically calculates timing based on audio duration

**Issue**: Missing slides
- **Solution**: Check the naming convention (must be `slide_01.png` not `slide_1.png`)

## Future Enhancements

- Automated slide transition effects
- Overlay animations
- Lower-third captions
- Logo watermarking

For questions or issues, see the runbook at `docs/runbook_video_generation.md`.
