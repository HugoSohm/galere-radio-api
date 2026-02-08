# <img src="https://www.truand2lagalere.fr/images/apple-touch-icon.png" width="40" height="40" style="vertical-align: middle;"> Galere Radio API

API for retrieving information, downloading media (queued), and grabbing cover art from various platforms with metadata support.

## ✨ Features

- 📥 **Local Async Downloads**: Download MP3 and Cover art to the server via the `/download` endpoint.
- ⚡ **Direct Streaming**: Download MP3 directly to your browser via the `/download/stream` endpoint.
- 🔍 **Integrated Search**: Search for tracks directly on YouTube via the `/search` endpoint.
- 🏷️ **Metadata & Tags**: Extraction of high-res cover art and ID3 tags via the `/info` endpoint.
- 🎵 **Playlist Support**: Automatically detect and download entire YouTube playlists.
- 🛡️ **Security**: Protected endpoints with API Key authentication.
- 🐋 **Docker Ready**: Pre-configured setup with Docker Compose.
- 📖 **API Docs**: Interactive documentation via Swagger UI.

## 🌟 Supported Platforms

- 🔴 **YouTube** (via yt-dlp)
- ☁️ **SoundCloud** (via scdl)
- 🟢 **Spotify** (Metadata & Search)
- 🟣 **Deezer** (Metadata & Search)
- 🍎 **Apple Music** (Metadata & Search)

## 🚀 Getting Started

### 🐋 Option 1: Docker (Recommended)

The easiest way to run the API with all its dependencies (including Redis):

