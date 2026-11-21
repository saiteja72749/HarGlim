# Harglim Publishers 📚

Production release approval is pending. See [PRODUCTION_RELEASE_AUDIT.md](PRODUCTION_RELEASE_AUDIT.md) for current security findings, backend contracts, verification evidence, and staging/admin blockers.

Welcome to the **Harglim Publishers** platform—a next-generation digital publishing and e-commerce ecosystem built for modern readers, authors, and administrators. 

This platform seamlessly connects authors with their audiences through a robust online bookstore, while providing dedicated portals for manuscript submissions, royalty tracking, and system administration.

---

## 🌟 Key Features & Portals

The application is structured into interconnected portals, featuring strict **Role-Based Access Control (RBAC)** to ensure maximum security.

### 📖 The Book Store (Public & Readers)
A beautifully designed, fast, and SEO-optimized storefront for book discovery and purchasing.
- **Advanced SEO (JSON-LD):** Implements professional-grade Schema.org structured data, canonical URLs, and dynamic sitemaps so Google can display Rich Snippets for books and author profiles.
- **Dynamic Catalog:** Browse books with advanced filtering by category, format, and price (`/books`).
- **Seamless Checkout Pipeline:** State-managed shopping cart ready for payment gateway integration (`/checkout/*`).
- **Reader Dashboard:** A secure space for users to track orders, manage their digital library, and save wishlists (`/dashboard/*`).

### ✍️ The Author Ecosystem
A dedicated workspace designed to empower writers, protected by the `Author` role.
- **Manuscript Portal:** Approved authors can submit and track manuscripts (`/author/manuscripts/new`). Author approval and editorial publication are separate backend workflows.
- **Analytics & Royalties:** Dashboards tracking sales performance and royalty payouts (`/author/analytics`).
- **Portfolio Management:** Manage published titles and update author profiles (`/author/books`).

### ⚙️ The Admin Command Center
A powerful, entirely secured CMS portal for platform administrators (`/admin`).
- **Inventory CMS:** Add, edit, and categorize the global book inventory using Cloudinary-ready `multipart/form-data` forms (`/admin/books/new`).
- **Order Fulfillment:** Track platform-wide physical orders and transition their statuses from Processing to Shipped to Delivered (`/admin/orders`).
- **User Role Management:** Instantly promote standard Readers to Authors or grant Admin privileges through the visual dashboard (`/admin/users`).
- **Access Controls:** `AuthGuard` waits for fresh backend role/capability context. The backend must independently enforce authorization and ownership on every protected endpoint; client navigation guards do not provide server security.

---

## 💻 Tech Stack & Architecture

Built with a focus on high performance, type safety, and exceptional user experience.

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Bundler:** Turbopack enabled for ultra-fast local development server speeds.
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) v4 & [Shadcn UI](https://ui.shadcn.com/) (Radix UI primitives).
- **State Management:** [Zustand](https://github.com/pmndrs/zustand) for global states (Auth, Cart).
- **API Integration:** Custom Axios instances with JWT interceptors.
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **Icons:** [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or 20+ (22 recommended)
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repository-url>
   cd Hargilm_publishers
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Turbopack development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   npm run start
   ```

---

## Testing

Run `npm run test:all` for unit tests, lint, a production build, and browser tests. See [TESTING.md](TESTING.md) for setup, coverage, and report locations.

## 🎨 UI/UX Design Philosophy

Our interface is built to feel premium and engaging:
- **Clean Typography:** Modern fonts with high legibility for long-form reading.
- **Micro-Interactions:** Subtle hover states and layout animations powered by Framer Motion guide the user's attention without overwhelming them.
- **Accessibility:** Uses Radix UI primitives, with public keyboard, responsive-control, and navigation checks in the browser suite. Complete role-specific accessibility verification remains part of release testing.

---
*Developed with modern web standards to redefine the digital publishing experience.*
