export interface RichTextNode {
  type: string;
  text?: string;
  children?: RichTextNode[];
}

export interface RichTextDescription {
  root: RichTextNode;
}
export class RichTextUtils {
  static getDescriptionText(description: string | RichTextDescription): string {
    if (!description) {
      return 'Description not available';
    }
    if (typeof description === 'string') {
      return description;
    }
    if (description.root && description.root.children) {
      return this.extractTextFromRichText(description.root);
    }
    return 'Description not available';
  }
  private static extractTextFromRichText(node: RichTextNode): string {
    if (!node) return '';
    if (node.type === 'text') {
      return node.text || '';
    }
    if (node.children && Array.isArray(node.children)) {
      return node.children
        .map((child: RichTextNode) => this.extractTextFromRichText(child))
        .join('');
    }
    return '';
  }
}
