# 🚀 How to Deploy on cPanel: support.akashshar.xyz

Ye complete deployment package aapki website **akashshar.xyz** ke subdomain **support.akashshar.xyz** ke liye ready kiya gaya hai.
Isme **React Frontend (built)** aur **Express.js + SQLite Backend** dono ek hi application ke andar integrated hain.

---

## 📋 Step 1: cPanel me Subdomain Banayein
1. Apne cPanel me login karein.
2. **Domains** section me jayein aur **Subdomains** (ya **Domains** -> **Create A New Domain**) par click karein.
3. Subdomain ka naam dalein:
   - **Domain / Subdomain**: `support.akashshar.xyz`
   - **Document Root**: `public_html/support` (ya `support.akashshar.xyz`)
4. **Submit / Create** par click karein.

---

## 📁 Step 2: ZIP File Upload aur Extract Karein
1. cPanel ke **File Manager** me jayein.
2. Apne subdomain ke folder me jayein (e.g., `public_html/support` ya `/home/username/support.akashshar.xyz`).
3. Top menu se **Upload** par click karke `support.akashshar.xyz.zip` upload karein.
4. Upload complete hone ke baad file par Right Click karein aur **Extract** par click karein.
5. Make sure files directly folder ke andar extract hon (jaise `src/`, `public/`, `package.json`, `.env`, `app.js`).

---

## ⚡ Step 3: cPanel me Node.js App Setup Karein
1. cPanel dashboard me jayein aur **Setup Node.js App** open karein.
2. **Create Application** button par click karein:
   - **Node.js version**: `20.x` ya `22.x` select karein.
   - **Application mode**: `Production` select karein.
   - **Application root**: Apne subdomain folder ka path dalein (e.g. `public_html/support` ya `support.akashshar.xyz`).
   - **Application URL**: `support.akashshar.xyz` select karein.
   - **Application startup file**: `app.js` (ya `src/server.js`) dalein.
3. **Create** button par click karein.
4. Ab page par **Run NPM Install** button dikhai dega, uspe click karein.
   *(5 se 10 second me sabhi dependencies install ho jayengi kyunki isme koi native C++ compilation nahi hai)*.
5. **Start Application** (ya **Restart**) par click karein!

---

## 🌐 Step 4: System Live Hai!
Ab browser me open karein:
👉 **https://support.akashshar.xyz**

### 🔑 Default Login Credentials:
- **Admin**:
  - Email: `admin@helpdesk.com`
  - Password: `password123`
- **Support Agent**:
  - Email: `agent@helpdesk.com`
  - Password: `password123`
- **Customer**:
  - Email: `customer@helpdesk.com`
  - Password: `password123`

*(Login karne ke baad aap naye users, agents ya categories create kar sakte hain)*
