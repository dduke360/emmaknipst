# Product Requirements Document: Photographer Portfolio Homepage

## 1. Project Overview

**Project Name:** Photographer Portfolio  
**Type:** Web Application  
**Core Functionality:** A personal portfolio homepage for a young talented photographer where only the owner can upload photos, which are automatically categorized by photoshoot/shooting.  
**Target Users:** 
- Primary: Photographer (owner/admin)
- Secondary: Potential clients, art directors, friends, and general audience

---

## 2. User Stories

### As a Visitor (Public)
- I want to view the photographer's portfolio so I can assess their style and quality
- I want to browse photos by shooting/category so I can find work that matches my interests
- I want to contact the photographer so I can inquire about bookings
- I want to learn about the photographer so I can connect with them

### As the Owner (Admin)
- I want to upload photos and assign them to a shooting/category so I can showcase my work
- I want to create new shooting categories so I can organize my portfolio
- I want to manage (edit/delete) my uploads so I can keep my portfolio updated

---

## 3. Functional Requirements

### 3.1 Public Features
| Feature | Description |
|---------|-------------|
| **Home/Gallery View** | Display all photos in a grid layout, latest first |
| **Category Navigation** | Filter photos by shooting/category |
| **Photo Detail View** | Lightbox/modal to view full-size images |
| **About Section** | Photographer bio, profile photo, social links |
| **Contact Section** | Email, social media links, or contact form |

### 3.2 Admin Features
| Feature | Description |
|---------|-------------|
| **Admin Login** | Secure authentication (password-protected) |
| **Upload Photos** | Upload single or multiple images |
| **Create Category** | Create new shooting/category names |
| **Assign Category** | Assign uploaded photos to a category |
| **Manage Photos** | Delete or re-categorize existing photos |
| **Manage Categories** | Edit or delete categories |

---

## 4. Non-Functional Requirements

- **Performance:** Gallery loads within 2 seconds; images lazy-loaded
- **Responsive:** Works on mobile, tablet, and desktop
- **Image Optimization:** Automatic thumbnail generation and optimization
- **Security:** Admin area protected by authentication; no public upload access
- **SEO:** Basic meta tags for search visibility

---

## 5. Technical Stack (Easiest to Publish/Maintain)

**Recommended: Static Site with JSON Data**

| Layer | Technology |
|-------|------------|
| **Frontend** | Plain HTML + CSS + Vanilla JavaScript |
| **Data Storage** | JSON file (`photos.json`) - photographer edits this to add photos |
| **Hosting** | Netlify or Vercel (free, automatic deploys from GitHub) |
| **Images** | Cloudinary (free tier) or local `/images` folder |
| **Admin** | Simple password protection via Netlify/Vercel Identity |

**Why this approach?**
- No database or backend to maintain
- Free hosting with SSL included
- Deploys automatically when you push to GitHub
- Photographer adds photos by editing a simple JSON file
- Can add Decap CMS later for visual admin interface

---

## 6. UI/UX Guidelines

- **Visual Style:** Clean, minimalist, gallery-focused to highlight the photography
- **Color Palette:** Neutral (white/black/gray) to let photos stand out
- **Typography:** Simple, elegant sans-serif fonts
- **Layout:** Masonry or grid gallery; sticky navigation
- **Animations:** Subtle fade-in effects for smooth transitions

---

## 7. Out of Scope (v1)

- E-commerce / print sales
- Client proofing galleries
- Blog or news section
- Multi-user support
- Image editing tools

---

## 8. Success Metrics

- Visitors can view and filter photos by category
- Admin can successfully upload and categorize photos
- Page load time under 2 seconds
- Mobile-friendly experience

---

## 9. Timeline Estimate

- **Phase 1:** Core gallery + category filtering (3-5 days)
- **Phase 2:** Admin authentication + upload (2-3 days)
- **Phase 3:** About & Contact sections (1-2 days)
- **Phase 4:** Testing & deployment (1-2 days)

**Total Estimate:** 7-12 days
