# EMS12172 Human–AI Interaction Experiment Platform

Study: **Does Chatbot Personality Shape Creative Confidence?**  
Ethics Reference: **EMS12172**  
Researcher: **Bhagyashree Yashwant Konde**

This project is a full-stack experimental platform for a controlled human–AI interaction study.

## Workflow

1. Participant Information Sheet + Consent Gate
2. AI Workshop Ideation Task with random condition assignment
3. Post-task Questionnaire
4. Interview Wizard
5. Debrief + Thank You
6. Researcher Dashboard
7. CSV/Excel export and GDPR hard erase

## Local Setup

### Backend

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Update `.env` with your MongoDB Atlas URI, admin key and OpenAI key.

### Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Open `http://localhost:5173`.

## Deployment

- Frontend: Vercel or Netlify
- Backend: Render or Railway
- Database: MongoDB Atlas free cluster

Set these environment variables:

### Backend

```env
MONGODB_URI=your_mongodb_atlas_connection_string
PORT=5001
ADMIN_API_KEY=your_secure_admin_key
OPENAI_API_KEY=your_openai_key_optional
CLIENT_ORIGIN=https://your-frontend-domain.vercel.app
```

### Frontend

```env
VITE_API_URL=https://your-backend.onrender.com/api
```

## Admin URLs

- Dashboard: `/dashboard`
- Export CSV: backend `/api/admin/export-data?format=csv`
- Export Excel: backend `/api/admin/export-data?format=xlsx`
- GDPR erase: backend `DELETE /api/admin/erase-participant/:study_id`

Use header:

```http
x-admin-key: YOUR_ADMIN_API_KEY
```
