-- SQL Migration Script for 1v1 Direct Challenge System

-- 1. Create challenges table if it doesn't exist
CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    opponent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    system TEXT NOT NULL CHECK (system IN ('aos', '40k')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Alter matches table to support direct-challenge details safely
ALTER TABLE matches ADD COLUMN IF NOT EXISTS challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS opponent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS system TEXT;

-- 3. Row Level Security (RLS) for challenges
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS challenges_select_policy ON challenges;
CREATE POLICY challenges_select_policy ON challenges
    FOR SELECT USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

DROP POLICY IF EXISTS challenges_insert_policy ON challenges;
CREATE POLICY challenges_insert_policy ON challenges
    FOR INSERT WITH CHECK (auth.uid() = challenger_id);

DROP POLICY IF EXISTS challenges_update_policy ON challenges;
CREATE POLICY challenges_update_policy ON challenges
    FOR UPDATE USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

DROP POLICY IF EXISTS challenges_delete_policy ON challenges;
CREATE POLICY challenges_delete_policy ON challenges
    FOR DELETE USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- 4. Constraint on DB level: Max 1 active challenge (pending or accepted) per user
CREATE OR REPLACE FUNCTION check_active_challenges_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('pending', 'accepted') THEN
        IF EXISTS (
            SELECT 1 FROM challenges
            WHERE status IN ('pending', 'accepted')
              AND id <> NEW.id
              AND (
                challenger_id = NEW.challenger_id OR
                opponent_id = NEW.challenger_id OR
                challenger_id = NEW.opponent_id OR
                opponent_id = NEW.opponent_id
              )
        ) THEN
            RAISE EXCEPTION 'Mindestens einer der Spieler ist bereits in einer aktiven Herausforderung (ausstehend oder angenommen).';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_active_challenges ON challenges;
CREATE TRIGGER trigger_check_active_challenges
    BEFORE INSERT OR UPDATE ON challenges
    FOR EACH ROW
    EXECUTE FUNCTION check_active_challenges_limit();

-- 5. Enable Realtime for challenges table
-- (Note: Since alter publication can fail if already added, we handle it gracefully or do it directly)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        -- Add challenges table to publication if not already present
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
              AND schemaname = 'public' 
              AND tablename = 'challenges'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE challenges;
        END IF;
    END IF;
END $$;

-- 6. Row Level Security (RLS) for matches table
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS matches_select_policy ON matches;
CREATE POLICY matches_select_policy ON matches
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = opponent_id);

DROP POLICY IF EXISTS matches_insert_policy ON matches;
CREATE POLICY matches_insert_policy ON matches
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = opponent_id);

DROP POLICY IF EXISTS matches_update_policy ON matches;
CREATE POLICY matches_update_policy ON matches
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = opponent_id);

DROP POLICY IF EXISTS matches_delete_policy ON matches;
CREATE POLICY matches_delete_policy ON matches
    FOR DELETE USING (auth.uid() = user_id OR auth.uid() = opponent_id);

-- 7. Add selected_badge column to profiles table to showcase favorite earned trophy
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS selected_badge TEXT;
