# PDF to Audio Converter

A lightweight, self-hosted web application that allows you to upload PDF documents, extract their text, and convert that text into high-quality MP3 audio files using the OpenRouter AI API.

This tool is designed to help students, professionals, or anyone who prefers listening to long documents instead of reading them. It utilizes OpenAI's `gpt-4o-audio-preview` via OpenRouter to provide premium Text-to-Speech (TTS) synthesis.

## Features

- **Drag-and-Drop Interface**: Easy-to-use modern upload interface with glassmorphism aesthetics.
- **Smart Text Chunking**: Automatically extracts and splits long PDFs securely across sentence boundaries to respect API limits without cutting off mid-word.
- **Background Processing**: Queues generating chunks without blocking UI interactions.
- **Local Dashboard Library**: Built-in audio player and library to track conversion history and download MP3s locally. 
- **100% Dockerized**: Easily spin up both Frontend and Backend seamlessly on any environment without configuring dependencies locally.

## Architecture & Tech Stack

- **Frontend**: React (Vite) + TailwindCSS
- **Backend**: Python (FastAPI) + SQLite + PyMuPDF
- **Audio Processing**: FFmpeg
- **Containerization**: Docker Compose

## Prerequisites

Before running the app, ensure you have the following installed on your machine:

1. [Docker](https://docs.docker.com/get-docker/)
2. [Docker Compose](https://docs.docker.com/compose/install/)
3. An **OpenRouter API Key**. You can obtain one by signing up at [OpenRouter](https://openrouter.ai/).

## Installation & Deployment

1. **Clone the Repository**
   ```bash
   git clone https://github.com/kennyanju/pdftoaudio.git
   cd pdftoaudio
   ```

2. **Supply your API Key**
   You can supply your OpenRouter API key directly in your terminal when launching Docker, or by using a `.env` file mapping.

   **Method A: Environment Export (Easiest)**
   ```bash
   export OPENROUTER_API_KEY="sk-or-v1-..."
   ```

   **Method B: Using a `.env` configuration**
   Create a `.env` file in the root directory:
   ```bash
   echo "OPENROUTER_API_KEY=sk-or-v1-..." > .env
   ```

3. **Start the Application**
   Use Docker Compose to build and start the containers. This handles installing Python packages and system dependencies (like FFmpeg) safely within the container.
   ```bash
   docker-compose up --build -d
   ```

## Usage Instructions

1. **Access the Web Player**
   Open your browser and navigate to exactly: `http://localhost:3000`

2. **Upload a Document**
   - Click the central upload box or drag-and-drop your `.pdf` file.
   - The application will automatically parse the PDF text and show you a preview snippet for verification.

3. **Start Conversion**
   - Click the **"Convert to Audio"** button.
   - Wait while the backend securely chunks your text, proxies the requests to OpenRouter, and splices the final MP3 using FFmpeg internally. You will see live progressive status updates.

4. **Listen or Download**
   - Once completed, you can use the built-in media player to preview the track immediately right on the dashboard.
   - Click **"Download MP3"** to securely save the final synthesized audio onto your device.

## Troubleshooting

- **Audio File Not Converting:** Make sure you supplied a _valid_ and funded OpenRouter API key before launching the compose file.
- **"Only PDF files are supported" error:** Ensure your target document hasn't been improperly formatted. Scanned PDFs (Images pretending to be PDFs) are currently not decipherable without an external OCR (Optical Character Recognition) pipeline.

## Future Plans

- Support for scanned image documents (OCR integration).
- Custom Voice Selection (Option to choose between standard voices: Alloy, Echo, Fable, Onyx, Nova, Shimmer directly from the UI).
- RSS Feed functionality to create a private podcast feed out of converted PDFs. 
