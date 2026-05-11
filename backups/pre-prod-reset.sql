


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."grade_level" AS ENUM (
    '3ème année collège',
    'Tronc commun scientifique',
    '1ère année Baccalauréat – Sciences expérimentales',
    '1ère année Baccalauréat – Sciences mathématiques'
);


ALTER TYPE "public"."grade_level" OWNER TO "postgres";


CREATE TYPE "public"."session_status" AS ENUM (
    'in-progress',
    'completed',
    'abandoned'
);


ALTER TYPE "public"."session_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'teacher',
    'student',
    'super_admin'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  meta_role text;
  safe_role public.user_role;
  meta_school text;
  resolved_school uuid;
begin
  meta_role := lower(trim(coalesce(new.raw_user_meta_data->>'role', '')));
  if meta_role in ('teacher', 'student') then
    safe_role := meta_role::public.user_role;
  else
    safe_role := 'student';
  end if;

  meta_school := trim(coalesce(new.raw_user_meta_data->>'school_id', ''));
  resolved_school := null;
  if meta_school <> '' and meta_school ~* '^[0-9a-f-]{36}$' then
    select s.id into resolved_school
    from public.schools s
    where s.id = meta_school::uuid and s.is_active = true;
  end if;

  insert into public.profiles (id, email, full_name, role, school_id)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    safe_role,
    case when safe_role = 'teacher' then resolved_school else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$_$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(public.role_of(auth.uid()) in ('admin', 'super_admin'), false)
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_my_student"("student" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.student_profiles
    where user_id = student
      and teacher_id = auth.uid()
  )
$$;


ALTER FUNCTION "public"."is_my_student"("student" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_super_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(public.role_of(auth.uid()) = 'super_admin', false)
$$;


ALTER FUNCTION "public"."is_super_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_teacher"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(public.role_of(auth.uid()) = 'teacher', false)
$$;


ALTER FUNCTION "public"."is_teacher"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."role_of"("uid" "uuid") RETURNS "public"."user_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select role from public.profiles where id = uid
$$;


ALTER FUNCTION "public"."role_of"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at := now();
  return new;
end$$;


ALTER FUNCTION "public"."touch_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."geometry_session_capacity_scores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "ck_code" "text" NOT NULL,
    "ck_name" "text",
    "earned" numeric DEFAULT 0 NOT NULL,
    "max_points" numeric DEFAULT 0 NOT NULL,
    "percent" numeric,
    "score_out_of_20" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."geometry_session_capacity_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."geometry_session_part_scores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "part_number" smallint NOT NULL,
    "part_label" "text",
    "earned" numeric DEFAULT 0 NOT NULL,
    "max_points" numeric DEFAULT 0 NOT NULL,
    "percent" numeric,
    "score_out_of_20" numeric,
    "correct_count" integer DEFAULT 0 NOT NULL,
    "total_scorable" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "geometry_session_part_scores_part_number_check" CHECK ((("part_number" >= 1) AND ("part_number" <= 3)))
);


ALTER TABLE "public"."geometry_session_part_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."metrics" (
    "user_id" "uuid" NOT NULL,
    "test_id" "text" NOT NULL,
    "period" "text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "best_score" numeric(5,2),
    "avg_score" numeric(5,2),
    "last_attempt" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "role" "public"."user_role" DEFAULT 'student'::"public"."user_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "school_id" "uuid"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_profiles" (
    "user_id" "uuid" NOT NULL,
    "full_name" "text",
    "age" integer,
    "gender" "text",
    "teacher_id" "uuid",
    "teacher_name" "text",
    "school_name" "text",
    "grade_level" "public"."grade_level",
    "academic_track" "text",
    "academic_year" "text",
    "math_average_2024_2025" numeric(4,2),
    "math_average_2025_2026" numeric(4,2),
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "student_profiles_age_check" CHECK ((("age" >= 5) AND ("age" <= 100))),
    CONSTRAINT "student_profiles_gender_check" CHECK (("gender" = ANY (ARRAY['Male'::"text", 'Female'::"text", ''::"text"]))),
    CONSTRAINT "student_profiles_math_average_2024_2025_check" CHECK ((("math_average_2024_2025" >= (0)::numeric) AND ("math_average_2024_2025" <= (20)::numeric))),
    CONSTRAINT "student_profiles_math_average_2025_2026_check" CHECK ((("math_average_2025_2026" >= (0)::numeric) AND ("math_average_2025_2026" <= (20)::numeric)))
);


