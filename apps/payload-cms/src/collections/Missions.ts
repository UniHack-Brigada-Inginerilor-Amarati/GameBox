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
    description: 'Create mission packs with 1-6 games covering core abilities',
  },
  hooks: {
    beforeValidate: [
      async ({ data, operation, req }) => {
        // Validate that at least one game is selected
        // Skip validation if games object doesn't exist
        if (!data?.games || typeof data.games !== 'object') {
          return data;
        }

        const games = data.games;
        
        // Check if games object is completely empty (no properties or all null/undefined)
        const gameKeys = Object.keys(games);
        if (gameKeys.length === 0) {
          // Empty object - this might be initial form state, skip validation
          return data;
        }

        const gameFields = [
          games.mentalFortitudeComposure,
          games.adaptabilityDecisionMaking,
          games.aimMechanicalSkill,
          games.gameSenseAwareness,
          games.teamworkCommunication,
          games.strategy,
        ];

        // Helper function to check if a game value is valid
        const isValidGame = (game: any): boolean => {
          // Check for null, undefined, or empty string
          if (game === null || game === undefined || game === '') {
            return false;
          }

          // Handle number IDs (Payload relationship fields use numbers)
          if (typeof game === 'number' && !isNaN(game) && game > 0) {
            return true;
          }

          // Handle string IDs (non-empty strings)
          if (typeof game === 'string' && game.trim() !== '') {
            return true;
          }

          // Handle arrays (relationship fields can be arrays)
          if (Array.isArray(game)) {
            return game.length > 0 && game.some((item) => {
              if (typeof item === 'number' && !isNaN(item) && item > 0) return true;
              if (typeof item === 'string' && item.trim() !== '') return true;
              if (typeof item === 'object' && item !== null && (item.id || item.slug)) return true;
              return false;
            });
          }

          // Handle object references (when depth > 0 or populated)
          if (typeof game === 'object' && game !== null) {
            // Check if it has an id or slug property (indicating it's a game object)
            if (game.id || game.slug) {
              return true;
            }
            // Check if it's an empty object
            if (Object.keys(game).length === 0) {
              return false;
            }
          }

          return false;
        };

        // Check if at least one game field has a valid value
        const hasAtLeastOneGame = gameFields.some(isValidGame);

        // Only throw error if games object exists and has been touched but no valid games are found
        // This means the user tried to save with an empty games object
        if (!hasAtLeastOneGame) {
          throw new Error(
            'At least one game must be selected for the mission. Please select at least one game from the available ability categories.',
          );
        }

        return data;
      },
    ],
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
      required: false,
      label: 'Mission Games by Ability',
      fields: [
        {
          name: 'mentalFortitudeComposure',
          type: 'relationship',
          relationTo: 'games',
          required: false,
          label: 'Mental Fortitude / Composure Game',
          admin: {
            description: 'Select a game that focuses on mental fortitude and composure',
          },
        },
        {
          name: 'adaptabilityDecisionMaking',
          type: 'relationship',
          relationTo: 'games',
          required: false,
          label: 'Adaptability / Decision Making Game',
          admin: {
            description: 'Select a game that focuses on adaptability and decision making',
          },
        },
        {
          name: 'aimMechanicalSkill',
          type: 'relationship',
          relationTo: 'games',
          required: false,
          label: 'Aim / Mechanical Skill Game',
          admin: {
            description: 'Select a game that focuses on aim and mechanical skill',
          },
        },
        {
          name: 'gameSenseAwareness',
          type: 'relationship',
          relationTo: 'games',
          required: false,
          label: 'Game Sense / Awareness Game',
          admin: {
            description: 'Select a game that focuses on game sense and awareness',
          },
        },
        {
          name: 'teamworkCommunication',
          type: 'relationship',
          relationTo: 'games',
          required: false,
          label: 'Teamwork / Communication Game',
          admin: {
            description: 'Select a game that focuses on teamwork and communication',
          },
        },
        {
          name: 'strategy',
          type: 'relationship',
          relationTo: 'games',
          required: false,
          label: 'Strategy Game',
          admin: {
            description: 'Select a game that focuses on strategy',
          },
        },
      ],
    },
  ],
};
