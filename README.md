# IrisAI: End-to-End ML Application

Random Forest classifier on the scikit-learn Iris dataset, served by FastAPI, with a web dashboard, an Expo mobile app, and Vercel deployment.

## Structure

```
iris-ml-app/
├── vercel.json              # Vercel build + routing config
├── requirements.txt         # Python deps used by Vercel
├── api/index.py             # Vercel serverless entrypoint (imports backend app)
├── backend/
│   ├── train.py             # trains model, writes model.joblib + metrics.json
│   ├── main.py              # FastAPI: /api/metrics, /api/predict, /api/health
│   ├── requirements.txt
│   ├── model.joblib
│   └── metrics.json
├── web/                     # index.html, styles.css, app.js
├── mobile/                  # Expo app (App.js, config.js, package.json)
├── report/figures/          # EDA + result figures
└── Assignment1_Report.docx
```

## Run locally

```bash
pip install -r backend/requirements.txt
python backend/train.py                     # creates model.joblib + metrics.json
uvicorn backend.main:app --reload --port 8000
# open web/index.html (it calls http://localhost:8000 automatically)
```

API docs: http://localhost:8000/docs

## Deploy to Vercel

1. Commit `backend/model.joblib` and `backend/metrics.json`.
2. Push to GitHub, import the repo in Vercel, deploy (root directory = repo root).
3. Open `https://<your-app>.vercel.app` for the web app and `/docs` for the API.

## Mobile app

```bash
cd mobile
npm install
# edit config.js: set API_URL to your Vercel URL
npx expo start        # scan the QR code with Expo Go
```
