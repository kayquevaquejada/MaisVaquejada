
-- -----------------------------------------------------------------------------
-- 0. REFACTOR PROFILES TABLE
-- -----------------------------------------------------------------------------
DO $$ 
BEGIN
    -- Add new columns to profiles if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'display_name') THEN
        ALTER TABLE public.profiles ADD COLUMN display_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'username') THEN
        ALTER TABLE public.profiles ADD COLUMN username TEXT UNIQUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone') THEN
        ALTER TABLE public.profiles ADD COLUMN phone TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'state_name') THEN
        ALTER TABLE public.profiles ADD COLUMN state_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'city_name') THEN
        ALTER TABLE public.profiles ADD COLUMN city_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'status') THEN
        ALTER TABLE public.profiles ADD COLUMN status TEXT DEFAULT 'PENDING_PROFILE';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'profile_completed') THEN
        ALTER TABLE public.profiles ADD COLUMN profile_completed BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_verified') THEN
        ALTER TABLE public.profiles ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'can_add_vaquejada') THEN
        ALTER TABLE public.profiles ADD COLUMN can_add_vaquejada BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'signup_provider') THEN
        ALTER TABLE public.profiles ADD COLUMN signup_provider TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'google_email') THEN
        ALTER TABLE public.profiles ADD COLUMN google_email TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'metadata_json') THEN
        ALTER TABLE public.profiles ADD COLUMN metadata_json JSONB DEFAULT '{}'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_login_at') THEN
        ALTER TABLE public.profiles ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at') THEN
        ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;
END $$;

-- Update existing profiles to move name and whatsapp to new columns if needed
UPDATE public.profiles SET full_name = name, display_name = name WHERE full_name IS NULL AND name IS NOT NULL;
UPDATE public.profiles SET phone = whatsapp WHERE phone IS NULL AND whatsapp IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 1. ACCOUNT RECOVERY SYSTEM
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.account_recovery_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email_informed TEXT,
    phone_informed TEXT,
    username_informed TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'OPEN', -- OPEN, UNDER_REVIEW, APPROVED, DENIED, EXPIRED, COMPLETED
    analysis_notes TEXT,
    handled_by_admin_id UUID REFERENCES auth.users(id),
    handled_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.account_recovery_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID REFERENCES public.account_recovery_requests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'ACTIVE', -- ACTIVE, USED, EXPIRED, REVOKED
    created_by_admin_id UUID REFERENCES auth.users(id)
);

-- -----------------------------------------------------------------------------
-- 2. SECURITY AUDIT LOGS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 3. TRIGGERS AND AUTOMATION
-- -----------------------------------------------------------------------------

-- Function to handle new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        display_name,
        role, 
        status, 
        profile_completed, 
        signup_provider,
        google_email
    )
    VALUES (
        new.id, 
        new.email, 
        COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 
        COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        CASE 
            WHEN new.email IN ('kayquegusmao@icloud.com', 'kayquegusmao1@gmail.com') THEN 'ADMIN_MASTER'
            ELSE 'USER'
        END,
        'PENDING_PROFILE',
        FALSE,
        new.raw_app_meta_data->>'provider',
        CASE WHEN new.raw_app_meta_data->>'provider' = 'google' THEN new.email ELSE NULL END
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updated_at in profiles
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
    new.updated_at = timezone('utc'::text, now());
    RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 4. RLS POLICIES
-- -----------------------------------------------------------------------------

ALTER TABLE public.account_recovery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_recovery_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: 
DROP POLICY IF EXISTS "Qualquer um vê perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuário gerencia próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Master can manage all" ON public.profiles;

CREATE POLICY "Qualquer um vê perfis" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Usuário gerencia próprio perfil" ON public.profiles FOR ALL 
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id AND 
    (role = (SELECT role FROM public.profiles WHERE id = auth.uid()) OR role IS NULL) AND
    (status = (SELECT status FROM public.profiles WHERE id = auth.uid()) OR status IS NULL)
);

CREATE POLICY "Master can manage all" ON public.profiles FOR ALL 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN_MASTER'));

-- Recovery Requests
CREATE POLICY "Users can create recovery request" ON public.account_recovery_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Users see own requests" ON public.account_recovery_requests FOR SELECT USING (user_id = auth.uid() OR email_informed = (SELECT email FROM auth.users WHERE id = auth.uid()));
CREATE POLICY "Master can manage requests" ON public.account_recovery_requests FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN_MASTER'));

-- Recovery Tokens
CREATE POLICY "Master manage tokens" ON public.account_recovery_tokens FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN_MASTER'));
CREATE POLICY "Public can read tokens for verification" ON public.account_recovery_tokens FOR SELECT USING (true);

-- Audit Logs
CREATE POLICY "Master read logs" ON public.security_audit_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN_MASTER'));
CREATE POLICY "System can insert logs" ON public.security_audit_logs FOR INSERT WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 5. INITIAL DATA (OPTIONAL)
-- -----------------------------------------------------------------------------
-- Update existing "ADMIN_MASTER"
UPDATE public.profiles SET role = 'ADMIN_MASTER' WHERE email IN ('kayquegusmao@icloud.com', 'kayquegusmao1@gmail.com');
