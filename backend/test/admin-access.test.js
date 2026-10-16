require('reflect-metadata');

const assert = require('node:assert/strict');
const { test } = require('node:test');
const bcrypt = require('bcrypt');
const { UserRole, UserStatus } = require('@prisma/client');
const { AdminRecordsService } = require('../dist/admin/records/admin-records.service');
const { AdminRecordsController } = require('../dist/admin/records/admin-records.controller');
const { AdminRecordType } = require('../dist/admin/records/dto/admin-records-query.dto');
const { AdminContentController } = require('../dist/admin/content/admin-content.controller');
const { AdminContentType } = require('../dist/admin/content/dto/admin-content-query.dto');
const { JwtStrategy } = require('../dist/auth/jwt.strategy');
const { AuthService } = require('../dist/auth/auth.service');
const { SuperAdminCredentialsService } = require('../dist/auth/super-admin-credentials.service');
const { AdminAuthService } = require('../dist/admin/auth/admin-auth.service');
const { createAuthTag } = require('../dist/auth/auth-tag.util');
const { ROLES_KEY } = require('../dist/auth/decorators/roles.decorator');
const { AdminDashboardController } = require('../dist/admin/dashboard/admin-dashboard.controller');
const { AdminAuditController } = require('../dist/admin/audit/admin-audit.controller');
const { AdminIncomingSearchController } = require('../dist/admin/incoming-search/admin-incoming-search.controller');
const { AdminIncomingMappingsController } = require('../dist/admin/incoming-mappings/admin-incoming-mappings.controller');
const { AdminMediaController } = require('../dist/admin/media/admin-media.controller');
const { AdminDepartureCitiesController } = require('../dist/admin/departure-cities/admin-departure-cities.controller');
const { AdminAuthController } = require('../dist/admin/auth/admin-auth.controller');

const manager = { sub: 'manager-id', role: UserRole.MANAGER };
const admin = { sub: 'admin-id', role: UserRole.ADMIN };
const superAdmin = { sub: 'super-id', role: UserRole.SUPER_ADMIN };
const transactional = (prisma) => ({ ...prisma, $transaction: async (callback) => callback(prisma) });

test('all CMS routes include super administrator and exclude partner and customer', () => {
  for (const controller of [AdminRecordsController, AdminContentController, AdminDashboardController,
    AdminAuditController, AdminIncomingSearchController, AdminIncomingMappingsController,
    AdminMediaController, AdminDepartureCitiesController]) {
    const roles = Reflect.getMetadata(ROLES_KEY, controller);
    assert.ok(roles.includes(UserRole.SUPER_ADMIN), controller.name);
    assert.ok(!roles.includes(UserRole.PARTNER), controller.name);
    assert.ok(!roles.includes(UserRole.CUSTOMER), controller.name);
  }
  const meRoles = Reflect.getMetadata(ROLES_KEY, AdminAuthController.prototype.me);
  assert.ok(meRoles.includes(UserRole.SUPER_ADMIN));
});

test('manager cannot list, create, update, or archive users and partners', async () => {
  const service = new AdminRecordsService({}, {}, {});
  const controller = new AdminRecordsController(service, {});
  for (const type of [AdminRecordType.USERS, AdminRecordType.PARTNERS]) {
    assert.throws(() => controller.list({ type }, { user: manager }), { status: 403 });
    await assert.rejects(service.create(type, {}, manager), { status: 403 });
    await assert.rejects(service.update(type, 'target-id', {}, manager), { status: 403 });
    await assert.rejects(service.archive(type, 'target-id', manager), { status: 403 });
  }
});

test('manager can access editorial content but not site settings', async () => {
  const content = { list: async () => [], update: async () => ({ id: 'entry-id' }) };
  const controller = new AdminContentController(content, { log: async () => {} });
  assert.deepEqual(await controller.list({ type: AdminContentType.TOURS }, { user: manager }), []);
  assert.throws(() => controller.list({ type: AdminContentType.SITE_SETTINGS }, { user: manager }), { status: 403 });
  await assert.rejects(controller.update(AdminContentType.SITE_SETTINGS, 'entry-id', {}, { user: manager }), { status: 403 });
});

test('administrator cannot modify, archive, delete, or reset another administrator', async () => {
  const prisma = {
    user: {
      findUnique: async () => ({ id: 'peer-id', role: UserRole.ADMIN, partnerId: null, status: UserStatus.ACTIVE, passwordHash: 'hash' }),
      update: async () => assert.fail('administrator was modified'),
      delete: async () => assert.fail('administrator was deleted'),
    },
  };
  const service = new AdminRecordsService(transactional(prisma), {}, {});
  await assert.rejects(service.update(AdminRecordType.USERS, 'peer-id', { userStatus: UserStatus.SUSPENDED }, admin), { status: 403 });
  await assert.rejects(service.archive(AdminRecordType.USERS, 'peer-id', admin), { status: 403 });
  await assert.rejects(service.deleteUser('peer-id', admin), { status: 403 });
  await assert.rejects(service.updateUserPassword('peer-id', 'new-password', admin), { status: 403 });
});

