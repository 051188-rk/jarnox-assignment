# Stock Prediction Web App 📈

A full-stack web application for tracking stock market data and predicting next-day prices using AI. The app features a **React** frontend, a **Node.js** backend, a **PostgreSQL** database, and interactive charts powered by **Chart.js**. It also integrates with the **Groq API** to provide AI-driven stock predictions.

## 🚀 Features

- **Live Stock Data:** Fetches real-time stock information from public APIs (e.g., Yahoo Finance).
- **Backend REST API:** Provides endpoints for company lists, historical stock data, and AI predictions.
- **PostgreSQL Database:** Stores company information and historical stock prices efficiently.
- **Interactive Visualizations:** Uses **Chart.js** to display historical stock data in a clear, interactive format.
- **AI-Powered Predictions:** Leverages the **Groq API (Llama 3.3 70b versatile)** to forecast the next day's stock price.

---

## 🛠️ Tech Stack

### Frontend
- **React:** For building a dynamic and responsive user interface.
- **Chart.js:** For creating beautiful and interactive data visualizations.

### Backend
- **Node.js:** A fast and scalable JavaScript runtime for the server.
- **Express.js:** A minimalist web framework for building the REST API.
- **PostgreSQL:** A powerful, open-source relational database.
- **Groq API:** Provides the AI model for stock price predictions.

---

## 📂 Project Structure

stock-prediction-app/
├── frontend/
│   ├── src/
│   └── .gitignore
│   └── package.json
├── backend/
│   ├── src/
│   └── server.js
│   └── .gitignore
│   └── package.json
└── README.md
└── schema.png


---

## ⚙️ Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js & npm:** [Download & install](https://nodejs.org/)
- **PostgreSQL:** [Download & install](https://www.postgresql.org/download/)
- **pgAdmin 4 (Optional):** A powerful GUI tool for managing your PostgreSQL database. [Download](https://www.pgadmin.org/)

---

## 📝 Setup Instructions

Follow these steps to get the application up and running on your local machine.

### 1. PostgreSQL Database Setup

1.  **Install PostgreSQL and pgAdmin 4.**
2.  Open pgAdmin 4 and create a new database. We'll use the name `stockdb` for this guide.
3.  Execute the SQL commands from the provided **ER Diagram** to create the necessary tables and relationships. The schema includes tables for `companies` and `historical_data`. (schema.png)

### 2. Backend Installation

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Install the required dependencies:
    ```bash
    npm install express pg cors dotenv axios
    ```
3.  Create a `.env` file in the `backend` directory and add your configuration details. This keeps your sensitive information secure.

    ```bash
    PORT=4000
    DATABASE_URL=postgresql://postgres:your_password@localhost:5432/stockdb
    GROQ_API_KEY=your_groq_api_key
    GROQ_MODEL=llama-3.3-70b-versatile
    GROQ_BASE=[https://api.groq.com/openai/v1](https://api.groq.com/openai/v1)
    ```
4.  Implement the API routes in `server.js` or a more structured format (e.g., `routes/stockRoutes.js`). The key endpoints will be:
    - `GET /api/companies`: Retrieves the list of companies.
    - `GET /api/stocks/:company`: Fetches historical stock data for a specific company.
    - `POST /api/predict/:company`: Requests an AI prediction for the next day's stock price.

5.  Start the backend server:
    ```bash
    node server.js
    ```
    The server will now be running at `http://localhost:4000`.

### 3. Frontend Installation

1.  Navigate to the `frontend` directory:
    ```bash
    cd ../frontend
    ```
2.  Install the frontend dependencies:
    ```bash
    npm install
    ```
3.  Start the React development server:
    ```bash
    npm start
    ```
    The app will automatically open in your browser at `http://localhost:3000`.

---

## 💻 Usage

-   Open your web browser and navigate to `http://localhost:3000`.
-   Use the **search box** to find a company by its ticker symbol.
-   Click the **"Add Company"** button to add it to your watchlist in the sidebar.
-   Click on a company in the **sidebar** to view its historical stock data and interactive chart.
-   Click the **"Predict"** button to get the AI-generated next-day price forecast.

---

## ER Diagram

![er diagram](https://raw.githubusercontent.com/051188-rk/jarnox-assignment/main/schema.png)

## 📄 License

This project is licensed under the **MIT License**. See the `LICENSE` file for details.