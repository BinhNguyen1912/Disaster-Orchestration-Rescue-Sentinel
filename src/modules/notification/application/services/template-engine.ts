export class TemplateEngine {
  /**
   * Render text from template string using {{variableName}} syntax
   */
  static render(template: string, data: Record<string, any>): string {
    if (!template) return '';
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }
}
