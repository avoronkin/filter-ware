var slice = [].slice;
var wrapped = require('wrapped')

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
  var args = done ? slice.call(arguments, 0, arguments.length - 1) : arguments;
  var errorHandlersCount = fns.reduce(function(count, fn) {
    var shouldRun = !ctx.filterFn || (fn && !fn._filter) || (fn && ctx.filterFn && ctx.filterFn.apply(ctx, [fn._filter].concat(args)));
    var isErrorHandler = fn && (fn.length === args.length + 2);

    return (isErrorHandler && shouldRun) ? count + 1 : count;
  }, 0);

  // next step
  function next(err) {
    var arr = slice.call(args);
    var fn = fns[i++];
    var shouldRun = !ctx.filterFn || (fn && !fn._filter) || (fn && ctx.filterFn && ctx.filterFn.apply(ctx, [fn._filter].concat(arr)));
    var isErrorHandler = fn && (fn.length === arr.length + 2);
    var shouldRunDone = !fn || err && !errorHandlersCount;
    var shouldFail = !done && err && !errorHandlersCount;
    var shouldPassErrorToNext = (err && !isErrorHandler && errorHandlersCount) || (err && isErrorHandler && errorHandlersCount && !shouldRun);
    var shouldRunErrorHandler = err && isErrorHandler && errorHandlersCount && shouldRun;

    if (shouldFail) {
      throw err;
    }

    if (shouldRunDone || shouldRunErrorHandler) {
      arr.unshift(err);
    }

    if (shouldRunDone) {
      return done && done.apply(null, arr);
    }

    if (shouldPassErrorToNext) {
      return next(err);
    }

    if (shouldRunErrorHandler) {
      errorHandlersCount--;
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
