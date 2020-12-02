var assert = require('assert');
import * as structure from "../src/app/structure";

describe('structure', function () {
  describe('overlaps()', function () {
    it('should not detect overlap when completely disjoint', function(){
      const a = {start: 2, end: 5};
      const b = {start: 8, end: 10};

      assert(!structure.overlaps(a,b));
      assert(!structure.overlaps(b,a));
    });
    it('should not detect overlap when touching but disjoint', function(){
      const a = {start: 2, end: 5};
      const b = {start: 5, end: 10};

      assert(!structure.overlaps(a,b));
      assert(!structure.overlaps(b,a));
    });
    it('should detect overlap when they are the same', function(){
      const a = {start: 2, end: 5};
      const b = {start: 2, end: 5};

      assert(structure.overlaps(a,b));
      assert(structure.overlaps(b,a));
    });
    it('should detect overlap when they encapsulate', function(){
      const a = {start: 2, end: 5};
      const b = {start: 3, end: 4};

      assert(structure.overlaps(a,b));
      assert(structure.overlaps(b,a));
    });
    it('should detect overlap when they encapsulate and one side touches', function(){
      const a = {start: 2, end: 5};
      const b = {start: 3, end: 5};
      const c = {start: 2, end: 4};
      const d = {start: 2, end: 5};
      assert(structure.overlaps(a,b));
      assert(structure.overlaps(b,a));
      assert(structure.overlaps(c,d));
      assert(structure.overlaps(d,c));
    });
    it('should detect overlap when they overlap while endpoints are outside', function(){
      const a = {start: 2, end: 5};
      const b = {start: 4, end: 7};
      assert(structure.overlaps(a,b));
      assert(structure.overlaps(b,a));
    });
  });
});