ALTER TABLE "public"."student_profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."my_students" AS
 SELECT "sp"."user_id",
    "p"."full_name",
    "p"."email",
    "sp"."grade_level",
    "sp"."math_average_2024_2025",
    "sp"."math_average_2025_2026",
    "sp"."teacher_id"
   FROM ("public"."student_profiles" "sp"
     JOIN "public"."profiles" "p" ON (("p"."id" = "sp"."user_id")));


ALTER VIEW "public"."my_students" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "test_id" "text" NOT NULL,
    "external_id" "text" NOT NULL,
    "prompt" "text",
    "options" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "correct_answer" "jsonb",
    "competencies" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "position" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schools" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "city" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."schools" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."students" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."students" OWNER TO "postgres";


COMMENT ON TABLE "public"."students" IS 'students';



CREATE TABLE IF NOT EXISTS "public"."test_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "test_id" "text" NOT NULL,
    "status" "public"."session_status" DEFAULT 'in-progress'::"public"."session_status" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "total_ms" integer,
    "score" numeric(5,2),
    "correct_count" integer,
    "total_questions" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."test_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tests" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "domain" "text" NOT NULL,
    "description" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trial_results" (
    "id" bigint NOT NULL,
    "session_id" "uuid" NOT NULL,
    "question_index" integer NOT NULL,
    "question_id" "text" NOT NULL,
    "selected" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "free_text" "text",
    "correct" boolean DEFAULT false NOT NULL,
    "score" numeric(4,3) DEFAULT 0 NOT NULL,
    "reaction_time_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."trial_results" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."trial_results_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."trial_results_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."trial_results_id_seq" OWNED BY "public"."trial_results"."id";



ALTER TABLE "public"."students" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."user_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."trial_results" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."trial_results_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."geometry_session_capacity_scores"
    ADD CONSTRAINT "geometry_session_capacity_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."geometry_session_capacity_scores"
    ADD CONSTRAINT "geometry_session_capacity_scores_session_id_ck_code_key" UNIQUE ("session_id", "ck_code");



ALTER TABLE ONLY "public"."geometry_session_part_scores"
    ADD CONSTRAINT "geometry_session_part_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."geometry_session_part_scores"
    ADD CONSTRAINT "geometry_session_part_scores_session_id_part_number_key" UNIQUE ("session_id", "part_number");



ALTER TABLE ONLY "public"."metrics"
    ADD CONSTRAINT "metrics_pkey" PRIMARY KEY ("user_id", "test_id", "period");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_test_id_external_id_key" UNIQUE ("test_id", "external_id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_profiles"
    ADD CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."test_sessions"
    ADD CONSTRAINT "test_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tests"
    ADD CONSTRAINT "tests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trial_results"
    ADD CONSTRAINT "trial_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "user_pkey" PRIMARY KEY ("id");



CREATE INDEX "geometry_cap_session_idx" ON "public"."geometry_session_capacity_scores" USING "btree" ("session_id");



CREATE INDEX "geometry_part_session_idx" ON "public"."geometry_session_part_scores" USING "btree" ("session_id");



CREATE INDEX "metrics_test_period_idx" ON "public"."metrics" USING "btree" ("test_id", "period");



CREATE INDEX "profiles_role_idx" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "profiles_school_idx" ON "public"."profiles" USING "btree" ("school_id");



CREATE INDEX "questions_test_idx" ON "public"."questions" USING "btree" ("test_id", "position");



CREATE INDEX "schools_active_idx" ON "public"."schools" USING "btree" ("is_active");



CREATE INDEX "student_profiles_teacher_idx" ON "public"."student_profiles" USING "btree" ("teacher_id");



