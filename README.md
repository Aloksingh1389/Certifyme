# Certifyme

Certifyme is a split frontend + backend certificate bucket built with React, Tailwind CSS, and Express. The frontend handles browsing, filtering, and uploads while the backend stores the certificate files on disk and serves view/download links.

## Project Structure

- `frontend/` contains the React app.
- `backend/` contains the file upload API and stored certificates.
- Uploaded files are saved on the server, not in browser storage.

## Features

- Add one or multiple certificate files.
- Categorize certificates into groups like Education, Hackthons, Workshops, Presentation, Achievements, Courses, and Others.
- Search and filter the certificate bucket.
- Preview images and PDFs, with a safe fallback for other file types.
- Persist everything locally in the browser.

## Getting Started

```bash
npm install
npm run dev
```

In a second terminal, run:

```bash
npm run backend
```

If you prefer to run the frontend separately, use `npm run dev:frontend`.

## Build

```bash
npm run build
```

## Notes

- The backend stores uploaded certificate files in `backend/uploads/` and metadata in `backend/data/`.
- The frontend requests certificates from `/api` and provides separate View and Download actions for each file.
