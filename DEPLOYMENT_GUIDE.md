# Step-by-step deployment guide

## 1. Local backend

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Edit `.env`:

```env
MONGODB_URI=mongodb://localhost:27017/study_ems12172
PORT=5001
ADMIN_API_KEY=ChangeThisAdminKey
OPENAI_API_KEY=optional
CLIENT_ORIGIN=http://localhost:5173
```

## 2. Local frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Edit `.env`:

```env
VITE_API_URL=http://localhost:5001/api
VITE_ADMIN_API_KEY=ChangeThisAdminKey
```

## 3. MongoDB Atlas

1. Create free cluster.
2. Create database user.
3. Allow network access from anywhere for testing or Render IP if known.
4. Copy connection string into backend `MONGODB_URI`.

## 4. Render backend

- New Web Service
- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Environment variables:
  - `MONGODB_URI`
  - `ADMIN_API_KEY`
  - `OPENAI_API_KEY`
  - `CLIENT_ORIGIN`

## 5. Vercel frontend

- Import repo
- Root directory: `frontend`
- Build command: `npm run build`
- Output: `dist`
- Environment variables:
  - `VITE_API_URL=https://your-render-backend.onrender.com/api`
  - `VITE_ADMIN_API_KEY=your_admin_key`

## 6. Researcher dashboard

Open:

```text
https://your-frontend-domain/dashboard
```

## 7. Exports

Dashboard buttons export CSV and Excel.

Backend direct endpoints:

```text
GET /api/admin/export-data?format=csv
GET /api/admin/export-data?format=xlsx
```

Header or query required:

```text
x-admin-key: your_admin_key
```

## 8. GDPR erase

Dashboard has erase button.

Direct endpoint:

```text
DELETE /api/admin/erase-participant/:study_id
```

## 9. Study procedure

1. Participant reads PIS and ticks all consent boxes.
2. System generates UUIDv4 study ID locally and starts participant server record.
3. Backend assigns balanced WC or NI condition.
4. Participant completes 15-minute AI ideation task.
5. Chat logs are saved in MongoDB.
6. Questionnaire autosaves and submits.
7. Interview autosaves and submits.
8. Debrief shows condition explanation and withdrawal instructions.
9. Dashboard tracks KPIs and exports data.
