# Geometry2d System Overview

The Geometry2d system in tldraw provides a comprehensive set of 2D geometric primitives and operations for handling various shapes and their interactions. This document outlines the key components and their purposes.

## Base Class: Geometry2d

`Geometry2d` is an abstract base class that defines the core functionality for all geometric shapes. It provides:

- Common properties like `isFilled`, `isClosed`, `isLabel`, `isInternal`
- Geometric operations like hit testing, distance calculations, and intersections
- SVG path generation capabilities
- Transformation support
- Bounds and area calculations

### Key Features

- **Hit Testing**: Methods for testing if points, line segments, or other geometries intersect
- **Distance Calculations**: Calculate distances between geometries and points/segments
- **Intersection Detection**: Find intersection points between different geometries
- **Path Generation**: Convert geometries to SVG path data
- **Transformation**: Support for geometric transformations using matrices

## Subclasses

### Basic Shapes

1. **Circle2d**

   - Represents a perfect circle
   - Defined by center point and radius
   - Optimized for circular operations

2. **Rectangle2d**

   - Represents a rectangle
   - Defined by position and dimensions
   - Supports rotation and scaling

3. **Polygon2d**

   - Represents any polygon shape
   - Defined by a set of vertices
   - Supports both regular and irregular polygons

4. **Ellipse2d**
   - Represents an ellipse
   - Defined by center, radii, and rotation
   - More general form of Circle2d

### Complex Shapes

1. **Arc2d**

   - Represents a circular arc
   - Defined by center, radius, start/end angles
   - Useful for curved paths

2. **CubicBezier2d**

   - Represents a cubic Bézier curve
   - Defined by four control points
   - Used for smooth curves

3. **CubicSpline2d**

   - Represents a series of connected cubic Bézier curves
   - Useful for complex curved paths

4. **Stadium2d**

   - Represents a rounded rectangle
   - Combines rectangle and circular caps
   - Useful for UI elements

5. **Polyline2d**
   - Represents a series of connected line segments
   - Defined by a set of points
   - Used for open paths

### Composite Shapes

1. **Group2d**

   - Container for multiple geometries
   - Allows grouping shapes for collective operations
   - Supports hierarchical transformations

2. **Edge2d**
   - Represents a connection between two points
   - Used for graph-like structures
   - Supports various edge styles

## Usage

The geometry system is used throughout tldraw for:

1. **Shape Representation**: Defining the visual appearance of shapes
2. **Hit Testing**: Determining user interaction with shapes
3. **Selection**: Identifying shapes within selection areas
4. **Transformation**: Handling shape transformations (move, rotate, scale)
5. **Rendering**: Converting shapes to SVG paths for display
6. **Collision Detection**: Checking for intersections between shapes

## Key Operations

- `hitTestPoint`: Check if a point is within a shape
- `distanceToPoint`: Calculate distance from a point to a shape
- `intersectLineSegment`: Find intersections with a line segment
- `getSvgPathData`: Generate SVG path data for rendering
- `transform`: Apply geometric transformations
- `getBounds`: Calculate the bounding box of a shape

## Best Practices

1. Use the most specific geometry class for your needs
2. Consider using `Group2d` for complex shapes composed of multiple primitives
3. Use the appropriate hit testing method based on your interaction needs
4. Take advantage of the transformation system for complex operations
5. Use the filtering system when working with groups to exclude certain elements
