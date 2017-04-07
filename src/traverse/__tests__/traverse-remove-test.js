/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

const traverse = require('..');
const parser = require('../../parser');
const generator = require('../../generator');

const defaultAst = parser.parse('/abcd/');

describe('traverse-remove', () => {

  it('removes two adjacent items', () => {

    traverse.traverse(defaultAst, {

      Char(path) {
        var value = path.node.value;
        if(value == "b")
          path.remove()
        else if(value == "c")
          path.remove()
      },
    });

    var generated = generator.generate(defaultAst);

    expect(generated).toEqual('/ad/)');
  });

});