CREATE INDEX "test_sessions_status_idx" ON "public"."test_sessions" USING "btree" ("status");



CREATE INDEX "test_sessions_test_idx" ON "public"."test_sessions" USING "btree" ("test_id", "completed_at" DESC);



CREATE INDEX "test_sessions_user_idx" ON "public"."test_sessions" USING "btree" ("user_id", "started_at" DESC);



CREATE INDEX "tests_domain_idx" ON "public"."tests" USING "btree" ("domain") WHERE "is_active";



CREATE INDEX "trial_results_session_idx" ON "public"."trial_results" USING "btree" ("session_id", "question_index");



CREATE OR REPLACE TRIGGER "trg_profiles_touch" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_schools_touch" BEFORE UPDATE ON "public"."schools" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_student_profiles_touch" BEFORE UPDATE ON "public"."student_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_test_sessions_touch" BEFORE UPDATE ON "public"."test_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_tests_touch" BEFORE UPDATE ON "public"."tests" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



ALTER TABLE ONLY "public"."geometry_session_capacity_scores"
    ADD CONSTRAINT "geometry_session_capacity_scores_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."test_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."geometry_session_part_scores"
    ADD CONSTRAINT "geometry_session_part_scores_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."test_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."metrics"
    ADD CONSTRAINT "metrics_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."metrics"
    ADD CONSTRAINT "metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_profiles"
    ADD CONSTRAINT "student_profiles_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."student_profiles"
    ADD CONSTRAINT "student_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_sessions"
    ADD CONSTRAINT "test_sessions_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."test_sessions"
    ADD CONSTRAINT "test_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trial_results"
    ADD CONSTRAINT "trial_results_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."test_sessions"("id") ON DELETE CASCADE;



