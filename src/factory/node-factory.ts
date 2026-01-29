/**
 * Node Factory
 *
 * Creates Excalidraw shape elements (rectangle, diamond, ellipse).
 */

import { createBaseElement } from './element-factory.js';
import type {
  ExcalidrawRectangle,
  ExcalidrawDiamond,
  ExcalidrawEllipse,
  ExcalidrawBoundElement,
} from '../types/excalidraw.js';
import type { LayoutedNode, NodeStyle } from '../types/dsl.js';
import { DEFAULT_NODE_PALETTE } from '../types/dsl.js';

/**
 * Map DSL style to Excalidraw properties; use default palette by node type when style is missing
 */
function mapStyle(node: LayoutedNode): Partial<ExcalidrawRectangle> {
  const style = node.style;
  const defaults = DEFAULT_NODE_PALETTE[node.type];

  return {
    strokeColor: style?.strokeColor ?? defaults.strokeColor,
    backgroundColor: style?.backgroundColor ?? defaults.backgroundColor,
    strokeWidth: style?.strokeWidth,
    strokeStyle: style?.strokeStyle,
    fillStyle: style?.fillStyle,
    opacity: style?.opacity,
    roughness: style?.roughness,
  };
}

/**
 * Create a rectangle element
 */
export function createRectangle(
  node: LayoutedNode,
  boundElements?: ExcalidrawBoundElement[]
): ExcalidrawRectangle {
  const styleProps = mapStyle(node);

  return {
    ...createBaseElement('rectangle', node.x, node.y, node.width, node.height, {
      id: node.id,
      roundness: { type: 3 }, // Adaptive roundness
      boundElements: boundElements || null,
      ...styleProps,
    }),
    type: 'rectangle',
  } as ExcalidrawRectangle;
}

/**
 * Create a diamond element
 */
export function createDiamond(
  node: LayoutedNode,
  boundElements?: ExcalidrawBoundElement[]
): ExcalidrawDiamond {
  const styleProps = mapStyle(node);

  return {
    ...createBaseElement('diamond', node.x, node.y, node.width, node.height, {
      id: node.id,
      roundness: { type: 2 }, // Proportional roundness
      boundElements: boundElements || null,
      ...styleProps,
    }),
    type: 'diamond',
  } as ExcalidrawDiamond;
}

/**
 * Create an ellipse element
 */
export function createEllipse(
  node: LayoutedNode,
  boundElements?: ExcalidrawBoundElement[]
): ExcalidrawEllipse {
  const styleProps = mapStyle(node);

  return {
    ...createBaseElement('ellipse', node.x, node.y, node.width, node.height, {
      id: node.id,
      roundness: null, // Ellipses don't use roundness
      boundElements: boundElements || null,
      ...styleProps,
    }),
    type: 'ellipse',
  } as ExcalidrawEllipse;
}

/**
 * Create a node element based on type
 */
export function createNode(
  node: LayoutedNode,
  boundElements?: ExcalidrawBoundElement[]
): ExcalidrawRectangle | ExcalidrawDiamond | ExcalidrawEllipse {
  switch (node.type) {
    case 'diamond':
      return createDiamond(node, boundElements);
    case 'ellipse':
      return createEllipse(node, boundElements);
    case 'database':
      // Database is rendered as rectangle with special styling
      return createRectangle(node, boundElements);
    case 'rectangle':
    default:
      return createRectangle(node, boundElements);
  }
}
