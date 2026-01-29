#!/usr/bin/env node

// excalidraw-cli: flowcharts from DSL, JSON, or DOT

import 'dotenv/config';
import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'fs';
import { parseDSL } from './parser/dsl-parser.js';
import { parseJSONString } from './parser/json-parser.js';
import { parseDOT } from './parser/dot-parser.js';
import { layoutGraph } from './layout/elk-layout.js';
import { generateExcalidraw, serializeExcalidraw } from './generator/excalidraw-generator.js';
import { promptToFlowchartDefinition } from './llm/grok-prompt.js';
import type { FlowchartGraph, FlowDirection } from './types/dsl.js';

const program = new Command();

function inferFormatFromPath(path: string): 'dsl' | 'json' | 'dot' {
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.dot') || path.endsWith('.gv')) return 'dot';
  return 'dsl';
}

function parseByFormat(raw: string, format: 'dsl' | 'json' | 'dot'): FlowchartGraph {
  if (format === 'json') return parseJSONString(raw);
  if (format === 'dot') return parseDOT(raw);
  return parseDSL(raw);
}

function applyCliOptions(graph: FlowchartGraph, opts: { direction?: string; spacing?: string }): void {
  if (opts.direction) {
    const dir = opts.direction.toUpperCase() as FlowDirection;
    if (['TB', 'BT', 'LR', 'RL'].includes(dir)) graph.options.direction = dir;
  }
  if (opts.spacing) {
    const n = parseInt(opts.spacing, 10);
    if (!isNaN(n)) graph.options.nodeSpacing = n;
  }
}

program
  .name('excalidraw-cli')
  .description('Create Excalidraw flowcharts from DSL, JSON, or DOT')
  .version('1.0.1');

program
  .command('create')
  .description('Create an Excalidraw flowchart')
  .argument('[input]', 'Input file path (DSL, JSON, or DOT)')
  .option('-o, --output <file>', 'Output file path', 'flowchart.excalidraw')
  .option('-f, --format <type>', 'Input format: dsl, json, dot (default: dsl)', 'dsl')
  .option('--inline <dsl>', 'Inline DSL/DOT string')
  .option('--stdin', 'Read input from stdin')
  .option('-p, --prompt <text>', 'Natural language prompt (uses xAI Grok; requires XAI_API_KEY)')
  .option('-d, --direction <dir>', 'Flow direction: TB, BT, LR, RL (default: TB)')
  .option('-s, --spacing <n>', 'Node spacing in pixels', '50')
  .option('--verbose', 'Verbose output')
  .action(async (inputFile, options, command) => {
    try {
      let rawInput: string;
      let format = options.format;
      const formatFromCli = command.getOptionValueSource('format') === 'cli';

      if (options.prompt) {
        if (options.verbose) console.log('Converting prompt to flowchart via xAI Grok...');
        const out = await promptToFlowchartDefinition(options.prompt);
        rawInput = out.content;
        format = out.format;
        if (options.verbose) console.log(`Grok returned ${format} (${rawInput.length} chars)`);
      } else if (options.inline) {
        rawInput = options.inline;
      } else if (options.stdin) {
        rawInput = readFileSync(0, 'utf-8');
      } else if (inputFile) {
        rawInput = readFileSync(inputFile, 'utf-8');
        if (!formatFromCli) format = inferFormatFromPath(inputFile);
      } else {
        console.error('Error: No input provided. Use --prompt, --inline, --stdin, or provide an input file.');
        process.exit(1);
      }

      if (options.verbose) {
        console.log(`Input format: ${format}`);
        console.log(`Input length: ${rawInput.length} characters`);
      }

      const graph = parseByFormat(rawInput, format);
      applyCliOptions(graph, { direction: options.direction, spacing: options.spacing });

      if (options.verbose) {
        console.log(`Parsed ${graph.nodes.length} nodes and ${graph.edges.length} edges`);
        console.log(`Layout direction: ${graph.options.direction}`);
      }

      const laidOut = await layoutGraph(graph);
      if (options.verbose) console.log(`Layout complete. Canvas size: ${laidOut.width}x${laidOut.height}`);

      const file = generateExcalidraw(laidOut);
      const output = serializeExcalidraw(file);

      if (options.output === '-') {
        process.stdout.write(output);
      } else {
        writeFileSync(options.output, output, 'utf-8');
        console.log(`Created: ${options.output}`);
      }
    } catch (err) {
      console.error('Error:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command('parse')
  .description('Parse and validate input without generating output')
  .argument('<input>', 'Input file path')
  .option('-f, --format <type>', 'Input format: dsl, json, dot (default: dsl)', 'dsl')
  .action((inputFile, options, command) => {
    try {
      const rawInput = readFileSync(inputFile, 'utf-8');
      let format = options.format;
      if (command.getOptionValueSource('format') !== 'cli') format = inferFormatFromPath(inputFile);

      const graph = parseByFormat(rawInput, format);

      console.log('Parse successful!');
      console.log(`  Nodes: ${graph.nodes.length}`);
      console.log(`  Edges: ${graph.edges.length}`);
      console.log(`  Direction: ${graph.options.direction}`);
      console.log('\nNodes:');
      for (const node of graph.nodes) console.log(`  - [${node.type}] ${node.label}`);
      console.log('\nEdges:');
      for (const edge of graph.edges) {
        const src = graph.nodes.find((n) => n.id === edge.source);
        const tgt = graph.nodes.find((n) => n.id === edge.target);
        const lbl = edge.label ? ` "${edge.label}"` : '';
        console.log(`  - ${src?.label} ->${lbl} ${tgt?.label}`);
      }
    } catch (err) {
      console.error('Parse error:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program.parse();
