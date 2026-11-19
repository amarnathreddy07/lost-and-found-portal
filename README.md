# Sai University — Campus Lost & Found Portal

A full-stack web application that digitizes Sai University's lost-and-found noticeboard. Students can report lost or found items, browse and filter a live campus board, submit claims with proof, and track their submissions. Administrators get a dedicated console for moderation, user management, and campus statistics.

**Live API / deployment:** [https://lost-and-found-portal-uxit.onrender.com](https://lost-and-found-portal-uxit.onrender.com)
**Repository:** [https://github.com/amarnathreddy07/lost-and-found-portal](https://github.com/amarnathreddy07/lost-and-found-portal)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [Demo Accounts &amp; Seeding](#demo-accounts--seeding)
- [API Reference](#api-reference)
- [Data Model](#data-model)
- [Postman Collection](#postman-collection)
- [Security](#security)
- [Deployment](#deployment)
- [Author](#author)

---

## Features

### For Students

- **Account system** — register with a university email (`name.initial-YY@department.saiuniversity.edu.in`), PRN, and a strong password; JWT-based sign-in with secure cookie sessions.
- **Report items** — post a **lost** or **found** listing with title, category, description, campus location, date, and an optional image or Google Drive link.
- **Live board** — search across items, rooms, labs, and areas; filter by type, category, and location; sort by post date, item date, or title; paginated results.
- **Claim workflow** — submit proof describing why an item is yours, resubmit rejected claims, and receive updates as the reporter or an admin reviews them.
- **My Space dashboard** — track your reported items and your submitted/received claims in one place.
- **Item management** — edit your own listings, update status (`active`, `claimed`, `resolved`, `archived`), and delete your posts.
- **Responsive UI** — accessible, mobile-friendly single-page interface with dark-mode-aware branding.

### For Administrators

- **Dashboard statistics** — total items, active lost/found counts, claimed/resolved counts, total users, pending claims, and resolution rate.
- **Moderation** — view and manage all items and claims across campus.
- **User management** — create, edit, and delete users, reset passwords, change roles, import users in bulk via CSV, and manage a set of preloaded demo accounts.
- **Protected routes** — all admin endpoints require an authenticated admin role.

### Categories & Locations

Items are classified into 9 categories (Electronics, Books & Notes, Clothing, Accessories, ID & Cards, Keys, Bags, Sports, Other) and one of 50+ campus locations across **AB1**, **AB2**, and outside areas (running track, parking, temple, sports complex). The canonical mapping is documented in [`docs/university-location-mapping.csv`](docs/university-location-mapping.csv).

---

## Tech Stack

| Layer      | Technologies                                                        |
| ---------- | ------------------------------------------------------------------- |
| Frontend   | Plain HTML, CSS, and ES modules (no framework/build step)           |
| Backend    | Node.js (≥18), Express 4, REST API                                 |
| Database   | MongoDB with Mongoose 8                                             |
| Auth       | bcryptjs password hashing, JSON Web Tokens (JWT), role-based access |
| Middleware | express-validator, express-rate-limit, CORS, cookie-parser          |
| Uploads    | Multer with image signature validation (PNG, JPEG, GIF, WebP, AVIF) |
| Tooling    | Nodemon (dev), Node's built-in test runner, Postman collection      |

---

## Project Structure

```
lost-and-found-portal/
├── index.html                 # Single-page app shell
├── styles.css                 # Global styles and theme
├── js/                        # Frontend ES modules
│   ├── api.js                 # API client with auth & error handling
│   ├── app.js                 # App bootstrap / routing
│   ├── constants.js           # Types, categories, locations, statuses
│   ├── store.js               # Client state
│   ├── ui.js                  # Shared UI helpers
│   └── views/                 # Home, report, item, auth, dashboard, admin views
├── assets/                    # University logos and favicons
├── docs/                      # Campus location mapping reference
├── postman/                   # Postman API collection
├── server/
│   ├── server.js              # Express app entry point
│   ├── config/                # DB, uploads, account config
│   ├── controllers/           # Auth, item, claim, admin logic
│   ├── middleware/            # Auth, validation, sanitization, rate limits, errors
│   ├── models/                # User, Item, Claim Mongoose schemas
│   ├── routes/                # API route definitions
│   └── utils/                 # DB seeding, admin creation, CSV parsing, tokens
├── .env.example               # Environment variable template
└── package.json               # Root scripts (delegates to server/)
```

---

## Getting Started

### Prerequisites

- **Node.js 18+** and npm
- **MongoDB** — a local instance (`mongodb://127.0.0.1:27017`) or a MongoDB Atlas connection string

### Installation

```bash
# Clone the repository
git clone https://github.com/amarnathreddy07/lost-and-found-portal.git
cd lost-and-found-portal

# Install server dependencies
npm install --prefix server

# Create your environment file
copy .env.example .env      # Windows
# cp .env.example .env      # macOS / Linux

# Edit .env and set JWT_SECRET (min 16 chars), MONGO_URI, and ADMIN_PASSWORD
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure the following:

| Variable                  | Default                                                 | Description                                                                    |
| ------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `PORT`                  | `5000`                                                | Port the Express server listens on.                                            |
| `MONGO_URI`             | `mongodb://127.0.0.1:27017/sai-university-lost-found` | MongoDB connection string.                                                     |
| `NODE_ENV`              | `development`                                         | Environment mode (`development` / `production`).                           |
| `JWT_SECRET`            | —                                                      | **Required.** Secret for signing tokens; must be at least 16 characters. |
| `JWT_EXPIRES`           | `7d`                                                  | Token lifetime.                                                                |
| `CLIENT_URL`            | `http://localhost:5000`                               | Comma-separated allowed CORS origins.                                          |
| `UPLOAD_MAX_MB`         | `5`                                                   | Maximum image upload size in megabytes.                                        |
| `SEED_ON_START`         | `true`                                                | Seed the admin account automatically on startup.                               |
| `SEED_DEMO_USERS`       | `false`                                               | Toggle seeding of demo users.                                                  |
| `ADMIN_EMAIL`           | `campusadmin.a-29@admin.saiuniversity.edu.in`         | Email used for the seeded admin account.                                       |
| `ADMIN_PASSWORD`        | empty                                                   | Password for the seeded admin; admin seeding is skipped if empty.              |
| `SEED_STUDENT_PASSWORD` | empty                                                   | Optional password for seeded students.                                         |
| `DEFAULT_USER_PASSWORD` | `Student@123`                                         | Initial password assigned to admin-created/imported users.                     |

> Never commit your `.env` file — it is listed in `.gitignore`.

---

## Running the App

```bash
# Production-style start
npm start

# Development with auto-reload (nodemon)
npm run dev
```

The portal is then available at [http://localhost:5000](http://localhost:5000), and the health check at [http://localhost:5000/api/health](http://localhost:5000/api/health).

Other useful scripts:

```bash
npm run seed              # Seed the admin account manually
npm --prefix server run create-admin   # Create an admin interactively
npm --prefix server test  # Run the Node.js test suite
```

---

## Demo Accounts & Seeding

Set `ADMIN_PASSWORD` in `.env` and start the server to automatically create the admin account (`ADMIN_EMAIL`). Admin-created and preloaded student accounts use `DEFAULT_USER_PASSWORD` (`Student@123` by default) and are forced to change their password on first sign-in.

Preloaded demo students (see `server/config/accounts.js`):

| Name / Email                                     | PRN            |
| ------------------------------------------------ | -------------- |
| `amarnathreddy.s-29@scds.saiuniversity.edu.in` | SAI-29SCDS-001 |
| `arjunmehta.a-21@scds.saiuniversity.edu.in`    | SAI-21CS-014   |
| `meeraiyer.m-22@ece.saiuniversity.edu.in`      | SAI-22EC-031   |
| `kabirshah.k-20@me.saiuniversity.edu.in`       | SAI-20ME-008   |
| `diyanair.d-23@llb.saiuniversity.edu.in`       | SAI-23LLB-045  |

Admins can create/import these accounts from the Admin → Users panel with a one-click seeding action.

---

## API Reference

All endpoints are prefixed with `/api`. JSON bodies are expected unless noted. Successful responses generally use the shape `{ "success": true, ... }`.

### Health

| Method  | Endpoint        | Description                |
| ------- | --------------- | -------------------------- |
| `GET` | `/api/health` | Service status and uptime. |

### Auth — `/api/auth`

| Method   | Endpoint             | Auth          | Description                                 |
| -------- | -------------------- | ------------- | ------------------------------------------- |
| `POST` | `/register`        | —            | Register a student with a university email. |
| `POST` | `/login`           | —            | Sign in and receive a JWT cookie.           |
| `GET`  | `/me`              | Bearer/cookie | Get the current user profile.               |
| `POST` | `/change-password` | Yes           | Change the current password.                |
| `POST` | `/logout`          | Yes           | End the session.                            |

### Items — `/api/items`

| Method     | Endpoint        | Auth        | Description                                                                                                     |
| ---------- | --------------- | ----------- | --------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/`           | —          | List items with `q`, `type`, `category`, `location`, `status`, `sort`, `page`, `limit` filters. |
| `GET`    | `/mine`       | Yes         | Items reported by the current user.                                                                             |
| `GET`    | `/:id`        | —          | Get a single item.                                                                                              |
| `POST`   | `/`           | Yes         | Create an item (multipart/form-data with optional `image`).                                                   |
| `PUT`    | `/:id`        | Owner/Admin | Update an item.                                                                                                 |
| `PATCH`  | `/:id/status` | Owner/Admin | Change item status.                                                                                             |
| `DELETE` | `/:id`        | Owner/Admin | Delete an item.                                                                                                 |

### Claims — `/api/claims`

| Method    | Endpoint          | Auth           | Description                                   |
| --------- | ----------------- | -------------- | --------------------------------------------- |
| `GET`   | `/`             | Admin          | List all claims.                              |
| `GET`   | `/mine`         | Yes            | Claims submitted by the current user.         |
| `GET`   | `/received`     | Yes            | Claims on items reported by the current user. |
| `GET`   | `/item/:itemId` | Owner/Admin    | Claims for a specific item.                   |
| `POST`  | `/`             | Yes            | Submit a claim with `itemId` and `proof`. |
| `PATCH` | `/:id/review`   | Reporter/Admin | Approve or reject a claim.                    |
| `GET`   | `/stats/values` | Admin          | Valid categories and locations.               |

### Admin — `/api/admin`

| Method     | Endpoint                      | Description                                |
| ---------- | ----------------------------- | ------------------------------------------ |
| `GET`    | `/stats`                    | Platform statistics.                       |
| `GET`    | `/items`                    | All items (`status`, `type` filters).  |
| `GET`    | `/users`                    | All users.                                 |
| `GET`    | `/users/preloaded`          | Preloaded demo users and initial password. |
| `POST`   | `/users`                    | Create a user.                             |
| `PATCH`  | `/users/:id`                | Update a user.                             |
| `POST`   | `/users/import`             | Bulk-import users from CSV.                |
| `POST`   | `/users/:id/reset-password` | Reset a user's password.                   |
| `PATCH`  | `/users/:id/role`           | Change a user's role.                      |
| `DELETE` | `/users/:id`                | Delete a user and related records.         |

---

## Data Model

- **User** — name, email, studentId (PRN), department, phone, hashed password, role (`user`/`admin`), `mustChangePassword`, `tokenVersion`.
- **Item** — title, type (`lost`/`found`), category, description, location, date, imageUrl, status (`active`/`claimed`/`resolved`/`archived`), reportedBy, timestamps. Text indexes power search.
- **Claim** — item, claimant, proof, status (`pending`/`approved`/`rejected`), reviewedAt, reviewedBy, timestamps. One claim per user per item; approving a claim rejects others and marks the item as claimed.

---

## Postman Collection

A ready-to-use collection is included at [`postman/campus-lost-found.postman_collection.json`](postman/campus-lost-found.postman_collection.json). Import it into Postman to exercise every endpoint with example requests. Set the base URL variable to `http://localhost:5000` for local use or the live deployment URL.

---

## Security

- Passwords hashed with bcrypt (cost 12); JWT session tokens with token version invalidation.
- Email-domain and input validation on all write routes; MongoDB query sanitization middleware.
- Role-based authorization for admin and owner-only actions.
- Rate limiting on API and authentication endpoints; CORS origin allowlist.
- Strict image upload validation (extension + MIME + file signature) and a 1 MB JSON body limit.
- Security headers on uploaded images (`X-Content-Type-Options: nosniff`) and no-store caching for app assets.

---

## Deployment

The app is deployed on **Render**: the Express server serves the static frontend and the API from a single service. Configure the environment variables above in your hosting dashboard, provide a MongoDB Atlas `MONGO_URI`, set a strong `JWT_SECRET` and `ADMIN_PASSWORD`, and point `CLIENT_URL` at the deployed origin for CORS.

`npm start` is the production entry point, and `Render` uses it to boot the service. The frontend automatically targets the deployed API via the `meta[name="api-base"]` tag in `index.html`, while local development calls the same-origin server.

---

## Author

Built by [Amarnath Reddy](https://github.com/amarnathreddy07) for Sai University.
