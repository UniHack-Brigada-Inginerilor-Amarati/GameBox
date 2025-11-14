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
          name: 'mentalFortitudeComposure',
          type: 'relationship',
          relationTo: 'games',
          required: true,
          label: 'Mental Fortitude / Composure Game',
          admin: {
            description: 'Select a game that focuses on mental fortitude and composure',
          },
        },
        {
          name: 'adaptabilityDecisionMaking',
          type: 'relationship',
          relationTo: 'games',
          required: true,
          label: 'Adaptability / Decision Making Game',
          admin: {
            description: 'Select a game that focuses on adaptability and decision making',
          },
        },
        {
          name: 'aimMechanicalSkill',
          type: 'relationship',
          relationTo: 'games',
          required: true,
          label: 'Aim / Mechanical Skill Game',
          admin: {
            description: 'Select a game that focuses on aim and mechanical skill',
          },
        },
        {
          name: 'gameSenseAwareness',
          type: 'relationship',
          relationTo: 'games',
          required: true,
          label: 'Game Sense / Awareness Game',
          admin: {
            description: 'Select a game that focuses on game sense and awareness',
          },
        },
        {
          name: 'teamworkCommunication',
          type: 'relationship',
          relationTo: 'games',
          required: true,
          label: 'Teamwork / Communication Game',
          admin: {
            description: 'Select a game that focuses on teamwork and communication',
          },
        },
        {
          name: 'strategy',
          type: 'relationship',
          relationTo: 'games',
          required: true,
          label: 'Strategy Game',
          admin: {
            description: 'Select a game that focuses on strategy',
          },
        },
      ],
    },
  ],
};
