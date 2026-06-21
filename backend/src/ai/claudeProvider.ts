import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { AIProvider, Message, ToolDefinition, ToolExecutor } from './types';
import { buildSystemPrompt } from './systemPrompt';

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: config.anthropicApiKey });
  }

  async embed(_text: string): Promise<number[]> {
    throw new Error(
      'ClaudeProvider does not support embeddings. AI_PROVIDER=claude pairs Claude (chat) with CohereProvider (embeddings).'
    );
  }

  async chat(
    messages: Message[],
    context: string[],
    tools: ToolDefinition[] = [],
    executor?: ToolExecutor,
  ): Promise<string> {
    const conversation: Anthropic.MessageParam[] = messages
      .filter((m): m is Message & { role: 'user' | 'assistant' } => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }));

    const anthropicTools: Anthropic.Tool[] = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: { type: 'object' as const, properties: {}, required: [] },
    }));

    const baseParams = {
      model: config.claudeChatModel,
      max_tokens: 1024,
      system: buildSystemPrompt(context),
      ...(anthropicTools.length > 0 && { tools: anthropicTools, tool_choice: { type: 'auto' as const } }),
    };

    let response = await this.client.messages.create({ ...baseParams, messages: conversation });

    // Tool-use loop: Claude calls tools until it produces a final text response
    while (response.stop_reason === 'tool_use' && executor) {
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (block) => ({
          type: 'tool_result' as const,
          tool_use_id: block.id,
          content: await executor(block.name),
        })),
      );

      conversation.push({ role: 'assistant', content: response.content as Anthropic.ContentBlockParam[] });
      conversation.push({ role: 'user', content: toolResults });

      response = await this.client.messages.create({ ...baseParams, messages: conversation });
    }

    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
  }

  async generate(prompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: config.claudeChatModel,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
  }
}
