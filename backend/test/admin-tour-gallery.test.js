require('reflect-metadata');

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { AdminContentService } = require('../dist/admin/content/admin-content.service');

test('tour gallery updates image URLs and order without dropping new images', async () => {
  const rows = new Map([
    ['a', { id: 'a', tourId: 'tour-1', imageUrl: '/old-a.jpg', sortOrder: 0 }],
    ['b', { id: 'b', tourId: 'tour-1', imageUrl: '/old-b.jpg', sortOrder: 1 }],
  ]);
  const tourImage = {
    count: async ({ where }) => where.id.in.filter((id) => rows.get(id)?.tourId === where.tourId).length,
    update: async ({ where, data }) => {
      Object.assign(rows.get(where.id), data);
    },
    create: async ({ data }) => {
      const row = { id: 'new', ...data };
      rows.set(row.id, row);
      return row;
    },
    deleteMany: async ({ where }) => {
      for (const row of rows.values()) {
        if (row.tourId === where.tourId && !where.id.notIn.includes(row.id)) rows.delete(row.id);
      }
    },
  };
  const service = new AdminContentService({ tourImage, $transaction: (run) => run({ tourImage }) });

  await service.updateTourImages('tour-1', {
    tourImages: [
      { id: 'b', imageUrl: '/updated-b.jpg' },
      { imageUrl: '/new.jpg' },
    ],
  });

  assert.deepEqual([...rows.values()], [
    { id: 'b', tourId: 'tour-1', imageUrl: '/updated-b.jpg', sortOrder: 0 },
    { id: 'new', tourId: 'tour-1', imageUrl: '/new.jpg', sortOrder: 1 },
  ]);
});

test('tour gallery rejects an image owned by another tour', async () => {
  let transactionCalled = false;
  const service = new AdminContentService({
    tourImage: { count: async () => 0 },
    $transaction: async () => { transactionCalled = true; },
  });

  await assert.rejects(
    service.updateTourImages('tour-1', { tourImages: [{ id: 'foreign', imageUrl: '/image.jpg' }] }),
    /does not belong to this tour/,
  );
  assert.equal(transactionCalled, false);
});
