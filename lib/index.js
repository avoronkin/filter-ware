var slice = [].slice;
var wrapped = require('wrapped')

function Ware(fn) {
  if (!(this instanceof Ware)) return new Ware(fn);
  this.layers = [];
  if (fn) this.use(fn);
}

Ware.prototype.use = function(fn) {
  var handlersOffset = (arguments[0] instanceof Ware || arguments[0] instanceof Array || typeof arguments[0] === 'function') ? 0 : 1;
  var filter = handlersOffset ? arguments[0] : undefined;

  fn = slice.call(arguments, handlersOffset);
  fn = [].concat.apply([], fn);
  fn = fn.length === 1 ? fn[0] : fn;

  if (fn instanceof Ware) {
    fn.layers.forEach(function (layer) {
        this.use(filter, layer);
    }, this);

    return this;
  }

  if (fn instanceof Array) {
    fn._filter = fn._filter ? fn._filter : filter;
    this.layers.push(fn);
    return this;
  }

  var layer = [fn]
  layer._filter = filter;

  this.layers.push(layer);
  return this;
}

Ware.prototype.filter = function(filterFn) {
  if (typeof filterFn !== 'function') {
    throw new Error('Ware.filter: filterFn argument required.')
  }
  this.filterFn = filterFn;

  return this;
}

Ware.prototype.run = function() {
  var layers = this.layers
  var fns = layers[0] || [];
  var ctx = this;
  var f = 0;
  var l = 0;
  var last = arguments[arguments.length - 1];
  var done = 'function' == typeof last && last;
  var args = done ? slice.call(arguments, 0, arguments.length - 1) : arguments;

  var errorHandlersCount = layers.reduce(function(count, layer) {
      var shouldRun = !ctx.filterFn || (layer && !layer._filter) || (layer && ctx.filterFn && ctx.filterFn.apply(ctx, [layer._filter].concat(args)));

      if (!shouldRun) {
          return count
      }

      return layer.reduce(function (count, fn) {
          var isErrorHandler = fn && (fn.length === args.length + 2);

          return isErrorHandler ? count + 1 : count;

      }, count)
  }, 0);

  // next step
  function next(err) {
    if (err === 'route') {
      l = l + 1
      f = 0
      return  next.apply(ctx)
    }
    var arr = slice.call(args);
    var layer = layers[l]
    var shouldRunDone = !layer || err && !errorHandlersCount;
    var shouldFail = !done && err && !errorHandlersCount;

    if (shouldFail) {
        throw err;
    }
    if (shouldRunDone) {
      return done && done.apply(null, [err].concat(args));
    }
    var shouldRun = !ctx.filterFn || (layer && !layer._filter) || (layer && ctx.filterFn && ctx.filterFn.apply(ctx, [layer._filter].concat(arr)));
    var fn = layer[f++];

    if (!fn) {
        l = l + 1
        f = 0
        return  next.apply(ctx, arguments)
    }

    var isErrorHandler = fn && (fn.length === arr.length + 2);
    var shouldPassErrorToNext = (err && !isErrorHandler && errorHandlersCount) || (err && isErrorHandler && errorHandlersCount && !shouldRun);
    var shouldRunErrorHandler = err && isErrorHandler && errorHandlersCount;

    if (shouldPassErrorToNext) {
        return next((err))
    }
    if (!shouldRun) {
        return  next.apply(ctx, arguments)
    }

    if (shouldRunErrorHandler) {
      errorHandlersCount--;
      arr.unshift(err);
      return wrapped(fn).apply(ctx, arr.concat(next));
    }


    if (shouldRun && !isErrorHandler) {
      wrapped(fn).apply(ctx, arr.concat(next));
    } else {
      next();
    }

  }

  next();

  return this;
};

module.exports = Ware;
