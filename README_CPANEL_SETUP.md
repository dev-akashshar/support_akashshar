# 🌐 Production Deployment Guide: cPanel & Linux Server

**Project**: Online Ticket Support & Helpdesk Management System  
**Production Domain**: [support.akashshar.xyz](https://support.akashshar.xyz)  
**Parent Repository**: [dev-akashshar/support_akashshar](https://github.com/dev-akashshar/support_akashshar)  
**Author**: Akash Sharma

---

## 📌 Overview

This deployment package contains the unified production build of the **Online Ticket Support Helpdesk System**, coupling the pre-compiled **React Single-Page Application (SPA)** with the **Express.js** REST API and native **SQLite** database.

This manual provides step-by-step instructions for deploying and running the project in production on **cPanel (CloudLinux / Node.js Selector)**, standard VPS environments, and shared hosting setups.

For complete software architectural documentation, database ER diagrams, API specifications, and local installation, refer to [README.md](file:///d:/Dev_Akash_Sharma/Laravel/Online-Ticket-Support-Helpdesk-System/support.akashshar.xyz/README.md).

---

## 📋 Prerequisites

Before proceeding with deployment, ensure the hosting server meets the following criteria:
- **cPanel Account** with **Setup Node.js App** (Passenger / CloudLinux Node.js Selector) enabled.
- **Node.js**: Version `20.x` or `22.x` (LTS recommended).
- **Subdomain / Domain**: Configured in DNS pointing to the server IP.
- **SSL Certificate**: Let's Encrypt / AutoSSL enabled for HTTPS.

---

## 🚀 Step-by-Step Deployment Instructions

### Step 1: Create Subdomain in cPanel
1. Log into your cPanel administrative dashboard.
2. Navigate to **Domains** ➔ **Domains** (or **Subdomains**).
3. Click **Create A New Domain**:
   - **Domain**: `support.akashshar.xyz`
   - **Document Root**: `public_html/support` *(or `/home/username/support.akashshar.xyz` depending on cPanel configuration)*.
4. Click **Submit** to finalize subdomain creation.

---

### Step 2: Upload Project Archive
1. In cPanel, navigate to **Files** ➔ **File Manager**.
2. Open the document root directory created in Step 1 (e.g., `public_html/support`).
3. Click **Upload** in the top navigation bar.
4. Upload `support.akashshar.xyz.zip` (or clone the repository using cPanel Git Version Control).
5. Once uploaded, right-click the `.zip` archive and select **Extract**.
6. Verify that the files are extracted directly into the root of the folder:
   ```text
   support/
   ├── app.js
   ├── package.json
   ├── .env.example
   ├── public/
   └── src/
   ```

---

### Step 3: Configure Environment Variables (`.env`)
1. In cPanel File Manager, create or edit the `.env` file in the project root.
2. Configure the production settings:
   ```env
   PORT=8000
   NODE_ENV=production
   APP_URL=https://support.akashshar.xyz
   CORS_ORIGIN=*
   JWT_SECRET=helpdesk_akashshar_secret_prod_jwt_2026_xyz981
   DB_PATH=./src/database/database.sqlite
   ```
3. Save changes.

---

### Step 4: Configure Node.js Application in cPanel
1. Return to the main cPanel dashboard and search for **Setup Node.js App**.
2. Click **Create Application**:
   - **Node.js version**: Select `20.x` or `22.x`.
   - **Application mode**: `Production`.
   - **Application root**: Enter the relative path to your project folder (e.g., `public_html/support`).
   - **Application URL**: Select `support.akashshar.xyz`.
   - **Application startup file**: `app.js`.
3. Click **Create**.
4. Once created, click the **Run NPM Install** button in the Node.js interface:
   - *Because this application uses Node.js native `DatabaseSync` (`node:sqlite`), there are zero C++ compilation steps, allowing dependencies to install within seconds without errors.*
5. Run the database migration and seeder (either via cPanel Terminal or by triggering the database initialize route):
   ```bash
   node src/database/seed.js
   ```
6. Click **Start Application** (or **Restart**).

---

## 🔑 Default Evaluation Accounts

The initial database seed populates the system with pre-configured accounts for testing:

| Role | Email Address | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@helpdesk.com` | `password123` | Full dashboard access, ticket management, agent assignment, system settings |
| **Support Agent** | `agent@helpdesk.com` | `password123` | Ticket queue handling, status workflow, internal notes |
| **Customer** | `customer@helpdesk.com` | `password123` | Ticket submission, public reply threads, status tracking |

---

## 🛠️ Verification & Health Check

After starting the application, verify server operation:

1. **Web Interface**:
   - Open [https://support.akashshar.xyz](https://support.akashshar.xyz) in any modern browser.
   - The React frontend should render immediately.
2. **REST API Health Check**:
   - Open [https://support.akashshar.xyz/api/health](https://support.akashshar.xyz/api/health).
   - Expected JSON response:
     ```json
     {
       "status": "ok",
       "service": "Online Ticket Support Express Backend",
       "database": "SQLite",
       "timestamp": "2026-11-02T..."
     }
     ```

---

## 🛡️ Production Troubleshooting & FAQs

### Q1: Received a 503 Service Unavailable Error
- **Cause**: The Node.js application process has not booted or encountered an uncaught exception on startup.
- **Resolution**:
  1. Check `stderr.log` in the application root directory.
  2. Verify Node.js version is set to `>= 20.x` in cPanel.
  3. Ensure `app.js` is specified as the application startup file.

### Q2: 404 Error when refreshing React routes (e.g. `/tickets/1`)
- **Cause**: Web server attempting to locate a static file on disk instead of delegating to Express.js.
- **Resolution**: Express server includes a built-in SPA catch-all handler (`src/server.js`) that automatically routes non-API GET requests to `public/index.html`.

### Q3: Database permission errors (`EACCES` / Read-only)
- **Cause**: The `src/database/` directory does not have write permissions for the web server user.
- **Resolution**: In cPanel File Manager, ensure folder `src/database` has `755` permissions, allowing the SQLite database and WAL journal files (`database.sqlite-wal`, `database.sqlite-shm`) to be written.

---

## 📄 License & Attribution

- **Project**: Online Ticket Support & Helpdesk Management System
- **Author**: Akash Sharma
- **Academic Submission**: Computer Science & Engineering Final Project
- **License**: ISC License
