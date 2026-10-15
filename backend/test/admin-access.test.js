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
const { createAuthTag } = require('../dist/auth/auth-tag.util');

const manager = { sub: 'manager-id', role: UserRole.MANAGER };
const admin = { sub: 'admin-id', role: UserRole.ADMIN };

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
  const service = new AdminRecordsService(prisma, {}, {});
  await assert.rejects(service.update(AdminRecordType.USERS, 'peer-id', { userStatus: UserStatus.SUSPENDED }, admin), { status: 403 });
  await assert.rejects(service.archive(AdminRecordType.USERS, 'peer-id', admin), { status: 403 });
  await assert.rejects(service.deleteUser('peer-id', admin), { status: 403 });
  await assert.rejects(service.updateUserPassword('peer-id', 'new-password', admin), { status: 403 });
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
  const service = new AdminRecordsService(prisma, {}, {});
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

test('partner linkage and administrator active status are validated before role promotion', async () => {
  const prisma = {
    user: { findUnique: async () => ({ role: UserRole.MANAGER, partnerId: null, status: UserStatus.PENDING }) },
  };
  const service = new AdminRecordsService(prisma, {}, {});
  await assert.rejects(service.update(AdminRecordType.USERS, 'user-id', { role: UserRole.ADMIN }, admin), { status: 400 });
  await assert.rejects(service.update(AdminRecordType.USERS, 'user-id', { role: UserRole.PARTNER }, admin), { status: 400 });
});
