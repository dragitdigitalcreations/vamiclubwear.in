Project: Vami Clubwear E-Commerce App & POS Sync
Role: Lead AI Full-Stack Developer
Project Overview
A premium, mobile-first e-commerce web application for Vami Clubwear (based in Manjeri, Kerala). The app specializes in Indo-Western fusion wear, modest fashion, and bespoke bridal collections. It requires a real-time omnichannel inventory synchronization with the physical store's POS (Tally/Zoho) to prevent overselling.

Visual & UX Architecture
Theme: Strict Dark Mode (Deep Charcoal #121212 background, Soft Black #1E1E1E surfaces, Mocha Mousse #5C4033 primary accents).

Layout: Mobile-first, utilizing asymmetrical masonry grids for product discovery and progressive visual filtering.

Media: High-fidelity WebP image processing is mandatory to showcase intricate garment details (e.g., zari work, sheer dupattas, embroidery textures).

Tech Stack
Frontend: Next.js 14 (App Router), React, Tailwind CSS, shadcn/ui.

Backend: Node.js / Express (Event-driven architecture).

Database: PostgreSQL with Prisma ORM.

State Management: Zustand.

Integrations: WhatsApp Business API (Conversational Commerce), Zoho POS / Tally XML webhooks.

Development Rules & Coding Conventions
Requirement-Driven Development (RDD): Never write code without first creating a traceable requirement file detailing scope, acceptance criteria, and task breakdowns.

Database Schema: Product entities must support multi-dimensional SKU variants (Size, Color, Fabric, Embroidery Type) to handle complex items like modular fusion sets.

Inventory Logic: Implement optimistic locking for all inventory transactions to ensure real-time synchronization between the web app and the physical POS.

Security: Never commit API keys or database credentials. Use .env.local strictly. Ensure strict Role-Based Access Control (RBAC) for the admin dashboard.

Component Structure: Use functional React components with strict TypeScript interfaces.