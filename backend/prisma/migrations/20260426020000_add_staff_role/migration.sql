-- Add STAFF to the AdminRole enum. STAFF accounts only access the mobile POS
-- scanner, so they can deduct stock when a sale is rung up while the main
-- admin/manager is away from the shop.
ALTER TYPE "AdminRole" ADD VALUE 'STAFF';