CREATE POLICY "gcap_admin_all" ON "public"."geometry_session_capacity_scores" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "gcap_self_insert" ON "public"."geometry_session_capacity_scores" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."test_sessions" "s"
  WHERE (("s"."id" = "geometry_session_capacity_scores"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "gcap_self_select" ON "public"."geometry_session_capacity_scores" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."test_sessions" "s"
  WHERE (("s"."id" = "geometry_session_capacity_scores"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "gcap_teacher_read" ON "public"."geometry_session_capacity_scores" FOR SELECT USING (("public"."is_teacher"() AND (EXISTS ( SELECT 1
   FROM "public"."test_sessions" "s"
  WHERE (("s"."id" = "geometry_session_capacity_scores"."session_id") AND "public"."is_my_student"("s"."user_id"))))));



ALTER TABLE "public"."geometry_session_capacity_scores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."geometry_session_part_scores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "gpart_admin_all" ON "public"."geometry_session_part_scores" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "gpart_self_insert" ON "public"."geometry_session_part_scores" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."test_sessions" "s"
  WHERE (("s"."id" = "geometry_session_part_scores"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "gpart_self_select" ON "public"."geometry_session_part_scores" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."test_sessions" "s"
  WHERE (("s"."id" = "geometry_session_part_scores"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "gpart_teacher_read" ON "public"."geometry_session_part_scores" FOR SELECT USING (("public"."is_teacher"() AND (EXISTS ( SELECT 1
   FROM "public"."test_sessions" "s"
  WHERE (("s"."id" = "geometry_session_part_scores"."session_id") AND "public"."is_my_student"("s"."user_id"))))));



CREATE POLICY "m_admin_all" ON "public"."metrics" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "m_self_read" ON "public"."metrics" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "m_teacher_read" ON "public"."metrics" FOR SELECT USING (("public"."is_teacher"() AND "public"."is_my_student"("user_id")));



ALTER TABLE "public"."metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_admin_read" ON "public"."profiles" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "profiles_admin_update" ON "public"."profiles" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "profiles_self_read" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_self_update" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "profiles_teacher_directory" ON "public"."profiles" FOR SELECT USING ((("role" = 'teacher'::"public"."user_role") AND ("auth"."uid"() IS NOT NULL)));



CREATE POLICY "profiles_teacher_read" ON "public"."profiles" FOR SELECT USING (("public"."is_teacher"() AND "public"."is_my_student"("id")));



ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "questions_admin_write" ON "public"."questions" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "questions_read_authed" ON "public"."questions" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."schools" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "schools_public_read" ON "public"."schools" FOR SELECT USING (("is_active" = true));



CREATE POLICY "schools_super_admin_all" ON "public"."schools" USING ("public"."is_super_admin"()) WITH CHECK ("public"."is_super_admin"());



CREATE POLICY "sp_admin_all" ON "public"."student_profiles" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "sp_self_rw" ON "public"."student_profiles" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "sp_teacher_read" ON "public"."student_profiles" FOR SELECT USING (("public"."is_teacher"() AND ("teacher_id" = "auth"."uid"())));



ALTER TABLE "public"."student_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."students" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."test_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tests_admin_write" ON "public"."tests" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "tests_read_authed" ON "public"."tests" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "tr_admin_all" ON "public"."trial_results" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "tr_self_insert" ON "public"."trial_results" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."test_sessions" "s"
  WHERE (("s"."id" = "trial_results"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "tr_self_select" ON "public"."trial_results" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."test_sessions" "s"
  WHERE (("s"."id" = "trial_results"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "tr_teacher_read" ON "public"."trial_results" FOR SELECT USING (("public"."is_teacher"() AND (EXISTS ( SELECT 1
   FROM "public"."test_sessions" "s"
  WHERE (("s"."id" = "trial_results"."session_id") AND "public"."is_my_student"("s"."user_id"))))));



ALTER TABLE "public"."trial_results" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ts_admin_all" ON "public"."test_sessions" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "ts_self_insert" ON "public"."test_sessions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "ts_self_select" ON "public"."test_sessions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "ts_self_update" ON "public"."test_sessions" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "ts_teacher_read" ON "public"."test_sessions" FOR SELECT USING (("public"."is_teacher"() AND "public"."is_my_student"("user_id")));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_my_student"("student" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_my_student"("student" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_my_student"("student" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_teacher"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_teacher"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_teacher"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."role_of"("uid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."role_of"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."role_of"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."role_of"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."geometry_session_capacity_scores" TO "anon";
GRANT ALL ON TABLE "public"."geometry_session_capacity_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."geometry_session_capacity_scores" TO "service_role";



GRANT ALL ON TABLE "public"."geometry_session_part_scores" TO "anon";
GRANT ALL ON TABLE "public"."geometry_session_part_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."geometry_session_part_scores" TO "service_role";



GRANT ALL ON TABLE "public"."metrics" TO "anon";
GRANT ALL ON TABLE "public"."metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."metrics" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."student_profiles" TO "anon";
GRANT ALL ON TABLE "public"."student_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."student_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."my_students" TO "anon";
GRANT ALL ON TABLE "public"."my_students" TO "authenticated";
GRANT ALL ON TABLE "public"."my_students" TO "service_role";



GRANT ALL ON TABLE "public"."questions" TO "anon";
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT ALL ON TABLE "public"."schools" TO "anon";
GRANT ALL ON TABLE "public"."schools" TO "authenticated";
GRANT ALL ON TABLE "public"."schools" TO "service_role";



GRANT ALL ON TABLE "public"."students" TO "anon";
GRANT ALL ON TABLE "public"."students" TO "authenticated";
GRANT ALL ON TABLE "public"."students" TO "service_role";



GRANT ALL ON TABLE "public"."test_sessions" TO "anon";
GRANT ALL ON TABLE "public"."test_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."test_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."tests" TO "anon";
GRANT ALL ON TABLE "public"."tests" TO "authenticated";
GRANT ALL ON TABLE "public"."tests" TO "service_role";



GRANT ALL ON TABLE "public"."trial_results" TO "anon";
GRANT ALL ON TABLE "public"."trial_results" TO "authenticated";
GRANT ALL ON TABLE "public"."trial_results" TO "service_role";



GRANT ALL ON SEQUENCE "public"."trial_results_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."trial_results_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."trial_results_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































