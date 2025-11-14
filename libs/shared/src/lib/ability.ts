export interface Ability {
    slug: string;
    name: string;
    description: string;
    icon?: {
      url: string;
      filename?: string;
    };
}
