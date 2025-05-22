DROP TABLE IF EXISTS public.breeds CASCADE;
-- Create breeds table
create table public.breeds (
  id bigint generated always as identity primary key,
  name varchar(255) not null
);

comment on table public.breeds is 'Stores information about different horse breeds available in the game.';

DROP TABLE IF EXISTS public.users CASCADE;
-- Create users table
create table public.users (
  id bigint generated always as identity primary key,
  username varchar(255) not null unique, -- Added unique constraint for username
  email varchar(255) unique -- Added unique constraint for email
);

comment on table public.users is 'Stores information about registered users/players.';

DROP TABLE IF EXISTS public.stables CASCADE;
-- Create stables table  
create table public.stables (
  id bigint generated always as identity primary key,
  name varchar(255) not null,
  location varchar(255)
  -- Consider adding a user_id to link stables to owners if a user can own multiple stables
  -- owner_id bigint references public.users(id) 
);

comment on table public.stables is 'Stores information about stables where horses can be kept.';

DROP TABLE IF EXISTS public.horses CASCADE;
-- Create the horses table with all required fields
create table public.horses (
  id bigint generated always as identity primary key,
  name varchar(255) not null,
  sex varchar(50) not null check (sex in ('Stallion', 'Mare', 'Colt', 'Filly')),
  date_of_birth date not null,
  breed_id bigint references public.breeds(id),
  owner_id bigint references public.users(id) on delete set null,
  stable_id bigint references public.stables(id) on delete set null,

  genotype jsonb,
  phenotypic_markings jsonb,
  final_display_color varchar(255),
  shade varchar(100),
  image_url varchar(1024) default '/images/samplehorse.JPG',

  trait varchar(100),
  temperament varchar(50),
  precision integer default 0 check (precision >= 0 and precision <= 100),
  strength integer default 0 check (strength >= 0 and strength <= 100),
  speed integer default 0 check (speed >= 0 and speed <= 100),
  agility integer default 0 check (agility >= 0 and agility <= 100),
  endurance integer default 0 check (endurance >= 0 and endurance <= 100),
  intelligence integer default 0 check (intelligence >= 0 and intelligence <= 100),
  personality integer default 0 check (personality >= 0 and personality <= 100),
  total_earnings integer default 0 check (total_earnings >= 0),

  sire_id bigint references public.horses(id) on delete set null, -- Added ON DELETE SET NULL for sires
  dam_id bigint references public.horses(id) on delete set null,   -- Added ON DELETE SET NULL for dams

  stud_status varchar(50) default 'Not at Stud' check (stud_status in ('Not at Stud', 'Public Stud', 'Private Stud')),
  stud_fee integer default 0 check (stud_fee >= 0),
  last_bred_date date,
  for_sale boolean default false,
  sale_price integer default 0 check (sale_price >= 0),

  health_status varchar(50) default 'Excellent' check (health_status in ('Excellent', 'Very Good', 'Good', 'Fair', 'Poor')),
  last_vetted_date date default current_date,

  tack jsonb default '{}'::jsonb
);

comment on table public.horses is 'Stores information about individual horses in the game, including their genetics, stats, lineage, and status.'; 