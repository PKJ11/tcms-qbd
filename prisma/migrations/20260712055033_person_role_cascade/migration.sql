-- Make person_roles.personId cascade on Person delete
ALTER TABLE "person_roles" DROP CONSTRAINT "person_roles_personId_fkey";
ALTER TABLE "person_roles" ADD CONSTRAINT "person_roles_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
