import type { CollectionConfig } from 'payload';
import { editRepoAndPush } from '@/functions/github';

export const Games: CollectionConfig = {
  slug: 'games',
  access: {
    read: () => true,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, originalDoc }) => {
        const isCreated = operation === 'create';
        const slugChanged = data.slug && data.slug !== originalDoc.slug;
        if (!data.repoUrl && (isCreated || slugChanged)) {
          const finalSlug = data.slug || originalDoc.slug;
          data.repoUrl = `${process.env.GITHUB_PUSH_URL}/${finalSlug}`;
        }
        return data;
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation === 'create') {
          const abilityIds = doc.abilities as string[];
          if (abilityIds?.length) {
            const fullAbilities = await req.payload.find({
              collection: 'abilities',
              where: {
                id: {
                  in: abilityIds,
                },
              },
              depth: 2,
              pagination: false,
            });
            doc.abilities = fullAbilities.docs;
          }
          const eventIds = doc.events as string[];
          if (eventIds?.length) {
            const fullEvents = await req.payload.find({
              collection: 'events',
              where: {
                id: {
                  in: eventIds,
                },
              },
              depth: 2,
              pagination: false,
            });
            doc.events = fullEvents.docs;
          }
          if (process.env.GITHUB_SKIP_REPO !== 'true') {
            await editRepoAndPush(doc);
            req.payload.logger.info('Creating repo edit and push');
          } else {
            req.payload.logger.info('Skipping repo edit and push');
          }
        }
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'media',
      type: 'array',
      fields: [
        {
          name: 'mediaField',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'type',
          type: 'select',
          options: [
            { label: 'Image', value: 'image' },
            { label: 'Video', value: 'video' },
            { label: 'Audio', value: 'audio' },
            { label: 'File', value: 'file' },
          ],
          required: true,
        },
      ],
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
    },
    {
      name: 'tags',
      type: 'array',
      fields: [
        {
          name: 'tag',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'guide',
      type: 'richText',
      required: true,
    },
    {
      name: 'abilities',
      type: 'relationship',
      relationTo: 'abilities',
      hasMany: true,
    },
    {
      name: 'events',
      type: 'relationship',
      relationTo: 'events',
      hasMany: true,
    },
    {
      name: 'repoUrl',
      type: 'text',
      required: true,
      admin: {
        readOnly: false,
        disabled: false,
      },
    },
  ],
};
