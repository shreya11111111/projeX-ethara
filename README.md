# ProjeX

Full-stack project management web application.

## Tech Stack

- **Backend:** Node.js, Express.js, MySQL (mysql2), JWT, bcryptjs
- **Frontend:** React.js, React Router v6, Axios
- **Deployment:** Railway

## Setup

### Prerequisites
- Node.js 18+
- MySQL 8+

### Install Dependencies
```bash
npm install --prefix server
npm install --prefix client
```

### Environment Variables
Copy `server/.env.example` to `server/.env` and fill in your values.

### Database Setup
Run `server/tables.sql` against your MySQL database.

### Development
```bash
# Start backend
npm run server

# Start frontend (separate terminal)
npm run client
```

### Production
```bash
cd client && npm run build
NODE_ENV=production node server/core/index.js
```

## Deployment (Railway)

1. Add a MySQL service in Railway
2. Set environment variables (see `.env.example`)
3. Run `tables.sql` in Railway MySQL Data tab (skip CREATE DATABASE/USE lines)
4. Deploy from GitHub
