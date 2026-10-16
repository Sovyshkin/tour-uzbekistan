CREATE UNIQUE INDEX "User_single_super_admin" ON "User" ("role") WHERE "role" = 'SUPER_ADMIN';