test('only super administrator may create or promote privileged accounts', async () => {
  const service = new AdminRecordsService(transactional({ user: { findUnique: async () => ({ role: UserRole.MANAGER, partnerId: null, status: UserStatus.ACTIVE }) } }), {}, {});
  for (const role of [UserRole.ADMIN, UserRole.SUPER_ADMIN]) {
    await assert.rejects(service.create(AdminRecordType.USERS, { email: 'new@example.com', password: 'password123', role }, admin), { status: 403 });
    await assert.rejects(service.update(AdminRecordType.USERS, 'user-id', { role }, admin), { status: 403 });
  }
});

test('nobody can assign super administrator through user records', async () => {
  const service = new AdminRecordsService({}, {}, {});
  for (const actor of [superAdmin, admin]) {
    await assert.rejects(service.create(AdminRecordType.USERS, {
      email: 'new@example.com', password: 'password123', role: UserRole.SUPER_ADMIN,
    }, actor), { status: 403 });
    await assert.rejects(service.update(AdminRecordType.USERS, 'user-id', {
      role: UserRole.SUPER_ADMIN, newPassword: 'fresh-password',
    }, actor), { status: 403 });
  }
});

test('super administrator can manage an administrator and reset a peer password', async () => {
  const passwordHash = await bcrypt.hash('old-password', 4);
  const updates = [];
  const prisma = {
    user: {
      findUnique: async () => ({ role: UserRole.ADMIN, partnerId: null, status: UserStatus.ACTIVE, passwordHash }),
      update: async (value) => { updates.push(value); },
    },
  };
  const service = new AdminRecordsService(transactional(prisma), {}, {});
  service.list = async () => [];
  await service.update(AdminRecordType.USERS, 'admin-id', { userStatus: UserStatus.SUSPENDED }, superAdmin);
  await service.updateUserPassword('admin-id', 'new-password', superAdmin);
  assert.equal(updates[0].data.status, UserStatus.SUSPENDED);
  assert.equal(updates[1].data.refreshTokenHash, null);
});

test('promotion to administrator requires a fresh password and revokes old sessions', async () => {
  let update;
  const prisma = {
    user: {
      findUnique: async () => ({ role: UserRole.MANAGER, partnerId: null, status: UserStatus.ACTIVE }),
      update: async (value) => { update = value; },
    },
  };
  const service = new AdminRecordsService(transactional(prisma), {}, {});
  service.list = async () => [];
  await assert.rejects(service.update(AdminRecordType.USERS, 'manager-id', { role: UserRole.ADMIN }, superAdmin), { status: 400 });
  assert.equal(update, undefined);
  await service.update(AdminRecordType.USERS, 'manager-id', { role: UserRole.ADMIN, newPassword: 'fresh-password' }, superAdmin);
  assert.equal(update.data.role, UserRole.ADMIN);
  assert.equal(update.data.refreshTokenHash, null);
  assert.equal(await bcrypt.compare('fresh-password', update.data.passwordHash), true);
});

test('the system super administrator cannot be edited, suspended, deleted, or have its password changed', async () => {
  const user = { role: UserRole.SUPER_ADMIN, partnerId: null, status: UserStatus.ACTIVE };
  const prisma = {
    user: { findUnique: async () => user, count: async () => 1, update: async () => assert.fail('last super admin changed') },
  };
  const service = new AdminRecordsService(transactional(prisma), {}, {});
  await assert.rejects(service.archive(AdminRecordType.USERS, 'peer-super-id', superAdmin), { status: 403 });
  await assert.rejects(service.update(AdminRecordType.USERS, 'peer-super-id', { role: UserRole.ADMIN }, superAdmin), { status: 403 });
  await assert.rejects(service.deleteUser('peer-super-id', superAdmin), { status: 403 });
  await assert.rejects(service.updateUserPassword('peer-super-id', 'new-password', superAdmin), { status: 403 });
});

