// supabase.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://mfzcgmcuxutmhmvnqumz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1memNnbWN1eHV0bWhtdm5xdW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MTEyMTQsImV4cCI6MjEwNTM4NzIxNH0.jbaNpKSP2HZtB-J_nYV2jr9K4XVn8vDyOAhGUkLyDs0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);