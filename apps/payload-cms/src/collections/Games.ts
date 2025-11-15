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
    afterRead: [
      async ({ doc, req }) => {
        // Transform ability scores from individual fields to abilities array format
        // Fetch all abilities to get their metadata
        const { docs: allAbilities } = await req.payload.find({
          collection: 'abilities',
          limit: 100,
          pagination: false,
        });

        // Create ability metadata map
        const abilityMap = new Map();
        allAbilities.forEach((ability: any) => {
          abilityMap.set(ability.slug, ability);
        });

        // Build abilities array from score fields
        const abilities: any[] = [];
        
        const abilityFields = [
          { field: 'mentalFortitudeComposureScore', slug: 'mental-fortitude-composure', name: 'Mental Fortitude / Composure' },
          { field: 'adaptabilityDecisionMakingScore', slug: 'adaptability-decision-making', name: 'Adaptability / Decision Making' },
          { field: 'aimMechanicalSkillScore', slug: 'aim-mechanical-skill', name: 'Aim / Mechanical Skill' },
          { field: 'gameSenseAwarenessScore', slug: 'game-sense-awareness', name: 'Game Sense / Awareness' },
          { field: 'teamworkCommunicationScore', slug: 'teamwork-communication', name: 'Teamwork / Communication' },
          { field: 'strategyScore', slug: 'strategy', name: 'Strategy' },
        ];

        abilityFields.forEach(({ field, slug, name }) => {
          const score = doc[field];
          if (score !== undefined && score !== null) {
            const ability = abilityMap.get(slug) || { slug, name, description: '' };
            abilities.push({
              ...ability,
              score: Math.max(0, Math.min(100, score)),
            });
          }
        });

        doc.abilities = abilities;
        return doc;
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation === 'create') {
          // Handle abilities array with scores
          if (doc.abilities && Array.isArray(doc.abilities)) {
            const abilityIds = doc.abilities
              .map((item: any) => (typeof item === 'object' ? item.ability : item))
              .filter((id: any) => id);
            if (abilityIds.length > 0) {
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
              // Map abilities back with their scores
              doc.abilities = doc.abilities.map((item: any) => {
                const abilityId = typeof item === 'object' ? item.ability : item;
                const score = typeof item === 'object' ? item.score : undefined;
                const ability = fullAbilities.docs.find((a: any) => a.id === abilityId);
                return ability ? { ...ability, score: score || 0 } : null;
              }).filter((item: any) => item !== null);
            }
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
      name: 'mentalFortitudeComposureScore',
      type: 'number',
      required: false,
      min: 0,
      max: 100,
      admin: {
        description: 'Score from 0 to 100 for Mental Fortitude / Composure',
      },
    },
    {
      name: 'adaptabilityDecisionMakingScore',
      type: 'number',
      required: false,
      min: 0,
      max: 100,
      admin: {
        description: 'Score from 0 to 100 for Adaptability / Decision Making',
      },
    },
    {
      name: 'aimMechanicalSkillScore',
      type: 'number',
      required: false,
      min: 0,
      max: 100,
      admin: {
        description: 'Score from 0 to 100 for Aim / Mechanical Skill',
      },
    },
    {
      name: 'gameSenseAwarenessScore',
      type: 'number',
      required: false,
      min: 0,
      max: 100,
      admin: {
        description: 'Score from 0 to 100 for Game Sense / Awareness',
      },
    },
    {
      name: 'teamworkCommunicationScore',
      type: 'number',
      required: false,
      min: 0,
      max: 100,
      admin: {
        description: 'Score from 0 to 100 for Teamwork / Communication',
      },
    },
    {
      name: 'strategyScore',
      type: 'number',
      required: false,
      min: 0,
      max: 100,
      admin: {
        description: 'Score from 0 to 100 for Strategy',
      },
    },
    {
      name: 'abilities',
      type: 'relationship',
      relationTo: 'abilities',
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
