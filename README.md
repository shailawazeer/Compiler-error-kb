# Compiler Error Knowledge Base

A web app that helps you understand and fix compiler errors using AI. Paste your error, get instant solutions.

## What it does

- Searches for compiler errors in the database first
- If not found, asks Google Gemini AI for help
- Saves the solution for next time
- Supports multiple programming languages (C, C++, Java, Python, JavaScript, etc.)

## Tech Stack

**Frontend:** React, Vite, Tailwind CSS  
**Backend:** Node.js, Express  
**Database:** MySQL  
**AI:** Google Gemini API

## Setup

### Database

```sql
CREATE DATABASE compiler_error_kb;
USE compiler_error_kb;

CREATE TABLE errors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  error_text TEXT NOT NULL,
  normalized_query TEXT NOT NULL,
  solution_text TEXT,
  programming_language VARCHAR(50) DEFAULT 'auto',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_normalized (normalized_query(255))
);
```

### Backend

```bash
cd Backend
npm install

# Create .env file with:
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=compiler_error_kb
GEMINI_API_KEY=your_key_here
PORT=5000

npm run dev
```

Get your Gemini API key from: https://aistudio.google.com/apikey

### Frontend

```bash
cd my-app
npm install
npm run dev
```

## How to Use

1. Select your programming language
2. Paste the compiler error
3. Click "Get Solution"
4. Read the AI-generated fix

That's it! The app will remember solutions for faster responses next time.

## API Endpoints

- `POST /api/errors` - Submit error and get solution
- `GET /api/errors` - Get all saved errors
- `GET /api/errors/:id` - Get specific error
- `DELETE /api/errors/:id` - Delete error

## Issues?

- Make sure MySQL is running
- Check if backend is on port 5000
- Verify your Gemini API key is valid
- Restart both servers if needed

## Future Plans

- User authentication
- Better code highlighting
- Export solutions as PDF
- Dark/light theme toggle

Built with React, Express, and Gemini AI.
