/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

'use strict';

/**
 * NodePath class encapsulates a traversing node,
 * its parent node, property name in the parent node, and
 * an index (in case if a node is part of a collection).
 * It also provides set of methods for AST manipulation.
 */
class NodePath {
  /**
   * NodePath constructor.
   *
   * @param Object node - an AST node
   * @param NodePath parentPath - a nullable parent path
   * @param string property - property name of the node in the parent
   * @param number index - index of the node in a collection.
   */
  constructor(
    node,
    parentPath = null,
    property = null,
    index = null
  ) {
    this.node = node;
    this.parentPath = parentPath;
    this.parent = parentPath ? parentPath.node : null;
    this.property = property;
    this.index = index;
  }

  /**
   * Inserts a node into a collection. By default child nodes
   * are supposed to by under `expressions` property. An explicit
   * property can be passed.
   *
   * @param Object node - a node to insert into a collection
   * @param number index - index at which to insert
   * @param string property - name of the collection property
   */
  insertChildAt(node, index, property = 'expressions') {
    if (!this.node.hasOwnProperty(property)) {
      throw new Error(
        `Node of type ${this.node.type} doesn't have "${property}" collection.`
      );
    }

    this.node[property].splice(index, 0, node);

    // If we inserted a node before the traversing index,
    // we should increase the later.
    if (index <= NodePath.getTraversingIndex()) {
      NodePath.updateTraversingIndex(+1);
    }

    this._rebuildIndex(this.node, property);
  }

  /**
   * Removes a node.
   */
  remove() {
    if (this.isRemoved()) {
      return;
    }

    this.node = null;


    if (!this.parent) {
      return;
    }

    // A node is in a collection.
    if (this.index !== null) {
      this.parent[this.property].splice(this.index, 1);

      // If we remove a node before the traversing index,
      // we should increase the later.
      if (this.index <= NodePath.getTraversingIndex()) {
        NodePath.updateTraversingIndex(-1);
      }

      // Rebuild index.
      this._rebuildIndex(this.parent, this.property);

      this.index = null;
      this.property = null;

      return;
    }

    // A simple node.
    delete this.parent[this.property];
    this.property = null;
  }

  /**
   * Rebuilds child nodes index (used on remove/insert).
   */
  _rebuildIndex(parent, property) {
    const parentPath = NodePath.getForNode(parent);

    for (let i = 0; i < parent[property].length; i++) {
      const path = NodePath.getForNode(
        parent[property][i],
        parentPath,
        property,
        i
      );
      path.index = i;
    }
  }

  /**
   * Whether the path was removed.
   */
  isRemoved() {
    return this.node === null;
  }

  /**
   * Replaces a node with the passed one.
   */
  replace(newNode) {
    this.node = newNode;

    if (!this.parent) {
      return;
    }

    // A node is in a collection.
    if (this.index !== null) {
      this.parent[this.property][this.index] = newNode;
      return;
    }

    // A simple node.
    this.parent[this.property] = newNode;
  }

  /**
   * Updates a node inline.
   */
  update(nodeProps) {
    Object.assign(this.node, nodeProps);
  }

  /**
   * Returns parent.
   */
  getParent() {
    return this.parentPath;
  }

  /**
   * Returns nth child.
   */
  getChild(n = 0) {
    if (this.node.expressions) {
      return NodePath.getForNode(
        this.node.expressions[n],
        this,
        "expressions",
        n
      );
    } else if (this.node.expression && n == 0) {
      return NodePath.getForNode(this.node.expression, this, "expression");
    }
    return null;
  }

  /**
   * Returns previous sibling.
   */
  getPreviousSibling() {
    if (!this.parent || this.index == null) {
      return null;
    }
    return NodePath.getForNode(
      this.parent[this.property][this.index - 1],
      NodePath.getForNode(this.parent),
      this.property,
      this.index - 1
    );
  }

  /**
   * Returns next sibling.
   */
  getNextSibling() {
    if (!this.parent || this.index == null) {
      return null;
    }
    return NodePath.getForNode(
      this.parent[this.property][this.index + 1],
      NodePath.getForNode(this.parent),
      this.property,
      this.index + 1
    );
  }

  /**
   * Returns a NodePath instance for a node.
   *
   * The same NodePath can be reused in several places, e.g.
   * a parent node passed for all its children.
   */
  static getForNode(node, parentPath = null, prop = null, index = null) {
    if (!node) {
      return null;
    }

    if (!NodePath.registry.has(node)) {
      NodePath.registry.set(
        node,
        new NodePath(node, parentPath, prop, index)
      );
    }

    return NodePath.registry.get(node);
  }

  /**
   * Initializes the NodePath registry. The registry is a map from
   * a node to its NodePath instance.
   */
  static initRegistry() {
    if (!NodePath.registry) {
      NodePath.registry = new Map();
    }
    NodePath.registry.clear();
  }

  /**
   * Updates index of a currently traversing collection.
   */
  static updateTraversingIndex(dx) {
    return (
      NodePath.traversingIndexStack[
        NodePath.traversingIndexStack.length - 1
      ] += dx
    );
  }

  /**
   * Returns current traversing index.
   */
  static getTraversingIndex() {
    return NodePath.traversingIndexStack[
      NodePath.traversingIndexStack.length - 1
    ];
  }
}

NodePath.initRegistry();

/**
 * Index of a currently traversing collection is stored on top of the
 * `NodePath.traversingIndexStack`. Remove/insert methods can adjust
 * this index.
 */
NodePath.traversingIndexStack = [];

module.exports = NodePath;
