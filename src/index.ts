// Programmatic API: flowcharts from DSL, JSON, or natural-language prompt.

import { layoutGraph } from './layout/elk-layout.js';
import { generateExcalidraw, serializeExcalidraw } from './generator/excalidraw-generator.js';
import { parseDSL } from './parser/dsl-parser.js';
import { parseJSON, parseJSONString } from './parser/json-parser.js';
import { parseDOT } from './parser/dot-parser.js';
import { promptToFlowchartDefinition } from './llm/grok-prompt.js';
import type { FlowchartGraph } from './types/dsl.js';

export type {
  FlowchartGraph,
  FlowchartInput,
  GraphNode,
  GraphEdge,
  LayoutOptions,
  LayoutedGraph,
  LayoutedNode,
  LayoutedEdge,
  NodeType,
  NodeStyle,
  EdgeStyle,
  FlowDirection,
} from './types/dsl.js';

export type {
  ExcalidrawFile,
  ExcalidrawElement,
  ExcalidrawRectangle,
  ExcalidrawDiamond,
  ExcalidrawEllipse,
  ExcalidrawText,
  ExcalidrawArrow,
  ExcalidrawAppState,
} from './types/excalidraw.js';

export { parseDSL } from './parser/dsl-parser.js';
export { parseJSON, parseJSONString } from './parser/json-parser.js';
export { layoutGraph } from './layout/elk-layout.js';
export { generateExcalidraw, serializeExcalidraw } from './generator/excalidraw-generator.js';
export { createNode, createArrow, createText } from './factory/index.js';
export { DEFAULT_LAYOUT_OPTIONS } from './types/dsl.js';
export { DEFAULT_APP_STATE, DEFAULT_ELEMENT_STYLE } from './types/excalidraw.js';

export {
  promptToFlowchartDefinition,
  stripMarkdownCodeBlock,
  detectOutputFormat,
  type GrokPromptOptions,
  type PromptOutputFormat,
} from './llm/index.js';

// single pipeline: graph -> layout -> excalidraw file -> json string
async function graphToExcalidrawString(graph: FlowchartGraph): Promise<string> {
  const laidOut = await layoutGraph(graph);
  const file = generateExcalidraw(laidOut);
  return serializeExcalidraw(file);
}

export async function createFlowchartFromDSL(dsl: string): Promise<string> {
  const graph = parseDSL(dsl);
  return graphToExcalidrawString(graph);
}

export async function createFlowchartFromJSON(input: import('./types/dsl.js').FlowchartInput): Promise<string> {
  const graph = parseJSON(input);
  return graphToExcalidrawString(graph);
}

export async function createFlowchartFromPrompt(
  prompt: string,
  options?: { apiKey?: string; model?: string; preferredFormat?: import('./llm/grok-prompt.js').PromptOutputFormat }
): Promise<string> {
  const { content, format } = await promptToFlowchartDefinition(prompt, options ?? {});

  if (format === 'json') {
    const graph = parseJSONString(content);
    return graphToExcalidrawString(graph);
  }
  if (format === 'dot') {
    const graph = parseDOT(content);
    return graphToExcalidrawString(graph);
  }

  const graph = parseDSL(content);
  return graphToExcalidrawString(graph);
}
