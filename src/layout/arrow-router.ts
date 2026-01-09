/**
 * Arrow Router
 *
 * Calculates binding points for arrows connecting to shapes.
 */

import type { LayoutedNode } from '../types/dsl.js';
import type { ExcalidrawArrowBinding } from '../types/excalidraw.js';

/**
 * Calculate the binding point for an arrow endpoint on a node.
 * Returns normalized coordinates [0-1] relative to the node.
 */
export function calculateBindingPoint(
  node: LayoutedNode,
  arrowPoint: { x: number; y: number }
): ExcalidrawArrowBinding {
  // Calculate relative position
  const relX = (arrowPoint.x - node.x) / node.width;
  const relY = (arrowPoint.y - node.y) / node.height;

  // Clamp to valid range [0, 1]
  const fixedX = Math.max(0, Math.min(1, relX));
  const fixedY = Math.max(0, Math.min(1, relY));

  return {
    elementId: node.id,
    mode: 'orbit',
    fixedPoint: [fixedX, fixedY],
  };
}

/**
 * Find the best connection point on a node's edge for an arrow
 * coming from a given direction.
 */
export function findEdgeConnectionPoint(
  node: LayoutedNode,
  fromPoint: { x: number; y: number }
): { x: number; y: number; binding: ExcalidrawArrowBinding } {
  const centerX = node.x + node.width / 2;
  const centerY = node.y + node.height / 2;

  // Calculate angle from center to fromPoint
  const dx = fromPoint.x - centerX;
  const dy = fromPoint.y - centerY;
  const angle = Math.atan2(dy, dx);

  // Determine which edge to connect to based on angle
  // Top: -3π/4 to -π/4
  // Right: -π/4 to π/4
  // Bottom: π/4 to 3π/4
  // Left: 3π/4 to -3π/4 (wrapping)

  let x: number;
  let y: number;
  let relX: number;
  let relY: number;

  if (angle >= -Math.PI / 4 && angle < Math.PI / 4) {
    // Connect to right edge
    x = node.x + node.width;
    y = centerY;
    relX = 1;
    relY = 0.5;
  } else if (angle >= Math.PI / 4 && angle < (3 * Math.PI) / 4) {
    // Connect to bottom edge
    x = centerX;
    y = node.y + node.height;
    relX = 0.5;
    relY = 1;
  } else if (angle >= (-3 * Math.PI) / 4 && angle < -Math.PI / 4) {
    // Connect to top edge
    x = centerX;
    y = node.y;
    relX = 0.5;
    relY = 0;
  } else {
    // Connect to left edge
    x = node.x;
    y = centerY;
    relX = 0;
    relY = 0.5;
  }

  return {
    x,
    y,
    binding: {
      elementId: node.id,
      mode: 'orbit',
      fixedPoint: [relX, relY],
    },
  };
}

/**
 * Calculate arrow binding for a source node (where arrow starts)
 */
export function calculateStartBinding(
  sourceNode: LayoutedNode,
  targetNode: LayoutedNode
): { point: { x: number; y: number }; binding: ExcalidrawArrowBinding } {
  const targetCenter = {
    x: targetNode.x + targetNode.width / 2,
    y: targetNode.y + targetNode.height / 2,
  };

  return findEdgeConnectionPoint(sourceNode, targetCenter);
}

/**
 * Calculate arrow binding for a target node (where arrow ends)
 */
export function calculateEndBinding(
  sourceNode: LayoutedNode,
  targetNode: LayoutedNode
): { point: { x: number; y: number }; binding: ExcalidrawArrowBinding } {
  const sourceCenter = {
    x: sourceNode.x + sourceNode.width / 2,
    y: sourceNode.y + sourceNode.height / 2,
  };

  return findEdgeConnectionPoint(targetNode, sourceCenter);
}