test('CMS accepts staff roles only, and the agent login accepts partners only', async () => {
  const cms = new AdminAuthService({}, {});
  for (const role of [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]) {
    assert.doesNotThrow(() => cms.ensureAdminRole(role, UserStatus.ACTIVE));
    assert.throws(() => cms.ensureAdminRole(role, UserStatus.SUSPENDED), { status: 401 });
  }
  for (const role of [UserRole.PARTNER, UserRole.CUSTOMER]) {
    assert.throws(() => cms.ensureAdminRole(role, UserStatus.ACTIVE), { status: 401 });
  }
  const passwordHash = await bcrypt.hash('password123', 4);
  for (const role of [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CUSTOMER]) {
    const auth = new AuthService({ user: { findUnique: async () => ({ id: 'id', email: 'user@example.com', role, status: UserStatus.ACTIVE, passwordHash }) } }, {}, { get: () => undefined });
    await assert.rejects(auth.loginPartner({ email: 'user@example.com', password: 'password123' }), { status: 401 });
  }
  const partnerAuth = new AuthService({ user: { findUnique: async () => ({ id: 'id', email: 'user@example.com', role: UserRole.PARTNER, status: UserStatus.ACTIVE, passwordHash }) } }, {}, {});
  await assert.rejects(partnerAuth.loginCms({ email: 'user@example.com', password: 'password123' }), { status: 401 });
});

test('super administrator login accepts only the configured password', async () => {
  const user = {
    id: 'system-id', email: 'root@example.com', role: UserRole.SUPER_ADMIN,
    status: UserStatus.ACTIVE, passwordHash: await bcrypt.hash('database-password', 4),
  };
  const auth = new AuthService(
    { user: { findUnique: async () => user } }, {},
    { get: (key) => ({ SUPER_ADMIN_EMAIL: 'root@example.com', SUPER_ADMIN_PASSWORD: 'environment-password' })[key] },
  );
  await assert.rejects(auth.authenticateUser({ email: user.email, password: 'database-password' }), { status: 401 });
  assert.equal((await auth.authenticateUser({ email: user.email, password: 'environment-password' })).id, user.id);
  await assert.rejects(auth.authenticateUser({ email: 'wrong@example.com', password: 'environment-password' }), { status: 401 });
});

test('startup creates one system account and rotates credentials with session revocation', async () => {
  const password = 'long-system-password';
  let account;
  const changes = [];
  const user = {
    findMany: async () => account ? [account] : [],
    findUnique: async () => null,
    create: async ({ data }) => { changes.push(data); account = { id: 'system-id', ...data, partnerId: null }; },
    update: async ({ data }) => { changes.push(data); account = { ...account, ...data }; },
  };
  const prisma = { user, $queryRaw: async () => [], $transaction: async (callback) => callback(prisma) };
  let email = 'root@example.com';
  const config = { get: (key) => ({ SUPER_ADMIN_EMAIL: email, SUPER_ADMIN_PASSWORD: password })[key] };
  const service = new SuperAdminCredentialsService(prisma, config);
  await service.onApplicationBootstrap();
  assert.equal(account.role, UserRole.SUPER_ADMIN);
  assert.equal(account.email, email);
  const initialHash = account.passwordHash;
  await service.onApplicationBootstrap();
  assert.equal(changes.length, 1);
  email = 'new-root@example.com';
  await service.onApplicationBootstrap();
  assert.notEqual(account.passwordHash, initialHash);
  assert.equal(account.refreshTokenHash, null);
  assert.equal(account.email, email);
  user.findMany = async () => [account, { ...account, id: 'other-id' }];
  await assert.rejects(service.onApplicationBootstrap(), /More than one super administrator/);
});

test('deactivating or deleting a partner suspends linked agent accounts', async () => {
  const changes = [];
  const prisma = {
    partner: { count: async () => 1, update: async () => {}, delete: async () => {} },
    user: { updateMany: async (value) => { changes.push(value); } },
  };
  const service = new AdminRecordsService(transactional(prisma), {}, {});
  service.list = async () => [];
  await service.update(AdminRecordType.PARTNERS, 'partner-id', { isActive: false }, admin);
  await service.deletePartner('partner-id', admin);
  assert.equal(changes.length, 2);
  for (const change of changes) {
    assert.equal(change.where.role, UserRole.PARTNER);
    assert.equal(change.data.status, UserStatus.SUSPENDED);
  }
});

test('only super administrator can permanently delete leads and bookings', async () => {
  const deleted = [];
  const prisma = {
    lead: { deleteMany: async ({ where }) => { deleted.push(['lead', where.id]); return { count: 1 }; } },
    booking: { deleteMany: async ({ where }) => { deleted.push(['booking', where.id]); return { count: 1 }; } },
  };
  const service = new AdminRecordsService(prisma, {}, {});
  service.list = async () => [];
  for (const type of [AdminRecordType.LEADS, AdminRecordType.BOOKINGS]) {
    for (const actor of [admin, manager, { sub: 'partner-id', role: UserRole.PARTNER }]) {
      await assert.rejects(service.deleteOperationalRecord(type, 'target-id', actor), { status: 403 });
    }
    await service.deleteOperationalRecord(type, 'target-id', superAdmin);
  }
  assert.deepEqual(deleted, [['lead', 'target-id'], ['booking', 'target-id']]);
  assert.deepEqual(Reflect.getMetadata(ROLES_KEY, AdminRecordsController.prototype.deleteLead), [UserRole.SUPER_ADMIN]);
  assert.deepEqual(Reflect.getMetadata(ROLES_KEY, AdminRecordsController.prototype.deleteBooking), [UserRole.SUPER_ADMIN]);
});

