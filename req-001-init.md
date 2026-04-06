Requirement: REQ-001 - Project Initialization & Database Schema
Scope
Initialize the Next.js frontend, configure the Node.js backend, and design the PostgreSQL database schema tailored for high-end fashion retail and omnichannel POS integration.

Acceptance Criteria
[ ] Next.js 14 project is initialized with Tailwind CSS and shadcn/ui.

[ ] Database schema includes Product, ProductVariant, Category, Order, and Inventory tables.

[ ] ProductVariant table must accurately handle complex SKUs (e.g., distinguishing between a "Green Embroidered Fusion Suit" in Size M vs. Size L).

[ ] A basic API endpoint is established to receive XML/JSON webhooks from the physical store's Tally/Zoho POS for inventory deduction.

Tasks
Run npx create-next-app@latest.

Install Tailwind and necessary UI dependencies.

Initialize Prisma and define the schema.prisma file based on the multi-dimensional SKU requirement.

Create the foundational Express server for webhook listening.

