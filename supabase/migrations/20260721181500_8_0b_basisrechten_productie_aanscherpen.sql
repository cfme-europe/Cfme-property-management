-- 0.8B Rollen en rechten
-- Sluit publieke databasetoegang af.
-- Productiegegevens worden niet fysiek verwijderd via applicatierollen.

revoke all privileges
on all tables in schema public
from anon;

revoke all privileges
on all sequences in schema public
from anon;

alter default privileges
in schema public
revoke all privileges
on tables
from anon;

alter default privileges
in schema public
revoke all privileges
on sequences
from anon;

revoke delete, truncate, references, trigger
on all tables in schema public
from authenticated;

alter default privileges
in schema public
revoke delete, truncate, references, trigger
on tables
from authenticated;