test('permanent deletion returns 404 for a missing record and records an audit event after success', async () => {
  const service = new AdminRecordsService({ lead: { deleteMany: async () => ({ count: 0 }) } }, {}, {});
  await assert.rejects(service.deleteOperationalRecord(AdminRecordType.LEADS, 'missing-id', superAdmin), { status: 404 });

  const events = [];
  const controller = new AdminRecordsController(
    { deleteOperationalRecord: async () => [] },
    { log: async (event) => { events.push(event); } },
  );
  const req = { user: { ...superAdmin, email: 'super@example.com' } };
  await controller.deleteBooking('booking-id', req);
  assert.equal(events[0].action, 'DELETE');
  assert.equal(events[0].entityType, 'record:bookings');
  assert.equal(events[0].entityId, 'booking-id');
});

test('administrator password change requires current password and revokes refresh tokens', async () => {
  const passwordHash = await bcrypt.hash('old-password', 4);
  let update;
  const prisma = {
    user: {
      findUnique: async () => ({ role: UserRole.ADMIN, passwordHash }),
      update: async (value) => { update = value; },
    },
  };
  const service = new AdminRecordsService(transactional(prisma), {}, {});
  service.list = async () => [];
  await assert.rejects(service.updateUserPassword('admin-id', 'new-password', admin), { status: 403 });
  await assert.rejects(service.updateUserPassword('admin-id', 'new-password', admin, 'wrong-password'), { status: 403 });
  assert.equal(update, undefined);
  await service.updateUserPassword('admin-id', 'new-password', admin, 'old-password');
  assert.equal(update.data.refreshTokenHash, null);
  assert.equal(await bcrypt.compare('new-password', update.data.passwordHash), true);
});

test('inactive user and changed password invalidate access tokens; current DB role wins', async () => {
  const user = {
    email: 'user@example.com', role: UserRole.MANAGER, status: UserStatus.ACTIVE,
    passwordHash: 'hash-1', refreshTokenHash: 'refresh-hash',
  };
  const context = {
    prisma: { user: { findUnique: async () => user } },
    configService: { getOrThrow: () => 'test-secret' },
  };
  const payload = {
    sub: 'user-id', email: user.email, role: UserRole.ADMIN,
    authTag: createAuthTag(user.passwordHash, 'test-secret'),
  };
  assert.equal((await JwtStrategy.prototype.validate.call(context, payload)).role, UserRole.MANAGER);
  user.status = UserStatus.SUSPENDED;
  await assert.rejects(JwtStrategy.prototype.validate.call(context, payload), { status: 401 });
  user.status = UserStatus.ACTIVE;
  user.passwordHash = 'hash-2';
  await assert.rejects(JwtStrategy.prototype.validate.call(context, payload), { status: 401 });
});

test('partner access token is rejected when its organization is inactive or missing', async () => {
  const user = {
    email: 'partner@example.com', role: UserRole.PARTNER, status: UserStatus.ACTIVE,
    passwordHash: 'hash', refreshTokenHash: 'refresh-hash', partnerId: 'partner-id', partner: { isActive: false },
  };
  const context = { prisma: { user: { findUnique: async () => user } }, configService: { getOrThrow: () => 'test-secret' } };
  const payload = { sub: 'partner-user-id', email: user.email, role: UserRole.PARTNER, authTag: createAuthTag(user.passwordHash, 'test-secret') };
  await assert.rejects(JwtStrategy.prototype.validate.call(context, payload), { status: 401 });
  user.partner.isActive = true;
  assert.equal((await JwtStrategy.prototype.validate.call(context, payload)).role, UserRole.PARTNER);
  user.partnerId = null;
  await assert.rejects(JwtStrategy.prototype.validate.call(context, payload), { status: 401 });
});

test('partner linkage and administrator active status are validated before role promotion', async () => {
  const prisma = {
    user: { findUnique: async () => ({ role: UserRole.MANAGER, partnerId: null, status: UserStatus.PENDING }) },
  };
  const service = new AdminRecordsService(transactional(prisma), {}, {});
  await assert.rejects(service.update(AdminRecordType.USERS, 'user-id', { role: UserRole.ADMIN }, superAdmin), { status: 400 });
  await assert.rejects(service.update(AdminRecordType.USERS, 'user-id', { role: UserRole.PARTNER }, admin), { status: 400 });
});
