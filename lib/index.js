var slice = [].slice;
var wrap = require('wrap-fn');

function Ware(fn) {
  if (!(this instanceof Ware)) return new Ware(fn);
  this.fns = [];
  if (fn) this.use(fn);
}

Ware.prototype.use = function(fn) {
  var filter;

  if (arguments.length >= 2) {
    filter = arguments[0];
  }

  if (arguments.length === 2) {
    fn = arguments[1];
    fn._filter = fn._filter ? fn._filter : filter;
  }

  if (arguments.length > 2) {
    fn = slice.call(arguments, 1);
  }

  if (fn instanceof Ware) {
    return this.use(filter, fn.fns);
  }

  if (fn instanceof Array) {
    for (var i = 0, f; f = fn[i++];) {
      this.use(filter, f);
    }
    return this;
  }

  this.fns.push(fn);
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
  var fns = this.fns;
  var ctx = this;
  var i = 0;
  var last = arguments[arguments.length - 1];
  var done = 'function' == typeof last && last;
  var args = done ? slice.call(arguments, 0, arguments.length - 1) : slice.call(arguments);
  var errorHandlersCount = fns.reduce(function(count, fn) {
    return count + (fn.length === args.length + 2);
  }, 0);

  // next step
  function next(err) {
    var arr = slice.call(args);
    var fn = fns[i++];
    var isErrorHandler = fn && (fn.length === arr.length + 2);
    var shouldRunDone = (err && !errorHandlersCount) || !fn;
    var shouldRunFail = err && !errorHandlersCount && !done;
    var shouldPassErrorToNext = err && errorHandlersCount && !isErrorHandler;
    var shouldRunErrorHandler = err && errorHandlersCount && isErrorHandler;
    var shouldRun = !ctx.filterFn || (fn && ctx.filterFn && ctx.filterFn.apply(ctx, [fn._filter].concat(arr)));

    if (shouldRunFail || shouldRunDone || shouldRunErrorHandler) {
      arr.unshift(err);
    }

    if (shouldRunFail) {
      return fail.apply(null, arr);
    }

    if (shouldRunDone) {
      return done && done.apply(null, arr);
    }

    if (shouldPassErrorToNext) {
      return next(err);
    }

    if (shouldRunErrorHandler) {
      errorHandlersCount--;
    }

    if (shouldRun) {
      wrap(fn, next).apply(ctx, arr);
    } else {
      next(err);
    }
  }

  next();

  return this;
};

module.exports = Ware;
