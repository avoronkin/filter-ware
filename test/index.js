var noop = function() {};
var ware = require('../lib');
var assert = require('assert');
var sinon = require('sinon');

describe('ware', function() {

  describe('#use', function() {
    it('should be chainable', function() {
      var w = ware();
      assert(w.use(noop) == w);
    });

    it('should add a middleware to layer', function() {
      var w = ware().use(noop);
      assert(1 == w.layers[0].length);
    });

    it('should accept an array of middleware', function() {
      var w = ware().use([noop, noop]);
      assert(2 == w.layers[0].length);
    });

    it('should accept a Ware instance', function() {
      var o = ware().use(noop).use(noop);
      var w = ware().use(o);
      assert(2 == w.layers.length);
    });

    it.skip('should accept an array of Ware instances', function() {
      var a = ware().use(noop).use(noop);
      var b = ware().use(noop).use(noop);
      var w = ware([a, b]);
      assert(4 == w.layers[0].length);
    })

    it('should accept middleware on construct', function() {
      var w = ware(noop);
      assert(1 == w.layers[0].length);
    });

    it('should accept optional filter argument', function() {
      var w = ware().use('filter', noop);
      assert(w.layers.length === 1);
      assert(typeof w.layers[0][0] === 'function');
      assert(w.layers[0]._filter)
      assert(w.layers[0]._filter === 'filter');
    });


  });

  describe('#run', function() {
    describe('async', function() {
      it('should receive an error', function(done) {
        var error = new Error();
        ware()
          .use(function(next) {
            next(error);
          })
          .run(function(err) {
              console.log('err', err)
            assert(err == error);
            done();
          });
      });

      it('should receive initial arguments', function(done) {
        ware()
          .use(function(req, res, next) {
            next();
          })
          .run('req', 'res', function(err, req, res) {
            assert(!err);
            assert('req' == req);
            assert('res' == res);
            done();
          });
      });

      it('should take any number of arguments', function(done) {
        ware()
          .use(function(a, b, c, next) {
            next();
          })
          .run('a', 'b', 'c', function(err, a, b, c) {
            assert(!err);
            assert('a' == a);
            assert('b' == b);
            assert('c' == c);
            done();
          });
      });

      it('should let middleware manipulate the same input objects', function(done) {
        ware()
          .use(function(obj, next) {
            obj.value = obj.value * 2;
            next();
          })
          .use(function(obj, next) {
            obj.value = obj.value.toString();
            next();
          })
          .run({
            value: 21
          }, function(err, obj) {
            assert('42' == obj.value);
            done();
          });
      });

      it('should jump to done on error', function(done) {
        var errors = 0;
        ware()
          .use(function(next) {
            next(new Error());
          })
          .use(function(next) {
            errors++;
            next(err);
          })
          .use(function(next) {
            errors++;
            next(err);
          })
          .run(function(err) {
            assert(err);
            assert(0 == errors);
            done();
          });
      });

      it('should not require a callback', function(done) {
        ware()
          .use(function(obj, next) {
            assert(obj);
            next();
          })
          .use(function(obj, next) {
            done();
          })
          .run('obj');
      });
    });

    describe('sync', function() {
      it('should receive an error', function(done) {
        var error = new Error();
        ware()
          .use(function() {
            return error;
          })
          .run(function(err) {
            assert(err == error);
            done();
          });
      });

      it('should catch an error', function(done) {
        var error = new Error();
        ware()
          .use(function() {
            throw error;
          })
          .run(function(err) {
            assert(err === error);
            done();
          });
      });

      it('should throw an error without callback', function() {
        var error = new Error();
        assert.throws(function() {
          ware()
            .use(function() {
              throw error;
            })
            .run();
        });
      });

      it('should receive initial arguments', function(done) {
        ware()
          .use(function(req, res) {
            return;
          })
          .run('req', 'res', function(err, req, res) {
            assert(!err);
            assert('req' == req);
            assert('res' == res);
            done();
          });
      });

      it('should take any number of arguments', function(done) {
        ware()
          .use(function(a, b, c) {})
          .run('a', 'b', 'c', function(err, a, b, c) {
            assert(!err);
            assert('a' == a);
            assert('b' == b);
            assert('c' == c);
            done();
          });
      });

      it('should let middleware manipulate the same input objects', function(done) {
        ware()
          .use(function(obj) {
            obj.value = obj.value * 2;
          })
          .use(function(obj) {
            obj.value = obj.value.toString();
          })
          .run({
            value: 21
          }, function(err, obj) {
            assert(!err);
            assert('42' == obj.value);
            done();
          });
      });


      it('should skip middleware on error', function(done) {
        var errors = 0;
        ware()
          .use(function() {
            return new Error();
          })
          .use(function(next) {
            errors++;
            next(err);
          })
          .use(function(next) {
            errors++;
            next(err);
          })
          .run(function(err) {
            assert(err);
            assert(0 == errors);
            done();
          });
      });

      it('should not require a callback', function(done) {
        ware()
          .use(function(obj) {
            assert(obj);
          })
          .use(function(obj) {
            done();
          })
          .run('obj');
      });

      it('should support promises', function(done) {
        ware()
          .use(function() {
            return {
              then: function(resolve) {
                resolve(10);
              }
            };
          })
          .run(done);
      });

      it('should skip middleware on promise error', function(done) {
        var errors = 0;
        ware()
          .use(function() {
            return {
              then: function(resolve, reject) {
                reject(new Error());
              }
            };
          })
          .use(function(next) {
            errors++;
            next(err);
          })
          .use(function(next) {
            errors++;
            next(err);
          })
          .run(function(err) {
            assert(err);
            assert(0 == errors);
            done();
          });
      });
    })

    describe('generator', function() {
      it('should receive an error', function(done) {
        var error = new Error();
        ware()
          .use(function*() {
            throw error;
          })
          .run(function(err) {
            assert(err == error);
            done();
          });
      });

      it('should receive initial arguments', function(done) {
        ware()
          .use(function*(req, res) {})
          .run('req', 'res', function(err, req, res) {
            assert(!err);
            assert('req' == req);
            assert('res' == res);
            done();
          });
      });

      it('should take any number of arguments', function(done) {
        ware()
          .use(function*(a, b, c) {})
          .run('a', 'b', 'c', function(err, a, b, c) {
            assert(!err);
            assert('a' == a);
            assert('b' == b);
            assert('c' == c);
            done();
          });
      });

      it('should let middleware manipulate the same input objects', function(done) {
        ware()
          .use(function*(obj) {
            obj.value = obj.value * 2;
          })
          .use(function*(obj) {
            obj.value = obj.value.toString();
          })
          .run({
            value: 21
          }, function(err, obj) {
            assert('42' == obj.value);
            done();
          });
      });

      it('should wait for the gen to finish', function(done) {
        ware()
          .use(function*(a, b, c) {
            yield wait(100);
          })
          .run('a', 'b', 'c', function(err, a, b, c) {
            assert(!err);
            assert('a' == a);
            assert('b' == b);
            assert('c' == c);
            done();
          });
      })

      it('should jump to done on error', function(done) {
        var errors = 0;
        ware()
          .use(function*() {
            throw new Error();
          })
          .use(function*() {
            errors++;
          })
          .use(function*() {
            errors++;
          })
          .run(function(err) {
            assert(err);
            assert(0 == errors);
            done();
          });
      });

      it('should not require a callback', function(done) {
        ware()
          .use(function*(obj) {
            assert(obj);
          })
          .use(function*(obj) {
            done();
          })
          .run('obj');
      });
    });

  });

  describe('#filter', function() {
    it('should be chainable', function() {
      var w = ware();
      assert(w.filter(function() {}) === w);
    });

    it('should require filter function argument', function() {
      var w = ware();
      assert.throws(function() {
        ware().filter()
      });
    });

    it('should filter middlewares that will be run', function(done) {
      var spy1 = sinon.spy();
      var spy2 = sinon.spy();
      var spy3 = sinon.spy();

      ware()
        .filter(function(filter, req, res) {
          return filter === 'pattern2';
        })
        .use(function(req, res, next) {
          spy1();
          next();
        })
        .use('pattern1', function(req, res, next) {
          spy2();
          next();
        })
        .use('pattern2', function(req, res, next) {
          spy3();
          next();
        }, function(req, res, next) {
          spy3();
          next();
        })
        .run({}, {}, function(err) {
          assert(spy1.called);
          assert(!spy2.called);
          assert(spy3.calledTwice);
          done(err);
        })
    })

    it('should filter error middlewares that will be run', function(done) {
      var spy1 = sinon.spy();
      var spy2 = sinon.spy();
      var spy3 = sinon.spy();

      ware()
        .filter(function(filter, req, res) {
          return filter === 'pattern2';
        })
        .use('pattern2', function(req, res, next) {
          next(new Error('Test error'));
        })
        .use(function(err, req, res, next) {
            spy1();
            next(err);
        })
        .use('pattern3', function(err, req, res, next) {
            spy2();
            next(err);
        })
        .use('pattern4', function(err, req, res, next) {
            spy2();
            next(err);
        })
        .use('pattern2', function(err, req, res, next) {
            spy3();
            next(err);
        })
        .run({}, {}, function(err) {
          assert.equal(spy1.called, true);
          assert.equal(spy2.called, false);
          assert.equal(spy3.called, true);
          done();
        })
    })

    it('should switch to next layer when called next("route")', function (done) {
        var spy1 = sinon.spy();
        var spy2 = sinon.spy();
        var spy3 = sinon.spy();

        ware()
          .filter(function(filter, req, res) {
            return filter === 'pattern2';
          })
          .use('pattern2', [function(req, res, next) {
            spy1();
            next('route');
          }, function(req, res, next) {
            spy1();
            next()
          }])
          .use('pattern2', function(req, res, next) {
            spy2();
            next()
          })
          .use('pattern1', function(req, res, next) {
            spy3();
            next()
          })
          .run({}, {}, function(err) {
            assert(spy1.calledOnce);
            assert(spy2.calledOnce);
            assert(!spy3.called);
            done(err);
          })
    })

  });

  describe('errorhandler middleware', function(done) {
    it('should handle errors via arity +1 functions', function(done) {
      ware()
      .use(function(obj, next) {
        next(new Error('foobar'));
      })
      .use(function(obj, next) {
        obj.order += '0';
        next();
      })
      .use(function(err, obj, next) {
        obj.order += 'a';
        next(err);
      })
      .run({
        order: ''
      }, function(err, obj) {
        assert(err);
        assert(err.message == 'foobar');
        assert(obj.order == 'a');
        done();
      })
    });

    it('should handle throw', function(done) {

      ware().use(function(obj, next) {
        throw new Error('foobar');
      }).use(function(obj, next) {
        obj.order += '0';
        next();
      }).use(function(err, obj, next) {
        obj.order += 'a';
        next(err);
      }).run({
        order: ''
      }, function(err, obj) {
        assert(err);
        assert(err.message == 'foobar');
        assert(obj.order == 'a');
        done();
      });

    });

    it('should handle throwing inside error handlers', function(done) {
      ware().use(function(obj, next) {
        throw new Error('boom!');
      }).use(function(err, obj, next) {
        throw new Error('oops');
      }).use(function(err, obj, next) {
        obj.message = err.message;
        next();
      }).run({}, function(err, obj) {
        assert(!err);
        assert(obj.message == 'oops');
        done();
      });

    });

    it('should handle single error handler', function(done) {
      ware().use(function(err, obj, next) {
        // this should not execute
        assert(!err);
      }).run({}, function(err) {
        done();
      });
    });

  })
});

function wait(ms) {
  return function(fn) {
    setTimeout(fn, ms);
  }
}
