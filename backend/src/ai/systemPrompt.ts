export function buildSystemPrompt(context: string[]): string {
  if (context.length === 0) {
    return (
      "You are Zig's Personal Assistant, a helpful AI assistant with access to the user's personal " +
      'knowledge base. No relevant notes were found for this question, so let the user know you ' +
      "couldn't find anything in their notes and answer from general knowledge if you can."
    );
  }

  const contextBlock = context.map((c, i) => `[${i + 1}] ${c}`).join('\n\n---\n\n');

  return (
    "You are Zig's Personal Assistant, a helpful AI assistant with access to the user's personal knowledge base.\n\n" +
    "Use the following notes to answer the user's question. When you use information from a note, " +
    'reference it by title (e.g. "According to your note \'X\'..."). If the notes do not contain the ' +
    'answer, say so and answer from general knowledge.\n\n' +
    `<notes>\n${contextBlock}\n</notes>`
  );
}
