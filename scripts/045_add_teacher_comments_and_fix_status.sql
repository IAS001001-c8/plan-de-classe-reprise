-- Add teacher_comments column to sub_room_proposals
ALTER TABLE sub_room_proposals
ADD COLUMN IF NOT EXISTS teacher_comments text;

-- Add 'draft' and 'returned' to status enum
ALTER TABLE sub_room_proposals
DROP CONSTRAINT IF EXISTS sub_room_proposals_status_check;

ALTER TABLE sub_room_proposals
ADD CONSTRAINT sub_room_proposals_status_check
CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'returned'));

-- Update notifications type constraint to include new types
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  'plan_modified',
  'plan_validated',
  'plan_rejected',
  'plan_returned',
  'plan_created',
  'plan_deleted',
  'proposal_submitted',
  'sub_room_created',
  'room_invitation'
));

-- Add comments column to track teacher feedback
COMMENT ON COLUMN sub_room_proposals.teacher_comments IS 'Commentaires du professeur lors du renvoi de la proposition';
