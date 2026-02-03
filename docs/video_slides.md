# Video Slides Guide

This document explains how to create and organize slides for IslaPOS video generation.

## Overview

The video generation system creates slideshow videos with AI voiceover and subtitles. Slides are static images (PNG or JPG) that are combined with audio narration and captions.

## Slide Organization

Slides are organized into two main categories:

- **Tour Videos**: Product demonstrations and feature highlights
- **Training Videos**: Step-by-step instructions for using the system

### Directory Structure

```
public/slides/
├── tour/           # Tour video slides
│   ├── slide_001.png
│   ├── slide_002.png
│   └── ...
└── training/       # Training video slides
    ├── slide_001.png
    ├── slide_002.png
    └── ...
```

## Creating Slides

### Option 1: Extract from Existing Video

If you have existing demo videos, you can extract frames to use as slides:

1. Use the provided scripts to extract frames from videos in `public/videos/`:

```bash
# Extract frames from existing video
ffmpeg -i public/videos/islapos-en.mp4 \
  -vf "fps=1/5,scale=1920:1080" \
  public/slides/extracted/frame_%04d.png
```

2. Review extracted frames and select the best ones
3. Rename selected frames to match the naming convention (slide_001.png, etc.)
4. Move to appropriate directory (tour/ or training/)

### Option 2: Create Custom Slides

You can create slides using:

- **PowerPoint/Keynote**: Export as images (1920x1080)
- **Canva**: Design slides and download as PNG
- **Figma**: Design slides and export at correct resolution
- **Screenshots**: Capture application screens at full resolution

### Slide Requirements

- **Resolution**: 1920x1080 pixels (16:9 aspect ratio)
- **Format**: PNG (preferred) or JPG
- **File naming**: Use sequential numbering: `slide_001.png`, `slide_002.png`, etc.
- **Content**: Clear, readable text with good contrast
- **Branding**: Include IslaPOS logo and brand colors

## Slide Content Guidelines

### Tour Video Slides (Recommended: 8-10 slides)

1. **Welcome/Intro** - Product name, tagline, logo
2. **Menu Interface** - Main navigation and categories
3. **Order Creation** - Adding items to cart
4. **Order Management** - Reviewing and modifying orders
5. **Payment Processing** - Checkout options
6. **Reporting** - Analytics and insights
7. **Key Features** - Offline mode, multi-device
8. **Call to Action** - Thank you, get started

### Training Video Slides (Recommended: 8-10 slides)

1. **Training Introduction** - Welcome to training
2. **Getting Started** - Initial screen overview
3. **Creating Orders** - Step-by-step process
4. **Modifying Orders** - Edit quantities and items
5. **Multiple Orders** - Managing tables/queues
6. **Payment Processing** - Complete transactions
7. **Reports** - End-of-shift procedures
8. **Help Resources** - Where to get support
9. **Practice Tips** - Hands-on learning
10. **Completion** - Training complete message

## Design Best Practices

### Visual Design
- Use consistent fonts and colors
- Maintain brand identity throughout
- Keep layouts simple and uncluttered
- Use high-contrast colors for readability

### Content
- Limit text to 2-3 points per slide
- Use large, readable fonts (minimum 40pt)
- Include visual indicators (arrows, highlights)
- Show actual application screenshots when possible

### Timing
- Each slide appears for approximately 5 seconds
- Total video length is typically 30-60 seconds
- Sync slide count with audio script length

## Using Extracted Frames

The `public/videos/` directory contains existing demo videos. To extract useful frames:

```bash
# Extract one frame every 2 seconds
ffmpeg -i public/videos/islapos-en.mp4 \
  -vf "fps=1/2,scale=1920:1080" \
  out/extracted/frame_%04d.png

# Extract specific frames at timestamps
ffmpeg -i public/videos/islapos-en.mp4 \
  -ss 00:00:05 -frames:v 1 public/slides/tour/slide_001.png
ffmpeg -i public/videos/islapos-en.mp4 \
  -ss 00:00:10 -frames:v 1 public/slides/tour/slide_002.png
```

Review extracted frames and select the cleanest, most representative images.

## Quality Checklist

Before finalizing slides:

- [ ] All slides are 1920x1080 resolution
- [ ] Files are named sequentially (slide_001.png, etc.)
- [ ] Text is readable and has good contrast
- [ ] Brand colors and logos are consistent
- [ ] Screenshots show the actual application
- [ ] Number of slides matches audio script length
- [ ] Slides are placed in correct directory (tour/ or training/)

## Multilingual Considerations

Currently, the same slides are used for both English and Spanish videos, as visual content is language-neutral. If you need language-specific text on slides:

1. Create separate directories: `tour/en/` and `tour/es/`
2. Update the video generation script to use language-specific paths
3. Ensure translated text fits within slide layouts

## Updating Slides

To update slides after initial creation:

1. Edit or replace slide images in the appropriate directory
2. Maintain the same file naming convention
3. Re-run the video generation workflow
4. Review generated videos to ensure quality

## See Also

- [Slide Template](../scripts/video/slides_template.txt) - Detailed slide-by-slide outline
- [Video Generation Runbook](./runbook_video_generation.md) - How to run the automation
- [GitHub Actions Workflow](../.github/workflows/video-generation.yml) - Automation configuration
