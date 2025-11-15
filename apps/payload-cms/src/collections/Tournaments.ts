import type { CollectionConfig } from 'payload';

export const Tournaments: CollectionConfig = {
  slug: 'tournaments',
  access: {
    read: () => true,
    create: ({ req: { user } }) => {
      return Boolean(user);
    },
    update: ({ req: { user } }) => {
      return Boolean(user);
    },
    delete: ({ req: { user } }) => {
      return Boolean(user);
    },
  },
  admin: {
    useAsTitle: 'name',
    description: 'Manage tournaments and competitive events',
  },
  fields: [
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: 'Tournament Slug',
      admin: {
        description: 'URL-friendly identifier for this tournament (e.g., "summer-championship-2024")',
        position: 'sidebar',
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Tournament Name',
      admin: {
        description: 'Give your tournament a descriptive name',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
      label: 'Tournament Description',
      admin: {
        description: 'Describe the tournament, rules, and prizes',
      },
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      label: 'Tournament Date',
      admin: {
        description: 'The date when the tournament will take place',
        date: {
          pickerAppearance: 'dayOnly',
        },
      },
    },
    {
      name: 'time',
      type: 'text',
      required: true,
      label: 'Tournament Time',
      admin: {
        description: 'The time when the tournament will start (e.g., "14:30" or "2:30 PM")',
      },
    },
    {
      name: 'game',
      type: 'relationship',
      relationTo: 'games',
      required: true,
      label: 'Game',
      admin: {
        description: 'Select the game for this tournament',
      },
    },
    {
      name: 'maxPlayers',
      type: 'number',
      required: true,
      label: 'Maximum Number of Players',
      admin: {
        description: 'Maximum number of players that can participate in this tournament',
      },
      min: 2,
      defaultValue: 10,
    },
  ],
};

