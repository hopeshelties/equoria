# Database Schema

## Tables
### public.horses
- `id`: INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY
- `name`: VARCHAR
- `sex`: VARCHAR
- `date_of_birth`: DATE
- `breed_id`: INTEGER REFERENCES public.breeds(id)
- `owner_id`: INTEGER REFERENCES public.users(id)
- `stable_id`: INTEGER REFERENCES public.stables(id)
- `genotype`: JSONB
- `phenotypic_markings`: JSONB
- `final_display_color`: VARCHAR
- `shade`: VARCHAR
- `image_url`: VARCHAR
- `trait`: VARCHAR
- `temperament`: VARCHAR
- `precision`: INTEGER
- `strength`: INTEGER
- `speed`: INTEGER
- `agility`: INTEGER
- `endurance`: INTEGER
- `intelligence`: INTEGER
- `personality`: INTEGER
- `total_earnings`: INTEGER
- `sire_id`: INTEGER
- `dam_id`: INTEGER
- `stud_status`: VARCHAR
- `stud_fee`: INTEGER
- `last_bred_date`: DATE
- `for_sale`: BOOLEAN
- `sale_price`: INTEGER
- `health_status`: VARCHAR
- `last_vetted_date`: DATE
- `tack`: JSONB

### public.breeds
- `id`: SERIAL PRIMARY KEY
- `name`: VARCHAR

### public.users
- `id`: SERIAL PRIMARY KEY
- `name`: VARCHAR

### public.stables
- `id`: SERIAL PRIMARY KEY
- `name`: VARCHAR

## Indexes
- `CREATE INDEX idx_horses_owner_id ON public.horses (owner_id);`
- `CREATE INDEX idx_horses_breed_id ON public.horses (breed_id);`

## References
- @docs/architecture.md