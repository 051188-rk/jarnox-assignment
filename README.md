# Stock Prediction Web App

A full-stack stock market web application using **React (frontend)** and **Node.js (backend)**, with **PostgreSQL** database, **Chart.js** visualizations, and AI-powered next-day stock price predictions via the Groq API (Llama 3.3 70b versatile model).

---

## Features

- Fetch live stock data from public APIs (e.g., Yahoo Finance)
- Backend REST API serving company list, historical stock data, and AI predictions
- PostgreSQL to store company info and historical stock prices
- Interactive charts using Chart.js
- AI-based next-day price forecasting using Groq API

---

## Project Structure

root/
│
├── frontend/ # React app with .jsx and .css files
│ ├── node_modules/
│ ├── public/
│ ├── src/
│ ├── package.json
│ └── ...
│
├── backend/ # Node.js API server
│ ├── node_modules/
│ ├── server.js # All API routes implemented here
│ ├── package.json
│ └── ...
│
└── README.md # This file


---

## Prerequisites

- **Node.js & npm:** [Download & install](https://nodejs.org/)
- **PostgreSQL:** [Download & install](https://www.postgresql.org/download/)
- **pgAdmin 4:** Optional GUI for PostgreSQL management ([pgadmin.org](https://www.pgadmin.org/))

---

## Setup Instructions

### 1. PostgreSQL Setup

- Install PostgreSQL and pgAdmin 4
- Launch pgAdmin 4 and create a new database (e.g., `stockdb`)
- Use the provided ER diagram (`er_diagram.png`) to create necessary tables and relationships

### 2. Backend Setup

```bash
cd backend
npm init -y
npm install express pg cors dotenv axios

Create a .env file with the following variables:

PORT=4000
DATABASE_URL=postgresql://postgres:admin123@localhost:5432/stockdb
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_BASE=https://api.groq.com/openai/v1

Implement APIs inside server.js:

/api/companies - Get list of companies

/api/stocks/:company - Get historical stock data

/api/predict/:company - Get AI prediction from Groq API

Start backend server:

node server.js

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start


---

## Usage

- Open `http://localhost:3000` in your browser
- Use the search box to search for a company
- Click "Add Company" to add a company to your watchlist
- Click "Predict" to get AI prediction for a company
- Click on a company in the sidebar to view its stock data and AI prediction

---

## ER Diagram

![ER Diagram](schema.png)

## License

MIT License
