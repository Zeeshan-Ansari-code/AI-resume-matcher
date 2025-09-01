# AI Resume Matcher - Setup Guide

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file in the root directory with your API keys:
```env
# Hugging Face API Key for semantic similarity scoring
HF_API_KEY=your_huggingface_api_key_here

# Google Gemini API Key for AI analysis and suggestions
GEMINI_API_KEY=your_gemini_api_key_here
```

## Getting API Keys

### Hugging Face API Key
1. Go to [Hugging Face](https://huggingface.co/settings/tokens)
2. Sign up/Login
3. Create a new token
4. Copy the token to your `.env.local` file

### Google Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key to your `.env.local` file

## Running the Project

1. Start the development server:
```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

## Features

- **File Upload**: Support for PDF, DOC, DOCX, and TXT files
- **Drag & Drop**: Easy file upload interface
- **Text Extraction**: Automatic text extraction from various file formats
- **AI Analysis**: Powered by Google Gemini for detailed suggestions
- **Semantic Matching**: Uses Hugging Face models for similarity scoring
- **Comprehensive Feedback**: Detailed analysis, suggestions, and action items

## File Size Limits

- Maximum file size: 10MB
- Supported formats: PDF, DOC, DOCX, TXT

## Troubleshooting

- **API Errors**: Check your API keys in `.env.local`
- **File Upload Issues**: Ensure files are not password-protected
- **Text Extraction Failures**: Some PDFs may have embedded images or complex formatting

## API Endpoints

- `POST /api/extract-text` - Extract text from uploaded files
- `POST /api/match` - Analyze resume against job description
