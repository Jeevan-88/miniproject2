# Social Media Platform Backend

**Student Details:**
- **Name:** Jeevan Yadav
- **Roll Number:** 27
- **Registration Number:** 12308799

## Project Overview
This is a production-ready Social Media Backend built with Node.js, Express, and TypeScript. It features a robust architecture including:
- **JWT Authentication** with Role-Based Access Control (RBAC).
- **Email Verification System** (Mocked for development).
- **Entity Relationships**: Users, Posts, Comments, and Likes.
- **Advanced Querying**: Pagination, sorting, and filtering.
- **External API Integration**: Demonstrating microservice communication.
- **Database**: SQLite (via `better-sqlite3`) for local development.

## Core Features
1. **User Management**: Registration, Login, Profile enrichment.
2. **Verification**: Users must verify their email before they can interact with the platform.
3. **Posts**: CRUD operations with pagination and sorting.
4. **Interactions**: Like and Comment systems.
5. **Security**: Password hashing with Bcrypt and stateless auth with JWT.
6. **Admin Privileges**: Admins can moderate content (delete any post).

## Setup Instructions
1. The backend runs on port 3000.
2. Environment variables are managed via `.env`.
3. Database is automatically initialized on startup.