1. **Prerequisites**: [Docker & Docker Compose](https://www.docker.com/products/docker-desktop/)
2. **Setup**: Create a `.env` file from `.env.sample`.
3. **Run**: 
   ```bash
   npm run deploy
   ```
4. **Access**: API at `http://localhost:${PORT}` and Docs at `http://localhost:${PORT}/docs`.

---

### 💻 Option 2: Local Development

If you prefer to run the project directly on your machine:

1. **Prerequisites**:
   - Node.js (v20+)
   - Redis (Running on `localhost:6379`)
2. **Setup**:
   ```bash
   npm install
   cp .env.sample .env
   ```
3. **Run**:
   ```bash
   npm run dev
   ```
4. **Access**: API at `http://localhost:${PORT}`.

## ⚙️ Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | The port the server will listen on | `3000` |
| `API_KEY` | Secret key required in `X-API-Key` header | - |
| `REDIS_URL` | URL for the Redis instance | `redis://localhost:6379` |
| `MP3_DOWNLOAD_DIR` | Directory where MP3 files will be stored | `/mp3` |
| `COVER_DOWNLOAD_DIR` | Directory where cover images will be stored | `/cover` |
| `SPOTIFY_CLIENT_ID` | Your Spotify Application Client ID | - |
| `SPOTIFY_CLIENT_SECRET` | Your Spotify Application Client Secret | - |
| `BASE_URL` | (Optional) Custom base URL for file listing (e.g., https://api.example.com) | `http://localhost:${PORT}` |

## 🛡️ Authentication

All routes (except `/health` and `/docs`) require an API Key if `API_KEY` is set in the environment.
Add the following header to your requests:
`X-API-Key: YOUR_API_KEY`

## 🛣️ API Routes

### Interactive Documentation
Static documentation is served at `/docs` (Swagger UI).

### Health Check
- **URL**: `/health`
- **Method**: `GET` (No Auth)

### Search
Search for tracks on YouTube.
- **URL**: `/search`
- **Method**: `POST`
- **Body**: `{ "artist": "Daft Punk", "title": "Get Lucky", "cookies": [...], "limit": 5 }` (artist, title, and cookies are optional, but at least artist or title is required)

### Get Info
Retrieve metadata for a given URL (supports single tracks and YouTube playlists).
- **URL**: `/info`
- **Method**: `POST`
- **Body**: `{ "url": "...", "cookies": [...] }`
- **Response**: A JSON array of metadata objects.
  ```json
  [
    {
      "title": "Song Title",
      "artists": ["Artist"],
      "coverUrl": "...",
      "source": "youtube",
      "url": "..."
    }
  ]
  ```

### Local Queued Download
Starts a background download job that saves the MP3 and cover art locally on the server. Supports bulk queuing.
- **URL**: `/download`
- **Method**: `POST`
- **Body**: 
  ```json
  {
    "tracks": [
      {
        "url": "https://www.youtube.com/watch?v=...",
        "title": "Custom Title" (optional),
        "artists": ["Artist 1"] (optional)
      }
    ],
    "cookies": [...], (optional, global)
    "mp3SubPath": "subdir/...", (optional, global),
    "coverSubPath": "subdir/..." (optional, global)
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "1 download(s) queued successfully",
    "count": 1,
    "jobs": [
      { "url": "...", "jobId": "7" }
    ]
  }
  ```

### Direct Streaming (Browser)
Downloads the MP3 file directly to your browser as an attachment. Bypasses server storage and does not download cover art.
- **URL**: `/download/stream`
- **Method**: `POST`
- **Body**: 
  ```json
  {
    "url": "https://www.youtube.com/watch?v=...",
    "title": "Custom Title" (optional),
    "artists": ["Artist 1"] (optional),
    "cookies": [...] (optional)
  }
  ```
- **Response**: Binary stream (audio/mpeg) with `Content-Disposition: attachment`.

### Job Status
Check the status and result of a download.
- **URL**: `/jobs`
- **Method**: `GET`
- **Query Params**: `id=YOUR_JOB_ID`
- **Response**:
  ```json
  {
    "id": "7",
    "status": "completed",
    "progress": 100,
    "result": {
      "mp3Path": "/app/mp3/Song.mp3",
      "coverPath": "/app/cover/Song.jpg",
      "metadata": {
        "title": "Song Title",
        "artists": ["Artist"],
        "coverUrl": "...",
        "source": "youtube"
      }
    },
    "error": null
  }
  ```

### List Files
Returns a grouped list of MP3s and their associated covers in a specific directory.
- **URL**: `/files`
- **Method**: `GET`
- **Query Params**:
    - `subPath`: (Optional) The subdirectory to list. If omitted, lists files in the root download folders. **This listing is not recursive.**
- **Response**:
  ```json
  [
    {
      "id": "Song-Artist",
      "mp3": { 
        "name": "Song-Artist.mp3", 
        "path": "/mp3/Song-Artist.mp3",
        "url": "http://localhost:${PORT}/mp3/Song-Artist.mp3"
      },
      "cover": { 
        "name": "Song-Artist.jpg", 
        "path": "/cover/Song-Artist.jpg",
        "url": "http://localhost:${PORT}/cover/Song-Artist.jpg"
      }
    }
  ]
  ```

### Delete Files
Deletes files based on query parameters.
- **URL**: `/files`
- **Method**: `DELETE`
- **Query Params**:
    - **Paired deletion**: `?id=filename_without_ext&subPath=subdir` (Deletes both MP3 and associated cover)
    - **Specific deletion**: `?type=mp3|cover&filename=full_filename&subPath=subdir` (Deletes a single file)
    - `subPath`: (Optional) The subdirectory where the files are located.
- **Examples**:
    - `DELETE /files?id=Song-Artist` (Root directory)
    - `DELETE /files?id=Song-Artist&subPath=my-album` (Subdirectory)
    - `DELETE /files?type=mp3&filename=Song-Artist.mp3`

## 🛠️ Technologies Used

- [Fastify](https://www.fastify.io/) - Web framework
- [BullMQ](https://docs.bullmq.io/) - Message queue & background jobs
- [Redis](https://redis.io/) - Data store for BullMQ
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - Media downloading
- [SoundCloud Downloader](https://github.com/dandv/soundcloud-downloader) - SoundCloud media fetching
- [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg) - Audio processing
- [Swagger](https://swagger.io/) - API Documentation
- [Docker](https://www.docker.com/) - Containerization
