import type { CollectionConfig } from 'payload';

export const Missions: CollectionConfig = {
  slug: 'missions',
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
    description: 'Create mission packs with 6 games covering all core abilities',
  },
  fields: [
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: 'Mission Slug',
      admin: {
        description: 'URL-friendly identifier for this mission (e.g., "space-adventure")',
        position: 'sidebar',
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Mission Name',
      unique: true,
      admin: {
        description: 'Give your mission a descriptive name',
      },
    },
    {
      name: 'description',
      type: 'richText',
      required: true,
      label: 'Mission Description',
    },
    {
      name: 'media',
      type: 'upload',
      relationTo: 'media',
      required: false,
      label: 'Mission Media (Image/Video)',
    },
    {
      name: 'games',
      type: 'group',
      required: true,
      label: 'Mission Games by Ability',
      fields: [
        {
          name: 'strengthEndurance',
          type: 'relationship',
          relationTo: 'games',
          required: true,
          label: 'Strength & Endurance Game',
          admin: {
            description: 'Select a game that focuses on physical strength and endurance',
          },
        },
        {
          name: 'agilitySpeed',
          type: 'relationship',
          relationTo: 'games',
          required: true,
          label: 'Agility & Speed Game',
          admin: {
            description: 'Select a game that focuses on agility and speed',
          },
        },
        {
          name: 'aimPrecision',
          type: 'relationship',
          relationTo: 'games',
          required: true,
          label: 'Aim & Precision Game',
          admin: {
            description: 'Select a game that focuses on aim and precision',
          },
        },
        {
          name: 'memoryAttention',
          type: 'relationship',
          relationTo: 'games',
          required: true,
          label: 'Memory & Attention to Detail Game',
          admin: {
            description: 'Select a game that focuses on memory and attention to detail',
          },
        },
        {
          name: 'communication',
          type: 'relationship',
          relationTo: 'games',
          required: true,
          label: 'Communication Game',
          admin: {
            description: 'Select a game that focuses on communication skills',
          },
        },
        {
          name: 'logicProblemSolving',
          type: 'relationship',
          relationTo: 'games',
          required: true,
          label: 'Logic & Problem Solving Game',
          admin: {
            description: 'Select a game that focuses on logic and problem solving',
          },
        },
      ],
    },
  ],
};
