-- Optional: Update foreign key constraint to CASCADE DELETE
-- This would automatically delete usage log entries when a pantry item is deleted
-- Run this if you want to make future deletions simpler

-- First, drop the existing foreign key constraint
ALTER TABLE "pantry_usage_log" 
DROP CONSTRAINT "pantry_usage_log_pantry_item_id_pantry_items_id_fk";

-- Then, recreate it with CASCADE DELETE
ALTER TABLE "pantry_usage_log" 
ADD CONSTRAINT "pantry_usage_log_pantry_item_id_pantry_items_id_fk" 
FOREIGN KEY ("pantry_item_id") 
REFERENCES "pantry_items"("id") 
ON DELETE CASCADE;

-- With this change, deleting a pantry item will automatically delete all related usage log entries
-- This would simplify the delete endpoint, but we lose the audit trail of what was deleted
