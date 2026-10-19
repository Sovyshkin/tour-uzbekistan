require('reflect-metadata');

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { AdminContentService } = require('../dist/admin/content/admin-content.service');
const { AdminContentType } = require('../dist/admin/content/dto/admin-content-query.dto');

test('service and news rich content keeps HTML as one block and preserves legacy paragraphs', async () => {
  const updates = [];
  const prisma = {
    serviceTranslation: { updateMany: async (value) => updates.push(value) },
    newsTranslation: { updateMany: async (value) => updates.push(value) },
  };
  const service = new AdminContentService(prisma);
  const html = '<h2>Heading</h2>\n<p>First paragraph</p><ul><li>Item</li></ul>';

  await service.updateTranslations(AdminContentType.SERVICES, 'service-id', {
    translations: [{ locale: 'ru', fields: { content: html } }],
  });
  await service.updateTranslations(AdminContentType.NEWS, 'news-id', {
    translations: [{ locale: 'en', fields: { content: html } }],
  });

  assert.deepEqual(updates[0].data.content, [html]);
  assert.deepEqual(updates[1].data.content, [html]);
  assert.deepEqual(service.readServiceContent('First line\nSecond line'), ['First line', 'Second line']);
  assert.deepEqual(service.readServiceContent(['Old paragraph', 'Another paragraph']), ['Old paragraph', 'Another paragraph']);
});

test('a new news record saves content for each locale', async () => {
  let created;
  const service = new AdminContentService({
    news: { create: async ({ data }) => { created = data; return { id: 'news-id' }; } },
  });
  service.list = async () => [{ id: 'news-id' }];

  await service.createNews({
    slug: 'sample-news',
    translations: [
      { locale: 'ru', fields: { title: 'Новость', content: '<p>Текст</p>' } },
      { locale: 'en', fields: { title: 'News', content: '<p>Text</p>' } },
    ],
  });

  assert.deepEqual(created.translations.create.find((item) => item.locale === 'ru').content, ['<p>Текст</p>']);
  assert.deepEqual(created.translations.create.find((item) => item.locale === 'en').content, ['<p>Text</p>']);
});
