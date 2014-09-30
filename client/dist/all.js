//     Underscore.js 1.6.0
//     http://underscorejs.org
//     (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.6.0';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return obj;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, length = obj.length; i < length; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      var keys = _.keys(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
      }
    }
    return obj;
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var result;
    any(obj, function(value, index, list) {
      if (predicate.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(predicate, context);
    each(obj, function(value, index, list) {
      if (predicate.call(context, value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, function(value, index, list) {
      return !predicate.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate || (predicate = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(predicate, context);
    each(obj, function(value, index, list) {
      if (!(result = result && predicate.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, predicate, context) {
    predicate || (predicate = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(predicate, context);
    each(obj, function(value, index, list) {
      if (result || (result = predicate.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matches(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matches(attrs));
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See [WebKit Bug 80797](https://bugs.webkit.org/show_bug.cgi?id=80797)
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    var result = -Infinity, lastComputed = -Infinity;
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      if (computed > lastComputed) {
        result = value;
        lastComputed = computed;
      }
    });
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    var result = Infinity, lastComputed = Infinity;
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      if (computed < lastComputed) {
        result = value;
        lastComputed = computed;
      }
    });
    return result;
  };

  // Shuffle an array, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (obj.length !== +obj.length) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return value;
    return _.property(value);
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, iterator, context) {
    iterator = lookupIterator(iterator);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iterator, context) {
      var result = {};
      iterator = lookupIterator(iterator);
      each(obj, function(value, index) {
        var key = iterator.call(context, value, index, obj);
        behavior(result, key, value);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, key, value) {
    _.has(result, key) ? result[key].push(value) : result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, key, value) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, key) {
    _.has(result, key) ? result[key]++ : result[key] = 1;
  });

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) return array[0];
    if (n < 0) return [];
    return slice.call(array, 0, n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) return array[array.length - 1];
    return slice.call(array, Math.max(array.length - n, 0));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    each(input, function(value) {
      if (_.isArray(value) || _.isArguments(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Split an array into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(array, predicate) {
    var pass = [], fail = [];
    each(array, function(elem) {
      (predicate(elem) ? pass : fail).push(elem);
    });
    return [pass, fail];
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.contains(other, item);
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var length = _.max(_.pluck(arguments, 'length').concat(0));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, '' + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, length + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(length);

    while(idx < length) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    return function() {
      var position = 0;
      var args = boundArgs.slice();
      for (var i = 0, length = args.length; i < length; i++) {
        if (args[i] === _) args[i] = arguments[position++];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return func.apply(this, args);
    };
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) throw new Error('bindAll must be passed function names');
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    options || (options = {});
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
        context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;
      if (last < wait) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) {
        timeout = setTimeout(later, wait);
      }
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = new Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = new Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                             _.isFunction(bCtor) && (bCtor instanceof bCtor))
                        && ('constructor' in a && 'constructor' in b)) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  _.constant = function(value) {
    return function () {
      return value;
    };
  };

  _.property = function(key) {
    return function(obj) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of `key:value` pairs.
  _.matches = function(attrs) {
    return function(obj) {
      if (obj === attrs) return true; //avoid comparing an object to itself.
      for (var key in attrs) {
        if (attrs[key] !== obj[key])
          return false;
      }
      return true;
    }
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(Math.max(0, n));
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() { return new Date().getTime(); };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}).call(this);

/*!

 handlebars v1.3.0

Copyright (C) 2011 by Yehuda Katz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

@license
*/
var Handlebars=function(){var a=function(){"use strict";function a(a){this.string=a}var b;return a.prototype.toString=function(){return""+this.string},b=a}(),b=function(a){"use strict";function b(a){return h[a]||"&amp;"}function c(a,b){for(var c in b)Object.prototype.hasOwnProperty.call(b,c)&&(a[c]=b[c])}function d(a){return a instanceof g?a.toString():a||0===a?(a=""+a,j.test(a)?a.replace(i,b):a):""}function e(a){return a||0===a?m(a)&&0===a.length?!0:!1:!0}var f={},g=a,h={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;","`":"&#x60;"},i=/[&<>"'`]/g,j=/[&<>"'`]/;f.extend=c;var k=Object.prototype.toString;f.toString=k;var l=function(a){return"function"==typeof a};l(/x/)&&(l=function(a){return"function"==typeof a&&"[object Function]"===k.call(a)});var l;f.isFunction=l;var m=Array.isArray||function(a){return a&&"object"==typeof a?"[object Array]"===k.call(a):!1};return f.isArray=m,f.escapeExpression=d,f.isEmpty=e,f}(a),c=function(){"use strict";function a(a,b){var d;b&&b.firstLine&&(d=b.firstLine,a+=" - "+d+":"+b.firstColumn);for(var e=Error.prototype.constructor.call(this,a),f=0;f<c.length;f++)this[c[f]]=e[c[f]];d&&(this.lineNumber=d,this.column=b.firstColumn)}var b,c=["description","fileName","lineNumber","message","name","number","stack"];return a.prototype=new Error,b=a}(),d=function(a,b){"use strict";function c(a,b){this.helpers=a||{},this.partials=b||{},d(this)}function d(a){a.registerHelper("helperMissing",function(a){if(2===arguments.length)return void 0;throw new h("Missing helper: '"+a+"'")}),a.registerHelper("blockHelperMissing",function(b,c){var d=c.inverse||function(){},e=c.fn;return m(b)&&(b=b.call(this)),b===!0?e(this):b===!1||null==b?d(this):l(b)?b.length>0?a.helpers.each(b,c):d(this):e(b)}),a.registerHelper("each",function(a,b){var c,d=b.fn,e=b.inverse,f=0,g="";if(m(a)&&(a=a.call(this)),b.data&&(c=q(b.data)),a&&"object"==typeof a)if(l(a))for(var h=a.length;h>f;f++)c&&(c.index=f,c.first=0===f,c.last=f===a.length-1),g+=d(a[f],{data:c});else for(var i in a)a.hasOwnProperty(i)&&(c&&(c.key=i,c.index=f,c.first=0===f),g+=d(a[i],{data:c}),f++);return 0===f&&(g=e(this)),g}),a.registerHelper("if",function(a,b){return m(a)&&(a=a.call(this)),!b.hash.includeZero&&!a||g.isEmpty(a)?b.inverse(this):b.fn(this)}),a.registerHelper("unless",function(b,c){return a.helpers["if"].call(this,b,{fn:c.inverse,inverse:c.fn,hash:c.hash})}),a.registerHelper("with",function(a,b){return m(a)&&(a=a.call(this)),g.isEmpty(a)?void 0:b.fn(a)}),a.registerHelper("log",function(b,c){var d=c.data&&null!=c.data.level?parseInt(c.data.level,10):1;a.log(d,b)})}function e(a,b){p.log(a,b)}var f={},g=a,h=b,i="1.3.0";f.VERSION=i;var j=4;f.COMPILER_REVISION=j;var k={1:"<= 1.0.rc.2",2:"== 1.0.0-rc.3",3:"== 1.0.0-rc.4",4:">= 1.0.0"};f.REVISION_CHANGES=k;var l=g.isArray,m=g.isFunction,n=g.toString,o="[object Object]";f.HandlebarsEnvironment=c,c.prototype={constructor:c,logger:p,log:e,registerHelper:function(a,b,c){if(n.call(a)===o){if(c||b)throw new h("Arg not supported with multiple helpers");g.extend(this.helpers,a)}else c&&(b.not=c),this.helpers[a]=b},registerPartial:function(a,b){n.call(a)===o?g.extend(this.partials,a):this.partials[a]=b}};var p={methodMap:{0:"debug",1:"info",2:"warn",3:"error"},DEBUG:0,INFO:1,WARN:2,ERROR:3,level:3,log:function(a,b){if(p.level<=a){var c=p.methodMap[a];"undefined"!=typeof console&&console[c]&&console[c].call(console,b)}}};f.logger=p,f.log=e;var q=function(a){var b={};return g.extend(b,a),b};return f.createFrame=q,f}(b,c),e=function(a,b,c){"use strict";function d(a){var b=a&&a[0]||1,c=m;if(b!==c){if(c>b){var d=n[c],e=n[b];throw new l("Template was precompiled with an older version of Handlebars than the current runtime. Please update your precompiler to a newer version ("+d+") or downgrade your runtime to an older version ("+e+").")}throw new l("Template was precompiled with a newer version of Handlebars than the current runtime. Please update your runtime to a newer version ("+a[1]+").")}}function e(a,b){if(!b)throw new l("No environment passed to template");var c=function(a,c,d,e,f,g){var h=b.VM.invokePartial.apply(this,arguments);if(null!=h)return h;if(b.compile){var i={helpers:e,partials:f,data:g};return f[c]=b.compile(a,{data:void 0!==g},b),f[c](d,i)}throw new l("The partial "+c+" could not be compiled when running in runtime-only mode")},d={escapeExpression:k.escapeExpression,invokePartial:c,programs:[],program:function(a,b,c){var d=this.programs[a];return c?d=g(a,b,c):d||(d=this.programs[a]=g(a,b)),d},merge:function(a,b){var c=a||b;return a&&b&&a!==b&&(c={},k.extend(c,b),k.extend(c,a)),c},programWithDepth:b.VM.programWithDepth,noop:b.VM.noop,compilerInfo:null};return function(c,e){e=e||{};var f,g,h=e.partial?e:b;e.partial||(f=e.helpers,g=e.partials);var i=a.call(d,h,c,f,g,e.data);return e.partial||b.VM.checkRevision(d.compilerInfo),i}}function f(a,b,c){var d=Array.prototype.slice.call(arguments,3),e=function(a,e){return e=e||{},b.apply(this,[a,e.data||c].concat(d))};return e.program=a,e.depth=d.length,e}function g(a,b,c){var d=function(a,d){return d=d||{},b(a,d.data||c)};return d.program=a,d.depth=0,d}function h(a,b,c,d,e,f){var g={partial:!0,helpers:d,partials:e,data:f};if(void 0===a)throw new l("The partial "+b+" could not be found");return a instanceof Function?a(c,g):void 0}function i(){return""}var j={},k=a,l=b,m=c.COMPILER_REVISION,n=c.REVISION_CHANGES;return j.checkRevision=d,j.template=e,j.programWithDepth=f,j.program=g,j.invokePartial=h,j.noop=i,j}(b,c,d),f=function(a,b,c,d,e){"use strict";var f,g=a,h=b,i=c,j=d,k=e,l=function(){var a=new g.HandlebarsEnvironment;return j.extend(a,g),a.SafeString=h,a.Exception=i,a.Utils=j,a.VM=k,a.template=function(b){return k.template(b,a)},a},m=l();return m.create=l,f=m}(d,a,c,b,e),g=function(a){"use strict";function b(a){a=a||{},this.firstLine=a.first_line,this.firstColumn=a.first_column,this.lastColumn=a.last_column,this.lastLine=a.last_line}var c,d=a,e={ProgramNode:function(a,c,d,f){var g,h;3===arguments.length?(f=d,d=null):2===arguments.length&&(f=c,c=null),b.call(this,f),this.type="program",this.statements=a,this.strip={},d?(h=d[0],h?(g={first_line:h.firstLine,last_line:h.lastLine,last_column:h.lastColumn,first_column:h.firstColumn},this.inverse=new e.ProgramNode(d,c,g)):this.inverse=new e.ProgramNode(d,c),this.strip.right=c.left):c&&(this.strip.left=c.right)},MustacheNode:function(a,c,d,f,g){if(b.call(this,g),this.type="mustache",this.strip=f,null!=d&&d.charAt){var h=d.charAt(3)||d.charAt(2);this.escaped="{"!==h&&"&"!==h}else this.escaped=!!d;this.sexpr=a instanceof e.SexprNode?a:new e.SexprNode(a,c),this.sexpr.isRoot=!0,this.id=this.sexpr.id,this.params=this.sexpr.params,this.hash=this.sexpr.hash,this.eligibleHelper=this.sexpr.eligibleHelper,this.isHelper=this.sexpr.isHelper},SexprNode:function(a,c,d){b.call(this,d),this.type="sexpr",this.hash=c;var e=this.id=a[0],f=this.params=a.slice(1),g=this.eligibleHelper=e.isSimple;this.isHelper=g&&(f.length||c)},PartialNode:function(a,c,d,e){b.call(this,e),this.type="partial",this.partialName=a,this.context=c,this.strip=d},BlockNode:function(a,c,e,f,g){if(b.call(this,g),a.sexpr.id.original!==f.path.original)throw new d(a.sexpr.id.original+" doesn't match "+f.path.original,this);this.type="block",this.mustache=a,this.program=c,this.inverse=e,this.strip={left:a.strip.left,right:f.strip.right},(c||e).strip.left=a.strip.right,(e||c).strip.right=f.strip.left,e&&!c&&(this.isInverse=!0)},ContentNode:function(a,c){b.call(this,c),this.type="content",this.string=a},HashNode:function(a,c){b.call(this,c),this.type="hash",this.pairs=a},IdNode:function(a,c){b.call(this,c),this.type="ID";for(var e="",f=[],g=0,h=0,i=a.length;i>h;h++){var j=a[h].part;if(e+=(a[h].separator||"")+j,".."===j||"."===j||"this"===j){if(f.length>0)throw new d("Invalid path: "+e,this);".."===j?g++:this.isScoped=!0}else f.push(j)}this.original=e,this.parts=f,this.string=f.join("."),this.depth=g,this.isSimple=1===a.length&&!this.isScoped&&0===g,this.stringModeValue=this.string},PartialNameNode:function(a,c){b.call(this,c),this.type="PARTIAL_NAME",this.name=a.original},DataNode:function(a,c){b.call(this,c),this.type="DATA",this.id=a},StringNode:function(a,c){b.call(this,c),this.type="STRING",this.original=this.string=this.stringModeValue=a},IntegerNode:function(a,c){b.call(this,c),this.type="INTEGER",this.original=this.integer=a,this.stringModeValue=Number(a)},BooleanNode:function(a,c){b.call(this,c),this.type="BOOLEAN",this.bool=a,this.stringModeValue="true"===a},CommentNode:function(a,c){b.call(this,c),this.type="comment",this.comment=a}};return c=e}(c),h=function(){"use strict";var a,b=function(){function a(a,b){return{left:"~"===a.charAt(2),right:"~"===b.charAt(0)||"~"===b.charAt(1)}}function b(){this.yy={}}var c={trace:function(){},yy:{},symbols_:{error:2,root:3,statements:4,EOF:5,program:6,simpleInverse:7,statement:8,openInverse:9,closeBlock:10,openBlock:11,mustache:12,partial:13,CONTENT:14,COMMENT:15,OPEN_BLOCK:16,sexpr:17,CLOSE:18,OPEN_INVERSE:19,OPEN_ENDBLOCK:20,path:21,OPEN:22,OPEN_UNESCAPED:23,CLOSE_UNESCAPED:24,OPEN_PARTIAL:25,partialName:26,partial_option0:27,sexpr_repetition0:28,sexpr_option0:29,dataName:30,param:31,STRING:32,INTEGER:33,BOOLEAN:34,OPEN_SEXPR:35,CLOSE_SEXPR:36,hash:37,hash_repetition_plus0:38,hashSegment:39,ID:40,EQUALS:41,DATA:42,pathSegments:43,SEP:44,$accept:0,$end:1},terminals_:{2:"error",5:"EOF",14:"CONTENT",15:"COMMENT",16:"OPEN_BLOCK",18:"CLOSE",19:"OPEN_INVERSE",20:"OPEN_ENDBLOCK",22:"OPEN",23:"OPEN_UNESCAPED",24:"CLOSE_UNESCAPED",25:"OPEN_PARTIAL",32:"STRING",33:"INTEGER",34:"BOOLEAN",35:"OPEN_SEXPR",36:"CLOSE_SEXPR",40:"ID",41:"EQUALS",42:"DATA",44:"SEP"},productions_:[0,[3,2],[3,1],[6,2],[6,3],[6,2],[6,1],[6,1],[6,0],[4,1],[4,2],[8,3],[8,3],[8,1],[8,1],[8,1],[8,1],[11,3],[9,3],[10,3],[12,3],[12,3],[13,4],[7,2],[17,3],[17,1],[31,1],[31,1],[31,1],[31,1],[31,1],[31,3],[37,1],[39,3],[26,1],[26,1],[26,1],[30,2],[21,1],[43,3],[43,1],[27,0],[27,1],[28,0],[28,2],[29,0],[29,1],[38,1],[38,2]],performAction:function(b,c,d,e,f,g){var h=g.length-1;switch(f){case 1:return new e.ProgramNode(g[h-1],this._$);case 2:return new e.ProgramNode([],this._$);case 3:this.$=new e.ProgramNode([],g[h-1],g[h],this._$);break;case 4:this.$=new e.ProgramNode(g[h-2],g[h-1],g[h],this._$);break;case 5:this.$=new e.ProgramNode(g[h-1],g[h],[],this._$);break;case 6:this.$=new e.ProgramNode(g[h],this._$);break;case 7:this.$=new e.ProgramNode([],this._$);break;case 8:this.$=new e.ProgramNode([],this._$);break;case 9:this.$=[g[h]];break;case 10:g[h-1].push(g[h]),this.$=g[h-1];break;case 11:this.$=new e.BlockNode(g[h-2],g[h-1].inverse,g[h-1],g[h],this._$);break;case 12:this.$=new e.BlockNode(g[h-2],g[h-1],g[h-1].inverse,g[h],this._$);break;case 13:this.$=g[h];break;case 14:this.$=g[h];break;case 15:this.$=new e.ContentNode(g[h],this._$);break;case 16:this.$=new e.CommentNode(g[h],this._$);break;case 17:this.$=new e.MustacheNode(g[h-1],null,g[h-2],a(g[h-2],g[h]),this._$);break;case 18:this.$=new e.MustacheNode(g[h-1],null,g[h-2],a(g[h-2],g[h]),this._$);break;case 19:this.$={path:g[h-1],strip:a(g[h-2],g[h])};break;case 20:this.$=new e.MustacheNode(g[h-1],null,g[h-2],a(g[h-2],g[h]),this._$);break;case 21:this.$=new e.MustacheNode(g[h-1],null,g[h-2],a(g[h-2],g[h]),this._$);break;case 22:this.$=new e.PartialNode(g[h-2],g[h-1],a(g[h-3],g[h]),this._$);break;case 23:this.$=a(g[h-1],g[h]);break;case 24:this.$=new e.SexprNode([g[h-2]].concat(g[h-1]),g[h],this._$);break;case 25:this.$=new e.SexprNode([g[h]],null,this._$);break;case 26:this.$=g[h];break;case 27:this.$=new e.StringNode(g[h],this._$);break;case 28:this.$=new e.IntegerNode(g[h],this._$);break;case 29:this.$=new e.BooleanNode(g[h],this._$);break;case 30:this.$=g[h];break;case 31:g[h-1].isHelper=!0,this.$=g[h-1];break;case 32:this.$=new e.HashNode(g[h],this._$);break;case 33:this.$=[g[h-2],g[h]];break;case 34:this.$=new e.PartialNameNode(g[h],this._$);break;case 35:this.$=new e.PartialNameNode(new e.StringNode(g[h],this._$),this._$);break;case 36:this.$=new e.PartialNameNode(new e.IntegerNode(g[h],this._$));break;case 37:this.$=new e.DataNode(g[h],this._$);break;case 38:this.$=new e.IdNode(g[h],this._$);break;case 39:g[h-2].push({part:g[h],separator:g[h-1]}),this.$=g[h-2];break;case 40:this.$=[{part:g[h]}];break;case 43:this.$=[];break;case 44:g[h-1].push(g[h]);break;case 47:this.$=[g[h]];break;case 48:g[h-1].push(g[h])}},table:[{3:1,4:2,5:[1,3],8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],22:[1,13],23:[1,14],25:[1,15]},{1:[3]},{5:[1,16],8:17,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],22:[1,13],23:[1,14],25:[1,15]},{1:[2,2]},{5:[2,9],14:[2,9],15:[2,9],16:[2,9],19:[2,9],20:[2,9],22:[2,9],23:[2,9],25:[2,9]},{4:20,6:18,7:19,8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,21],20:[2,8],22:[1,13],23:[1,14],25:[1,15]},{4:20,6:22,7:19,8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,21],20:[2,8],22:[1,13],23:[1,14],25:[1,15]},{5:[2,13],14:[2,13],15:[2,13],16:[2,13],19:[2,13],20:[2,13],22:[2,13],23:[2,13],25:[2,13]},{5:[2,14],14:[2,14],15:[2,14],16:[2,14],19:[2,14],20:[2,14],22:[2,14],23:[2,14],25:[2,14]},{5:[2,15],14:[2,15],15:[2,15],16:[2,15],19:[2,15],20:[2,15],22:[2,15],23:[2,15],25:[2,15]},{5:[2,16],14:[2,16],15:[2,16],16:[2,16],19:[2,16],20:[2,16],22:[2,16],23:[2,16],25:[2,16]},{17:23,21:24,30:25,40:[1,28],42:[1,27],43:26},{17:29,21:24,30:25,40:[1,28],42:[1,27],43:26},{17:30,21:24,30:25,40:[1,28],42:[1,27],43:26},{17:31,21:24,30:25,40:[1,28],42:[1,27],43:26},{21:33,26:32,32:[1,34],33:[1,35],40:[1,28],43:26},{1:[2,1]},{5:[2,10],14:[2,10],15:[2,10],16:[2,10],19:[2,10],20:[2,10],22:[2,10],23:[2,10],25:[2,10]},{10:36,20:[1,37]},{4:38,8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],20:[2,7],22:[1,13],23:[1,14],25:[1,15]},{7:39,8:17,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,21],20:[2,6],22:[1,13],23:[1,14],25:[1,15]},{17:23,18:[1,40],21:24,30:25,40:[1,28],42:[1,27],43:26},{10:41,20:[1,37]},{18:[1,42]},{18:[2,43],24:[2,43],28:43,32:[2,43],33:[2,43],34:[2,43],35:[2,43],36:[2,43],40:[2,43],42:[2,43]},{18:[2,25],24:[2,25],36:[2,25]},{18:[2,38],24:[2,38],32:[2,38],33:[2,38],34:[2,38],35:[2,38],36:[2,38],40:[2,38],42:[2,38],44:[1,44]},{21:45,40:[1,28],43:26},{18:[2,40],24:[2,40],32:[2,40],33:[2,40],34:[2,40],35:[2,40],36:[2,40],40:[2,40],42:[2,40],44:[2,40]},{18:[1,46]},{18:[1,47]},{24:[1,48]},{18:[2,41],21:50,27:49,40:[1,28],43:26},{18:[2,34],40:[2,34]},{18:[2,35],40:[2,35]},{18:[2,36],40:[2,36]},{5:[2,11],14:[2,11],15:[2,11],16:[2,11],19:[2,11],20:[2,11],22:[2,11],23:[2,11],25:[2,11]},{21:51,40:[1,28],43:26},{8:17,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],20:[2,3],22:[1,13],23:[1,14],25:[1,15]},{4:52,8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],20:[2,5],22:[1,13],23:[1,14],25:[1,15]},{14:[2,23],15:[2,23],16:[2,23],19:[2,23],20:[2,23],22:[2,23],23:[2,23],25:[2,23]},{5:[2,12],14:[2,12],15:[2,12],16:[2,12],19:[2,12],20:[2,12],22:[2,12],23:[2,12],25:[2,12]},{14:[2,18],15:[2,18],16:[2,18],19:[2,18],20:[2,18],22:[2,18],23:[2,18],25:[2,18]},{18:[2,45],21:56,24:[2,45],29:53,30:60,31:54,32:[1,57],33:[1,58],34:[1,59],35:[1,61],36:[2,45],37:55,38:62,39:63,40:[1,64],42:[1,27],43:26},{40:[1,65]},{18:[2,37],24:[2,37],32:[2,37],33:[2,37],34:[2,37],35:[2,37],36:[2,37],40:[2,37],42:[2,37]},{14:[2,17],15:[2,17],16:[2,17],19:[2,17],20:[2,17],22:[2,17],23:[2,17],25:[2,17]},{5:[2,20],14:[2,20],15:[2,20],16:[2,20],19:[2,20],20:[2,20],22:[2,20],23:[2,20],25:[2,20]},{5:[2,21],14:[2,21],15:[2,21],16:[2,21],19:[2,21],20:[2,21],22:[2,21],23:[2,21],25:[2,21]},{18:[1,66]},{18:[2,42]},{18:[1,67]},{8:17,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],20:[2,4],22:[1,13],23:[1,14],25:[1,15]},{18:[2,24],24:[2,24],36:[2,24]},{18:[2,44],24:[2,44],32:[2,44],33:[2,44],34:[2,44],35:[2,44],36:[2,44],40:[2,44],42:[2,44]},{18:[2,46],24:[2,46],36:[2,46]},{18:[2,26],24:[2,26],32:[2,26],33:[2,26],34:[2,26],35:[2,26],36:[2,26],40:[2,26],42:[2,26]},{18:[2,27],24:[2,27],32:[2,27],33:[2,27],34:[2,27],35:[2,27],36:[2,27],40:[2,27],42:[2,27]},{18:[2,28],24:[2,28],32:[2,28],33:[2,28],34:[2,28],35:[2,28],36:[2,28],40:[2,28],42:[2,28]},{18:[2,29],24:[2,29],32:[2,29],33:[2,29],34:[2,29],35:[2,29],36:[2,29],40:[2,29],42:[2,29]},{18:[2,30],24:[2,30],32:[2,30],33:[2,30],34:[2,30],35:[2,30],36:[2,30],40:[2,30],42:[2,30]},{17:68,21:24,30:25,40:[1,28],42:[1,27],43:26},{18:[2,32],24:[2,32],36:[2,32],39:69,40:[1,70]},{18:[2,47],24:[2,47],36:[2,47],40:[2,47]},{18:[2,40],24:[2,40],32:[2,40],33:[2,40],34:[2,40],35:[2,40],36:[2,40],40:[2,40],41:[1,71],42:[2,40],44:[2,40]},{18:[2,39],24:[2,39],32:[2,39],33:[2,39],34:[2,39],35:[2,39],36:[2,39],40:[2,39],42:[2,39],44:[2,39]},{5:[2,22],14:[2,22],15:[2,22],16:[2,22],19:[2,22],20:[2,22],22:[2,22],23:[2,22],25:[2,22]},{5:[2,19],14:[2,19],15:[2,19],16:[2,19],19:[2,19],20:[2,19],22:[2,19],23:[2,19],25:[2,19]},{36:[1,72]},{18:[2,48],24:[2,48],36:[2,48],40:[2,48]},{41:[1,71]},{21:56,30:60,31:73,32:[1,57],33:[1,58],34:[1,59],35:[1,61],40:[1,28],42:[1,27],43:26},{18:[2,31],24:[2,31],32:[2,31],33:[2,31],34:[2,31],35:[2,31],36:[2,31],40:[2,31],42:[2,31]},{18:[2,33],24:[2,33],36:[2,33],40:[2,33]}],defaultActions:{3:[2,2],16:[2,1],50:[2,42]},parseError:function(a){throw new Error(a)},parse:function(a){function b(){var a;return a=c.lexer.lex()||1,"number"!=typeof a&&(a=c.symbols_[a]||a),a}var c=this,d=[0],e=[null],f=[],g=this.table,h="",i=0,j=0,k=0;this.lexer.setInput(a),this.lexer.yy=this.yy,this.yy.lexer=this.lexer,this.yy.parser=this,"undefined"==typeof this.lexer.yylloc&&(this.lexer.yylloc={});var l=this.lexer.yylloc;f.push(l);var m=this.lexer.options&&this.lexer.options.ranges;"function"==typeof this.yy.parseError&&(this.parseError=this.yy.parseError);for(var n,o,p,q,r,s,t,u,v,w={};;){if(p=d[d.length-1],this.defaultActions[p]?q=this.defaultActions[p]:((null===n||"undefined"==typeof n)&&(n=b()),q=g[p]&&g[p][n]),"undefined"==typeof q||!q.length||!q[0]){var x="";if(!k){v=[];for(s in g[p])this.terminals_[s]&&s>2&&v.push("'"+this.terminals_[s]+"'");x=this.lexer.showPosition?"Parse error on line "+(i+1)+":\n"+this.lexer.showPosition()+"\nExpecting "+v.join(", ")+", got '"+(this.terminals_[n]||n)+"'":"Parse error on line "+(i+1)+": Unexpected "+(1==n?"end of input":"'"+(this.terminals_[n]||n)+"'"),this.parseError(x,{text:this.lexer.match,token:this.terminals_[n]||n,line:this.lexer.yylineno,loc:l,expected:v})}}if(q[0]instanceof Array&&q.length>1)throw new Error("Parse Error: multiple actions possible at state: "+p+", token: "+n);switch(q[0]){case 1:d.push(n),e.push(this.lexer.yytext),f.push(this.lexer.yylloc),d.push(q[1]),n=null,o?(n=o,o=null):(j=this.lexer.yyleng,h=this.lexer.yytext,i=this.lexer.yylineno,l=this.lexer.yylloc,k>0&&k--);break;case 2:if(t=this.productions_[q[1]][1],w.$=e[e.length-t],w._$={first_line:f[f.length-(t||1)].first_line,last_line:f[f.length-1].last_line,first_column:f[f.length-(t||1)].first_column,last_column:f[f.length-1].last_column},m&&(w._$.range=[f[f.length-(t||1)].range[0],f[f.length-1].range[1]]),r=this.performAction.call(w,h,j,i,this.yy,q[1],e,f),"undefined"!=typeof r)return r;t&&(d=d.slice(0,-1*t*2),e=e.slice(0,-1*t),f=f.slice(0,-1*t)),d.push(this.productions_[q[1]][0]),e.push(w.$),f.push(w._$),u=g[d[d.length-2]][d[d.length-1]],d.push(u);break;case 3:return!0}}return!0}},d=function(){var a={EOF:1,parseError:function(a,b){if(!this.yy.parser)throw new Error(a);this.yy.parser.parseError(a,b)},setInput:function(a){return this._input=a,this._more=this._less=this.done=!1,this.yylineno=this.yyleng=0,this.yytext=this.matched=this.match="",this.conditionStack=["INITIAL"],this.yylloc={first_line:1,first_column:0,last_line:1,last_column:0},this.options.ranges&&(this.yylloc.range=[0,0]),this.offset=0,this},input:function(){var a=this._input[0];this.yytext+=a,this.yyleng++,this.offset++,this.match+=a,this.matched+=a;var b=a.match(/(?:\r\n?|\n).*/g);return b?(this.yylineno++,this.yylloc.last_line++):this.yylloc.last_column++,this.options.ranges&&this.yylloc.range[1]++,this._input=this._input.slice(1),a},unput:function(a){var b=a.length,c=a.split(/(?:\r\n?|\n)/g);this._input=a+this._input,this.yytext=this.yytext.substr(0,this.yytext.length-b-1),this.offset-=b;var d=this.match.split(/(?:\r\n?|\n)/g);this.match=this.match.substr(0,this.match.length-1),this.matched=this.matched.substr(0,this.matched.length-1),c.length-1&&(this.yylineno-=c.length-1);var e=this.yylloc.range;return this.yylloc={first_line:this.yylloc.first_line,last_line:this.yylineno+1,first_column:this.yylloc.first_column,last_column:c?(c.length===d.length?this.yylloc.first_column:0)+d[d.length-c.length].length-c[0].length:this.yylloc.first_column-b},this.options.ranges&&(this.yylloc.range=[e[0],e[0]+this.yyleng-b]),this},more:function(){return this._more=!0,this},less:function(a){this.unput(this.match.slice(a))},pastInput:function(){var a=this.matched.substr(0,this.matched.length-this.match.length);return(a.length>20?"...":"")+a.substr(-20).replace(/\n/g,"")},upcomingInput:function(){var a=this.match;return a.length<20&&(a+=this._input.substr(0,20-a.length)),(a.substr(0,20)+(a.length>20?"...":"")).replace(/\n/g,"")},showPosition:function(){var a=this.pastInput(),b=new Array(a.length+1).join("-");return a+this.upcomingInput()+"\n"+b+"^"},next:function(){if(this.done)return this.EOF;this._input||(this.done=!0);var a,b,c,d,e;this._more||(this.yytext="",this.match="");for(var f=this._currentRules(),g=0;g<f.length&&(c=this._input.match(this.rules[f[g]]),!c||b&&!(c[0].length>b[0].length)||(b=c,d=g,this.options.flex));g++);return b?(e=b[0].match(/(?:\r\n?|\n).*/g),e&&(this.yylineno+=e.length),this.yylloc={first_line:this.yylloc.last_line,last_line:this.yylineno+1,first_column:this.yylloc.last_column,last_column:e?e[e.length-1].length-e[e.length-1].match(/\r?\n?/)[0].length:this.yylloc.last_column+b[0].length},this.yytext+=b[0],this.match+=b[0],this.matches=b,this.yyleng=this.yytext.length,this.options.ranges&&(this.yylloc.range=[this.offset,this.offset+=this.yyleng]),this._more=!1,this._input=this._input.slice(b[0].length),this.matched+=b[0],a=this.performAction.call(this,this.yy,this,f[d],this.conditionStack[this.conditionStack.length-1]),this.done&&this._input&&(this.done=!1),a?a:void 0):""===this._input?this.EOF:this.parseError("Lexical error on line "+(this.yylineno+1)+". Unrecognized text.\n"+this.showPosition(),{text:"",token:null,line:this.yylineno})},lex:function(){var a=this.next();return"undefined"!=typeof a?a:this.lex()},begin:function(a){this.conditionStack.push(a)},popState:function(){return this.conditionStack.pop()},_currentRules:function(){return this.conditions[this.conditionStack[this.conditionStack.length-1]].rules},topState:function(){return this.conditionStack[this.conditionStack.length-2]},pushState:function(a){this.begin(a)}};return a.options={},a.performAction=function(a,b,c,d){function e(a,c){return b.yytext=b.yytext.substr(a,b.yyleng-c)}switch(c){case 0:if("\\\\"===b.yytext.slice(-2)?(e(0,1),this.begin("mu")):"\\"===b.yytext.slice(-1)?(e(0,1),this.begin("emu")):this.begin("mu"),b.yytext)return 14;break;case 1:return 14;case 2:return this.popState(),14;case 3:return e(0,4),this.popState(),15;case 4:return 35;case 5:return 36;case 6:return 25;case 7:return 16;case 8:return 20;case 9:return 19;case 10:return 19;case 11:return 23;case 12:return 22;case 13:this.popState(),this.begin("com");break;case 14:return e(3,5),this.popState(),15;case 15:return 22;case 16:return 41;case 17:return 40;case 18:return 40;case 19:return 44;case 20:break;case 21:return this.popState(),24;case 22:return this.popState(),18;case 23:return b.yytext=e(1,2).replace(/\\"/g,'"'),32;case 24:return b.yytext=e(1,2).replace(/\\'/g,"'"),32;case 25:return 42;case 26:return 34;case 27:return 34;case 28:return 33;case 29:return 40;case 30:return b.yytext=e(1,2),40;case 31:return"INVALID";case 32:return 5}},a.rules=[/^(?:[^\x00]*?(?=(\{\{)))/,/^(?:[^\x00]+)/,/^(?:[^\x00]{2,}?(?=(\{\{|\\\{\{|\\\\\{\{|$)))/,/^(?:[\s\S]*?--\}\})/,/^(?:\()/,/^(?:\))/,/^(?:\{\{(~)?>)/,/^(?:\{\{(~)?#)/,/^(?:\{\{(~)?\/)/,/^(?:\{\{(~)?\^)/,/^(?:\{\{(~)?\s*else\b)/,/^(?:\{\{(~)?\{)/,/^(?:\{\{(~)?&)/,/^(?:\{\{!--)/,/^(?:\{\{![\s\S]*?\}\})/,/^(?:\{\{(~)?)/,/^(?:=)/,/^(?:\.\.)/,/^(?:\.(?=([=~}\s\/.)])))/,/^(?:[\/.])/,/^(?:\s+)/,/^(?:\}(~)?\}\})/,/^(?:(~)?\}\})/,/^(?:"(\\["]|[^"])*")/,/^(?:'(\\[']|[^'])*')/,/^(?:@)/,/^(?:true(?=([~}\s)])))/,/^(?:false(?=([~}\s)])))/,/^(?:-?[0-9]+(?=([~}\s)])))/,/^(?:([^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=([=~}\s\/.)]))))/,/^(?:\[[^\]]*\])/,/^(?:.)/,/^(?:$)/],a.conditions={mu:{rules:[4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32],inclusive:!1},emu:{rules:[2],inclusive:!1},com:{rules:[3],inclusive:!1},INITIAL:{rules:[0,1,32],inclusive:!0}},a}();return c.lexer=d,b.prototype=c,c.Parser=b,new b}();return a=b}(),i=function(a,b){"use strict";function c(a){return a.constructor===f.ProgramNode?a:(e.yy=f,e.parse(a))}var d={},e=a,f=b;return d.parser=e,d.parse=c,d}(h,g),j=function(a){"use strict";function b(){}function c(a,b,c){if(null==a||"string"!=typeof a&&a.constructor!==c.AST.ProgramNode)throw new f("You must pass a string or Handlebars AST to Handlebars.precompile. You passed "+a);b=b||{},"data"in b||(b.data=!0);var d=c.parse(a),e=(new c.Compiler).compile(d,b);return(new c.JavaScriptCompiler).compile(e,b)}function d(a,b,c){function d(){var d=c.parse(a),e=(new c.Compiler).compile(d,b),f=(new c.JavaScriptCompiler).compile(e,b,void 0,!0);return c.template(f)}if(null==a||"string"!=typeof a&&a.constructor!==c.AST.ProgramNode)throw new f("You must pass a string or Handlebars AST to Handlebars.compile. You passed "+a);b=b||{},"data"in b||(b.data=!0);var e;return function(a,b){return e||(e=d()),e.call(this,a,b)}}var e={},f=a;return e.Compiler=b,b.prototype={compiler:b,disassemble:function(){for(var a,b,c,d=this.opcodes,e=[],f=0,g=d.length;g>f;f++)if(a=d[f],"DECLARE"===a.opcode)e.push("DECLARE "+a.name+"="+a.value);else{b=[];for(var h=0;h<a.args.length;h++)c=a.args[h],"string"==typeof c&&(c='"'+c.replace("\n","\\n")+'"'),b.push(c);e.push(a.opcode+" "+b.join(" "))}return e.join("\n")},equals:function(a){var b=this.opcodes.length;if(a.opcodes.length!==b)return!1;for(var c=0;b>c;c++){var d=this.opcodes[c],e=a.opcodes[c];if(d.opcode!==e.opcode||d.args.length!==e.args.length)return!1;for(var f=0;f<d.args.length;f++)if(d.args[f]!==e.args[f])return!1}if(b=this.children.length,a.children.length!==b)return!1;for(c=0;b>c;c++)if(!this.children[c].equals(a.children[c]))return!1;return!0},guid:0,compile:function(a,b){this.opcodes=[],this.children=[],this.depths={list:[]},this.options=b;var c=this.options.knownHelpers;if(this.options.knownHelpers={helperMissing:!0,blockHelperMissing:!0,each:!0,"if":!0,unless:!0,"with":!0,log:!0},c)for(var d in c)this.options.knownHelpers[d]=c[d];return this.accept(a)},accept:function(a){var b,c=a.strip||{};return c.left&&this.opcode("strip"),b=this[a.type](a),c.right&&this.opcode("strip"),b},program:function(a){for(var b=a.statements,c=0,d=b.length;d>c;c++)this.accept(b[c]);return this.isSimple=1===d,this.depths.list=this.depths.list.sort(function(a,b){return a-b}),this},compileProgram:function(a){var b,c=(new this.compiler).compile(a,this.options),d=this.guid++;this.usePartial=this.usePartial||c.usePartial,this.children[d]=c;for(var e=0,f=c.depths.list.length;f>e;e++)b=c.depths.list[e],2>b||this.addDepth(b-1);return d},block:function(a){var b=a.mustache,c=a.program,d=a.inverse;c&&(c=this.compileProgram(c)),d&&(d=this.compileProgram(d));var e=b.sexpr,f=this.classifySexpr(e);"helper"===f?this.helperSexpr(e,c,d):"simple"===f?(this.simpleSexpr(e),this.opcode("pushProgram",c),this.opcode("pushProgram",d),this.opcode("emptyHash"),this.opcode("blockValue")):(this.ambiguousSexpr(e,c,d),this.opcode("pushProgram",c),this.opcode("pushProgram",d),this.opcode("emptyHash"),this.opcode("ambiguousBlockValue")),this.opcode("append")},hash:function(a){var b,c,d=a.pairs;this.opcode("pushHash");for(var e=0,f=d.length;f>e;e++)b=d[e],c=b[1],this.options.stringParams?(c.depth&&this.addDepth(c.depth),this.opcode("getContext",c.depth||0),this.opcode("pushStringParam",c.stringModeValue,c.type),"sexpr"===c.type&&this.sexpr(c)):this.accept(c),this.opcode("assignToHash",b[0]);this.opcode("popHash")},partial:function(a){var b=a.partialName;this.usePartial=!0,a.context?this.ID(a.context):this.opcode("push","depth0"),this.opcode("invokePartial",b.name),this.opcode("append")},content:function(a){this.opcode("appendContent",a.string)},mustache:function(a){this.sexpr(a.sexpr),a.escaped&&!this.options.noEscape?this.opcode("appendEscaped"):this.opcode("append")},ambiguousSexpr:function(a,b,c){var d=a.id,e=d.parts[0],f=null!=b||null!=c;this.opcode("getContext",d.depth),this.opcode("pushProgram",b),this.opcode("pushProgram",c),this.opcode("invokeAmbiguous",e,f)},simpleSexpr:function(a){var b=a.id;"DATA"===b.type?this.DATA(b):b.parts.length?this.ID(b):(this.addDepth(b.depth),this.opcode("getContext",b.depth),this.opcode("pushContext")),this.opcode("resolvePossibleLambda")},helperSexpr:function(a,b,c){var d=this.setupFullMustacheParams(a,b,c),e=a.id.parts[0];if(this.options.knownHelpers[e])this.opcode("invokeKnownHelper",d.length,e);else{if(this.options.knownHelpersOnly)throw new f("You specified knownHelpersOnly, but used the unknown helper "+e,a);this.opcode("invokeHelper",d.length,e,a.isRoot)}},sexpr:function(a){var b=this.classifySexpr(a);"simple"===b?this.simpleSexpr(a):"helper"===b?this.helperSexpr(a):this.ambiguousSexpr(a)},ID:function(a){this.addDepth(a.depth),this.opcode("getContext",a.depth);var b=a.parts[0];b?this.opcode("lookupOnContext",a.parts[0]):this.opcode("pushContext");for(var c=1,d=a.parts.length;d>c;c++)this.opcode("lookup",a.parts[c])},DATA:function(a){if(this.options.data=!0,a.id.isScoped||a.id.depth)throw new f("Scoped data references are not supported: "+a.original,a);this.opcode("lookupData");for(var b=a.id.parts,c=0,d=b.length;d>c;c++)this.opcode("lookup",b[c])},STRING:function(a){this.opcode("pushString",a.string)},INTEGER:function(a){this.opcode("pushLiteral",a.integer)},BOOLEAN:function(a){this.opcode("pushLiteral",a.bool)},comment:function(){},opcode:function(a){this.opcodes.push({opcode:a,args:[].slice.call(arguments,1)})},declare:function(a,b){this.opcodes.push({opcode:"DECLARE",name:a,value:b})},addDepth:function(a){0!==a&&(this.depths[a]||(this.depths[a]=!0,this.depths.list.push(a)))},classifySexpr:function(a){var b=a.isHelper,c=a.eligibleHelper,d=this.options;if(c&&!b){var e=a.id.parts[0];d.knownHelpers[e]?b=!0:d.knownHelpersOnly&&(c=!1)}return b?"helper":c?"ambiguous":"simple"},pushParams:function(a){for(var b,c=a.length;c--;)b=a[c],this.options.stringParams?(b.depth&&this.addDepth(b.depth),this.opcode("getContext",b.depth||0),this.opcode("pushStringParam",b.stringModeValue,b.type),"sexpr"===b.type&&this.sexpr(b)):this[b.type](b)},setupFullMustacheParams:function(a,b,c){var d=a.params;return this.pushParams(d),this.opcode("pushProgram",b),this.opcode("pushProgram",c),a.hash?this.hash(a.hash):this.opcode("emptyHash"),d}},e.precompile=c,e.compile=d,e}(c),k=function(a,b){"use strict";function c(a){this.value=a}function d(){}var e,f=a.COMPILER_REVISION,g=a.REVISION_CHANGES,h=a.log,i=b;d.prototype={nameLookup:function(a,b){var c,e;return 0===a.indexOf("depth")&&(c=!0),e=/^[0-9]+$/.test(b)?a+"["+b+"]":d.isValidJavaScriptVariableName(b)?a+"."+b:a+"['"+b+"']",c?"("+a+" && "+e+")":e},compilerInfo:function(){var a=f,b=g[a];return"this.compilerInfo = ["+a+",'"+b+"'];\n"},appendToBuffer:function(a){return this.environment.isSimple?"return "+a+";":{appendToBuffer:!0,content:a,toString:function(){return"buffer += "+a+";"}}},initializeBuffer:function(){return this.quotedString("")},namespace:"Handlebars",compile:function(a,b,c,d){this.environment=a,this.options=b||{},h("debug",this.environment.disassemble()+"\n\n"),this.name=this.environment.name,this.isChild=!!c,this.context=c||{programs:[],environments:[],aliases:{}},this.preamble(),this.stackSlot=0,this.stackVars=[],this.registers={list:[]},this.hashes=[],this.compileStack=[],this.inlineStack=[],this.compileChildren(a,b);
var e,f=a.opcodes;this.i=0;for(var g=f.length;this.i<g;this.i++)e=f[this.i],"DECLARE"===e.opcode?this[e.name]=e.value:this[e.opcode].apply(this,e.args),e.opcode!==this.stripNext&&(this.stripNext=!1);if(this.pushSource(""),this.stackSlot||this.inlineStack.length||this.compileStack.length)throw new i("Compile completed with content left on stack");return this.createFunctionContext(d)},preamble:function(){var a=[];if(this.isChild)a.push("");else{var b=this.namespace,c="helpers = this.merge(helpers, "+b+".helpers);";this.environment.usePartial&&(c=c+" partials = this.merge(partials, "+b+".partials);"),this.options.data&&(c+=" data = data || {};"),a.push(c)}this.environment.isSimple?a.push(""):a.push(", buffer = "+this.initializeBuffer()),this.lastContext=0,this.source=a},createFunctionContext:function(a){var b=this.stackVars.concat(this.registers.list);if(b.length>0&&(this.source[1]=this.source[1]+", "+b.join(", ")),!this.isChild)for(var c in this.context.aliases)this.context.aliases.hasOwnProperty(c)&&(this.source[1]=this.source[1]+", "+c+"="+this.context.aliases[c]);this.source[1]&&(this.source[1]="var "+this.source[1].substring(2)+";"),this.isChild||(this.source[1]+="\n"+this.context.programs.join("\n")+"\n"),this.environment.isSimple||this.pushSource("return buffer;");for(var d=this.isChild?["depth0","data"]:["Handlebars","depth0","helpers","partials","data"],e=0,f=this.environment.depths.list.length;f>e;e++)d.push("depth"+this.environment.depths.list[e]);var g=this.mergeSource();if(this.isChild||(g=this.compilerInfo()+g),a)return d.push(g),Function.apply(this,d);var i="function "+(this.name||"")+"("+d.join(",")+") {\n  "+g+"}";return h("debug",i+"\n\n"),i},mergeSource:function(){for(var a,b="",c=0,d=this.source.length;d>c;c++){var e=this.source[c];e.appendToBuffer?a=a?a+"\n    + "+e.content:e.content:(a&&(b+="buffer += "+a+";\n  ",a=void 0),b+=e+"\n  ")}return b},blockValue:function(){this.context.aliases.blockHelperMissing="helpers.blockHelperMissing";var a=["depth0"];this.setupParams(0,a),this.replaceStack(function(b){return a.splice(1,0,b),"blockHelperMissing.call("+a.join(", ")+")"})},ambiguousBlockValue:function(){this.context.aliases.blockHelperMissing="helpers.blockHelperMissing";var a=["depth0"];this.setupParams(0,a);var b=this.topStack();a.splice(1,0,b),this.pushSource("if (!"+this.lastHelper+") { "+b+" = blockHelperMissing.call("+a.join(", ")+"); }")},appendContent:function(a){this.pendingContent&&(a=this.pendingContent+a),this.stripNext&&(a=a.replace(/^\s+/,"")),this.pendingContent=a},strip:function(){this.pendingContent&&(this.pendingContent=this.pendingContent.replace(/\s+$/,"")),this.stripNext="strip"},append:function(){this.flushInline();var a=this.popStack();this.pushSource("if("+a+" || "+a+" === 0) { "+this.appendToBuffer(a)+" }"),this.environment.isSimple&&this.pushSource("else { "+this.appendToBuffer("''")+" }")},appendEscaped:function(){this.context.aliases.escapeExpression="this.escapeExpression",this.pushSource(this.appendToBuffer("escapeExpression("+this.popStack()+")"))},getContext:function(a){this.lastContext!==a&&(this.lastContext=a)},lookupOnContext:function(a){this.push(this.nameLookup("depth"+this.lastContext,a,"context"))},pushContext:function(){this.pushStackLiteral("depth"+this.lastContext)},resolvePossibleLambda:function(){this.context.aliases.functionType='"function"',this.replaceStack(function(a){return"typeof "+a+" === functionType ? "+a+".apply(depth0) : "+a})},lookup:function(a){this.replaceStack(function(b){return b+" == null || "+b+" === false ? "+b+" : "+this.nameLookup(b,a,"context")})},lookupData:function(){this.pushStackLiteral("data")},pushStringParam:function(a,b){this.pushStackLiteral("depth"+this.lastContext),this.pushString(b),"sexpr"!==b&&("string"==typeof a?this.pushString(a):this.pushStackLiteral(a))},emptyHash:function(){this.pushStackLiteral("{}"),this.options.stringParams&&(this.push("{}"),this.push("{}"))},pushHash:function(){this.hash&&this.hashes.push(this.hash),this.hash={values:[],types:[],contexts:[]}},popHash:function(){var a=this.hash;this.hash=this.hashes.pop(),this.options.stringParams&&(this.push("{"+a.contexts.join(",")+"}"),this.push("{"+a.types.join(",")+"}")),this.push("{\n    "+a.values.join(",\n    ")+"\n  }")},pushString:function(a){this.pushStackLiteral(this.quotedString(a))},push:function(a){return this.inlineStack.push(a),a},pushLiteral:function(a){this.pushStackLiteral(a)},pushProgram:function(a){null!=a?this.pushStackLiteral(this.programExpression(a)):this.pushStackLiteral(null)},invokeHelper:function(a,b,c){this.context.aliases.helperMissing="helpers.helperMissing",this.useRegister("helper");var d=this.lastHelper=this.setupHelper(a,b,!0),e=this.nameLookup("depth"+this.lastContext,b,"context"),f="helper = "+d.name+" || "+e;d.paramsInit&&(f+=","+d.paramsInit),this.push("("+f+",helper ? helper.call("+d.callParams+") : helperMissing.call("+d.helperMissingParams+"))"),c||this.flushInline()},invokeKnownHelper:function(a,b){var c=this.setupHelper(a,b);this.push(c.name+".call("+c.callParams+")")},invokeAmbiguous:function(a,b){this.context.aliases.functionType='"function"',this.useRegister("helper"),this.emptyHash();var c=this.setupHelper(0,a,b),d=this.lastHelper=this.nameLookup("helpers",a,"helper"),e=this.nameLookup("depth"+this.lastContext,a,"context"),f=this.nextStack();c.paramsInit&&this.pushSource(c.paramsInit),this.pushSource("if (helper = "+d+") { "+f+" = helper.call("+c.callParams+"); }"),this.pushSource("else { helper = "+e+"; "+f+" = typeof helper === functionType ? helper.call("+c.callParams+") : helper; }")},invokePartial:function(a){var b=[this.nameLookup("partials",a,"partial"),"'"+a+"'",this.popStack(),"helpers","partials"];this.options.data&&b.push("data"),this.context.aliases.self="this",this.push("self.invokePartial("+b.join(", ")+")")},assignToHash:function(a){var b,c,d=this.popStack();this.options.stringParams&&(c=this.popStack(),b=this.popStack());var e=this.hash;b&&e.contexts.push("'"+a+"': "+b),c&&e.types.push("'"+a+"': "+c),e.values.push("'"+a+"': ("+d+")")},compiler:d,compileChildren:function(a,b){for(var c,d,e=a.children,f=0,g=e.length;g>f;f++){c=e[f],d=new this.compiler;var h=this.matchExistingProgram(c);null==h?(this.context.programs.push(""),h=this.context.programs.length,c.index=h,c.name="program"+h,this.context.programs[h]=d.compile(c,b,this.context),this.context.environments[h]=c):(c.index=h,c.name="program"+h)}},matchExistingProgram:function(a){for(var b=0,c=this.context.environments.length;c>b;b++){var d=this.context.environments[b];if(d&&d.equals(a))return b}},programExpression:function(a){if(this.context.aliases.self="this",null==a)return"self.noop";for(var b,c=this.environment.children[a],d=c.depths.list,e=[c.index,c.name,"data"],f=0,g=d.length;g>f;f++)b=d[f],1===b?e.push("depth0"):e.push("depth"+(b-1));return(0===d.length?"self.program(":"self.programWithDepth(")+e.join(", ")+")"},register:function(a,b){this.useRegister(a),this.pushSource(a+" = "+b+";")},useRegister:function(a){this.registers[a]||(this.registers[a]=!0,this.registers.list.push(a))},pushStackLiteral:function(a){return this.push(new c(a))},pushSource:function(a){this.pendingContent&&(this.source.push(this.appendToBuffer(this.quotedString(this.pendingContent))),this.pendingContent=void 0),a&&this.source.push(a)},pushStack:function(a){this.flushInline();var b=this.incrStack();return a&&this.pushSource(b+" = "+a+";"),this.compileStack.push(b),b},replaceStack:function(a){var b,d,e,f="",g=this.isInline();if(g){var h=this.popStack(!0);if(h instanceof c)b=h.value,e=!0;else{d=!this.stackSlot;var i=d?this.incrStack():this.topStackName();f="("+this.push(i)+" = "+h+"),",b=this.topStack()}}else b=this.topStack();var j=a.call(this,b);return g?(e||this.popStack(),d&&this.stackSlot--,this.push("("+f+j+")")):(/^stack/.test(b)||(b=this.nextStack()),this.pushSource(b+" = ("+f+j+");")),b},nextStack:function(){return this.pushStack()},incrStack:function(){return this.stackSlot++,this.stackSlot>this.stackVars.length&&this.stackVars.push("stack"+this.stackSlot),this.topStackName()},topStackName:function(){return"stack"+this.stackSlot},flushInline:function(){var a=this.inlineStack;if(a.length){this.inlineStack=[];for(var b=0,d=a.length;d>b;b++){var e=a[b];e instanceof c?this.compileStack.push(e):this.pushStack(e)}}},isInline:function(){return this.inlineStack.length},popStack:function(a){var b=this.isInline(),d=(b?this.inlineStack:this.compileStack).pop();if(!a&&d instanceof c)return d.value;if(!b){if(!this.stackSlot)throw new i("Invalid stack pop");this.stackSlot--}return d},topStack:function(a){var b=this.isInline()?this.inlineStack:this.compileStack,d=b[b.length-1];return!a&&d instanceof c?d.value:d},quotedString:function(a){return'"'+a.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029")+'"'},setupHelper:function(a,b,c){var d=[],e=this.setupParams(a,d,c),f=this.nameLookup("helpers",b,"helper");return{params:d,paramsInit:e,name:f,callParams:["depth0"].concat(d).join(", "),helperMissingParams:c&&["depth0",this.quotedString(b)].concat(d).join(", ")}},setupOptions:function(a,b){var c,d,e,f=[],g=[],h=[];f.push("hash:"+this.popStack()),this.options.stringParams&&(f.push("hashTypes:"+this.popStack()),f.push("hashContexts:"+this.popStack())),d=this.popStack(),e=this.popStack(),(e||d)&&(e||(this.context.aliases.self="this",e="self.noop"),d||(this.context.aliases.self="this",d="self.noop"),f.push("inverse:"+d),f.push("fn:"+e));for(var i=0;a>i;i++)c=this.popStack(),b.push(c),this.options.stringParams&&(h.push(this.popStack()),g.push(this.popStack()));return this.options.stringParams&&(f.push("contexts:["+g.join(",")+"]"),f.push("types:["+h.join(",")+"]")),this.options.data&&f.push("data:data"),f},setupParams:function(a,b,c){var d="{"+this.setupOptions(a,b).join(",")+"}";return c?(this.useRegister("options"),b.push("options"),"options="+d):(b.push(d),"")}};for(var j="break else new var case finally return void catch for switch while continue function this with default if throw delete in try do instanceof typeof abstract enum int short boolean export interface static byte extends long super char final native synchronized class float package throws const goto private transient debugger implements protected volatile double import public let yield".split(" "),k=d.RESERVED_WORDS={},l=0,m=j.length;m>l;l++)k[j[l]]=!0;return d.isValidJavaScriptVariableName=function(a){return!d.RESERVED_WORDS[a]&&/^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(a)?!0:!1},e=d}(d,c),l=function(a,b,c,d,e){"use strict";var f,g=a,h=b,i=c.parser,j=c.parse,k=d.Compiler,l=d.compile,m=d.precompile,n=e,o=g.create,p=function(){var a=o();return a.compile=function(b,c){return l(b,c,a)},a.precompile=function(b,c){return m(b,c,a)},a.AST=h,a.Compiler=k,a.JavaScriptCompiler=n,a.Parser=i,a.parse=j,a};return g=p(),g.create=p,f=g}(f,g,i,j,k);return l}();
/*! jQuery v2.1.1 | (c) 2005, 2014 jQuery Foundation, Inc. | jquery.org/license */
!function(a,b){"object"==typeof module&&"object"==typeof module.exports?module.exports=a.document?b(a,!0):function(a){if(!a.document)throw new Error("jQuery requires a window with a document");return b(a)}:b(a)}("undefined"!=typeof window?window:this,function(a,b){var c=[],d=c.slice,e=c.concat,f=c.push,g=c.indexOf,h={},i=h.toString,j=h.hasOwnProperty,k={},l=a.document,m="2.1.1",n=function(a,b){return new n.fn.init(a,b)},o=/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,p=/^-ms-/,q=/-([\da-z])/gi,r=function(a,b){return b.toUpperCase()};n.fn=n.prototype={jquery:m,constructor:n,selector:"",length:0,toArray:function(){return d.call(this)},get:function(a){return null!=a?0>a?this[a+this.length]:this[a]:d.call(this)},pushStack:function(a){var b=n.merge(this.constructor(),a);return b.prevObject=this,b.context=this.context,b},each:function(a,b){return n.each(this,a,b)},map:function(a){return this.pushStack(n.map(this,function(b,c){return a.call(b,c,b)}))},slice:function(){return this.pushStack(d.apply(this,arguments))},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},eq:function(a){var b=this.length,c=+a+(0>a?b:0);return this.pushStack(c>=0&&b>c?[this[c]]:[])},end:function(){return this.prevObject||this.constructor(null)},push:f,sort:c.sort,splice:c.splice},n.extend=n.fn.extend=function(){var a,b,c,d,e,f,g=arguments[0]||{},h=1,i=arguments.length,j=!1;for("boolean"==typeof g&&(j=g,g=arguments[h]||{},h++),"object"==typeof g||n.isFunction(g)||(g={}),h===i&&(g=this,h--);i>h;h++)if(null!=(a=arguments[h]))for(b in a)c=g[b],d=a[b],g!==d&&(j&&d&&(n.isPlainObject(d)||(e=n.isArray(d)))?(e?(e=!1,f=c&&n.isArray(c)?c:[]):f=c&&n.isPlainObject(c)?c:{},g[b]=n.extend(j,f,d)):void 0!==d&&(g[b]=d));return g},n.extend({expando:"jQuery"+(m+Math.random()).replace(/\D/g,""),isReady:!0,error:function(a){throw new Error(a)},noop:function(){},isFunction:function(a){return"function"===n.type(a)},isArray:Array.isArray,isWindow:function(a){return null!=a&&a===a.window},isNumeric:function(a){return!n.isArray(a)&&a-parseFloat(a)>=0},isPlainObject:function(a){return"object"!==n.type(a)||a.nodeType||n.isWindow(a)?!1:a.constructor&&!j.call(a.constructor.prototype,"isPrototypeOf")?!1:!0},isEmptyObject:function(a){var b;for(b in a)return!1;return!0},type:function(a){return null==a?a+"":"object"==typeof a||"function"==typeof a?h[i.call(a)]||"object":typeof a},globalEval:function(a){var b,c=eval;a=n.trim(a),a&&(1===a.indexOf("use strict")?(b=l.createElement("script"),b.text=a,l.head.appendChild(b).parentNode.removeChild(b)):c(a))},camelCase:function(a){return a.replace(p,"ms-").replace(q,r)},nodeName:function(a,b){return a.nodeName&&a.nodeName.toLowerCase()===b.toLowerCase()},each:function(a,b,c){var d,e=0,f=a.length,g=s(a);if(c){if(g){for(;f>e;e++)if(d=b.apply(a[e],c),d===!1)break}else for(e in a)if(d=b.apply(a[e],c),d===!1)break}else if(g){for(;f>e;e++)if(d=b.call(a[e],e,a[e]),d===!1)break}else for(e in a)if(d=b.call(a[e],e,a[e]),d===!1)break;return a},trim:function(a){return null==a?"":(a+"").replace(o,"")},makeArray:function(a,b){var c=b||[];return null!=a&&(s(Object(a))?n.merge(c,"string"==typeof a?[a]:a):f.call(c,a)),c},inArray:function(a,b,c){return null==b?-1:g.call(b,a,c)},merge:function(a,b){for(var c=+b.length,d=0,e=a.length;c>d;d++)a[e++]=b[d];return a.length=e,a},grep:function(a,b,c){for(var d,e=[],f=0,g=a.length,h=!c;g>f;f++)d=!b(a[f],f),d!==h&&e.push(a[f]);return e},map:function(a,b,c){var d,f=0,g=a.length,h=s(a),i=[];if(h)for(;g>f;f++)d=b(a[f],f,c),null!=d&&i.push(d);else for(f in a)d=b(a[f],f,c),null!=d&&i.push(d);return e.apply([],i)},guid:1,proxy:function(a,b){var c,e,f;return"string"==typeof b&&(c=a[b],b=a,a=c),n.isFunction(a)?(e=d.call(arguments,2),f=function(){return a.apply(b||this,e.concat(d.call(arguments)))},f.guid=a.guid=a.guid||n.guid++,f):void 0},now:Date.now,support:k}),n.each("Boolean Number String Function Array Date RegExp Object Error".split(" "),function(a,b){h["[object "+b+"]"]=b.toLowerCase()});function s(a){var b=a.length,c=n.type(a);return"function"===c||n.isWindow(a)?!1:1===a.nodeType&&b?!0:"array"===c||0===b||"number"==typeof b&&b>0&&b-1 in a}var t=function(a){var b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u="sizzle"+-new Date,v=a.document,w=0,x=0,y=gb(),z=gb(),A=gb(),B=function(a,b){return a===b&&(l=!0),0},C="undefined",D=1<<31,E={}.hasOwnProperty,F=[],G=F.pop,H=F.push,I=F.push,J=F.slice,K=F.indexOf||function(a){for(var b=0,c=this.length;c>b;b++)if(this[b]===a)return b;return-1},L="checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",M="[\\x20\\t\\r\\n\\f]",N="(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",O=N.replace("w","w#"),P="\\["+M+"*("+N+")(?:"+M+"*([*^$|!~]?=)"+M+"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|("+O+"))|)"+M+"*\\]",Q=":("+N+")(?:\\((('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|((?:\\\\.|[^\\\\()[\\]]|"+P+")*)|.*)\\)|)",R=new RegExp("^"+M+"+|((?:^|[^\\\\])(?:\\\\.)*)"+M+"+$","g"),S=new RegExp("^"+M+"*,"+M+"*"),T=new RegExp("^"+M+"*([>+~]|"+M+")"+M+"*"),U=new RegExp("="+M+"*([^\\]'\"]*?)"+M+"*\\]","g"),V=new RegExp(Q),W=new RegExp("^"+O+"$"),X={ID:new RegExp("^#("+N+")"),CLASS:new RegExp("^\\.("+N+")"),TAG:new RegExp("^("+N.replace("w","w*")+")"),ATTR:new RegExp("^"+P),PSEUDO:new RegExp("^"+Q),CHILD:new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\("+M+"*(even|odd|(([+-]|)(\\d*)n|)"+M+"*(?:([+-]|)"+M+"*(\\d+)|))"+M+"*\\)|)","i"),bool:new RegExp("^(?:"+L+")$","i"),needsContext:new RegExp("^"+M+"*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\("+M+"*((?:-\\d)?\\d*)"+M+"*\\)|)(?=[^-]|$)","i")},Y=/^(?:input|select|textarea|button)$/i,Z=/^h\d$/i,$=/^[^{]+\{\s*\[native \w/,_=/^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,ab=/[+~]/,bb=/'|\\/g,cb=new RegExp("\\\\([\\da-f]{1,6}"+M+"?|("+M+")|.)","ig"),db=function(a,b,c){var d="0x"+b-65536;return d!==d||c?b:0>d?String.fromCharCode(d+65536):String.fromCharCode(d>>10|55296,1023&d|56320)};try{I.apply(F=J.call(v.childNodes),v.childNodes),F[v.childNodes.length].nodeType}catch(eb){I={apply:F.length?function(a,b){H.apply(a,J.call(b))}:function(a,b){var c=a.length,d=0;while(a[c++]=b[d++]);a.length=c-1}}}function fb(a,b,d,e){var f,h,j,k,l,o,r,s,w,x;if((b?b.ownerDocument||b:v)!==n&&m(b),b=b||n,d=d||[],!a||"string"!=typeof a)return d;if(1!==(k=b.nodeType)&&9!==k)return[];if(p&&!e){if(f=_.exec(a))if(j=f[1]){if(9===k){if(h=b.getElementById(j),!h||!h.parentNode)return d;if(h.id===j)return d.push(h),d}else if(b.ownerDocument&&(h=b.ownerDocument.getElementById(j))&&t(b,h)&&h.id===j)return d.push(h),d}else{if(f[2])return I.apply(d,b.getElementsByTagName(a)),d;if((j=f[3])&&c.getElementsByClassName&&b.getElementsByClassName)return I.apply(d,b.getElementsByClassName(j)),d}if(c.qsa&&(!q||!q.test(a))){if(s=r=u,w=b,x=9===k&&a,1===k&&"object"!==b.nodeName.toLowerCase()){o=g(a),(r=b.getAttribute("id"))?s=r.replace(bb,"\\$&"):b.setAttribute("id",s),s="[id='"+s+"'] ",l=o.length;while(l--)o[l]=s+qb(o[l]);w=ab.test(a)&&ob(b.parentNode)||b,x=o.join(",")}if(x)try{return I.apply(d,w.querySelectorAll(x)),d}catch(y){}finally{r||b.removeAttribute("id")}}}return i(a.replace(R,"$1"),b,d,e)}function gb(){var a=[];function b(c,e){return a.push(c+" ")>d.cacheLength&&delete b[a.shift()],b[c+" "]=e}return b}function hb(a){return a[u]=!0,a}function ib(a){var b=n.createElement("div");try{return!!a(b)}catch(c){return!1}finally{b.parentNode&&b.parentNode.removeChild(b),b=null}}function jb(a,b){var c=a.split("|"),e=a.length;while(e--)d.attrHandle[c[e]]=b}function kb(a,b){var c=b&&a,d=c&&1===a.nodeType&&1===b.nodeType&&(~b.sourceIndex||D)-(~a.sourceIndex||D);if(d)return d;if(c)while(c=c.nextSibling)if(c===b)return-1;return a?1:-1}function lb(a){return function(b){var c=b.nodeName.toLowerCase();return"input"===c&&b.type===a}}function mb(a){return function(b){var c=b.nodeName.toLowerCase();return("input"===c||"button"===c)&&b.type===a}}function nb(a){return hb(function(b){return b=+b,hb(function(c,d){var e,f=a([],c.length,b),g=f.length;while(g--)c[e=f[g]]&&(c[e]=!(d[e]=c[e]))})})}function ob(a){return a&&typeof a.getElementsByTagName!==C&&a}c=fb.support={},f=fb.isXML=function(a){var b=a&&(a.ownerDocument||a).documentElement;return b?"HTML"!==b.nodeName:!1},m=fb.setDocument=function(a){var b,e=a?a.ownerDocument||a:v,g=e.defaultView;return e!==n&&9===e.nodeType&&e.documentElement?(n=e,o=e.documentElement,p=!f(e),g&&g!==g.top&&(g.addEventListener?g.addEventListener("unload",function(){m()},!1):g.attachEvent&&g.attachEvent("onunload",function(){m()})),c.attributes=ib(function(a){return a.className="i",!a.getAttribute("className")}),c.getElementsByTagName=ib(function(a){return a.appendChild(e.createComment("")),!a.getElementsByTagName("*").length}),c.getElementsByClassName=$.test(e.getElementsByClassName)&&ib(function(a){return a.innerHTML="<div class='a'></div><div class='a i'></div>",a.firstChild.className="i",2===a.getElementsByClassName("i").length}),c.getById=ib(function(a){return o.appendChild(a).id=u,!e.getElementsByName||!e.getElementsByName(u).length}),c.getById?(d.find.ID=function(a,b){if(typeof b.getElementById!==C&&p){var c=b.getElementById(a);return c&&c.parentNode?[c]:[]}},d.filter.ID=function(a){var b=a.replace(cb,db);return function(a){return a.getAttribute("id")===b}}):(delete d.find.ID,d.filter.ID=function(a){var b=a.replace(cb,db);return function(a){var c=typeof a.getAttributeNode!==C&&a.getAttributeNode("id");return c&&c.value===b}}),d.find.TAG=c.getElementsByTagName?function(a,b){return typeof b.getElementsByTagName!==C?b.getElementsByTagName(a):void 0}:function(a,b){var c,d=[],e=0,f=b.getElementsByTagName(a);if("*"===a){while(c=f[e++])1===c.nodeType&&d.push(c);return d}return f},d.find.CLASS=c.getElementsByClassName&&function(a,b){return typeof b.getElementsByClassName!==C&&p?b.getElementsByClassName(a):void 0},r=[],q=[],(c.qsa=$.test(e.querySelectorAll))&&(ib(function(a){a.innerHTML="<select msallowclip=''><option selected=''></option></select>",a.querySelectorAll("[msallowclip^='']").length&&q.push("[*^$]="+M+"*(?:''|\"\")"),a.querySelectorAll("[selected]").length||q.push("\\["+M+"*(?:value|"+L+")"),a.querySelectorAll(":checked").length||q.push(":checked")}),ib(function(a){var b=e.createElement("input");b.setAttribute("type","hidden"),a.appendChild(b).setAttribute("name","D"),a.querySelectorAll("[name=d]").length&&q.push("name"+M+"*[*^$|!~]?="),a.querySelectorAll(":enabled").length||q.push(":enabled",":disabled"),a.querySelectorAll("*,:x"),q.push(",.*:")})),(c.matchesSelector=$.test(s=o.matches||o.webkitMatchesSelector||o.mozMatchesSelector||o.oMatchesSelector||o.msMatchesSelector))&&ib(function(a){c.disconnectedMatch=s.call(a,"div"),s.call(a,"[s!='']:x"),r.push("!=",Q)}),q=q.length&&new RegExp(q.join("|")),r=r.length&&new RegExp(r.join("|")),b=$.test(o.compareDocumentPosition),t=b||$.test(o.contains)?function(a,b){var c=9===a.nodeType?a.documentElement:a,d=b&&b.parentNode;return a===d||!(!d||1!==d.nodeType||!(c.contains?c.contains(d):a.compareDocumentPosition&&16&a.compareDocumentPosition(d)))}:function(a,b){if(b)while(b=b.parentNode)if(b===a)return!0;return!1},B=b?function(a,b){if(a===b)return l=!0,0;var d=!a.compareDocumentPosition-!b.compareDocumentPosition;return d?d:(d=(a.ownerDocument||a)===(b.ownerDocument||b)?a.compareDocumentPosition(b):1,1&d||!c.sortDetached&&b.compareDocumentPosition(a)===d?a===e||a.ownerDocument===v&&t(v,a)?-1:b===e||b.ownerDocument===v&&t(v,b)?1:k?K.call(k,a)-K.call(k,b):0:4&d?-1:1)}:function(a,b){if(a===b)return l=!0,0;var c,d=0,f=a.parentNode,g=b.parentNode,h=[a],i=[b];if(!f||!g)return a===e?-1:b===e?1:f?-1:g?1:k?K.call(k,a)-K.call(k,b):0;if(f===g)return kb(a,b);c=a;while(c=c.parentNode)h.unshift(c);c=b;while(c=c.parentNode)i.unshift(c);while(h[d]===i[d])d++;return d?kb(h[d],i[d]):h[d]===v?-1:i[d]===v?1:0},e):n},fb.matches=function(a,b){return fb(a,null,null,b)},fb.matchesSelector=function(a,b){if((a.ownerDocument||a)!==n&&m(a),b=b.replace(U,"='$1']"),!(!c.matchesSelector||!p||r&&r.test(b)||q&&q.test(b)))try{var d=s.call(a,b);if(d||c.disconnectedMatch||a.document&&11!==a.document.nodeType)return d}catch(e){}return fb(b,n,null,[a]).length>0},fb.contains=function(a,b){return(a.ownerDocument||a)!==n&&m(a),t(a,b)},fb.attr=function(a,b){(a.ownerDocument||a)!==n&&m(a);var e=d.attrHandle[b.toLowerCase()],f=e&&E.call(d.attrHandle,b.toLowerCase())?e(a,b,!p):void 0;return void 0!==f?f:c.attributes||!p?a.getAttribute(b):(f=a.getAttributeNode(b))&&f.specified?f.value:null},fb.error=function(a){throw new Error("Syntax error, unrecognized expression: "+a)},fb.uniqueSort=function(a){var b,d=[],e=0,f=0;if(l=!c.detectDuplicates,k=!c.sortStable&&a.slice(0),a.sort(B),l){while(b=a[f++])b===a[f]&&(e=d.push(f));while(e--)a.splice(d[e],1)}return k=null,a},e=fb.getText=function(a){var b,c="",d=0,f=a.nodeType;if(f){if(1===f||9===f||11===f){if("string"==typeof a.textContent)return a.textContent;for(a=a.firstChild;a;a=a.nextSibling)c+=e(a)}else if(3===f||4===f)return a.nodeValue}else while(b=a[d++])c+=e(b);return c},d=fb.selectors={cacheLength:50,createPseudo:hb,match:X,attrHandle:{},find:{},relative:{">":{dir:"parentNode",first:!0}," ":{dir:"parentNode"},"+":{dir:"previousSibling",first:!0},"~":{dir:"previousSibling"}},preFilter:{ATTR:function(a){return a[1]=a[1].replace(cb,db),a[3]=(a[3]||a[4]||a[5]||"").replace(cb,db),"~="===a[2]&&(a[3]=" "+a[3]+" "),a.slice(0,4)},CHILD:function(a){return a[1]=a[1].toLowerCase(),"nth"===a[1].slice(0,3)?(a[3]||fb.error(a[0]),a[4]=+(a[4]?a[5]+(a[6]||1):2*("even"===a[3]||"odd"===a[3])),a[5]=+(a[7]+a[8]||"odd"===a[3])):a[3]&&fb.error(a[0]),a},PSEUDO:function(a){var b,c=!a[6]&&a[2];return X.CHILD.test(a[0])?null:(a[3]?a[2]=a[4]||a[5]||"":c&&V.test(c)&&(b=g(c,!0))&&(b=c.indexOf(")",c.length-b)-c.length)&&(a[0]=a[0].slice(0,b),a[2]=c.slice(0,b)),a.slice(0,3))}},filter:{TAG:function(a){var b=a.replace(cb,db).toLowerCase();return"*"===a?function(){return!0}:function(a){return a.nodeName&&a.nodeName.toLowerCase()===b}},CLASS:function(a){var b=y[a+" "];return b||(b=new RegExp("(^|"+M+")"+a+"("+M+"|$)"))&&y(a,function(a){return b.test("string"==typeof a.className&&a.className||typeof a.getAttribute!==C&&a.getAttribute("class")||"")})},ATTR:function(a,b,c){return function(d){var e=fb.attr(d,a);return null==e?"!="===b:b?(e+="","="===b?e===c:"!="===b?e!==c:"^="===b?c&&0===e.indexOf(c):"*="===b?c&&e.indexOf(c)>-1:"$="===b?c&&e.slice(-c.length)===c:"~="===b?(" "+e+" ").indexOf(c)>-1:"|="===b?e===c||e.slice(0,c.length+1)===c+"-":!1):!0}},CHILD:function(a,b,c,d,e){var f="nth"!==a.slice(0,3),g="last"!==a.slice(-4),h="of-type"===b;return 1===d&&0===e?function(a){return!!a.parentNode}:function(b,c,i){var j,k,l,m,n,o,p=f!==g?"nextSibling":"previousSibling",q=b.parentNode,r=h&&b.nodeName.toLowerCase(),s=!i&&!h;if(q){if(f){while(p){l=b;while(l=l[p])if(h?l.nodeName.toLowerCase()===r:1===l.nodeType)return!1;o=p="only"===a&&!o&&"nextSibling"}return!0}if(o=[g?q.firstChild:q.lastChild],g&&s){k=q[u]||(q[u]={}),j=k[a]||[],n=j[0]===w&&j[1],m=j[0]===w&&j[2],l=n&&q.childNodes[n];while(l=++n&&l&&l[p]||(m=n=0)||o.pop())if(1===l.nodeType&&++m&&l===b){k[a]=[w,n,m];break}}else if(s&&(j=(b[u]||(b[u]={}))[a])&&j[0]===w)m=j[1];else while(l=++n&&l&&l[p]||(m=n=0)||o.pop())if((h?l.nodeName.toLowerCase()===r:1===l.nodeType)&&++m&&(s&&((l[u]||(l[u]={}))[a]=[w,m]),l===b))break;return m-=e,m===d||m%d===0&&m/d>=0}}},PSEUDO:function(a,b){var c,e=d.pseudos[a]||d.setFilters[a.toLowerCase()]||fb.error("unsupported pseudo: "+a);return e[u]?e(b):e.length>1?(c=[a,a,"",b],d.setFilters.hasOwnProperty(a.toLowerCase())?hb(function(a,c){var d,f=e(a,b),g=f.length;while(g--)d=K.call(a,f[g]),a[d]=!(c[d]=f[g])}):function(a){return e(a,0,c)}):e}},pseudos:{not:hb(function(a){var b=[],c=[],d=h(a.replace(R,"$1"));return d[u]?hb(function(a,b,c,e){var f,g=d(a,null,e,[]),h=a.length;while(h--)(f=g[h])&&(a[h]=!(b[h]=f))}):function(a,e,f){return b[0]=a,d(b,null,f,c),!c.pop()}}),has:hb(function(a){return function(b){return fb(a,b).length>0}}),contains:hb(function(a){return function(b){return(b.textContent||b.innerText||e(b)).indexOf(a)>-1}}),lang:hb(function(a){return W.test(a||"")||fb.error("unsupported lang: "+a),a=a.replace(cb,db).toLowerCase(),function(b){var c;do if(c=p?b.lang:b.getAttribute("xml:lang")||b.getAttribute("lang"))return c=c.toLowerCase(),c===a||0===c.indexOf(a+"-");while((b=b.parentNode)&&1===b.nodeType);return!1}}),target:function(b){var c=a.location&&a.location.hash;return c&&c.slice(1)===b.id},root:function(a){return a===o},focus:function(a){return a===n.activeElement&&(!n.hasFocus||n.hasFocus())&&!!(a.type||a.href||~a.tabIndex)},enabled:function(a){return a.disabled===!1},disabled:function(a){return a.disabled===!0},checked:function(a){var b=a.nodeName.toLowerCase();return"input"===b&&!!a.checked||"option"===b&&!!a.selected},selected:function(a){return a.parentNode&&a.parentNode.selectedIndex,a.selected===!0},empty:function(a){for(a=a.firstChild;a;a=a.nextSibling)if(a.nodeType<6)return!1;return!0},parent:function(a){return!d.pseudos.empty(a)},header:function(a){return Z.test(a.nodeName)},input:function(a){return Y.test(a.nodeName)},button:function(a){var b=a.nodeName.toLowerCase();return"input"===b&&"button"===a.type||"button"===b},text:function(a){var b;return"input"===a.nodeName.toLowerCase()&&"text"===a.type&&(null==(b=a.getAttribute("type"))||"text"===b.toLowerCase())},first:nb(function(){return[0]}),last:nb(function(a,b){return[b-1]}),eq:nb(function(a,b,c){return[0>c?c+b:c]}),even:nb(function(a,b){for(var c=0;b>c;c+=2)a.push(c);return a}),odd:nb(function(a,b){for(var c=1;b>c;c+=2)a.push(c);return a}),lt:nb(function(a,b,c){for(var d=0>c?c+b:c;--d>=0;)a.push(d);return a}),gt:nb(function(a,b,c){for(var d=0>c?c+b:c;++d<b;)a.push(d);return a})}},d.pseudos.nth=d.pseudos.eq;for(b in{radio:!0,checkbox:!0,file:!0,password:!0,image:!0})d.pseudos[b]=lb(b);for(b in{submit:!0,reset:!0})d.pseudos[b]=mb(b);function pb(){}pb.prototype=d.filters=d.pseudos,d.setFilters=new pb,g=fb.tokenize=function(a,b){var c,e,f,g,h,i,j,k=z[a+" "];if(k)return b?0:k.slice(0);h=a,i=[],j=d.preFilter;while(h){(!c||(e=S.exec(h)))&&(e&&(h=h.slice(e[0].length)||h),i.push(f=[])),c=!1,(e=T.exec(h))&&(c=e.shift(),f.push({value:c,type:e[0].replace(R," ")}),h=h.slice(c.length));for(g in d.filter)!(e=X[g].exec(h))||j[g]&&!(e=j[g](e))||(c=e.shift(),f.push({value:c,type:g,matches:e}),h=h.slice(c.length));if(!c)break}return b?h.length:h?fb.error(a):z(a,i).slice(0)};function qb(a){for(var b=0,c=a.length,d="";c>b;b++)d+=a[b].value;return d}function rb(a,b,c){var d=b.dir,e=c&&"parentNode"===d,f=x++;return b.first?function(b,c,f){while(b=b[d])if(1===b.nodeType||e)return a(b,c,f)}:function(b,c,g){var h,i,j=[w,f];if(g){while(b=b[d])if((1===b.nodeType||e)&&a(b,c,g))return!0}else while(b=b[d])if(1===b.nodeType||e){if(i=b[u]||(b[u]={}),(h=i[d])&&h[0]===w&&h[1]===f)return j[2]=h[2];if(i[d]=j,j[2]=a(b,c,g))return!0}}}function sb(a){return a.length>1?function(b,c,d){var e=a.length;while(e--)if(!a[e](b,c,d))return!1;return!0}:a[0]}function tb(a,b,c){for(var d=0,e=b.length;e>d;d++)fb(a,b[d],c);return c}function ub(a,b,c,d,e){for(var f,g=[],h=0,i=a.length,j=null!=b;i>h;h++)(f=a[h])&&(!c||c(f,d,e))&&(g.push(f),j&&b.push(h));return g}function vb(a,b,c,d,e,f){return d&&!d[u]&&(d=vb(d)),e&&!e[u]&&(e=vb(e,f)),hb(function(f,g,h,i){var j,k,l,m=[],n=[],o=g.length,p=f||tb(b||"*",h.nodeType?[h]:h,[]),q=!a||!f&&b?p:ub(p,m,a,h,i),r=c?e||(f?a:o||d)?[]:g:q;if(c&&c(q,r,h,i),d){j=ub(r,n),d(j,[],h,i),k=j.length;while(k--)(l=j[k])&&(r[n[k]]=!(q[n[k]]=l))}if(f){if(e||a){if(e){j=[],k=r.length;while(k--)(l=r[k])&&j.push(q[k]=l);e(null,r=[],j,i)}k=r.length;while(k--)(l=r[k])&&(j=e?K.call(f,l):m[k])>-1&&(f[j]=!(g[j]=l))}}else r=ub(r===g?r.splice(o,r.length):r),e?e(null,g,r,i):I.apply(g,r)})}function wb(a){for(var b,c,e,f=a.length,g=d.relative[a[0].type],h=g||d.relative[" "],i=g?1:0,k=rb(function(a){return a===b},h,!0),l=rb(function(a){return K.call(b,a)>-1},h,!0),m=[function(a,c,d){return!g&&(d||c!==j)||((b=c).nodeType?k(a,c,d):l(a,c,d))}];f>i;i++)if(c=d.relative[a[i].type])m=[rb(sb(m),c)];else{if(c=d.filter[a[i].type].apply(null,a[i].matches),c[u]){for(e=++i;f>e;e++)if(d.relative[a[e].type])break;return vb(i>1&&sb(m),i>1&&qb(a.slice(0,i-1).concat({value:" "===a[i-2].type?"*":""})).replace(R,"$1"),c,e>i&&wb(a.slice(i,e)),f>e&&wb(a=a.slice(e)),f>e&&qb(a))}m.push(c)}return sb(m)}function xb(a,b){var c=b.length>0,e=a.length>0,f=function(f,g,h,i,k){var l,m,o,p=0,q="0",r=f&&[],s=[],t=j,u=f||e&&d.find.TAG("*",k),v=w+=null==t?1:Math.random()||.1,x=u.length;for(k&&(j=g!==n&&g);q!==x&&null!=(l=u[q]);q++){if(e&&l){m=0;while(o=a[m++])if(o(l,g,h)){i.push(l);break}k&&(w=v)}c&&((l=!o&&l)&&p--,f&&r.push(l))}if(p+=q,c&&q!==p){m=0;while(o=b[m++])o(r,s,g,h);if(f){if(p>0)while(q--)r[q]||s[q]||(s[q]=G.call(i));s=ub(s)}I.apply(i,s),k&&!f&&s.length>0&&p+b.length>1&&fb.uniqueSort(i)}return k&&(w=v,j=t),r};return c?hb(f):f}return h=fb.compile=function(a,b){var c,d=[],e=[],f=A[a+" "];if(!f){b||(b=g(a)),c=b.length;while(c--)f=wb(b[c]),f[u]?d.push(f):e.push(f);f=A(a,xb(e,d)),f.selector=a}return f},i=fb.select=function(a,b,e,f){var i,j,k,l,m,n="function"==typeof a&&a,o=!f&&g(a=n.selector||a);if(e=e||[],1===o.length){if(j=o[0]=o[0].slice(0),j.length>2&&"ID"===(k=j[0]).type&&c.getById&&9===b.nodeType&&p&&d.relative[j[1].type]){if(b=(d.find.ID(k.matches[0].replace(cb,db),b)||[])[0],!b)return e;n&&(b=b.parentNode),a=a.slice(j.shift().value.length)}i=X.needsContext.test(a)?0:j.length;while(i--){if(k=j[i],d.relative[l=k.type])break;if((m=d.find[l])&&(f=m(k.matches[0].replace(cb,db),ab.test(j[0].type)&&ob(b.parentNode)||b))){if(j.splice(i,1),a=f.length&&qb(j),!a)return I.apply(e,f),e;break}}}return(n||h(a,o))(f,b,!p,e,ab.test(a)&&ob(b.parentNode)||b),e},c.sortStable=u.split("").sort(B).join("")===u,c.detectDuplicates=!!l,m(),c.sortDetached=ib(function(a){return 1&a.compareDocumentPosition(n.createElement("div"))}),ib(function(a){return a.innerHTML="<a href='#'></a>","#"===a.firstChild.getAttribute("href")})||jb("type|href|height|width",function(a,b,c){return c?void 0:a.getAttribute(b,"type"===b.toLowerCase()?1:2)}),c.attributes&&ib(function(a){return a.innerHTML="<input/>",a.firstChild.setAttribute("value",""),""===a.firstChild.getAttribute("value")})||jb("value",function(a,b,c){return c||"input"!==a.nodeName.toLowerCase()?void 0:a.defaultValue}),ib(function(a){return null==a.getAttribute("disabled")})||jb(L,function(a,b,c){var d;return c?void 0:a[b]===!0?b.toLowerCase():(d=a.getAttributeNode(b))&&d.specified?d.value:null}),fb}(a);n.find=t,n.expr=t.selectors,n.expr[":"]=n.expr.pseudos,n.unique=t.uniqueSort,n.text=t.getText,n.isXMLDoc=t.isXML,n.contains=t.contains;var u=n.expr.match.needsContext,v=/^<(\w+)\s*\/?>(?:<\/\1>|)$/,w=/^.[^:#\[\.,]*$/;function x(a,b,c){if(n.isFunction(b))return n.grep(a,function(a,d){return!!b.call(a,d,a)!==c});if(b.nodeType)return n.grep(a,function(a){return a===b!==c});if("string"==typeof b){if(w.test(b))return n.filter(b,a,c);b=n.filter(b,a)}return n.grep(a,function(a){return g.call(b,a)>=0!==c})}n.filter=function(a,b,c){var d=b[0];return c&&(a=":not("+a+")"),1===b.length&&1===d.nodeType?n.find.matchesSelector(d,a)?[d]:[]:n.find.matches(a,n.grep(b,function(a){return 1===a.nodeType}))},n.fn.extend({find:function(a){var b,c=this.length,d=[],e=this;if("string"!=typeof a)return this.pushStack(n(a).filter(function(){for(b=0;c>b;b++)if(n.contains(e[b],this))return!0}));for(b=0;c>b;b++)n.find(a,e[b],d);return d=this.pushStack(c>1?n.unique(d):d),d.selector=this.selector?this.selector+" "+a:a,d},filter:function(a){return this.pushStack(x(this,a||[],!1))},not:function(a){return this.pushStack(x(this,a||[],!0))},is:function(a){return!!x(this,"string"==typeof a&&u.test(a)?n(a):a||[],!1).length}});var y,z=/^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/,A=n.fn.init=function(a,b){var c,d;if(!a)return this;if("string"==typeof a){if(c="<"===a[0]&&">"===a[a.length-1]&&a.length>=3?[null,a,null]:z.exec(a),!c||!c[1]&&b)return!b||b.jquery?(b||y).find(a):this.constructor(b).find(a);if(c[1]){if(b=b instanceof n?b[0]:b,n.merge(this,n.parseHTML(c[1],b&&b.nodeType?b.ownerDocument||b:l,!0)),v.test(c[1])&&n.isPlainObject(b))for(c in b)n.isFunction(this[c])?this[c](b[c]):this.attr(c,b[c]);return this}return d=l.getElementById(c[2]),d&&d.parentNode&&(this.length=1,this[0]=d),this.context=l,this.selector=a,this}return a.nodeType?(this.context=this[0]=a,this.length=1,this):n.isFunction(a)?"undefined"!=typeof y.ready?y.ready(a):a(n):(void 0!==a.selector&&(this.selector=a.selector,this.context=a.context),n.makeArray(a,this))};A.prototype=n.fn,y=n(l);var B=/^(?:parents|prev(?:Until|All))/,C={children:!0,contents:!0,next:!0,prev:!0};n.extend({dir:function(a,b,c){var d=[],e=void 0!==c;while((a=a[b])&&9!==a.nodeType)if(1===a.nodeType){if(e&&n(a).is(c))break;d.push(a)}return d},sibling:function(a,b){for(var c=[];a;a=a.nextSibling)1===a.nodeType&&a!==b&&c.push(a);return c}}),n.fn.extend({has:function(a){var b=n(a,this),c=b.length;return this.filter(function(){for(var a=0;c>a;a++)if(n.contains(this,b[a]))return!0})},closest:function(a,b){for(var c,d=0,e=this.length,f=[],g=u.test(a)||"string"!=typeof a?n(a,b||this.context):0;e>d;d++)for(c=this[d];c&&c!==b;c=c.parentNode)if(c.nodeType<11&&(g?g.index(c)>-1:1===c.nodeType&&n.find.matchesSelector(c,a))){f.push(c);break}return this.pushStack(f.length>1?n.unique(f):f)},index:function(a){return a?"string"==typeof a?g.call(n(a),this[0]):g.call(this,a.jquery?a[0]:a):this[0]&&this[0].parentNode?this.first().prevAll().length:-1},add:function(a,b){return this.pushStack(n.unique(n.merge(this.get(),n(a,b))))},addBack:function(a){return this.add(null==a?this.prevObject:this.prevObject.filter(a))}});function D(a,b){while((a=a[b])&&1!==a.nodeType);return a}n.each({parent:function(a){var b=a.parentNode;return b&&11!==b.nodeType?b:null},parents:function(a){return n.dir(a,"parentNode")},parentsUntil:function(a,b,c){return n.dir(a,"parentNode",c)},next:function(a){return D(a,"nextSibling")},prev:function(a){return D(a,"previousSibling")},nextAll:function(a){return n.dir(a,"nextSibling")},prevAll:function(a){return n.dir(a,"previousSibling")},nextUntil:function(a,b,c){return n.dir(a,"nextSibling",c)},prevUntil:function(a,b,c){return n.dir(a,"previousSibling",c)},siblings:function(a){return n.sibling((a.parentNode||{}).firstChild,a)},children:function(a){return n.sibling(a.firstChild)},contents:function(a){return a.contentDocument||n.merge([],a.childNodes)}},function(a,b){n.fn[a]=function(c,d){var e=n.map(this,b,c);return"Until"!==a.slice(-5)&&(d=c),d&&"string"==typeof d&&(e=n.filter(d,e)),this.length>1&&(C[a]||n.unique(e),B.test(a)&&e.reverse()),this.pushStack(e)}});var E=/\S+/g,F={};function G(a){var b=F[a]={};return n.each(a.match(E)||[],function(a,c){b[c]=!0}),b}n.Callbacks=function(a){a="string"==typeof a?F[a]||G(a):n.extend({},a);var b,c,d,e,f,g,h=[],i=!a.once&&[],j=function(l){for(b=a.memory&&l,c=!0,g=e||0,e=0,f=h.length,d=!0;h&&f>g;g++)if(h[g].apply(l[0],l[1])===!1&&a.stopOnFalse){b=!1;break}d=!1,h&&(i?i.length&&j(i.shift()):b?h=[]:k.disable())},k={add:function(){if(h){var c=h.length;!function g(b){n.each(b,function(b,c){var d=n.type(c);"function"===d?a.unique&&k.has(c)||h.push(c):c&&c.length&&"string"!==d&&g(c)})}(arguments),d?f=h.length:b&&(e=c,j(b))}return this},remove:function(){return h&&n.each(arguments,function(a,b){var c;while((c=n.inArray(b,h,c))>-1)h.splice(c,1),d&&(f>=c&&f--,g>=c&&g--)}),this},has:function(a){return a?n.inArray(a,h)>-1:!(!h||!h.length)},empty:function(){return h=[],f=0,this},disable:function(){return h=i=b=void 0,this},disabled:function(){return!h},lock:function(){return i=void 0,b||k.disable(),this},locked:function(){return!i},fireWith:function(a,b){return!h||c&&!i||(b=b||[],b=[a,b.slice?b.slice():b],d?i.push(b):j(b)),this},fire:function(){return k.fireWith(this,arguments),this},fired:function(){return!!c}};return k},n.extend({Deferred:function(a){var b=[["resolve","done",n.Callbacks("once memory"),"resolved"],["reject","fail",n.Callbacks("once memory"),"rejected"],["notify","progress",n.Callbacks("memory")]],c="pending",d={state:function(){return c},always:function(){return e.done(arguments).fail(arguments),this},then:function(){var a=arguments;return n.Deferred(function(c){n.each(b,function(b,f){var g=n.isFunction(a[b])&&a[b];e[f[1]](function(){var a=g&&g.apply(this,arguments);a&&n.isFunction(a.promise)?a.promise().done(c.resolve).fail(c.reject).progress(c.notify):c[f[0]+"With"](this===d?c.promise():this,g?[a]:arguments)})}),a=null}).promise()},promise:function(a){return null!=a?n.extend(a,d):d}},e={};return d.pipe=d.then,n.each(b,function(a,f){var g=f[2],h=f[3];d[f[1]]=g.add,h&&g.add(function(){c=h},b[1^a][2].disable,b[2][2].lock),e[f[0]]=function(){return e[f[0]+"With"](this===e?d:this,arguments),this},e[f[0]+"With"]=g.fireWith}),d.promise(e),a&&a.call(e,e),e},when:function(a){var b=0,c=d.call(arguments),e=c.length,f=1!==e||a&&n.isFunction(a.promise)?e:0,g=1===f?a:n.Deferred(),h=function(a,b,c){return function(e){b[a]=this,c[a]=arguments.length>1?d.call(arguments):e,c===i?g.notifyWith(b,c):--f||g.resolveWith(b,c)}},i,j,k;if(e>1)for(i=new Array(e),j=new Array(e),k=new Array(e);e>b;b++)c[b]&&n.isFunction(c[b].promise)?c[b].promise().done(h(b,k,c)).fail(g.reject).progress(h(b,j,i)):--f;return f||g.resolveWith(k,c),g.promise()}});var H;n.fn.ready=function(a){return n.ready.promise().done(a),this},n.extend({isReady:!1,readyWait:1,holdReady:function(a){a?n.readyWait++:n.ready(!0)},ready:function(a){(a===!0?--n.readyWait:n.isReady)||(n.isReady=!0,a!==!0&&--n.readyWait>0||(H.resolveWith(l,[n]),n.fn.triggerHandler&&(n(l).triggerHandler("ready"),n(l).off("ready"))))}});function I(){l.removeEventListener("DOMContentLoaded",I,!1),a.removeEventListener("load",I,!1),n.ready()}n.ready.promise=function(b){return H||(H=n.Deferred(),"complete"===l.readyState?setTimeout(n.ready):(l.addEventListener("DOMContentLoaded",I,!1),a.addEventListener("load",I,!1))),H.promise(b)},n.ready.promise();var J=n.access=function(a,b,c,d,e,f,g){var h=0,i=a.length,j=null==c;if("object"===n.type(c)){e=!0;for(h in c)n.access(a,b,h,c[h],!0,f,g)}else if(void 0!==d&&(e=!0,n.isFunction(d)||(g=!0),j&&(g?(b.call(a,d),b=null):(j=b,b=function(a,b,c){return j.call(n(a),c)})),b))for(;i>h;h++)b(a[h],c,g?d:d.call(a[h],h,b(a[h],c)));return e?a:j?b.call(a):i?b(a[0],c):f};n.acceptData=function(a){return 1===a.nodeType||9===a.nodeType||!+a.nodeType};function K(){Object.defineProperty(this.cache={},0,{get:function(){return{}}}),this.expando=n.expando+Math.random()}K.uid=1,K.accepts=n.acceptData,K.prototype={key:function(a){if(!K.accepts(a))return 0;var b={},c=a[this.expando];if(!c){c=K.uid++;try{b[this.expando]={value:c},Object.defineProperties(a,b)}catch(d){b[this.expando]=c,n.extend(a,b)}}return this.cache[c]||(this.cache[c]={}),c},set:function(a,b,c){var d,e=this.key(a),f=this.cache[e];if("string"==typeof b)f[b]=c;else if(n.isEmptyObject(f))n.extend(this.cache[e],b);else for(d in b)f[d]=b[d];return f},get:function(a,b){var c=this.cache[this.key(a)];return void 0===b?c:c[b]},access:function(a,b,c){var d;return void 0===b||b&&"string"==typeof b&&void 0===c?(d=this.get(a,b),void 0!==d?d:this.get(a,n.camelCase(b))):(this.set(a,b,c),void 0!==c?c:b)},remove:function(a,b){var c,d,e,f=this.key(a),g=this.cache[f];if(void 0===b)this.cache[f]={};else{n.isArray(b)?d=b.concat(b.map(n.camelCase)):(e=n.camelCase(b),b in g?d=[b,e]:(d=e,d=d in g?[d]:d.match(E)||[])),c=d.length;while(c--)delete g[d[c]]}},hasData:function(a){return!n.isEmptyObject(this.cache[a[this.expando]]||{})},discard:function(a){a[this.expando]&&delete this.cache[a[this.expando]]}};var L=new K,M=new K,N=/^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,O=/([A-Z])/g;function P(a,b,c){var d;if(void 0===c&&1===a.nodeType)if(d="data-"+b.replace(O,"-$1").toLowerCase(),c=a.getAttribute(d),"string"==typeof c){try{c="true"===c?!0:"false"===c?!1:"null"===c?null:+c+""===c?+c:N.test(c)?n.parseJSON(c):c}catch(e){}M.set(a,b,c)}else c=void 0;return c}n.extend({hasData:function(a){return M.hasData(a)||L.hasData(a)},data:function(a,b,c){return M.access(a,b,c)},removeData:function(a,b){M.remove(a,b)
},_data:function(a,b,c){return L.access(a,b,c)},_removeData:function(a,b){L.remove(a,b)}}),n.fn.extend({data:function(a,b){var c,d,e,f=this[0],g=f&&f.attributes;if(void 0===a){if(this.length&&(e=M.get(f),1===f.nodeType&&!L.get(f,"hasDataAttrs"))){c=g.length;while(c--)g[c]&&(d=g[c].name,0===d.indexOf("data-")&&(d=n.camelCase(d.slice(5)),P(f,d,e[d])));L.set(f,"hasDataAttrs",!0)}return e}return"object"==typeof a?this.each(function(){M.set(this,a)}):J(this,function(b){var c,d=n.camelCase(a);if(f&&void 0===b){if(c=M.get(f,a),void 0!==c)return c;if(c=M.get(f,d),void 0!==c)return c;if(c=P(f,d,void 0),void 0!==c)return c}else this.each(function(){var c=M.get(this,d);M.set(this,d,b),-1!==a.indexOf("-")&&void 0!==c&&M.set(this,a,b)})},null,b,arguments.length>1,null,!0)},removeData:function(a){return this.each(function(){M.remove(this,a)})}}),n.extend({queue:function(a,b,c){var d;return a?(b=(b||"fx")+"queue",d=L.get(a,b),c&&(!d||n.isArray(c)?d=L.access(a,b,n.makeArray(c)):d.push(c)),d||[]):void 0},dequeue:function(a,b){b=b||"fx";var c=n.queue(a,b),d=c.length,e=c.shift(),f=n._queueHooks(a,b),g=function(){n.dequeue(a,b)};"inprogress"===e&&(e=c.shift(),d--),e&&("fx"===b&&c.unshift("inprogress"),delete f.stop,e.call(a,g,f)),!d&&f&&f.empty.fire()},_queueHooks:function(a,b){var c=b+"queueHooks";return L.get(a,c)||L.access(a,c,{empty:n.Callbacks("once memory").add(function(){L.remove(a,[b+"queue",c])})})}}),n.fn.extend({queue:function(a,b){var c=2;return"string"!=typeof a&&(b=a,a="fx",c--),arguments.length<c?n.queue(this[0],a):void 0===b?this:this.each(function(){var c=n.queue(this,a,b);n._queueHooks(this,a),"fx"===a&&"inprogress"!==c[0]&&n.dequeue(this,a)})},dequeue:function(a){return this.each(function(){n.dequeue(this,a)})},clearQueue:function(a){return this.queue(a||"fx",[])},promise:function(a,b){var c,d=1,e=n.Deferred(),f=this,g=this.length,h=function(){--d||e.resolveWith(f,[f])};"string"!=typeof a&&(b=a,a=void 0),a=a||"fx";while(g--)c=L.get(f[g],a+"queueHooks"),c&&c.empty&&(d++,c.empty.add(h));return h(),e.promise(b)}});var Q=/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source,R=["Top","Right","Bottom","Left"],S=function(a,b){return a=b||a,"none"===n.css(a,"display")||!n.contains(a.ownerDocument,a)},T=/^(?:checkbox|radio)$/i;!function(){var a=l.createDocumentFragment(),b=a.appendChild(l.createElement("div")),c=l.createElement("input");c.setAttribute("type","radio"),c.setAttribute("checked","checked"),c.setAttribute("name","t"),b.appendChild(c),k.checkClone=b.cloneNode(!0).cloneNode(!0).lastChild.checked,b.innerHTML="<textarea>x</textarea>",k.noCloneChecked=!!b.cloneNode(!0).lastChild.defaultValue}();var U="undefined";k.focusinBubbles="onfocusin"in a;var V=/^key/,W=/^(?:mouse|pointer|contextmenu)|click/,X=/^(?:focusinfocus|focusoutblur)$/,Y=/^([^.]*)(?:\.(.+)|)$/;function Z(){return!0}function $(){return!1}function _(){try{return l.activeElement}catch(a){}}n.event={global:{},add:function(a,b,c,d,e){var f,g,h,i,j,k,l,m,o,p,q,r=L.get(a);if(r){c.handler&&(f=c,c=f.handler,e=f.selector),c.guid||(c.guid=n.guid++),(i=r.events)||(i=r.events={}),(g=r.handle)||(g=r.handle=function(b){return typeof n!==U&&n.event.triggered!==b.type?n.event.dispatch.apply(a,arguments):void 0}),b=(b||"").match(E)||[""],j=b.length;while(j--)h=Y.exec(b[j])||[],o=q=h[1],p=(h[2]||"").split(".").sort(),o&&(l=n.event.special[o]||{},o=(e?l.delegateType:l.bindType)||o,l=n.event.special[o]||{},k=n.extend({type:o,origType:q,data:d,handler:c,guid:c.guid,selector:e,needsContext:e&&n.expr.match.needsContext.test(e),namespace:p.join(".")},f),(m=i[o])||(m=i[o]=[],m.delegateCount=0,l.setup&&l.setup.call(a,d,p,g)!==!1||a.addEventListener&&a.addEventListener(o,g,!1)),l.add&&(l.add.call(a,k),k.handler.guid||(k.handler.guid=c.guid)),e?m.splice(m.delegateCount++,0,k):m.push(k),n.event.global[o]=!0)}},remove:function(a,b,c,d,e){var f,g,h,i,j,k,l,m,o,p,q,r=L.hasData(a)&&L.get(a);if(r&&(i=r.events)){b=(b||"").match(E)||[""],j=b.length;while(j--)if(h=Y.exec(b[j])||[],o=q=h[1],p=(h[2]||"").split(".").sort(),o){l=n.event.special[o]||{},o=(d?l.delegateType:l.bindType)||o,m=i[o]||[],h=h[2]&&new RegExp("(^|\\.)"+p.join("\\.(?:.*\\.|)")+"(\\.|$)"),g=f=m.length;while(f--)k=m[f],!e&&q!==k.origType||c&&c.guid!==k.guid||h&&!h.test(k.namespace)||d&&d!==k.selector&&("**"!==d||!k.selector)||(m.splice(f,1),k.selector&&m.delegateCount--,l.remove&&l.remove.call(a,k));g&&!m.length&&(l.teardown&&l.teardown.call(a,p,r.handle)!==!1||n.removeEvent(a,o,r.handle),delete i[o])}else for(o in i)n.event.remove(a,o+b[j],c,d,!0);n.isEmptyObject(i)&&(delete r.handle,L.remove(a,"events"))}},trigger:function(b,c,d,e){var f,g,h,i,k,m,o,p=[d||l],q=j.call(b,"type")?b.type:b,r=j.call(b,"namespace")?b.namespace.split("."):[];if(g=h=d=d||l,3!==d.nodeType&&8!==d.nodeType&&!X.test(q+n.event.triggered)&&(q.indexOf(".")>=0&&(r=q.split("."),q=r.shift(),r.sort()),k=q.indexOf(":")<0&&"on"+q,b=b[n.expando]?b:new n.Event(q,"object"==typeof b&&b),b.isTrigger=e?2:3,b.namespace=r.join("."),b.namespace_re=b.namespace?new RegExp("(^|\\.)"+r.join("\\.(?:.*\\.|)")+"(\\.|$)"):null,b.result=void 0,b.target||(b.target=d),c=null==c?[b]:n.makeArray(c,[b]),o=n.event.special[q]||{},e||!o.trigger||o.trigger.apply(d,c)!==!1)){if(!e&&!o.noBubble&&!n.isWindow(d)){for(i=o.delegateType||q,X.test(i+q)||(g=g.parentNode);g;g=g.parentNode)p.push(g),h=g;h===(d.ownerDocument||l)&&p.push(h.defaultView||h.parentWindow||a)}f=0;while((g=p[f++])&&!b.isPropagationStopped())b.type=f>1?i:o.bindType||q,m=(L.get(g,"events")||{})[b.type]&&L.get(g,"handle"),m&&m.apply(g,c),m=k&&g[k],m&&m.apply&&n.acceptData(g)&&(b.result=m.apply(g,c),b.result===!1&&b.preventDefault());return b.type=q,e||b.isDefaultPrevented()||o._default&&o._default.apply(p.pop(),c)!==!1||!n.acceptData(d)||k&&n.isFunction(d[q])&&!n.isWindow(d)&&(h=d[k],h&&(d[k]=null),n.event.triggered=q,d[q](),n.event.triggered=void 0,h&&(d[k]=h)),b.result}},dispatch:function(a){a=n.event.fix(a);var b,c,e,f,g,h=[],i=d.call(arguments),j=(L.get(this,"events")||{})[a.type]||[],k=n.event.special[a.type]||{};if(i[0]=a,a.delegateTarget=this,!k.preDispatch||k.preDispatch.call(this,a)!==!1){h=n.event.handlers.call(this,a,j),b=0;while((f=h[b++])&&!a.isPropagationStopped()){a.currentTarget=f.elem,c=0;while((g=f.handlers[c++])&&!a.isImmediatePropagationStopped())(!a.namespace_re||a.namespace_re.test(g.namespace))&&(a.handleObj=g,a.data=g.data,e=((n.event.special[g.origType]||{}).handle||g.handler).apply(f.elem,i),void 0!==e&&(a.result=e)===!1&&(a.preventDefault(),a.stopPropagation()))}return k.postDispatch&&k.postDispatch.call(this,a),a.result}},handlers:function(a,b){var c,d,e,f,g=[],h=b.delegateCount,i=a.target;if(h&&i.nodeType&&(!a.button||"click"!==a.type))for(;i!==this;i=i.parentNode||this)if(i.disabled!==!0||"click"!==a.type){for(d=[],c=0;h>c;c++)f=b[c],e=f.selector+" ",void 0===d[e]&&(d[e]=f.needsContext?n(e,this).index(i)>=0:n.find(e,this,null,[i]).length),d[e]&&d.push(f);d.length&&g.push({elem:i,handlers:d})}return h<b.length&&g.push({elem:this,handlers:b.slice(h)}),g},props:"altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),fixHooks:{},keyHooks:{props:"char charCode key keyCode".split(" "),filter:function(a,b){return null==a.which&&(a.which=null!=b.charCode?b.charCode:b.keyCode),a}},mouseHooks:{props:"button buttons clientX clientY offsetX offsetY pageX pageY screenX screenY toElement".split(" "),filter:function(a,b){var c,d,e,f=b.button;return null==a.pageX&&null!=b.clientX&&(c=a.target.ownerDocument||l,d=c.documentElement,e=c.body,a.pageX=b.clientX+(d&&d.scrollLeft||e&&e.scrollLeft||0)-(d&&d.clientLeft||e&&e.clientLeft||0),a.pageY=b.clientY+(d&&d.scrollTop||e&&e.scrollTop||0)-(d&&d.clientTop||e&&e.clientTop||0)),a.which||void 0===f||(a.which=1&f?1:2&f?3:4&f?2:0),a}},fix:function(a){if(a[n.expando])return a;var b,c,d,e=a.type,f=a,g=this.fixHooks[e];g||(this.fixHooks[e]=g=W.test(e)?this.mouseHooks:V.test(e)?this.keyHooks:{}),d=g.props?this.props.concat(g.props):this.props,a=new n.Event(f),b=d.length;while(b--)c=d[b],a[c]=f[c];return a.target||(a.target=l),3===a.target.nodeType&&(a.target=a.target.parentNode),g.filter?g.filter(a,f):a},special:{load:{noBubble:!0},focus:{trigger:function(){return this!==_()&&this.focus?(this.focus(),!1):void 0},delegateType:"focusin"},blur:{trigger:function(){return this===_()&&this.blur?(this.blur(),!1):void 0},delegateType:"focusout"},click:{trigger:function(){return"checkbox"===this.type&&this.click&&n.nodeName(this,"input")?(this.click(),!1):void 0},_default:function(a){return n.nodeName(a.target,"a")}},beforeunload:{postDispatch:function(a){void 0!==a.result&&a.originalEvent&&(a.originalEvent.returnValue=a.result)}}},simulate:function(a,b,c,d){var e=n.extend(new n.Event,c,{type:a,isSimulated:!0,originalEvent:{}});d?n.event.trigger(e,null,b):n.event.dispatch.call(b,e),e.isDefaultPrevented()&&c.preventDefault()}},n.removeEvent=function(a,b,c){a.removeEventListener&&a.removeEventListener(b,c,!1)},n.Event=function(a,b){return this instanceof n.Event?(a&&a.type?(this.originalEvent=a,this.type=a.type,this.isDefaultPrevented=a.defaultPrevented||void 0===a.defaultPrevented&&a.returnValue===!1?Z:$):this.type=a,b&&n.extend(this,b),this.timeStamp=a&&a.timeStamp||n.now(),void(this[n.expando]=!0)):new n.Event(a,b)},n.Event.prototype={isDefaultPrevented:$,isPropagationStopped:$,isImmediatePropagationStopped:$,preventDefault:function(){var a=this.originalEvent;this.isDefaultPrevented=Z,a&&a.preventDefault&&a.preventDefault()},stopPropagation:function(){var a=this.originalEvent;this.isPropagationStopped=Z,a&&a.stopPropagation&&a.stopPropagation()},stopImmediatePropagation:function(){var a=this.originalEvent;this.isImmediatePropagationStopped=Z,a&&a.stopImmediatePropagation&&a.stopImmediatePropagation(),this.stopPropagation()}},n.each({mouseenter:"mouseover",mouseleave:"mouseout",pointerenter:"pointerover",pointerleave:"pointerout"},function(a,b){n.event.special[a]={delegateType:b,bindType:b,handle:function(a){var c,d=this,e=a.relatedTarget,f=a.handleObj;return(!e||e!==d&&!n.contains(d,e))&&(a.type=f.origType,c=f.handler.apply(this,arguments),a.type=b),c}}}),k.focusinBubbles||n.each({focus:"focusin",blur:"focusout"},function(a,b){var c=function(a){n.event.simulate(b,a.target,n.event.fix(a),!0)};n.event.special[b]={setup:function(){var d=this.ownerDocument||this,e=L.access(d,b);e||d.addEventListener(a,c,!0),L.access(d,b,(e||0)+1)},teardown:function(){var d=this.ownerDocument||this,e=L.access(d,b)-1;e?L.access(d,b,e):(d.removeEventListener(a,c,!0),L.remove(d,b))}}}),n.fn.extend({on:function(a,b,c,d,e){var f,g;if("object"==typeof a){"string"!=typeof b&&(c=c||b,b=void 0);for(g in a)this.on(g,b,c,a[g],e);return this}if(null==c&&null==d?(d=b,c=b=void 0):null==d&&("string"==typeof b?(d=c,c=void 0):(d=c,c=b,b=void 0)),d===!1)d=$;else if(!d)return this;return 1===e&&(f=d,d=function(a){return n().off(a),f.apply(this,arguments)},d.guid=f.guid||(f.guid=n.guid++)),this.each(function(){n.event.add(this,a,d,c,b)})},one:function(a,b,c,d){return this.on(a,b,c,d,1)},off:function(a,b,c){var d,e;if(a&&a.preventDefault&&a.handleObj)return d=a.handleObj,n(a.delegateTarget).off(d.namespace?d.origType+"."+d.namespace:d.origType,d.selector,d.handler),this;if("object"==typeof a){for(e in a)this.off(e,b,a[e]);return this}return(b===!1||"function"==typeof b)&&(c=b,b=void 0),c===!1&&(c=$),this.each(function(){n.event.remove(this,a,c,b)})},trigger:function(a,b){return this.each(function(){n.event.trigger(a,b,this)})},triggerHandler:function(a,b){var c=this[0];return c?n.event.trigger(a,b,c,!0):void 0}});var ab=/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,bb=/<([\w:]+)/,cb=/<|&#?\w+;/,db=/<(?:script|style|link)/i,eb=/checked\s*(?:[^=]|=\s*.checked.)/i,fb=/^$|\/(?:java|ecma)script/i,gb=/^true\/(.*)/,hb=/^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g,ib={option:[1,"<select multiple='multiple'>","</select>"],thead:[1,"<table>","</table>"],col:[2,"<table><colgroup>","</colgroup></table>"],tr:[2,"<table><tbody>","</tbody></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],_default:[0,"",""]};ib.optgroup=ib.option,ib.tbody=ib.tfoot=ib.colgroup=ib.caption=ib.thead,ib.th=ib.td;function jb(a,b){return n.nodeName(a,"table")&&n.nodeName(11!==b.nodeType?b:b.firstChild,"tr")?a.getElementsByTagName("tbody")[0]||a.appendChild(a.ownerDocument.createElement("tbody")):a}function kb(a){return a.type=(null!==a.getAttribute("type"))+"/"+a.type,a}function lb(a){var b=gb.exec(a.type);return b?a.type=b[1]:a.removeAttribute("type"),a}function mb(a,b){for(var c=0,d=a.length;d>c;c++)L.set(a[c],"globalEval",!b||L.get(b[c],"globalEval"))}function nb(a,b){var c,d,e,f,g,h,i,j;if(1===b.nodeType){if(L.hasData(a)&&(f=L.access(a),g=L.set(b,f),j=f.events)){delete g.handle,g.events={};for(e in j)for(c=0,d=j[e].length;d>c;c++)n.event.add(b,e,j[e][c])}M.hasData(a)&&(h=M.access(a),i=n.extend({},h),M.set(b,i))}}function ob(a,b){var c=a.getElementsByTagName?a.getElementsByTagName(b||"*"):a.querySelectorAll?a.querySelectorAll(b||"*"):[];return void 0===b||b&&n.nodeName(a,b)?n.merge([a],c):c}function pb(a,b){var c=b.nodeName.toLowerCase();"input"===c&&T.test(a.type)?b.checked=a.checked:("input"===c||"textarea"===c)&&(b.defaultValue=a.defaultValue)}n.extend({clone:function(a,b,c){var d,e,f,g,h=a.cloneNode(!0),i=n.contains(a.ownerDocument,a);if(!(k.noCloneChecked||1!==a.nodeType&&11!==a.nodeType||n.isXMLDoc(a)))for(g=ob(h),f=ob(a),d=0,e=f.length;e>d;d++)pb(f[d],g[d]);if(b)if(c)for(f=f||ob(a),g=g||ob(h),d=0,e=f.length;e>d;d++)nb(f[d],g[d]);else nb(a,h);return g=ob(h,"script"),g.length>0&&mb(g,!i&&ob(a,"script")),h},buildFragment:function(a,b,c,d){for(var e,f,g,h,i,j,k=b.createDocumentFragment(),l=[],m=0,o=a.length;o>m;m++)if(e=a[m],e||0===e)if("object"===n.type(e))n.merge(l,e.nodeType?[e]:e);else if(cb.test(e)){f=f||k.appendChild(b.createElement("div")),g=(bb.exec(e)||["",""])[1].toLowerCase(),h=ib[g]||ib._default,f.innerHTML=h[1]+e.replace(ab,"<$1></$2>")+h[2],j=h[0];while(j--)f=f.lastChild;n.merge(l,f.childNodes),f=k.firstChild,f.textContent=""}else l.push(b.createTextNode(e));k.textContent="",m=0;while(e=l[m++])if((!d||-1===n.inArray(e,d))&&(i=n.contains(e.ownerDocument,e),f=ob(k.appendChild(e),"script"),i&&mb(f),c)){j=0;while(e=f[j++])fb.test(e.type||"")&&c.push(e)}return k},cleanData:function(a){for(var b,c,d,e,f=n.event.special,g=0;void 0!==(c=a[g]);g++){if(n.acceptData(c)&&(e=c[L.expando],e&&(b=L.cache[e]))){if(b.events)for(d in b.events)f[d]?n.event.remove(c,d):n.removeEvent(c,d,b.handle);L.cache[e]&&delete L.cache[e]}delete M.cache[c[M.expando]]}}}),n.fn.extend({text:function(a){return J(this,function(a){return void 0===a?n.text(this):this.empty().each(function(){(1===this.nodeType||11===this.nodeType||9===this.nodeType)&&(this.textContent=a)})},null,a,arguments.length)},append:function(){return this.domManip(arguments,function(a){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var b=jb(this,a);b.appendChild(a)}})},prepend:function(){return this.domManip(arguments,function(a){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var b=jb(this,a);b.insertBefore(a,b.firstChild)}})},before:function(){return this.domManip(arguments,function(a){this.parentNode&&this.parentNode.insertBefore(a,this)})},after:function(){return this.domManip(arguments,function(a){this.parentNode&&this.parentNode.insertBefore(a,this.nextSibling)})},remove:function(a,b){for(var c,d=a?n.filter(a,this):this,e=0;null!=(c=d[e]);e++)b||1!==c.nodeType||n.cleanData(ob(c)),c.parentNode&&(b&&n.contains(c.ownerDocument,c)&&mb(ob(c,"script")),c.parentNode.removeChild(c));return this},empty:function(){for(var a,b=0;null!=(a=this[b]);b++)1===a.nodeType&&(n.cleanData(ob(a,!1)),a.textContent="");return this},clone:function(a,b){return a=null==a?!1:a,b=null==b?a:b,this.map(function(){return n.clone(this,a,b)})},html:function(a){return J(this,function(a){var b=this[0]||{},c=0,d=this.length;if(void 0===a&&1===b.nodeType)return b.innerHTML;if("string"==typeof a&&!db.test(a)&&!ib[(bb.exec(a)||["",""])[1].toLowerCase()]){a=a.replace(ab,"<$1></$2>");try{for(;d>c;c++)b=this[c]||{},1===b.nodeType&&(n.cleanData(ob(b,!1)),b.innerHTML=a);b=0}catch(e){}}b&&this.empty().append(a)},null,a,arguments.length)},replaceWith:function(){var a=arguments[0];return this.domManip(arguments,function(b){a=this.parentNode,n.cleanData(ob(this)),a&&a.replaceChild(b,this)}),a&&(a.length||a.nodeType)?this:this.remove()},detach:function(a){return this.remove(a,!0)},domManip:function(a,b){a=e.apply([],a);var c,d,f,g,h,i,j=0,l=this.length,m=this,o=l-1,p=a[0],q=n.isFunction(p);if(q||l>1&&"string"==typeof p&&!k.checkClone&&eb.test(p))return this.each(function(c){var d=m.eq(c);q&&(a[0]=p.call(this,c,d.html())),d.domManip(a,b)});if(l&&(c=n.buildFragment(a,this[0].ownerDocument,!1,this),d=c.firstChild,1===c.childNodes.length&&(c=d),d)){for(f=n.map(ob(c,"script"),kb),g=f.length;l>j;j++)h=c,j!==o&&(h=n.clone(h,!0,!0),g&&n.merge(f,ob(h,"script"))),b.call(this[j],h,j);if(g)for(i=f[f.length-1].ownerDocument,n.map(f,lb),j=0;g>j;j++)h=f[j],fb.test(h.type||"")&&!L.access(h,"globalEval")&&n.contains(i,h)&&(h.src?n._evalUrl&&n._evalUrl(h.src):n.globalEval(h.textContent.replace(hb,"")))}return this}}),n.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(a,b){n.fn[a]=function(a){for(var c,d=[],e=n(a),g=e.length-1,h=0;g>=h;h++)c=h===g?this:this.clone(!0),n(e[h])[b](c),f.apply(d,c.get());return this.pushStack(d)}});var qb,rb={};function sb(b,c){var d,e=n(c.createElement(b)).appendTo(c.body),f=a.getDefaultComputedStyle&&(d=a.getDefaultComputedStyle(e[0]))?d.display:n.css(e[0],"display");return e.detach(),f}function tb(a){var b=l,c=rb[a];return c||(c=sb(a,b),"none"!==c&&c||(qb=(qb||n("<iframe frameborder='0' width='0' height='0'/>")).appendTo(b.documentElement),b=qb[0].contentDocument,b.write(),b.close(),c=sb(a,b),qb.detach()),rb[a]=c),c}var ub=/^margin/,vb=new RegExp("^("+Q+")(?!px)[a-z%]+$","i"),wb=function(a){return a.ownerDocument.defaultView.getComputedStyle(a,null)};function xb(a,b,c){var d,e,f,g,h=a.style;return c=c||wb(a),c&&(g=c.getPropertyValue(b)||c[b]),c&&(""!==g||n.contains(a.ownerDocument,a)||(g=n.style(a,b)),vb.test(g)&&ub.test(b)&&(d=h.width,e=h.minWidth,f=h.maxWidth,h.minWidth=h.maxWidth=h.width=g,g=c.width,h.width=d,h.minWidth=e,h.maxWidth=f)),void 0!==g?g+"":g}function yb(a,b){return{get:function(){return a()?void delete this.get:(this.get=b).apply(this,arguments)}}}!function(){var b,c,d=l.documentElement,e=l.createElement("div"),f=l.createElement("div");if(f.style){f.style.backgroundClip="content-box",f.cloneNode(!0).style.backgroundClip="",k.clearCloneStyle="content-box"===f.style.backgroundClip,e.style.cssText="border:0;width:0;height:0;top:0;left:-9999px;margin-top:1px;position:absolute",e.appendChild(f);function g(){f.style.cssText="-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;display:block;margin-top:1%;top:1%;border:1px;padding:1px;width:4px;position:absolute",f.innerHTML="",d.appendChild(e);var g=a.getComputedStyle(f,null);b="1%"!==g.top,c="4px"===g.width,d.removeChild(e)}a.getComputedStyle&&n.extend(k,{pixelPosition:function(){return g(),b},boxSizingReliable:function(){return null==c&&g(),c},reliableMarginRight:function(){var b,c=f.appendChild(l.createElement("div"));return c.style.cssText=f.style.cssText="-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box;display:block;margin:0;border:0;padding:0",c.style.marginRight=c.style.width="0",f.style.width="1px",d.appendChild(e),b=!parseFloat(a.getComputedStyle(c,null).marginRight),d.removeChild(e),b}})}}(),n.swap=function(a,b,c,d){var e,f,g={};for(f in b)g[f]=a.style[f],a.style[f]=b[f];e=c.apply(a,d||[]);for(f in b)a.style[f]=g[f];return e};var zb=/^(none|table(?!-c[ea]).+)/,Ab=new RegExp("^("+Q+")(.*)$","i"),Bb=new RegExp("^([+-])=("+Q+")","i"),Cb={position:"absolute",visibility:"hidden",display:"block"},Db={letterSpacing:"0",fontWeight:"400"},Eb=["Webkit","O","Moz","ms"];function Fb(a,b){if(b in a)return b;var c=b[0].toUpperCase()+b.slice(1),d=b,e=Eb.length;while(e--)if(b=Eb[e]+c,b in a)return b;return d}function Gb(a,b,c){var d=Ab.exec(b);return d?Math.max(0,d[1]-(c||0))+(d[2]||"px"):b}function Hb(a,b,c,d,e){for(var f=c===(d?"border":"content")?4:"width"===b?1:0,g=0;4>f;f+=2)"margin"===c&&(g+=n.css(a,c+R[f],!0,e)),d?("content"===c&&(g-=n.css(a,"padding"+R[f],!0,e)),"margin"!==c&&(g-=n.css(a,"border"+R[f]+"Width",!0,e))):(g+=n.css(a,"padding"+R[f],!0,e),"padding"!==c&&(g+=n.css(a,"border"+R[f]+"Width",!0,e)));return g}function Ib(a,b,c){var d=!0,e="width"===b?a.offsetWidth:a.offsetHeight,f=wb(a),g="border-box"===n.css(a,"boxSizing",!1,f);if(0>=e||null==e){if(e=xb(a,b,f),(0>e||null==e)&&(e=a.style[b]),vb.test(e))return e;d=g&&(k.boxSizingReliable()||e===a.style[b]),e=parseFloat(e)||0}return e+Hb(a,b,c||(g?"border":"content"),d,f)+"px"}function Jb(a,b){for(var c,d,e,f=[],g=0,h=a.length;h>g;g++)d=a[g],d.style&&(f[g]=L.get(d,"olddisplay"),c=d.style.display,b?(f[g]||"none"!==c||(d.style.display=""),""===d.style.display&&S(d)&&(f[g]=L.access(d,"olddisplay",tb(d.nodeName)))):(e=S(d),"none"===c&&e||L.set(d,"olddisplay",e?c:n.css(d,"display"))));for(g=0;h>g;g++)d=a[g],d.style&&(b&&"none"!==d.style.display&&""!==d.style.display||(d.style.display=b?f[g]||"":"none"));return a}n.extend({cssHooks:{opacity:{get:function(a,b){if(b){var c=xb(a,"opacity");return""===c?"1":c}}}},cssNumber:{columnCount:!0,fillOpacity:!0,flexGrow:!0,flexShrink:!0,fontWeight:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,widows:!0,zIndex:!0,zoom:!0},cssProps:{"float":"cssFloat"},style:function(a,b,c,d){if(a&&3!==a.nodeType&&8!==a.nodeType&&a.style){var e,f,g,h=n.camelCase(b),i=a.style;return b=n.cssProps[h]||(n.cssProps[h]=Fb(i,h)),g=n.cssHooks[b]||n.cssHooks[h],void 0===c?g&&"get"in g&&void 0!==(e=g.get(a,!1,d))?e:i[b]:(f=typeof c,"string"===f&&(e=Bb.exec(c))&&(c=(e[1]+1)*e[2]+parseFloat(n.css(a,b)),f="number"),null!=c&&c===c&&("number"!==f||n.cssNumber[h]||(c+="px"),k.clearCloneStyle||""!==c||0!==b.indexOf("background")||(i[b]="inherit"),g&&"set"in g&&void 0===(c=g.set(a,c,d))||(i[b]=c)),void 0)}},css:function(a,b,c,d){var e,f,g,h=n.camelCase(b);return b=n.cssProps[h]||(n.cssProps[h]=Fb(a.style,h)),g=n.cssHooks[b]||n.cssHooks[h],g&&"get"in g&&(e=g.get(a,!0,c)),void 0===e&&(e=xb(a,b,d)),"normal"===e&&b in Db&&(e=Db[b]),""===c||c?(f=parseFloat(e),c===!0||n.isNumeric(f)?f||0:e):e}}),n.each(["height","width"],function(a,b){n.cssHooks[b]={get:function(a,c,d){return c?zb.test(n.css(a,"display"))&&0===a.offsetWidth?n.swap(a,Cb,function(){return Ib(a,b,d)}):Ib(a,b,d):void 0},set:function(a,c,d){var e=d&&wb(a);return Gb(a,c,d?Hb(a,b,d,"border-box"===n.css(a,"boxSizing",!1,e),e):0)}}}),n.cssHooks.marginRight=yb(k.reliableMarginRight,function(a,b){return b?n.swap(a,{display:"inline-block"},xb,[a,"marginRight"]):void 0}),n.each({margin:"",padding:"",border:"Width"},function(a,b){n.cssHooks[a+b]={expand:function(c){for(var d=0,e={},f="string"==typeof c?c.split(" "):[c];4>d;d++)e[a+R[d]+b]=f[d]||f[d-2]||f[0];return e}},ub.test(a)||(n.cssHooks[a+b].set=Gb)}),n.fn.extend({css:function(a,b){return J(this,function(a,b,c){var d,e,f={},g=0;if(n.isArray(b)){for(d=wb(a),e=b.length;e>g;g++)f[b[g]]=n.css(a,b[g],!1,d);return f}return void 0!==c?n.style(a,b,c):n.css(a,b)},a,b,arguments.length>1)},show:function(){return Jb(this,!0)},hide:function(){return Jb(this)},toggle:function(a){return"boolean"==typeof a?a?this.show():this.hide():this.each(function(){S(this)?n(this).show():n(this).hide()})}});function Kb(a,b,c,d,e){return new Kb.prototype.init(a,b,c,d,e)}n.Tween=Kb,Kb.prototype={constructor:Kb,init:function(a,b,c,d,e,f){this.elem=a,this.prop=c,this.easing=e||"swing",this.options=b,this.start=this.now=this.cur(),this.end=d,this.unit=f||(n.cssNumber[c]?"":"px")},cur:function(){var a=Kb.propHooks[this.prop];return a&&a.get?a.get(this):Kb.propHooks._default.get(this)},run:function(a){var b,c=Kb.propHooks[this.prop];return this.pos=b=this.options.duration?n.easing[this.easing](a,this.options.duration*a,0,1,this.options.duration):a,this.now=(this.end-this.start)*b+this.start,this.options.step&&this.options.step.call(this.elem,this.now,this),c&&c.set?c.set(this):Kb.propHooks._default.set(this),this}},Kb.prototype.init.prototype=Kb.prototype,Kb.propHooks={_default:{get:function(a){var b;return null==a.elem[a.prop]||a.elem.style&&null!=a.elem.style[a.prop]?(b=n.css(a.elem,a.prop,""),b&&"auto"!==b?b:0):a.elem[a.prop]},set:function(a){n.fx.step[a.prop]?n.fx.step[a.prop](a):a.elem.style&&(null!=a.elem.style[n.cssProps[a.prop]]||n.cssHooks[a.prop])?n.style(a.elem,a.prop,a.now+a.unit):a.elem[a.prop]=a.now}}},Kb.propHooks.scrollTop=Kb.propHooks.scrollLeft={set:function(a){a.elem.nodeType&&a.elem.parentNode&&(a.elem[a.prop]=a.now)}},n.easing={linear:function(a){return a},swing:function(a){return.5-Math.cos(a*Math.PI)/2}},n.fx=Kb.prototype.init,n.fx.step={};var Lb,Mb,Nb=/^(?:toggle|show|hide)$/,Ob=new RegExp("^(?:([+-])=|)("+Q+")([a-z%]*)$","i"),Pb=/queueHooks$/,Qb=[Vb],Rb={"*":[function(a,b){var c=this.createTween(a,b),d=c.cur(),e=Ob.exec(b),f=e&&e[3]||(n.cssNumber[a]?"":"px"),g=(n.cssNumber[a]||"px"!==f&&+d)&&Ob.exec(n.css(c.elem,a)),h=1,i=20;if(g&&g[3]!==f){f=f||g[3],e=e||[],g=+d||1;do h=h||".5",g/=h,n.style(c.elem,a,g+f);while(h!==(h=c.cur()/d)&&1!==h&&--i)}return e&&(g=c.start=+g||+d||0,c.unit=f,c.end=e[1]?g+(e[1]+1)*e[2]:+e[2]),c}]};function Sb(){return setTimeout(function(){Lb=void 0}),Lb=n.now()}function Tb(a,b){var c,d=0,e={height:a};for(b=b?1:0;4>d;d+=2-b)c=R[d],e["margin"+c]=e["padding"+c]=a;return b&&(e.opacity=e.width=a),e}function Ub(a,b,c){for(var d,e=(Rb[b]||[]).concat(Rb["*"]),f=0,g=e.length;g>f;f++)if(d=e[f].call(c,b,a))return d}function Vb(a,b,c){var d,e,f,g,h,i,j,k,l=this,m={},o=a.style,p=a.nodeType&&S(a),q=L.get(a,"fxshow");c.queue||(h=n._queueHooks(a,"fx"),null==h.unqueued&&(h.unqueued=0,i=h.empty.fire,h.empty.fire=function(){h.unqueued||i()}),h.unqueued++,l.always(function(){l.always(function(){h.unqueued--,n.queue(a,"fx").length||h.empty.fire()})})),1===a.nodeType&&("height"in b||"width"in b)&&(c.overflow=[o.overflow,o.overflowX,o.overflowY],j=n.css(a,"display"),k="none"===j?L.get(a,"olddisplay")||tb(a.nodeName):j,"inline"===k&&"none"===n.css(a,"float")&&(o.display="inline-block")),c.overflow&&(o.overflow="hidden",l.always(function(){o.overflow=c.overflow[0],o.overflowX=c.overflow[1],o.overflowY=c.overflow[2]}));for(d in b)if(e=b[d],Nb.exec(e)){if(delete b[d],f=f||"toggle"===e,e===(p?"hide":"show")){if("show"!==e||!q||void 0===q[d])continue;p=!0}m[d]=q&&q[d]||n.style(a,d)}else j=void 0;if(n.isEmptyObject(m))"inline"===("none"===j?tb(a.nodeName):j)&&(o.display=j);else{q?"hidden"in q&&(p=q.hidden):q=L.access(a,"fxshow",{}),f&&(q.hidden=!p),p?n(a).show():l.done(function(){n(a).hide()}),l.done(function(){var b;L.remove(a,"fxshow");for(b in m)n.style(a,b,m[b])});for(d in m)g=Ub(p?q[d]:0,d,l),d in q||(q[d]=g.start,p&&(g.end=g.start,g.start="width"===d||"height"===d?1:0))}}function Wb(a,b){var c,d,e,f,g;for(c in a)if(d=n.camelCase(c),e=b[d],f=a[c],n.isArray(f)&&(e=f[1],f=a[c]=f[0]),c!==d&&(a[d]=f,delete a[c]),g=n.cssHooks[d],g&&"expand"in g){f=g.expand(f),delete a[d];for(c in f)c in a||(a[c]=f[c],b[c]=e)}else b[d]=e}function Xb(a,b,c){var d,e,f=0,g=Qb.length,h=n.Deferred().always(function(){delete i.elem}),i=function(){if(e)return!1;for(var b=Lb||Sb(),c=Math.max(0,j.startTime+j.duration-b),d=c/j.duration||0,f=1-d,g=0,i=j.tweens.length;i>g;g++)j.tweens[g].run(f);return h.notifyWith(a,[j,f,c]),1>f&&i?c:(h.resolveWith(a,[j]),!1)},j=h.promise({elem:a,props:n.extend({},b),opts:n.extend(!0,{specialEasing:{}},c),originalProperties:b,originalOptions:c,startTime:Lb||Sb(),duration:c.duration,tweens:[],createTween:function(b,c){var d=n.Tween(a,j.opts,b,c,j.opts.specialEasing[b]||j.opts.easing);return j.tweens.push(d),d},stop:function(b){var c=0,d=b?j.tweens.length:0;if(e)return this;for(e=!0;d>c;c++)j.tweens[c].run(1);return b?h.resolveWith(a,[j,b]):h.rejectWith(a,[j,b]),this}}),k=j.props;for(Wb(k,j.opts.specialEasing);g>f;f++)if(d=Qb[f].call(j,a,k,j.opts))return d;return n.map(k,Ub,j),n.isFunction(j.opts.start)&&j.opts.start.call(a,j),n.fx.timer(n.extend(i,{elem:a,anim:j,queue:j.opts.queue})),j.progress(j.opts.progress).done(j.opts.done,j.opts.complete).fail(j.opts.fail).always(j.opts.always)}n.Animation=n.extend(Xb,{tweener:function(a,b){n.isFunction(a)?(b=a,a=["*"]):a=a.split(" ");for(var c,d=0,e=a.length;e>d;d++)c=a[d],Rb[c]=Rb[c]||[],Rb[c].unshift(b)},prefilter:function(a,b){b?Qb.unshift(a):Qb.push(a)}}),n.speed=function(a,b,c){var d=a&&"object"==typeof a?n.extend({},a):{complete:c||!c&&b||n.isFunction(a)&&a,duration:a,easing:c&&b||b&&!n.isFunction(b)&&b};return d.duration=n.fx.off?0:"number"==typeof d.duration?d.duration:d.duration in n.fx.speeds?n.fx.speeds[d.duration]:n.fx.speeds._default,(null==d.queue||d.queue===!0)&&(d.queue="fx"),d.old=d.complete,d.complete=function(){n.isFunction(d.old)&&d.old.call(this),d.queue&&n.dequeue(this,d.queue)},d},n.fn.extend({fadeTo:function(a,b,c,d){return this.filter(S).css("opacity",0).show().end().animate({opacity:b},a,c,d)},animate:function(a,b,c,d){var e=n.isEmptyObject(a),f=n.speed(b,c,d),g=function(){var b=Xb(this,n.extend({},a),f);(e||L.get(this,"finish"))&&b.stop(!0)};return g.finish=g,e||f.queue===!1?this.each(g):this.queue(f.queue,g)},stop:function(a,b,c){var d=function(a){var b=a.stop;delete a.stop,b(c)};return"string"!=typeof a&&(c=b,b=a,a=void 0),b&&a!==!1&&this.queue(a||"fx",[]),this.each(function(){var b=!0,e=null!=a&&a+"queueHooks",f=n.timers,g=L.get(this);if(e)g[e]&&g[e].stop&&d(g[e]);else for(e in g)g[e]&&g[e].stop&&Pb.test(e)&&d(g[e]);for(e=f.length;e--;)f[e].elem!==this||null!=a&&f[e].queue!==a||(f[e].anim.stop(c),b=!1,f.splice(e,1));(b||!c)&&n.dequeue(this,a)})},finish:function(a){return a!==!1&&(a=a||"fx"),this.each(function(){var b,c=L.get(this),d=c[a+"queue"],e=c[a+"queueHooks"],f=n.timers,g=d?d.length:0;for(c.finish=!0,n.queue(this,a,[]),e&&e.stop&&e.stop.call(this,!0),b=f.length;b--;)f[b].elem===this&&f[b].queue===a&&(f[b].anim.stop(!0),f.splice(b,1));for(b=0;g>b;b++)d[b]&&d[b].finish&&d[b].finish.call(this);delete c.finish})}}),n.each(["toggle","show","hide"],function(a,b){var c=n.fn[b];n.fn[b]=function(a,d,e){return null==a||"boolean"==typeof a?c.apply(this,arguments):this.animate(Tb(b,!0),a,d,e)}}),n.each({slideDown:Tb("show"),slideUp:Tb("hide"),slideToggle:Tb("toggle"),fadeIn:{opacity:"show"},fadeOut:{opacity:"hide"},fadeToggle:{opacity:"toggle"}},function(a,b){n.fn[a]=function(a,c,d){return this.animate(b,a,c,d)}}),n.timers=[],n.fx.tick=function(){var a,b=0,c=n.timers;for(Lb=n.now();b<c.length;b++)a=c[b],a()||c[b]!==a||c.splice(b--,1);c.length||n.fx.stop(),Lb=void 0},n.fx.timer=function(a){n.timers.push(a),a()?n.fx.start():n.timers.pop()},n.fx.interval=13,n.fx.start=function(){Mb||(Mb=setInterval(n.fx.tick,n.fx.interval))},n.fx.stop=function(){clearInterval(Mb),Mb=null},n.fx.speeds={slow:600,fast:200,_default:400},n.fn.delay=function(a,b){return a=n.fx?n.fx.speeds[a]||a:a,b=b||"fx",this.queue(b,function(b,c){var d=setTimeout(b,a);c.stop=function(){clearTimeout(d)}})},function(){var a=l.createElement("input"),b=l.createElement("select"),c=b.appendChild(l.createElement("option"));a.type="checkbox",k.checkOn=""!==a.value,k.optSelected=c.selected,b.disabled=!0,k.optDisabled=!c.disabled,a=l.createElement("input"),a.value="t",a.type="radio",k.radioValue="t"===a.value}();var Yb,Zb,$b=n.expr.attrHandle;n.fn.extend({attr:function(a,b){return J(this,n.attr,a,b,arguments.length>1)},removeAttr:function(a){return this.each(function(){n.removeAttr(this,a)})}}),n.extend({attr:function(a,b,c){var d,e,f=a.nodeType;if(a&&3!==f&&8!==f&&2!==f)return typeof a.getAttribute===U?n.prop(a,b,c):(1===f&&n.isXMLDoc(a)||(b=b.toLowerCase(),d=n.attrHooks[b]||(n.expr.match.bool.test(b)?Zb:Yb)),void 0===c?d&&"get"in d&&null!==(e=d.get(a,b))?e:(e=n.find.attr(a,b),null==e?void 0:e):null!==c?d&&"set"in d&&void 0!==(e=d.set(a,c,b))?e:(a.setAttribute(b,c+""),c):void n.removeAttr(a,b))
},removeAttr:function(a,b){var c,d,e=0,f=b&&b.match(E);if(f&&1===a.nodeType)while(c=f[e++])d=n.propFix[c]||c,n.expr.match.bool.test(c)&&(a[d]=!1),a.removeAttribute(c)},attrHooks:{type:{set:function(a,b){if(!k.radioValue&&"radio"===b&&n.nodeName(a,"input")){var c=a.value;return a.setAttribute("type",b),c&&(a.value=c),b}}}}}),Zb={set:function(a,b,c){return b===!1?n.removeAttr(a,c):a.setAttribute(c,c),c}},n.each(n.expr.match.bool.source.match(/\w+/g),function(a,b){var c=$b[b]||n.find.attr;$b[b]=function(a,b,d){var e,f;return d||(f=$b[b],$b[b]=e,e=null!=c(a,b,d)?b.toLowerCase():null,$b[b]=f),e}});var _b=/^(?:input|select|textarea|button)$/i;n.fn.extend({prop:function(a,b){return J(this,n.prop,a,b,arguments.length>1)},removeProp:function(a){return this.each(function(){delete this[n.propFix[a]||a]})}}),n.extend({propFix:{"for":"htmlFor","class":"className"},prop:function(a,b,c){var d,e,f,g=a.nodeType;if(a&&3!==g&&8!==g&&2!==g)return f=1!==g||!n.isXMLDoc(a),f&&(b=n.propFix[b]||b,e=n.propHooks[b]),void 0!==c?e&&"set"in e&&void 0!==(d=e.set(a,c,b))?d:a[b]=c:e&&"get"in e&&null!==(d=e.get(a,b))?d:a[b]},propHooks:{tabIndex:{get:function(a){return a.hasAttribute("tabindex")||_b.test(a.nodeName)||a.href?a.tabIndex:-1}}}}),k.optSelected||(n.propHooks.selected={get:function(a){var b=a.parentNode;return b&&b.parentNode&&b.parentNode.selectedIndex,null}}),n.each(["tabIndex","readOnly","maxLength","cellSpacing","cellPadding","rowSpan","colSpan","useMap","frameBorder","contentEditable"],function(){n.propFix[this.toLowerCase()]=this});var ac=/[\t\r\n\f]/g;n.fn.extend({addClass:function(a){var b,c,d,e,f,g,h="string"==typeof a&&a,i=0,j=this.length;if(n.isFunction(a))return this.each(function(b){n(this).addClass(a.call(this,b,this.className))});if(h)for(b=(a||"").match(E)||[];j>i;i++)if(c=this[i],d=1===c.nodeType&&(c.className?(" "+c.className+" ").replace(ac," "):" ")){f=0;while(e=b[f++])d.indexOf(" "+e+" ")<0&&(d+=e+" ");g=n.trim(d),c.className!==g&&(c.className=g)}return this},removeClass:function(a){var b,c,d,e,f,g,h=0===arguments.length||"string"==typeof a&&a,i=0,j=this.length;if(n.isFunction(a))return this.each(function(b){n(this).removeClass(a.call(this,b,this.className))});if(h)for(b=(a||"").match(E)||[];j>i;i++)if(c=this[i],d=1===c.nodeType&&(c.className?(" "+c.className+" ").replace(ac," "):"")){f=0;while(e=b[f++])while(d.indexOf(" "+e+" ")>=0)d=d.replace(" "+e+" "," ");g=a?n.trim(d):"",c.className!==g&&(c.className=g)}return this},toggleClass:function(a,b){var c=typeof a;return"boolean"==typeof b&&"string"===c?b?this.addClass(a):this.removeClass(a):this.each(n.isFunction(a)?function(c){n(this).toggleClass(a.call(this,c,this.className,b),b)}:function(){if("string"===c){var b,d=0,e=n(this),f=a.match(E)||[];while(b=f[d++])e.hasClass(b)?e.removeClass(b):e.addClass(b)}else(c===U||"boolean"===c)&&(this.className&&L.set(this,"__className__",this.className),this.className=this.className||a===!1?"":L.get(this,"__className__")||"")})},hasClass:function(a){for(var b=" "+a+" ",c=0,d=this.length;d>c;c++)if(1===this[c].nodeType&&(" "+this[c].className+" ").replace(ac," ").indexOf(b)>=0)return!0;return!1}});var bc=/\r/g;n.fn.extend({val:function(a){var b,c,d,e=this[0];{if(arguments.length)return d=n.isFunction(a),this.each(function(c){var e;1===this.nodeType&&(e=d?a.call(this,c,n(this).val()):a,null==e?e="":"number"==typeof e?e+="":n.isArray(e)&&(e=n.map(e,function(a){return null==a?"":a+""})),b=n.valHooks[this.type]||n.valHooks[this.nodeName.toLowerCase()],b&&"set"in b&&void 0!==b.set(this,e,"value")||(this.value=e))});if(e)return b=n.valHooks[e.type]||n.valHooks[e.nodeName.toLowerCase()],b&&"get"in b&&void 0!==(c=b.get(e,"value"))?c:(c=e.value,"string"==typeof c?c.replace(bc,""):null==c?"":c)}}}),n.extend({valHooks:{option:{get:function(a){var b=n.find.attr(a,"value");return null!=b?b:n.trim(n.text(a))}},select:{get:function(a){for(var b,c,d=a.options,e=a.selectedIndex,f="select-one"===a.type||0>e,g=f?null:[],h=f?e+1:d.length,i=0>e?h:f?e:0;h>i;i++)if(c=d[i],!(!c.selected&&i!==e||(k.optDisabled?c.disabled:null!==c.getAttribute("disabled"))||c.parentNode.disabled&&n.nodeName(c.parentNode,"optgroup"))){if(b=n(c).val(),f)return b;g.push(b)}return g},set:function(a,b){var c,d,e=a.options,f=n.makeArray(b),g=e.length;while(g--)d=e[g],(d.selected=n.inArray(d.value,f)>=0)&&(c=!0);return c||(a.selectedIndex=-1),f}}}}),n.each(["radio","checkbox"],function(){n.valHooks[this]={set:function(a,b){return n.isArray(b)?a.checked=n.inArray(n(a).val(),b)>=0:void 0}},k.checkOn||(n.valHooks[this].get=function(a){return null===a.getAttribute("value")?"on":a.value})}),n.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" "),function(a,b){n.fn[b]=function(a,c){return arguments.length>0?this.on(b,null,a,c):this.trigger(b)}}),n.fn.extend({hover:function(a,b){return this.mouseenter(a).mouseleave(b||a)},bind:function(a,b,c){return this.on(a,null,b,c)},unbind:function(a,b){return this.off(a,null,b)},delegate:function(a,b,c,d){return this.on(b,a,c,d)},undelegate:function(a,b,c){return 1===arguments.length?this.off(a,"**"):this.off(b,a||"**",c)}});var cc=n.now(),dc=/\?/;n.parseJSON=function(a){return JSON.parse(a+"")},n.parseXML=function(a){var b,c;if(!a||"string"!=typeof a)return null;try{c=new DOMParser,b=c.parseFromString(a,"text/xml")}catch(d){b=void 0}return(!b||b.getElementsByTagName("parsererror").length)&&n.error("Invalid XML: "+a),b};var ec,fc,gc=/#.*$/,hc=/([?&])_=[^&]*/,ic=/^(.*?):[ \t]*([^\r\n]*)$/gm,jc=/^(?:about|app|app-storage|.+-extension|file|res|widget):$/,kc=/^(?:GET|HEAD)$/,lc=/^\/\//,mc=/^([\w.+-]+:)(?:\/\/(?:[^\/?#]*@|)([^\/?#:]*)(?::(\d+)|)|)/,nc={},oc={},pc="*/".concat("*");try{fc=location.href}catch(qc){fc=l.createElement("a"),fc.href="",fc=fc.href}ec=mc.exec(fc.toLowerCase())||[];function rc(a){return function(b,c){"string"!=typeof b&&(c=b,b="*");var d,e=0,f=b.toLowerCase().match(E)||[];if(n.isFunction(c))while(d=f[e++])"+"===d[0]?(d=d.slice(1)||"*",(a[d]=a[d]||[]).unshift(c)):(a[d]=a[d]||[]).push(c)}}function sc(a,b,c,d){var e={},f=a===oc;function g(h){var i;return e[h]=!0,n.each(a[h]||[],function(a,h){var j=h(b,c,d);return"string"!=typeof j||f||e[j]?f?!(i=j):void 0:(b.dataTypes.unshift(j),g(j),!1)}),i}return g(b.dataTypes[0])||!e["*"]&&g("*")}function tc(a,b){var c,d,e=n.ajaxSettings.flatOptions||{};for(c in b)void 0!==b[c]&&((e[c]?a:d||(d={}))[c]=b[c]);return d&&n.extend(!0,a,d),a}function uc(a,b,c){var d,e,f,g,h=a.contents,i=a.dataTypes;while("*"===i[0])i.shift(),void 0===d&&(d=a.mimeType||b.getResponseHeader("Content-Type"));if(d)for(e in h)if(h[e]&&h[e].test(d)){i.unshift(e);break}if(i[0]in c)f=i[0];else{for(e in c){if(!i[0]||a.converters[e+" "+i[0]]){f=e;break}g||(g=e)}f=f||g}return f?(f!==i[0]&&i.unshift(f),c[f]):void 0}function vc(a,b,c,d){var e,f,g,h,i,j={},k=a.dataTypes.slice();if(k[1])for(g in a.converters)j[g.toLowerCase()]=a.converters[g];f=k.shift();while(f)if(a.responseFields[f]&&(c[a.responseFields[f]]=b),!i&&d&&a.dataFilter&&(b=a.dataFilter(b,a.dataType)),i=f,f=k.shift())if("*"===f)f=i;else if("*"!==i&&i!==f){if(g=j[i+" "+f]||j["* "+f],!g)for(e in j)if(h=e.split(" "),h[1]===f&&(g=j[i+" "+h[0]]||j["* "+h[0]])){g===!0?g=j[e]:j[e]!==!0&&(f=h[0],k.unshift(h[1]));break}if(g!==!0)if(g&&a["throws"])b=g(b);else try{b=g(b)}catch(l){return{state:"parsererror",error:g?l:"No conversion from "+i+" to "+f}}}return{state:"success",data:b}}n.extend({active:0,lastModified:{},etag:{},ajaxSettings:{url:fc,type:"GET",isLocal:jc.test(ec[1]),global:!0,processData:!0,async:!0,contentType:"application/x-www-form-urlencoded; charset=UTF-8",accepts:{"*":pc,text:"text/plain",html:"text/html",xml:"application/xml, text/xml",json:"application/json, text/javascript"},contents:{xml:/xml/,html:/html/,json:/json/},responseFields:{xml:"responseXML",text:"responseText",json:"responseJSON"},converters:{"* text":String,"text html":!0,"text json":n.parseJSON,"text xml":n.parseXML},flatOptions:{url:!0,context:!0}},ajaxSetup:function(a,b){return b?tc(tc(a,n.ajaxSettings),b):tc(n.ajaxSettings,a)},ajaxPrefilter:rc(nc),ajaxTransport:rc(oc),ajax:function(a,b){"object"==typeof a&&(b=a,a=void 0),b=b||{};var c,d,e,f,g,h,i,j,k=n.ajaxSetup({},b),l=k.context||k,m=k.context&&(l.nodeType||l.jquery)?n(l):n.event,o=n.Deferred(),p=n.Callbacks("once memory"),q=k.statusCode||{},r={},s={},t=0,u="canceled",v={readyState:0,getResponseHeader:function(a){var b;if(2===t){if(!f){f={};while(b=ic.exec(e))f[b[1].toLowerCase()]=b[2]}b=f[a.toLowerCase()]}return null==b?null:b},getAllResponseHeaders:function(){return 2===t?e:null},setRequestHeader:function(a,b){var c=a.toLowerCase();return t||(a=s[c]=s[c]||a,r[a]=b),this},overrideMimeType:function(a){return t||(k.mimeType=a),this},statusCode:function(a){var b;if(a)if(2>t)for(b in a)q[b]=[q[b],a[b]];else v.always(a[v.status]);return this},abort:function(a){var b=a||u;return c&&c.abort(b),x(0,b),this}};if(o.promise(v).complete=p.add,v.success=v.done,v.error=v.fail,k.url=((a||k.url||fc)+"").replace(gc,"").replace(lc,ec[1]+"//"),k.type=b.method||b.type||k.method||k.type,k.dataTypes=n.trim(k.dataType||"*").toLowerCase().match(E)||[""],null==k.crossDomain&&(h=mc.exec(k.url.toLowerCase()),k.crossDomain=!(!h||h[1]===ec[1]&&h[2]===ec[2]&&(h[3]||("http:"===h[1]?"80":"443"))===(ec[3]||("http:"===ec[1]?"80":"443")))),k.data&&k.processData&&"string"!=typeof k.data&&(k.data=n.param(k.data,k.traditional)),sc(nc,k,b,v),2===t)return v;i=k.global,i&&0===n.active++&&n.event.trigger("ajaxStart"),k.type=k.type.toUpperCase(),k.hasContent=!kc.test(k.type),d=k.url,k.hasContent||(k.data&&(d=k.url+=(dc.test(d)?"&":"?")+k.data,delete k.data),k.cache===!1&&(k.url=hc.test(d)?d.replace(hc,"$1_="+cc++):d+(dc.test(d)?"&":"?")+"_="+cc++)),k.ifModified&&(n.lastModified[d]&&v.setRequestHeader("If-Modified-Since",n.lastModified[d]),n.etag[d]&&v.setRequestHeader("If-None-Match",n.etag[d])),(k.data&&k.hasContent&&k.contentType!==!1||b.contentType)&&v.setRequestHeader("Content-Type",k.contentType),v.setRequestHeader("Accept",k.dataTypes[0]&&k.accepts[k.dataTypes[0]]?k.accepts[k.dataTypes[0]]+("*"!==k.dataTypes[0]?", "+pc+"; q=0.01":""):k.accepts["*"]);for(j in k.headers)v.setRequestHeader(j,k.headers[j]);if(k.beforeSend&&(k.beforeSend.call(l,v,k)===!1||2===t))return v.abort();u="abort";for(j in{success:1,error:1,complete:1})v[j](k[j]);if(c=sc(oc,k,b,v)){v.readyState=1,i&&m.trigger("ajaxSend",[v,k]),k.async&&k.timeout>0&&(g=setTimeout(function(){v.abort("timeout")},k.timeout));try{t=1,c.send(r,x)}catch(w){if(!(2>t))throw w;x(-1,w)}}else x(-1,"No Transport");function x(a,b,f,h){var j,r,s,u,w,x=b;2!==t&&(t=2,g&&clearTimeout(g),c=void 0,e=h||"",v.readyState=a>0?4:0,j=a>=200&&300>a||304===a,f&&(u=uc(k,v,f)),u=vc(k,u,v,j),j?(k.ifModified&&(w=v.getResponseHeader("Last-Modified"),w&&(n.lastModified[d]=w),w=v.getResponseHeader("etag"),w&&(n.etag[d]=w)),204===a||"HEAD"===k.type?x="nocontent":304===a?x="notmodified":(x=u.state,r=u.data,s=u.error,j=!s)):(s=x,(a||!x)&&(x="error",0>a&&(a=0))),v.status=a,v.statusText=(b||x)+"",j?o.resolveWith(l,[r,x,v]):o.rejectWith(l,[v,x,s]),v.statusCode(q),q=void 0,i&&m.trigger(j?"ajaxSuccess":"ajaxError",[v,k,j?r:s]),p.fireWith(l,[v,x]),i&&(m.trigger("ajaxComplete",[v,k]),--n.active||n.event.trigger("ajaxStop")))}return v},getJSON:function(a,b,c){return n.get(a,b,c,"json")},getScript:function(a,b){return n.get(a,void 0,b,"script")}}),n.each(["get","post"],function(a,b){n[b]=function(a,c,d,e){return n.isFunction(c)&&(e=e||d,d=c,c=void 0),n.ajax({url:a,type:b,dataType:e,data:c,success:d})}}),n.each(["ajaxStart","ajaxStop","ajaxComplete","ajaxError","ajaxSuccess","ajaxSend"],function(a,b){n.fn[b]=function(a){return this.on(b,a)}}),n._evalUrl=function(a){return n.ajax({url:a,type:"GET",dataType:"script",async:!1,global:!1,"throws":!0})},n.fn.extend({wrapAll:function(a){var b;return n.isFunction(a)?this.each(function(b){n(this).wrapAll(a.call(this,b))}):(this[0]&&(b=n(a,this[0].ownerDocument).eq(0).clone(!0),this[0].parentNode&&b.insertBefore(this[0]),b.map(function(){var a=this;while(a.firstElementChild)a=a.firstElementChild;return a}).append(this)),this)},wrapInner:function(a){return this.each(n.isFunction(a)?function(b){n(this).wrapInner(a.call(this,b))}:function(){var b=n(this),c=b.contents();c.length?c.wrapAll(a):b.append(a)})},wrap:function(a){var b=n.isFunction(a);return this.each(function(c){n(this).wrapAll(b?a.call(this,c):a)})},unwrap:function(){return this.parent().each(function(){n.nodeName(this,"body")||n(this).replaceWith(this.childNodes)}).end()}}),n.expr.filters.hidden=function(a){return a.offsetWidth<=0&&a.offsetHeight<=0},n.expr.filters.visible=function(a){return!n.expr.filters.hidden(a)};var wc=/%20/g,xc=/\[\]$/,yc=/\r?\n/g,zc=/^(?:submit|button|image|reset|file)$/i,Ac=/^(?:input|select|textarea|keygen)/i;function Bc(a,b,c,d){var e;if(n.isArray(b))n.each(b,function(b,e){c||xc.test(a)?d(a,e):Bc(a+"["+("object"==typeof e?b:"")+"]",e,c,d)});else if(c||"object"!==n.type(b))d(a,b);else for(e in b)Bc(a+"["+e+"]",b[e],c,d)}n.param=function(a,b){var c,d=[],e=function(a,b){b=n.isFunction(b)?b():null==b?"":b,d[d.length]=encodeURIComponent(a)+"="+encodeURIComponent(b)};if(void 0===b&&(b=n.ajaxSettings&&n.ajaxSettings.traditional),n.isArray(a)||a.jquery&&!n.isPlainObject(a))n.each(a,function(){e(this.name,this.value)});else for(c in a)Bc(c,a[c],b,e);return d.join("&").replace(wc,"+")},n.fn.extend({serialize:function(){return n.param(this.serializeArray())},serializeArray:function(){return this.map(function(){var a=n.prop(this,"elements");return a?n.makeArray(a):this}).filter(function(){var a=this.type;return this.name&&!n(this).is(":disabled")&&Ac.test(this.nodeName)&&!zc.test(a)&&(this.checked||!T.test(a))}).map(function(a,b){var c=n(this).val();return null==c?null:n.isArray(c)?n.map(c,function(a){return{name:b.name,value:a.replace(yc,"\r\n")}}):{name:b.name,value:c.replace(yc,"\r\n")}}).get()}}),n.ajaxSettings.xhr=function(){try{return new XMLHttpRequest}catch(a){}};var Cc=0,Dc={},Ec={0:200,1223:204},Fc=n.ajaxSettings.xhr();a.ActiveXObject&&n(a).on("unload",function(){for(var a in Dc)Dc[a]()}),k.cors=!!Fc&&"withCredentials"in Fc,k.ajax=Fc=!!Fc,n.ajaxTransport(function(a){var b;return k.cors||Fc&&!a.crossDomain?{send:function(c,d){var e,f=a.xhr(),g=++Cc;if(f.open(a.type,a.url,a.async,a.username,a.password),a.xhrFields)for(e in a.xhrFields)f[e]=a.xhrFields[e];a.mimeType&&f.overrideMimeType&&f.overrideMimeType(a.mimeType),a.crossDomain||c["X-Requested-With"]||(c["X-Requested-With"]="XMLHttpRequest");for(e in c)f.setRequestHeader(e,c[e]);b=function(a){return function(){b&&(delete Dc[g],b=f.onload=f.onerror=null,"abort"===a?f.abort():"error"===a?d(f.status,f.statusText):d(Ec[f.status]||f.status,f.statusText,"string"==typeof f.responseText?{text:f.responseText}:void 0,f.getAllResponseHeaders()))}},f.onload=b(),f.onerror=b("error"),b=Dc[g]=b("abort");try{f.send(a.hasContent&&a.data||null)}catch(h){if(b)throw h}},abort:function(){b&&b()}}:void 0}),n.ajaxSetup({accepts:{script:"text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},contents:{script:/(?:java|ecma)script/},converters:{"text script":function(a){return n.globalEval(a),a}}}),n.ajaxPrefilter("script",function(a){void 0===a.cache&&(a.cache=!1),a.crossDomain&&(a.type="GET")}),n.ajaxTransport("script",function(a){if(a.crossDomain){var b,c;return{send:function(d,e){b=n("<script>").prop({async:!0,charset:a.scriptCharset,src:a.url}).on("load error",c=function(a){b.remove(),c=null,a&&e("error"===a.type?404:200,a.type)}),l.head.appendChild(b[0])},abort:function(){c&&c()}}}});var Gc=[],Hc=/(=)\?(?=&|$)|\?\?/;n.ajaxSetup({jsonp:"callback",jsonpCallback:function(){var a=Gc.pop()||n.expando+"_"+cc++;return this[a]=!0,a}}),n.ajaxPrefilter("json jsonp",function(b,c,d){var e,f,g,h=b.jsonp!==!1&&(Hc.test(b.url)?"url":"string"==typeof b.data&&!(b.contentType||"").indexOf("application/x-www-form-urlencoded")&&Hc.test(b.data)&&"data");return h||"jsonp"===b.dataTypes[0]?(e=b.jsonpCallback=n.isFunction(b.jsonpCallback)?b.jsonpCallback():b.jsonpCallback,h?b[h]=b[h].replace(Hc,"$1"+e):b.jsonp!==!1&&(b.url+=(dc.test(b.url)?"&":"?")+b.jsonp+"="+e),b.converters["script json"]=function(){return g||n.error(e+" was not called"),g[0]},b.dataTypes[0]="json",f=a[e],a[e]=function(){g=arguments},d.always(function(){a[e]=f,b[e]&&(b.jsonpCallback=c.jsonpCallback,Gc.push(e)),g&&n.isFunction(f)&&f(g[0]),g=f=void 0}),"script"):void 0}),n.parseHTML=function(a,b,c){if(!a||"string"!=typeof a)return null;"boolean"==typeof b&&(c=b,b=!1),b=b||l;var d=v.exec(a),e=!c&&[];return d?[b.createElement(d[1])]:(d=n.buildFragment([a],b,e),e&&e.length&&n(e).remove(),n.merge([],d.childNodes))};var Ic=n.fn.load;n.fn.load=function(a,b,c){if("string"!=typeof a&&Ic)return Ic.apply(this,arguments);var d,e,f,g=this,h=a.indexOf(" ");return h>=0&&(d=n.trim(a.slice(h)),a=a.slice(0,h)),n.isFunction(b)?(c=b,b=void 0):b&&"object"==typeof b&&(e="POST"),g.length>0&&n.ajax({url:a,type:e,dataType:"html",data:b}).done(function(a){f=arguments,g.html(d?n("<div>").append(n.parseHTML(a)).find(d):a)}).complete(c&&function(a,b){g.each(c,f||[a.responseText,b,a])}),this},n.expr.filters.animated=function(a){return n.grep(n.timers,function(b){return a===b.elem}).length};var Jc=a.document.documentElement;function Kc(a){return n.isWindow(a)?a:9===a.nodeType&&a.defaultView}n.offset={setOffset:function(a,b,c){var d,e,f,g,h,i,j,k=n.css(a,"position"),l=n(a),m={};"static"===k&&(a.style.position="relative"),h=l.offset(),f=n.css(a,"top"),i=n.css(a,"left"),j=("absolute"===k||"fixed"===k)&&(f+i).indexOf("auto")>-1,j?(d=l.position(),g=d.top,e=d.left):(g=parseFloat(f)||0,e=parseFloat(i)||0),n.isFunction(b)&&(b=b.call(a,c,h)),null!=b.top&&(m.top=b.top-h.top+g),null!=b.left&&(m.left=b.left-h.left+e),"using"in b?b.using.call(a,m):l.css(m)}},n.fn.extend({offset:function(a){if(arguments.length)return void 0===a?this:this.each(function(b){n.offset.setOffset(this,a,b)});var b,c,d=this[0],e={top:0,left:0},f=d&&d.ownerDocument;if(f)return b=f.documentElement,n.contains(b,d)?(typeof d.getBoundingClientRect!==U&&(e=d.getBoundingClientRect()),c=Kc(f),{top:e.top+c.pageYOffset-b.clientTop,left:e.left+c.pageXOffset-b.clientLeft}):e},position:function(){if(this[0]){var a,b,c=this[0],d={top:0,left:0};return"fixed"===n.css(c,"position")?b=c.getBoundingClientRect():(a=this.offsetParent(),b=this.offset(),n.nodeName(a[0],"html")||(d=a.offset()),d.top+=n.css(a[0],"borderTopWidth",!0),d.left+=n.css(a[0],"borderLeftWidth",!0)),{top:b.top-d.top-n.css(c,"marginTop",!0),left:b.left-d.left-n.css(c,"marginLeft",!0)}}},offsetParent:function(){return this.map(function(){var a=this.offsetParent||Jc;while(a&&!n.nodeName(a,"html")&&"static"===n.css(a,"position"))a=a.offsetParent;return a||Jc})}}),n.each({scrollLeft:"pageXOffset",scrollTop:"pageYOffset"},function(b,c){var d="pageYOffset"===c;n.fn[b]=function(e){return J(this,function(b,e,f){var g=Kc(b);return void 0===f?g?g[c]:b[e]:void(g?g.scrollTo(d?a.pageXOffset:f,d?f:a.pageYOffset):b[e]=f)},b,e,arguments.length,null)}}),n.each(["top","left"],function(a,b){n.cssHooks[b]=yb(k.pixelPosition,function(a,c){return c?(c=xb(a,b),vb.test(c)?n(a).position()[b]+"px":c):void 0})}),n.each({Height:"height",Width:"width"},function(a,b){n.each({padding:"inner"+a,content:b,"":"outer"+a},function(c,d){n.fn[d]=function(d,e){var f=arguments.length&&(c||"boolean"!=typeof d),g=c||(d===!0||e===!0?"margin":"border");return J(this,function(b,c,d){var e;return n.isWindow(b)?b.document.documentElement["client"+a]:9===b.nodeType?(e=b.documentElement,Math.max(b.body["scroll"+a],e["scroll"+a],b.body["offset"+a],e["offset"+a],e["client"+a])):void 0===d?n.css(b,c,g):n.style(b,c,d,g)},b,f?d:void 0,f,null)}})}),n.fn.size=function(){return this.length},n.fn.andSelf=n.fn.addBack,"function"==typeof define&&define.amd&&define("jquery",[],function(){return n});var Lc=a.jQuery,Mc=a.$;return n.noConflict=function(b){return a.$===n&&(a.$=Mc),b&&a.jQuery===n&&(a.jQuery=Lc),n},typeof b===U&&(a.jQuery=a.$=n),n});
//# sourceMappingURL=jquery.min.map
/* build: `node build.js modules=ALL exclude=gestures,cufon,json minifier=uglifyjs` *//*! Fabric.js Copyright 2008-2014, Printio (Juriy Zaytsev, Maxim Chernyak) */var fabric=fabric||{version:"1.4.11"};typeof exports!="undefined"&&(exports.fabric=fabric),typeof document!="undefined"&&typeof window!="undefined"?(fabric.document=document,fabric.window=window):(fabric.document=require("jsdom").jsdom("<!DOCTYPE html><html><head></head><body></body></html>"),fabric.window=fabric.document.createWindow()),fabric.isTouchSupported="ontouchstart"in fabric.document.documentElement,fabric.isLikelyNode=typeof Buffer!="undefined"&&typeof window=="undefined",fabric.SHARED_ATTRIBUTES=["display","transform","fill","fill-opacity","fill-rule","opacity","stroke","stroke-dasharray","stroke-linecap","stroke-linejoin","stroke-miterlimit","stroke-opacity","stroke-width"],fabric.DPI=96,function(){function e(e,t){if(!this.__eventListeners[e])return;t?fabric.util.removeFromArray(this.__eventListeners[e],t):this.__eventListeners[e].length=0}function t(e,t){this.__eventListeners||(this.__eventListeners={});if(arguments.length===1)for(var n in e)this.on(n,e[n]);else this.__eventListeners[e]||(this.__eventListeners[e]=[]),this.__eventListeners[e].push(t);return this}function n(t,n){if(!this.__eventListeners)return;if(arguments.length===0)this.__eventListeners={};else if(arguments.length===1&&typeof arguments[0]=="object")for(var r in t)e.call(this,r,t[r]);else e.call(this,t,n);return this}function r(e,t){if(!this.__eventListeners)return;var n=this.__eventListeners[e];if(!n)return;for(var r=0,i=n.length;r<i;r++)n[r].call(this,t||{});return this}fabric.Observable={observe:t,stopObserving:n,fire:r,on:t,off:n,trigger:r}}(),fabric.Collection={add:function(){this._objects.push.apply(this._objects,arguments);for(var e=0,t=arguments.length;e<t;e++)this._onObjectAdded(arguments[e]);return this.renderOnAddRemove&&this.renderAll(),this},insertAt:function(e,t,n){var r=this.getObjects();return n?r[t]=e:r.splice(t,0,e),this._onObjectAdded(e),this.renderOnAddRemove&&this.renderAll(),this},remove:function(){var e=this.getObjects(),t;for(var n=0,r=arguments.length;n<r;n++)t=e.indexOf(arguments[n]),t!==-1&&(e.splice(t,1),this._onObjectRemoved(arguments[n]));return this.renderOnAddRemove&&this.renderAll(),this},forEachObject:function(e,t){var n=this.getObjects(),r=n.length;while(r--)e.call(t,n[r],r,n);return this},getObjects:function(e){return typeof e=="undefined"?this._objects:this._objects.filter(function(t){return t.type===e})},item:function(e){return this.getObjects()[e]},isEmpty:function(){return this.getObjects().length===0},size:function(){return this.getObjects().length},contains:function(e){return this.getObjects().indexOf(e)>-1},complexity:function(){return this.getObjects().reduce(function(e,t){return e+=t.complexity?t.complexity():0,e},0)}},function(e){var t=Math.sqrt,n=Math.atan2,r=Math.PI/180;fabric.util={removeFromArray:function(e,t){var n=e.indexOf(t);return n!==-1&&e.splice(n,1),e},getRandomInt:function(e,t){return Math.floor(Math.random()*(t-e+1))+e},degreesToRadians:function(e){return e*r},radiansToDegrees:function(e){return e/r},rotatePoint:function(e,t,n){var r=Math.sin(n),i=Math.cos(n);e.subtractEquals(t);var s=e.x*i-e.y*r,o=e.x*r+e.y*i;return(new fabric.Point(s,o)).addEquals(t)},transformPoint:function(e,t,n){return n?new fabric.Point(t[0]*e.x+t[1]*e.y,t[2]*e.x+t[3]*e.y):new fabric.Point(t[0]*e.x+t[1]*e.y+t[4],t[2]*e.x+t[3]*e.y+t[5])},invertTransform:function(e){var t=e.slice(),n=1/(e[0]*e[3]-e[1]*e[2]);t=[n*e[3],-n*e[1],-n*e[2],n*e[0],0,0];var r=fabric.util.transformPoint({x:e[4],y:e[5]},t);return t[4]=-r.x,t[5]=-r.y,t},toFixed:function(e,t){return parseFloat(Number(e).toFixed(t))},parseUnit:function(e){var t=/\D{0,2}$/.exec(e),n=parseFloat(e);switch(t[0]){case"mm":return n*fabric.DPI/25.4;case"cm":return n*fabric.DPI/2.54;case"in":return n*fabric.DPI;case"pt":return n*fabric.DPI/72;case"pc":return n*fabric.DPI/72*12;default:return n}},falseFunction:function(){return!1},getKlass:function(e,t){return e=fabric.util.string.camelize(e.charAt(0).toUpperCase()+e.slice(1)),fabric.util.resolveNamespace(t)[e]},resolveNamespace:function(t){if(!t)return fabric;var n=t.split("."),r=n.length,i=e||fabric.window;for(var s=0;s<r;++s)i=i[n[s]];return i},loadImage:function(e,t,n,r){if(!e){t&&t.call(n,e);return}var i=fabric.util.createImage();i.onload=function(){t&&t.call(n,i),i=i.onload=i.onerror=null},i.onerror=function(){fabric.log("Error loading "+i.src),t&&t.call(n,null,!0),i=i.onload=i.onerror=null},e.indexOf("data")!==0&&typeof r!="undefined"&&(i.crossOrigin=r),i.src=e},enlivenObjects:function(e,t,n,r){function i(){++o===u&&t&&t(s)}e=e||[];var s=[],o=0,u=e.length;if(!u){t&&t(s);return}e.forEach(function(e,t){if(!e||!e.type){i();return}var o=fabric.util.getKlass(e.type,n);o.async?o.fromObject(e,function(n,o){o||(s[t]=n,r&&r(e,s[t])),i()}):(s[t]=o.fromObject(e),r&&r(e,s[t]),i())})},groupSVGElements:function(e,t,n){var r;return r=new fabric.PathGroup(e,t),typeof n!="undefined"&&r.setSourcePath(n),r},populateWithProperties:function(e,t,n){if(n&&Object.prototype.toString.call(n)==="[object Array]")for(var r=0,i=n.length;r<i;r++)n[r]in e&&(t[n[r]]=e[n[r]])},drawDashedLine:function(e,r,i,s,o,u){var a=s-r,f=o-i,l=t(a*a+f*f),c=n(f,a),h=u.length,p=0,d=!0;e.save(),e.translate(r,i),e.moveTo(0,0),e.rotate(c),r=0;while(l>r)r+=u[p++%h],r>l&&(r=l),e[d?"lineTo":"moveTo"](r,0),d=!d;e.restore()},createCanvasElement:function(e){return e||(e=fabric.document.createElement("canvas")),!e.getContext&&typeof G_vmlCanvasManager!="undefined"&&G_vmlCanvasManager.initElement(e),e},createImage:function(){return fabric.isLikelyNode?new(require("canvas").Image):fabric.document.createElement("img")},createAccessors:function(e){var t=e.prototype;for(var n=t.stateProperties.length;n--;){var r=t.stateProperties[n],i=r.charAt(0).toUpperCase()+r.slice(1),s="set"+i,o="get"+i;t[o]||(t[o]=function(e){return new Function('return this.get("'+e+'")')}(r)),t[s]||(t[s]=function(e){return new Function("value",'return this.set("'+e+'", value)')}(r))}},clipContext:function(e,t){t.save(),t.beginPath(),e.clipTo(t),t.clip()},multiplyTransformMatrices:function(e,t){var n=[[e[0],e[2],e[4]],[e[1],e[3],e[5]],[0,0,1]],r=[[t[0],t[2],t[4]],[t[1],t[3],t[5]],[0,0,1]],i=[];for(var s=0;s<3;s++){i[s]=[];for(var o=0;o<3;o++){var u=0;for(var a=0;a<3;a++)u+=n[s][a]*r[a][o];i[s][o]=u}}return[i[0][0],i[1][0],i[0][1],i[1][1],i[0][2],i[1][2]]},getFunctionBody:function(e){return(String(e).match(/function[^{]*\{([\s\S]*)\}/)||{})[1]},isTransparent:function(e,t,n,r){r>0&&(t>r?t-=r:t=0,n>r?n-=r:n=0);var i=!0,s=e.getImageData(t,n,r*2||1,r*2||1);for(var o=3,u=s.data.length;o<u;o+=4){var a=s.data[o];i=a<=0;if(i===!1)break}return s=null,i}}}(typeof exports!="undefined"?exports:this),function(){function r(t,r,o,u,a,f,l){var c=n.call(arguments);if(e[c])return e[c];var h=Math.PI,p=l*(h/180),d=Math.sin(p),v=Math.cos(p),m=0,g=0;o=Math.abs(o),u=Math.abs(u);var y=-v*t-d*r,b=-v*r+d*t,w=o*o,E=u*u,S=b*b,x=y*y,T=4*w*E-w*S-E*x,N=0;if(T<0){var C=Math.sqrt(1-.25*T/(w*E));o*=C,u*=C}else N=(a===f?-0.5:.5)*Math.sqrt(T/(w*S+E*x));var k=N*o*b/u,L=-N*u*y/o,A=v*k-d*L+t/2,O=d*k+v*L+r/2,M=s(1,0,(y-k)/o,(b-L)/u),_=s((y-k)/o,(b-L)/u,(-y-k)/o,(-b-L)/u);f===0&&_>0?_-=2*h:f===1&&_<0&&(_+=2*h);var D=Math.ceil(Math.abs(_/(h*.5))),P=[],H=_/D,B=8/3*Math.sin(H/4)*Math.sin(H/4)/Math.sin(H/2),j=M+H;for(var F=0;F<D;F++)P[F]=i(M,j,v,d,o,u,A,O,B,m,g),m=P[F][4],g=P[F][5],M+=H,j+=H;return e[c]=P,P}function i(e,r,i,s,o,u,a,f,l,c,h){var p=n.call(arguments);if(t[p])return t[p];var d=Math.cos(e),v=Math.sin(e),m=Math.cos(r),g=Math.sin(r),y=i*o*m-s*u*g+a,b=s*o*m+i*u*g+f,w=c+l*(-i*o*v-s*u*d),E=h+l*(-s*o*v+i*u*d),S=y+l*(i*o*g+s*u*m),x=b+l*(s*o*g-i*u*m);return t[p]=[w,E,S,x,y,b],t[p]}function s(e,t,n,r){var i=Math.atan2(t,e),s=Math.atan2(r,n);return s>=i?s-i:2*Math.PI-(i-s)}var e={},t={},n=Array.prototype.join;fabric.util.drawArc=function(e,t,n,i){var s=i[0],o=i[1],u=i[2],a=i[3],f=i[4],l=i[5],c=i[6],h=[[],[],[],[]],p=r(l-t,c-n,s,o,a,f,u);for(var d=0;d<p.length;d++)h[d][0]=p[d][0]+t,h[d][1]=p[d][1]+n,h[d][2]=p[d][2]+t,h[d][3]=p[d][3]+n,h[d][4]=p[d][4]+t,h[d][5]=p[d][5]+n,e.bezierCurveTo.apply(e,h[d])}}(),function(){function t(t,n){var r=e.call(arguments,2),i=[];for(var s=0,o=t.length;s<o;s++)i[s]=r.length?t[s][n].apply(t[s],r):t[s][n].call(t[s]);return i}function n(e,t){return i(e,t,function(e,t){return e>=t})}function r(e,t){return i(e,t,function(e,t){return e<t})}function i(e,t,n){if(!e||e.length===0)return;var r=e.length-1,i=t?e[r][t]:e[r];if(t)while(r--)n(e[r][t],i)&&(i=e[r][t]);else while(r--)n(e[r],i)&&(i=e[r]);return i}var e=Array.prototype.slice;Array.prototype.indexOf||(Array.prototype.indexOf=function(e){if(this===void 0||this===null)throw new TypeError;var t=Object(this),n=t.length>>>0;if(n===0)return-1;var r=0;arguments.length>0&&(r=Number(arguments[1]),r!==r?r=0:r!==0&&r!==Number.POSITIVE_INFINITY&&r!==Number.NEGATIVE_INFINITY&&(r=(r>0||-1)*Math.floor(Math.abs(r))));if(r>=n)return-1;var i=r>=0?r:Math.max(n-Math.abs(r),0);for(;i<n;i++)if(i in t&&t[i]===e)return i;return-1}),Array.prototype.forEach||(Array.prototype.forEach=function(e,t){for(var n=0,r=this.length>>>0;n<r;n++)n in this&&e.call(t,this[n],n,this)}),Array.prototype.map||(Array.prototype.map=function(e,t){var n=[];for(var r=0,i=this.length>>>0;r<i;r++)r in this&&(n[r]=e.call(t,this[r],r,this));return n}),Array.prototype.every||(Array.prototype.every=function(e,t){for(var n=0,r=this.length>>>0;n<r;n++)if(n in this&&!e.call(t,this[n],n,this))return!1;return!0}),Array.prototype.some||(Array.prototype.some=function(e,t){for(var n=0,r=this.length>>>0;n<r;n++)if(n in this&&e.call(t,this[n],n,this))return!0;return!1}),Array.prototype.filter||(Array.prototype.filter=function(e,t){var n=[],r;for(var i=0,s=this.length>>>0;i<s;i++)i in this&&(r=this[i],e.call(t,r,i,this)&&n.push(r));return n}),Array.prototype.reduce||(Array.prototype.reduce=function(e){var t=this.length>>>0,n=0,r;if(arguments.length>1)r=arguments[1];else do{if(n in this){r=this[n++];break}if(++n>=t)throw new TypeError}while(!0);for(;n<t;n++)n in this&&(r=e.call(null,r,this[n],n,this));return r}),fabric.util.array={invoke:t,min:r,max:n}}(),function(){function e(e,t){for(var n in t)e[n]=t[n];return e}function t(t){return e({},t)}fabric.util.object={extend:e,clone:t}}(),function(){function e(e){return e.replace(/-+(.)?/g,function(e,t){return t?t.toUpperCase():""})}function t(e,t){return e.charAt(0).toUpperCase()+(t?e.slice(1):e.slice(1).toLowerCase())}function n(e){return e.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&apos;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}String.prototype.trim||(String.prototype.trim=function(){return this.replace(/^[\s\xA0]+/,"").replace(/[\s\xA0]+$/,"")}),fabric.util.string={camelize:e,capitalize:t,escapeXml:n}}(),function(){var e=Array.prototype.slice,t=Function.prototype.apply,n=function(){};Function.prototype.bind||(Function.prototype.bind=function(r){var i=this,s=e.call(arguments,1),o;return s.length?o=function(){return t.call(i,this instanceof n?this:r,s.concat(e.call(arguments)))}:o=function(){return t.call(i,this instanceof n?this:r,arguments)},n.prototype=this.prototype,o.prototype=new n,o})}(),function(){function i(){}function s(t){var n=this.constructor.superclass.prototype[t];return arguments.length>1?n.apply(this,e.call(arguments,1)):n.call(this)}function o(){function u(){this.initialize.apply(this,arguments)}var n=null,o=e.call(arguments,0);typeof o[0]=="function"&&(n=o.shift()),u.superclass=n,u.subclasses=[],n&&(i.prototype=n.prototype,u.prototype=new i,n.subclasses.push(u));for(var a=0,f=o.length;a<f;a++)r(u,o[a],n);return u.prototype.initialize||(u.prototype.initialize=t),u.prototype.constructor=u,u.prototype.callSuper=s,u}var e=Array.prototype.slice,t=function(){},n=function(){for(var e in{toString:1})if(e==="toString")return!1;return!0}(),r=function(e,t,r){for(var i in t)i in e.prototype&&typeof e.prototype[i]=="function"&&(t[i]+"").indexOf("callSuper")>-1?e.prototype[i]=function(e){return function(){var n=this.constructor.superclass;this.constructor.superclass=r;var i=t[e].apply(this,arguments);this.constructor.superclass=n;if(e!=="initialize")return i}}(i):e.prototype[i]=t[i],n&&(t.toString!==Object.prototype.toString&&(e.prototype.toString=t.toString),t.valueOf!==Object.prototype.valueOf&&(e.prototype.valueOf=t.valueOf))};fabric.util.createClass=o}(),function(){function t(e){var t=Array.prototype.slice.call(arguments,1),n,r,i=t.length;for(r=0;r<i;r++){n=typeof e[t[r]];if(!/^(?:function|object|unknown)$/.test(n))return!1}return!0}function s(e,t){return{handler:t,wrappedHandler:o(e,t)}}function o(e,t){return function(r){t.call(n(e),r||fabric.window.event)}}function u(e,t){return function(n){if(c[e]&&c[e][t]){var r=c[e][t];for(var i=0,s=r.length;i<s;i++)r[i].call(this,n||fabric.window.event)}}}function d(t,n){t||(t=fabric.window.event);var r=t.target||(typeof t.srcElement!==e?t.srcElement:null),i=fabric.util.getScrollLeftTop(r,n);return{x:v(t)+i.left,y:m(t)+i.top}}function g(e,t,n){var r=e.type==="touchend"?"changedTouches":"touches";return e[r]&&e[r][0]?e[r][0][t]-(e[r][0][t]-e[r][0][n])||e[n]:e[n]}var e="unknown",n,r,i=function(){var e=0;return function(t){return t.__uniqueID||(t.__uniqueID="uniqueID__"+e++)}}();(function(){var e={};n=function(t){return e[t]},r=function(t,n){e[t]=n}})();var a=t(fabric.document.documentElement,"addEventListener","removeEventListener")&&t(fabric.window,"addEventListener","removeEventListener"),f=t(fabric.document.documentElement,"attachEvent","detachEvent")&&t(fabric.window,"attachEvent","detachEvent"),l={},c={},h,p;a?(h=function(e,t,n){e.addEventListener(t,n,!1)},p=function(e,t,n){e.removeEventListener(t,n,!1)}):f?(h=function(e,t,n){var o=i(e);r(o,e),l[o]||(l[o]={}),l[o][t]||(l[o][t]=[]);var u=s(o,n);l[o][t].push(u),e.attachEvent("on"+t,u.wrappedHandler)},p=function(e,t,n){var r=i(e),s;if(l[r]&&l[r][t])for(var o=0,u=l[r][t].length;o<u;o++)s=l[r][t][o],s&&s.handler===n&&(e.detachEvent("on"+t,s.wrappedHandler),l[r][t][o]=null)}):(h=function(e,t,n){var r=i(e);c[r]||(c[r]={});if(!c[r][t]){c[r][t]=[];var s=e["on"+t];s&&c[r][t].push(s),e["on"+t]=u(r,t)}c[r][t].push(n)},p=function(e,t,n){var r=i(e);if(c[r]&&c[r][t]){var s=c[r][t];for(var o=0,u=s.length;o<u;o++)s[o]===n&&s.splice(o,1)}}),fabric.util.addListener=h,fabric.util.removeListener=p;var v=function(t){return typeof t.clientX!==e?t.clientX:0},m=function(t){return typeof t.clientY!==e?t.clientY:0};fabric.isTouchSupported&&(v=function(e){return g(e,"pageX","clientX")},m=function(e){return g(e,"pageY","clientY")}),fabric.util.getPointer=d,fabric.util.object.extend(fabric.util,fabric.Observable)}(),function(){function e(e,t){var n=e.style;if(!n)return e;if(typeof t=="string")return e.style.cssText+=";"+t,t.indexOf("opacity")>-1?s(e,t.match(/opacity:\s*(\d?\.?\d*)/)[1]):e;for(var r in t)if(r==="opacity")s(e,t[r]);else{var i=r==="float"||r==="cssFloat"?typeof n.styleFloat=="undefined"?"cssFloat":"styleFloat":r;n[i]=t[r]}return e}var t=fabric.document.createElement("div"),n=typeof t.style.opacity=="string",r=typeof t.style.filter=="string",i=/alpha\s*\(\s*opacity\s*=\s*([^\)]+)\)/,s=function(e){return e};n?s=function(e,t){return e.style.opacity=t,e}:r&&(s=function(e,t){var n=e.style;return e.currentStyle&&!e.currentStyle.hasLayout&&(n.zoom=1),i.test(n.filter)?(t=t>=.9999?"":"alpha(opacity="+t*100+")",n.filter=n.filter.replace(i,t)):n.filter+=" alpha(opacity="+t*100+")",e}),fabric.util.setStyle=e}(),function(){function t(e){return typeof e=="string"?fabric.document.getElementById(e):e}function s(e,t){var n=fabric.document.createElement(e);for(var r in t)r==="class"?n.className=t[r]:r==="for"?n.htmlFor=t[r]:n.setAttribute(r,t[r]);return n}function o(e,t){e&&(" "+e.className+" ").indexOf(" "+t+" ")===-1&&(e.className+=(e.className?" ":"")+t)}function u(e,t,n){return typeof t=="string"&&(t=s(t,n)),e.parentNode&&e.parentNode.replaceChild(t,e),t.appendChild(e),t}function a(e,t){var n,r,i=0,s=0,o=fabric.document.documentElement,u=fabric.document.body||{scrollLeft:0,scrollTop:0};r=e;while(e&&e.parentNode&&!n)e=e.parentNode,e!==fabric.document&&fabric.util.getElementStyle(e,"position")==="fixed"&&(n=e),e!==fabric.document&&r!==t&&fabric.util.getElementStyle(e,"position")==="absolute"?(i=0,s=0):e===fabric.document?(i=u.scrollLeft||o.scrollLeft||0,s=u.scrollTop||o.scrollTop||0):(i+=e.scrollLeft||0,s+=e.scrollTop||0);return{left:i,top:s}}function f(e){var t,n=e&&e.ownerDocument,r={left:0,top:0},i={left:0,top:0},s,o={borderLeftWidth:"left",borderTopWidth:"top",paddingLeft:"left",paddingTop:"top"};if(!n)return{left:0,top:0};for(var u in o)i[o[u]]+=parseInt(l(e,u),10)||0;return t=n.documentElement,typeof e.getBoundingClientRect!="undefined"&&(r=e.getBoundingClientRect()),s=fabric.util.getScrollLeftTop(e,null),{left:r.left+s.left-(t.clientLeft||0)+i.left,top:r.top+s.top-(t.clientTop||0)+i.top}}var e=Array.prototype.slice,n,r=function(t){return e.call(t,0)};try{n=r(fabric.document.childNodes)instanceof Array}catch(i){}n||(r=function(e){var t=new Array(e.length),n=e.length;while(n--)t[n]=e[n];return t});var l;fabric.document.defaultView&&fabric.document.defaultView.getComputedStyle?l=function(e,t){return fabric.document.defaultView.getComputedStyle(e,null)[t]}:l=function(e,t){var n=e.style[t];return!n&&e.currentStyle&&(n=e.currentStyle[t]),n},function(){function n(e){return typeof e.onselectstart!="undefined"&&(e.onselectstart=fabric.util.falseFunction),t?e.style[t]="none":typeof e.unselectable=="string"&&(e.unselectable="on"),e}function r(e){return typeof e.onselectstart!="undefined"&&(e.onselectstart=null),t?e.style[t]="":typeof e.unselectable=="string"&&(e.unselectable=""),e}var e=fabric.document.documentElement.style,t="userSelect"in e?"userSelect":"MozUserSelect"in e?"MozUserSelect":"WebkitUserSelect"in e?"WebkitUserSelect":"KhtmlUserSelect"in e?"KhtmlUserSelect":"";fabric.util.makeElementUnselectable=n,fabric.util.makeElementSelectable=r}(),function(){function e(e,t){var n=fabric.document.getElementsByTagName("head")[0],r=fabric.document.createElement("script"),i=!0;r.onload=r.onreadystatechange=function(e){if(i){if(typeof this.readyState=="string"&&this.readyState!=="loaded"&&this.readyState!=="complete")return;i=!1,t(e||fabric.window.event),r=r.onload=r.onreadystatechange=null}},r.src=e,n.appendChild(r)}fabric.util.getScript=e}(),fabric.util.getById=t,fabric.util.toArray=r,fabric.util.makeElement=s,fabric.util.addClass=o,fabric.util.wrapElement=u,fabric.util.getScrollLeftTop=a,fabric.util.getElementOffset=f,fabric.util.getElementStyle=l}(),function(){function e(e,t){return e+(/\?/.test(e)?"&":"?")+t}function n(){}function r(r,i){i||(i={});var s=i.method?i.method.toUpperCase():"GET",o=i.onComplete||function(){},u=t(),a;return u.onreadystatechange=function(){u.readyState===4&&(o(u),u.onreadystatechange=n)},s==="GET"&&(a=null,typeof i.parameters=="string"&&(r=e(r,i.parameters))),u.open(s,r,!0),(s==="POST"||s==="PUT")&&u.setRequestHeader("Content-Type","application/x-www-form-urlencoded"),u.send(a),u}var t=function(){var e=[function(){return new ActiveXObject("Microsoft.XMLHTTP")},function(){return new ActiveXObject("Msxml2.XMLHTTP")},function(){return new ActiveXObject("Msxml2.XMLHTTP.3.0")},function(){return new XMLHttpRequest}];for(var t=e.length;t--;)try{var n=e[t]();if(n)return e[t]}catch(r){}}();fabric.util.request=r}(),fabric.log=function(){},fabric.warn=function(){},typeof console!="undefined"&&["log","warn"].forEach(function(e){typeof console[e]!="undefined"&&console[e].apply&&(fabric[e]=function(){return console[e].apply(console,arguments)})}),function(){function e(e){n(function(t){e||(e={});var r=t||+(new Date),i=e.duration||500,s=r+i,o,u=e.onChange||function(){},a=e.abort||function(){return!1},f=e.easing||function(e,t,n,r){return-n*Math.cos(e/r*(Math.PI/2))+n+t},l="startValue"in e?e.startValue:0,c="endValue"in e?e.endValue:100,h=e.byValue||c-l;e.onStart&&e.onStart(),function p(t){o=t||+(new Date);var c=o>s?i:o-r;if(a()){e.onComplete&&e.onComplete();return}u(f(c,l,h,i));if(o>s){e.onComplete&&e.onComplete();return}n(p)}(r)})}function n(){return t.apply(fabric.window,arguments)}var t=fabric.window.requestAnimationFrame||fabric.window.webkitRequestAnimationFrame||fabric.window.mozRequestAnimationFrame||fabric.window.oRequestAnimationFrame||fabric.window.msRequestAnimationFrame||function(e){fabric.window.setTimeout(e,1e3/60)};fabric.util.animate=e,fabric.util.requestAnimFrame=n}(),function(){function e(e,t,n,r){return e<Math.abs(t)?(e=t,r=n/4):r=n/(2*Math.PI)*Math.asin(t/e),{a:e,c:t,p:n,s:r}}function t(e,t,n){return e.a*Math.pow(2,10*(t-=1))*Math.sin((t*n-e.s)*2*Math.PI/e.p)}function n(e,t,n,r){return n*((e=e/r-1)*e*e+1)+t}function r(e,t,n,r){return e/=r/2,e<1?n/2*e*e*e+t:n/2*((e-=2)*e*e+2)+t}function i(e,t,n,r){return n*(e/=r)*e*e*e+t}function s(e,t,n,r){return-n*((e=e/r-1)*e*e*e-1)+t}function o(e,t,n,r){return e/=r/2,e<1?n/2*e*e*e*e+t:-n/2*((e-=2)*e*e*e-2)+t}function u(e,t,n,r){return n*(e/=r)*e*e*e*e+t}function a(e,t,n,r){return n*((e=e/r-1)*e*e*e*e+1)+t}function f(e,t,n,r){return e/=r/2,e<1?n/2*e*e*e*e*e+t:n/2*((e-=2)*e*e*e*e+2)+t}function l(e,t,n,r){return-n*Math.cos(e/r*(Math.PI/2))+n+t}function c(e,t,n,r){return n*Math.sin(e/r*(Math.PI/2))+t}function h(e,t,n,r){return-n/2*(Math.cos(Math.PI*e/r)-1)+t}function p(e,t,n,r){return e===0?t:n*Math.pow(2,10*(e/r-1))+t}function d(e,t,n,r){return e===r?t+n:n*(-Math.pow(2,-10*e/r)+1)+t}function v(e,t,n,r){return e===0?t:e===r?t+n:(e/=r/2,e<1?n/2*Math.pow(2,10*(e-1))+t:n/2*(-Math.pow(2,-10*--e)+2)+t)}function m(e,t,n,r){return-n*(Math.sqrt(1-(e/=r)*e)-1)+t}function g(e,t,n,r){return n*Math.sqrt(1-(e=e/r-1)*e)+t}function y(e,t,n,r){return e/=r/2,e<1?-n/2*(Math.sqrt(1-e*e)-1)+t:n/2*(Math.sqrt(1-(e-=2)*e)+1)+t}function b(n,r,i,s){var o=1.70158,u=0,a=i;if(n===0)return r;n/=s;if(n===1)return r+i;u||(u=s*.3);var f=e(a,i,u,o);return-t(f,n,s)+r}function w(t,n,r,i){var s=1.70158,o=0,u=r;if(t===0)return n;t/=i;if(t===1)return n+r;o||(o=i*.3);var a=e(u,r,o,s);return a.a*Math.pow(2,-10*t)*Math.sin((t*i-a.s)*2*Math.PI/a.p)+a.c+n}function E(n,r,i,s){var o=1.70158,u=0,a=i;if(n===0)return r;n/=s/2;if(n===2)return r+i;u||(u=s*.3*1.5);var f=e(a,i,u,o);return n<1?-0.5*t(f,n,s)+r:f.a*Math.pow(2,-10*(n-=1))*Math.sin((n*s-f.s)*2*Math.PI/f.p)*.5+f.c+r}function S(e,t,n,r,i){return i===undefined&&(i=1.70158),n*(e/=r)*e*((i+1)*e-i)+t}function x(e,t,n,r,i){return i===undefined&&(i=1.70158),n*((e=e/r-1)*e*((i+1)*e+i)+1)+t}function T(e,t,n,r,i){return i===undefined&&(i=1.70158),e/=r/2,e<1?n/2*e*e*(((i*=1.525)+1)*e-i)+t:n/2*((e-=2)*e*(((i*=1.525)+1)*e+i)+2)+t}function N(e,t,n,r){return n-C(r-e,0,n,r)+t}function C(e,t,n,r){return(e/=r)<1/2.75?n*7.5625*e*e+t:e<2/2.75?n*(7.5625*(e-=1.5/2.75)*e+.75)+t:e<2.5/2.75?n*(7.5625*(e-=2.25/2.75)*e+.9375)+t:n*(7.5625*(e-=2.625/2.75)*e+.984375)+t}function k(e,t,n,r){return e<r/2?N(e*2,0,n,r)*.5+t:C(e*2-r,0,n,r)*.5+n*.5+t}fabric.util.ease={easeInQuad:function(e,t,n,r){return n*(e/=r)*e+t},easeOutQuad:function(e,t,n,r){return-n*(e/=r)*(e-2)+t},easeInOutQuad:function(e,t,n,r){return e/=r/2,e<1?n/2*e*e+t:-n/2*(--e*(e-2)-1)+t},easeInCubic:function(e,t,n,r){return n*(e/=r)*e*e+t},easeOutCubic:n,easeInOutCubic:r,easeInQuart:i,easeOutQuart:s,easeInOutQuart:o,easeInQuint:u,easeOutQuint:a,easeInOutQuint:f,easeInSine:l,easeOutSine:c,easeInOutSine:h,easeInExpo:p,easeOutExpo:d,easeInOutExpo:v,easeInCirc:m,easeOutCirc:g,easeInOutCirc:y,easeInElastic:b,easeOutElastic:w,easeInOutElastic:E,easeInBack:S,easeOutBack:x,easeInOutBack:T,easeInBounce:N,easeOutBounce:C,easeInOutBounce:k}}(),function(e){"use strict";function l(e){return e in a?a[e]:e}function c(e,n,r){var i=Object.prototype.toString.call(n)==="[object Array]",s;return e!=="fill"&&e!=="stroke"||n!=="none"?e==="fillRule"?n=n==="evenodd"?"destination-over":n:e==="strokeDashArray"?n=n.replace(/,/g," ").split(/\s+/).map(function(e){return parseInt(e)}):e==="transformMatrix"?r&&r.transformMatrix?n=u(r.transformMatrix,t.parseTransformAttribute(n)):n=t.parseTransformAttribute(n):e==="visible"?(n=n==="none"||n==="hidden"?!1:!0,r&&r.visible===!1&&(n=!1)):e==="originX"?n=n==="start"?"left":n==="end"?"right":"center":s=i?n.map(o):o(n):n="",!i&&isNaN(s)?n:s}function h(e){for(var n in f){if(!e[n]||typeof e[f[n]]=="undefined")continue;if(e[n].indexOf("url(")===0)continue;var r=new t.Color(e[n]);e[n]=r.setAlpha(s(r.getAlpha()*e[f[n]],2)).toRgba()}return e}function p(e,t){var n=e.match(/(normal|italic)?\s*(normal|small-caps)?\s*(normal|bold|bolder|lighter|100|200|300|400|500|600|700|800|900)?\s*(\d+)px(?:\/(normal|[\d\.]+))?\s+(.*)/);if(!n)return;var r=n[1],i=n[3],s=n[4],o=n[5],u=n[6];r&&(t.fontStyle=r),i&&(t.fontWeight=isNaN(parseFloat(i))?i:parseFloat(i)),s&&(t.fontSize=parseFloat(s)),u&&(t.fontFamily=u),o&&(t.lineHeight=o==="normal"?1:o)}function d(e,t){var n,r;e.replace(/;$/,"").split(";").forEach(function(e){var i=e.split(":");n=l(i[0].trim().toLowerCase()),r=c(n,i[1].trim()),n==="font"?p(r,t):t[n]=r})}function v(e,t){var n,r;for(var i in e){if(typeof e[i]=="undefined")continue;n=l(i.toLowerCase()),r=c(n,e[i]),n==="font"?p(r,t):t[n]=r}}function m(e){var n={};for(var r in t.cssRules)if(g(e,r.split(" ")))for(var i in t.cssRules[r])n[i]=t.cssRules[r][i];return n}function g(e,t){var n,r=!0;return n=b(e,t.pop()),n&&t.length&&(r=y(e,t)),n&&r&&t.length===0}function y(e,t){var n,r=!0;while(e.parentNode&&e.parentNode.nodeType===1&&t.length)r&&(n=t.pop()),e=e.parentNode,r=b(e,n);return t.length===0}function b(e,t){var n=e.nodeName,r=e.getAttribute("class"),i=e.getAttribute("id"),s;s=new RegExp("^"+n,"i"),t=t.replace(s,""),i&&t.length&&(s=new RegExp("#"+i+"(?![a-zA-Z\\-]+)","i"),t=t.replace(s,""));if(r&&t.length){r=r.split(" ");for(var o=r.length;o--;)s=new RegExp("\\."+r[o]+"(?![a-zA-Z\\-]+)","i"),t=t.replace(s,"")}return t.length===0}function w(e){var t=e.getElementsByTagName("use");while(t.length){var n=t[0],r=n.getAttribute("xlink:href").substr(1),i=n.getAttribute("x")||0,s=n.getAttribute("y")||0,o=e.getElementById(r).cloneNode(!0),u=(n.getAttribute("transform")||"")+" translate("+i+", "+s+")",a;for(var f=0,l=n.attributes,c=l.length;f<c;f++){var h=l.item(f);if(h.nodeName==="x"||h.nodeName==="y"||h.nodeName==="xlink:href")continue;h.nodeName==="transform"?u=u+" "+h.nodeValue:o.setAttribute(h.nodeName,h.nodeValue)}o.setAttribute("transform",u),o.removeAttribute("id"),a=n.parentNode,a.replaceChild(o,n)}}function E(e,t){t[3]=t[0]=t[0]>t[3]?t[3]:t[0];if(t[0]===1&&t[3]===1&&t[4]===0&&t[5]===0)return;var n=e.ownerDocument.createElement("g");while(e.firstChild!=null)n.appendChild(e.firstChild);n.setAttribute("transform","matrix("+t[0]+" "+t[1]+" "+t[2]+" "+t[3]+" "+t[4]+" "+t[5]+")"),e.appendChild(n)}function x(e){var n=e.objects,i=e.options;return n=n.map(function(e){return t[r(e.type)].fromObject(e)}),{objects:n,options:i}}function T(e,t,n){t[n]&&t[n].toSVG&&e.push('<pattern x="0" y="0" id="',n,'Pattern" ','width="',t[n].source.width,'" height="',t[n].source.height,'" patternUnits="userSpaceOnUse">','<image x="0" y="0" ','width="',t[n].source.width,'" height="',t[n].source.height,'" xlink:href="',t[n].source.src,'"></image></pattern>')}var t=e.fabric||(e.fabric={}),n=t.util.object.extend,r=t.util.string.capitalize,i=t.util.object.clone,s=t.util.toFixed,o=t.util.parseUnit,u=t.util.multiplyTransformMatrices,a={cx:"left",x:"left",r:"radius",cy:"top",y:"top",display:"visible",visibility:"visible",transform:"transformMatrix","fill-opacity":"fillOpacity","fill-rule":"fillRule","font-family":"fontFamily","font-size":"fontSize","font-style":"fontStyle","font-weight":"fontWeight","stroke-dasharray":"strokeDashArray","stroke-linecap":"strokeLineCap","stroke-linejoin":"strokeLineJoin","stroke-miterlimit":"strokeMiterLimit","stroke-opacity":"strokeOpacity","stroke-width":"strokeWidth","text-decoration":"textDecoration","text-anchor":"originX"},f={stroke:"strokeOpacity",fill:"fillOpacity"};t.parseTransformAttribute=function(){function e(e,t){var n=t[0];e[0]=Math.cos(n),e[1]=Math.sin(n),e[2]=-Math.sin(n),e[3]=Math.cos(n)}function n(e,t){var n=t[0],r=t.length===2?t[1]:t[0];e[0]=n,e[3]=r}function r(e,t){e[2]=t[0]}function i(e,t){e[1]=t[0]}function s(e,t){e[4]=t[0],t.length===2&&(e[5]=t[1])}var o=[1,0,0,1,0,0],u="(?:[-+]?(?:\\d+|\\d*\\.\\d+)(?:e[-+]?\\d+)?)",a="(?:\\s+,?\\s*|,\\s*)",f="(?:(skewX)\\s*\\(\\s*("+u+")\\s*\\))",l="(?:(skewY)\\s*\\(\\s*("+u+")\\s*\\))",c="(?:(rotate)\\s*\\(\\s*("+u+")(?:"+a+"("+u+")"+a+"("+u+"))?\\s*\\))",h="(?:(scale)\\s*\\(\\s*("+u+")(?:"+a+"("+u+"))?\\s*\\))",p="(?:(translate)\\s*\\(\\s*("+u+")(?:"+a+"("+u+"))?\\s*\\))",d="(?:(matrix)\\s*\\(\\s*("+u+")"+a+"("+u+")"+a+"("+u+")"+a+"("+u+")"+a+"("+u+")"+a+"("+u+")"+"\\s*\\))",v="(?:"+d+"|"+p+"|"+h+"|"+c+"|"+f+"|"+l+")",m="(?:"+v+"(?:"+a+v+")*"+")",g="^\\s*(?:"+m+"?)\\s*$",y=new RegExp(g),b=new RegExp(v,"g");return function(u){var a=o.concat(),f=[];if(!u||u&&!y.test(u))return a;u.replace(b,function(u){var l=(new RegExp(v)).exec(u).filter(function(e){return e!==""&&e!=null}),c=l[1],h=l.slice(2).map(parseFloat);switch(c){case"translate":s(a,h);break;case"rotate":h[0]=t.util.degreesToRadians(h[0]),e(a,h);break;case"scale":n(a,h);break;case"skewX":r(a,h);break;case"skewY":i(a,h);break;case"matrix":a=h}f.push(a.concat()),a=o.concat()});var l=f[0];while(f.length>1)f.shift(),l=t.util.multiplyTransformMatrices(l,f[0]);return l}}(),t.parseSVGDocument=function(){function s(e,t){while(e&&(e=e.parentNode))if(t.test(e.nodeName))return!0;return!1}var e=/^(path|circle|polygon|polyline|ellipse|rect|line|image|text)$/,n="(?:[-+]?(?:\\d+|\\d*\\.\\d+)(?:e[-+]?\\d+)?)",r=new RegExp("^\\s*("+n+"+)\\s*,?"+"\\s*("+n+"+)\\s*,?"+"\\s*("+n+"+)\\s*,?"+"\\s*("+n+"+)\\s*"+"$");return function(n,u,a){if(!n)return;var f=new Date;w(n);var l=n.getAttribute("viewBox"),c=o(n.getAttribute("width")),h=o(n.getAttribute("height")),p,d;if(l&&(l=l.match(r))){var v=parseFloat(l[1]),m=parseFloat(l[2]),g=1,y=1;p=parseFloat(l[3]),d=parseFloat(l[4]),c&&c!==p&&(g=c/p),h&&h!==d&&(y=h/d),E(n,[g,0,0,y,g*-v,y*-m])}var b=t.util.toArray(n.getElementsByTagName("*"));if(b.length===0&&t.isLikelyNode){b=n.selectNodes('//*[name(.)!="svg"]');var S=[];for(var x=0,T=b.length;x<T;x++)S[x]=b[x];b=S}var N=b.filter(function(t){return e.test(t.tagName)&&!s(t,/^(?:pattern|defs)$/)});if(!N||N&&!N.length){u&&u([],{});return}var C={width:c?c:p,height:h?h:d,widthAttr:c,heightAttr:h};t.gradientDefs=t.getGradientDefs(n),t.cssRules=t.getCSSRules(n),t.parseElements(N,function(e){t.documentParsingTime=new Date-f,u&&u(e,C)},i(C),a)}}();var S={has:function(e,t){t(!1)},get:function(){},set:function(){}};n(t,{getGradientDefs:function(e){var t=e.getElementsByTagName("linearGradient"),n=e.getElementsByTagName("radialGradient"),r,i,s=0,o,u,a=[],f={},l={};a.length=t.length+n.length,i=t.length;while(i--)a[s++]=t[i];i=n.length;while(i--)a[s++]=n[i];while(s--)r=a[s],u=r.getAttribute("xlink:href"),o=r.getAttribute("id"),u&&(l[o]=u.substr(1)),f[o]=r;for(o in l){var c=f[l[o]].cloneNode(!0);r=f[o];while(c.firstChild)r.appendChild(c.firstChild)}return f},parseAttributes:function(e,r){if(!e)return;var i,s={};e.parentNode&&/^symbol|[g|a]$/i.test(e.parentNode.nodeName)&&(s=t.parseAttributes(e.parentNode,r));var o=r.reduce(function(t,n){return i=e.getAttribute(n),i&&(n=l(n),i=c(n,i,s),t[n]=i),t},{});return o=n(o,n(m(e),t.parseStyleAttribute(e))),h(n(s,o))},parseElements:function(e,n,r,i){(new t.ElementsParser(e,n,r,i)).parse()},parseStyleAttribute:function(e){var t={},n=e.getAttribute("style");return n?(typeof n=="string"?d(n,t):v(n,t),t):t},parsePointsAttribute:function(e){if(!e)return null;e=e.replace(/,/g," ").trim(),e=e.split(/\s+/);var t=[],n,r;n=0,r=e.length;for(;n<r;n+=2)t.push({x:parseFloat(e[n]),y:parseFloat(e[n+1])});return t},getCSSRules:function(e){var n=e.getElementsByTagName("style"),r={},i;for(var s=0,o=n.length;s<o;s++){var u=n[0].textContent;u=u.replace(/\/\*[\s\S]*?\*\//g,""),i=u.match(/[^{]*\{[\s\S]*?\}/g),i=i.map(function(e){return e.trim()}),i.forEach(function(e){var n=e.match(/([\s\S]*?)\s*\{([^}]*)\}/),i={},s=n[2].trim(),o=s.replace(/;$/,"").split(/\s*;\s*/);for(var u=0,a=o.length;u<a;u++){var f=o[u].split(/\s*:\s*/),h=l(f[0]),p=c(h,f[1],f[0]);i[h]=p}e=n[1],e.split(",").forEach(function(e){r[e.trim()]=t.util.object.clone(i)})})}return r},loadSVGFromURL:function(e,n,r){function i(i){var s=i.responseXML;s&&!s.documentElement&&t.window.ActiveXObject&&i.responseText&&(s=new ActiveXObject("Microsoft.XMLDOM"),s.async="false",s.loadXML(i.responseText.replace(/<!DOCTYPE[\s\S]*?(\[[\s\S]*\])*?>/i,"")));if(!s||!s.documentElement)return;t.parseSVGDocument(s.documentElement,function(r,i){S.set(e,{objects:t.util.array.invoke(r,"toObject"),options:i}),n(r,i)},r)}e=e.replace(/^\n\s*/,"").trim(),S.has(e,function(r){r?S.get(e,function(e){var t=x(e);n(t.objects,t.options)}):new t.util.request(e,{method
:"get",onComplete:i})})},loadSVGFromString:function(e,n,r){e=e.trim();var i;if(typeof DOMParser!="undefined"){var s=new DOMParser;s&&s.parseFromString&&(i=s.parseFromString(e,"text/xml"))}else t.window.ActiveXObject&&(i=new ActiveXObject("Microsoft.XMLDOM"),i.async="false",i.loadXML(e.replace(/<!DOCTYPE[\s\S]*?(\[[\s\S]*\])*?>/i,"")));t.parseSVGDocument(i.documentElement,function(e,t){n(e,t)},r)},createSVGFontFacesMarkup:function(e){var t="";for(var n=0,r=e.length;n<r;n++){if(e[n].type!=="text"||!e[n].path)continue;t+=["@font-face {","font-family: ",e[n].fontFamily,"; ","src: url('",e[n].path,"')","}"].join("")}return t&&(t=['<style type="text/css">',"<![CDATA[",t,"]]>","</style>"].join("")),t},createSVGRefElementsMarkup:function(e){var t=[];return T(t,e,"backgroundColor"),T(t,e,"overlayColor"),t.join("")}})}(typeof exports!="undefined"?exports:this),fabric.ElementsParser=function(e,t,n,r){this.elements=e,this.callback=t,this.options=n,this.reviver=r},fabric.ElementsParser.prototype.parse=function(){this.instances=new Array(this.elements.length),this.numElements=this.elements.length,this.createObjects()},fabric.ElementsParser.prototype.createObjects=function(){for(var e=0,t=this.elements.length;e<t;e++)(function(e,t){setTimeout(function(){e.createObject(e.elements[t],t)},0)})(this,e)},fabric.ElementsParser.prototype.createObject=function(e,t){var n=fabric[fabric.util.string.capitalize(e.tagName)];if(n&&n.fromElement)try{this._createObject(n,e,t)}catch(r){fabric.log(r)}else this.checkIfDone()},fabric.ElementsParser.prototype._createObject=function(e,t,n){if(e.async)e.fromElement(t,this.createCallback(n,t),this.options);else{var r=e.fromElement(t,this.options);this.resolveGradient(r,"fill"),this.resolveGradient(r,"stroke"),this.reviver&&this.reviver(t,r),this.instances[n]=r,this.checkIfDone()}},fabric.ElementsParser.prototype.createCallback=function(e,t){var n=this;return function(r){n.resolveGradient(r,"fill"),n.resolveGradient(r,"stroke"),n.reviver&&n.reviver(t,r),n.instances[e]=r,n.checkIfDone()}},fabric.ElementsParser.prototype.resolveGradient=function(e,t){var n=e.get(t);if(!/^url\(/.test(n))return;var r=n.slice(5,n.length-1);fabric.gradientDefs[r]&&e.set(t,fabric.Gradient.fromElement(fabric.gradientDefs[r],e))},fabric.ElementsParser.prototype.checkIfDone=function(){--this.numElements===0&&(this.instances=this.instances.filter(function(e){return e!=null}),this.callback(this.instances))},function(e){"use strict";function n(e,t){this.x=e,this.y=t}var t=e.fabric||(e.fabric={});if(t.Point){t.warn("fabric.Point is already defined");return}t.Point=n,n.prototype={constructor:n,add:function(e){return new n(this.x+e.x,this.y+e.y)},addEquals:function(e){return this.x+=e.x,this.y+=e.y,this},scalarAdd:function(e){return new n(this.x+e,this.y+e)},scalarAddEquals:function(e){return this.x+=e,this.y+=e,this},subtract:function(e){return new n(this.x-e.x,this.y-e.y)},subtractEquals:function(e){return this.x-=e.x,this.y-=e.y,this},scalarSubtract:function(e){return new n(this.x-e,this.y-e)},scalarSubtractEquals:function(e){return this.x-=e,this.y-=e,this},multiply:function(e){return new n(this.x*e,this.y*e)},multiplyEquals:function(e){return this.x*=e,this.y*=e,this},divide:function(e){return new n(this.x/e,this.y/e)},divideEquals:function(e){return this.x/=e,this.y/=e,this},eq:function(e){return this.x===e.x&&this.y===e.y},lt:function(e){return this.x<e.x&&this.y<e.y},lte:function(e){return this.x<=e.x&&this.y<=e.y},gt:function(e){return this.x>e.x&&this.y>e.y},gte:function(e){return this.x>=e.x&&this.y>=e.y},lerp:function(e,t){return new n(this.x+(e.x-this.x)*t,this.y+(e.y-this.y)*t)},distanceFrom:function(e){var t=this.x-e.x,n=this.y-e.y;return Math.sqrt(t*t+n*n)},midPointFrom:function(e){return new n(this.x+(e.x-this.x)/2,this.y+(e.y-this.y)/2)},min:function(e){return new n(Math.min(this.x,e.x),Math.min(this.y,e.y))},max:function(e){return new n(Math.max(this.x,e.x),Math.max(this.y,e.y))},toString:function(){return this.x+","+this.y},setXY:function(e,t){this.x=e,this.y=t},setFromPoint:function(e){this.x=e.x,this.y=e.y},swap:function(e){var t=this.x,n=this.y;this.x=e.x,this.y=e.y,e.x=t,e.y=n}}}(typeof exports!="undefined"?exports:this),function(e){"use strict";function n(e){this.status=e,this.points=[]}var t=e.fabric||(e.fabric={});if(t.Intersection){t.warn("fabric.Intersection is already defined");return}t.Intersection=n,t.Intersection.prototype={appendPoint:function(e){this.points.push(e)},appendPoints:function(e){this.points=this.points.concat(e)}},t.Intersection.intersectLineLine=function(e,r,i,s){var o,u=(s.x-i.x)*(e.y-i.y)-(s.y-i.y)*(e.x-i.x),a=(r.x-e.x)*(e.y-i.y)-(r.y-e.y)*(e.x-i.x),f=(s.y-i.y)*(r.x-e.x)-(s.x-i.x)*(r.y-e.y);if(f!==0){var l=u/f,c=a/f;0<=l&&l<=1&&0<=c&&c<=1?(o=new n("Intersection"),o.points.push(new t.Point(e.x+l*(r.x-e.x),e.y+l*(r.y-e.y)))):o=new n}else u===0||a===0?o=new n("Coincident"):o=new n("Parallel");return o},t.Intersection.intersectLinePolygon=function(e,t,r){var i=new n,s=r.length;for(var o=0;o<s;o++){var u=r[o],a=r[(o+1)%s],f=n.intersectLineLine(e,t,u,a);i.appendPoints(f.points)}return i.points.length>0&&(i.status="Intersection"),i},t.Intersection.intersectPolygonPolygon=function(e,t){var r=new n,i=e.length;for(var s=0;s<i;s++){var o=e[s],u=e[(s+1)%i],a=n.intersectLinePolygon(o,u,t);r.appendPoints(a.points)}return r.points.length>0&&(r.status="Intersection"),r},t.Intersection.intersectPolygonRectangle=function(e,r,i){var s=r.min(i),o=r.max(i),u=new t.Point(o.x,s.y),a=new t.Point(s.x,o.y),f=n.intersectLinePolygon(s,u,e),l=n.intersectLinePolygon(u,o,e),c=n.intersectLinePolygon(o,a,e),h=n.intersectLinePolygon(a,s,e),p=new n;return p.appendPoints(f.points),p.appendPoints(l.points),p.appendPoints(c.points),p.appendPoints(h.points),p.points.length>0&&(p.status="Intersection"),p}}(typeof exports!="undefined"?exports:this),function(e){"use strict";function n(e){e?this._tryParsingColor(e):this.setSource([0,0,0,1])}function r(e,t,n){return n<0&&(n+=1),n>1&&(n-=1),n<1/6?e+(t-e)*6*n:n<.5?t:n<2/3?e+(t-e)*(2/3-n)*6:e}var t=e.fabric||(e.fabric={});if(t.Color){t.warn("fabric.Color is already defined.");return}t.Color=n,t.Color.prototype={_tryParsingColor:function(e){var t;e in n.colorNameMap&&(e=n.colorNameMap[e]);if(e==="transparent"){this.setSource([255,255,255,0]);return}t=n.sourceFromHex(e),t||(t=n.sourceFromRgb(e)),t||(t=n.sourceFromHsl(e)),t&&this.setSource(t)},_rgbToHsl:function(e,n,r){e/=255,n/=255,r/=255;var i,s,o,u=t.util.array.max([e,n,r]),a=t.util.array.min([e,n,r]);o=(u+a)/2;if(u===a)i=s=0;else{var f=u-a;s=o>.5?f/(2-u-a):f/(u+a);switch(u){case e:i=(n-r)/f+(n<r?6:0);break;case n:i=(r-e)/f+2;break;case r:i=(e-n)/f+4}i/=6}return[Math.round(i*360),Math.round(s*100),Math.round(o*100)]},getSource:function(){return this._source},setSource:function(e){this._source=e},toRgb:function(){var e=this.getSource();return"rgb("+e[0]+","+e[1]+","+e[2]+")"},toRgba:function(){var e=this.getSource();return"rgba("+e[0]+","+e[1]+","+e[2]+","+e[3]+")"},toHsl:function(){var e=this.getSource(),t=this._rgbToHsl(e[0],e[1],e[2]);return"hsl("+t[0]+","+t[1]+"%,"+t[2]+"%)"},toHsla:function(){var e=this.getSource(),t=this._rgbToHsl(e[0],e[1],e[2]);return"hsla("+t[0]+","+t[1]+"%,"+t[2]+"%,"+e[3]+")"},toHex:function(){var e=this.getSource(),t,n,r;return t=e[0].toString(16),t=t.length===1?"0"+t:t,n=e[1].toString(16),n=n.length===1?"0"+n:n,r=e[2].toString(16),r=r.length===1?"0"+r:r,t.toUpperCase()+n.toUpperCase()+r.toUpperCase()},getAlpha:function(){return this.getSource()[3]},setAlpha:function(e){var t=this.getSource();return t[3]=e,this.setSource(t),this},toGrayscale:function(){var e=this.getSource(),t=parseInt((e[0]*.3+e[1]*.59+e[2]*.11).toFixed(0),10),n=e[3];return this.setSource([t,t,t,n]),this},toBlackWhite:function(e){var t=this.getSource(),n=(t[0]*.3+t[1]*.59+t[2]*.11).toFixed(0),r=t[3];return e=e||127,n=Number(n)<Number(e)?0:255,this.setSource([n,n,n,r]),this},overlayWith:function(e){e instanceof n||(e=new n(e));var t=[],r=this.getAlpha(),i=.5,s=this.getSource(),o=e.getSource();for(var u=0;u<3;u++)t.push(Math.round(s[u]*(1-i)+o[u]*i));return t[3]=r,this.setSource(t),this}},t.Color.reRGBa=/^rgba?\(\s*(\d{1,3}(?:\.\d+)?\%?)\s*,\s*(\d{1,3}(?:\.\d+)?\%?)\s*,\s*(\d{1,3}(?:\.\d+)?\%?)\s*(?:\s*,\s*(\d+(?:\.\d+)?)\s*)?\)$/,t.Color.reHSLa=/^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3}\%)\s*,\s*(\d{1,3}\%)\s*(?:\s*,\s*(\d+(?:\.\d+)?)\s*)?\)$/,t.Color.reHex=/^#?([0-9a-f]{6}|[0-9a-f]{3})$/i,t.Color.colorNameMap={aqua:"#00FFFF",black:"#000000",blue:"#0000FF",fuchsia:"#FF00FF",gray:"#808080",green:"#008000",lime:"#00FF00",maroon:"#800000",navy:"#000080",olive:"#808000",orange:"#FFA500",purple:"#800080",red:"#FF0000",silver:"#C0C0C0",teal:"#008080",white:"#FFFFFF",yellow:"#FFFF00"},t.Color.fromRgb=function(e){return n.fromSource(n.sourceFromRgb(e))},t.Color.sourceFromRgb=function(e){var t=e.match(n.reRGBa);if(t){var r=parseInt(t[1],10)/(/%$/.test(t[1])?100:1)*(/%$/.test(t[1])?255:1),i=parseInt(t[2],10)/(/%$/.test(t[2])?100:1)*(/%$/.test(t[2])?255:1),s=parseInt(t[3],10)/(/%$/.test(t[3])?100:1)*(/%$/.test(t[3])?255:1);return[parseInt(r,10),parseInt(i,10),parseInt(s,10),t[4]?parseFloat(t[4]):1]}},t.Color.fromRgba=n.fromRgb,t.Color.fromHsl=function(e){return n.fromSource(n.sourceFromHsl(e))},t.Color.sourceFromHsl=function(e){var t=e.match(n.reHSLa);if(!t)return;var i=(parseFloat(t[1])%360+360)%360/360,s=parseFloat(t[2])/(/%$/.test(t[2])?100:1),o=parseFloat(t[3])/(/%$/.test(t[3])?100:1),u,a,f;if(s===0)u=a=f=o;else{var l=o<=.5?o*(s+1):o+s-o*s,c=o*2-l;u=r(c,l,i+1/3),a=r(c,l,i),f=r(c,l,i-1/3)}return[Math.round(u*255),Math.round(a*255),Math.round(f*255),t[4]?parseFloat(t[4]):1]},t.Color.fromHsla=n.fromHsl,t.Color.fromHex=function(e){return n.fromSource(n.sourceFromHex(e))},t.Color.sourceFromHex=function(e){if(e.match(n.reHex)){var t=e.slice(e.indexOf("#")+1),r=t.length===3,i=r?t.charAt(0)+t.charAt(0):t.substring(0,2),s=r?t.charAt(1)+t.charAt(1):t.substring(2,4),o=r?t.charAt(2)+t.charAt(2):t.substring(4,6);return[parseInt(i,16),parseInt(s,16),parseInt(o,16),1]}},t.Color.fromSource=function(e){var t=new n;return t.setSource(e),t}}(typeof exports!="undefined"?exports:this),function(){function e(e){var t=e.getAttribute("style"),n=e.getAttribute("offset"),r,i,s;n=parseFloat(n)/(/%$/.test(n)?100:1);if(t){var o=t.split(/\s*;\s*/);o[o.length-1]===""&&o.pop();for(var u=o.length;u--;){var a=o[u].split(/\s*:\s*/),f=a[0].trim(),l=a[1].trim();f==="stop-color"?r=l:f==="stop-opacity"&&(s=l)}}return r||(r=e.getAttribute("stop-color")||"rgb(0,0,0)"),s||(s=e.getAttribute("stop-opacity")),r=new fabric.Color(r),i=r.getAlpha(),s=isNaN(parseFloat(s))?1:parseFloat(s),s*=i,{offset:n,color:r.toRgb(),opacity:s}}function t(e){return{x1:e.getAttribute("x1")||0,y1:e.getAttribute("y1")||0,x2:e.getAttribute("x2")||"100%",y2:e.getAttribute("y2")||0}}function n(e){return{x1:e.getAttribute("fx")||e.getAttribute("cx")||"50%",y1:e.getAttribute("fy")||e.getAttribute("cy")||"50%",r1:0,x2:e.getAttribute("cx")||"50%",y2:e.getAttribute("cy")||"50%",r2:e.getAttribute("r")||"50%"}}function r(e,t){for(var n in t)if(typeof t[n]=="string"&&/^\d+%$/.test(t[n])){var r=parseFloat(t[n],10);if(n==="x1"||n==="x2"||n==="r2")t[n]=fabric.util.toFixed(e.width*r/100,2)+e.left;else if(n==="y1"||n==="y2")t[n]=fabric.util.toFixed(e.height*r/100,2)+e.top}}function i(e,t){for(var n in t)if(n==="x1"||n==="x2"||n==="r2")t[n]=fabric.util.toFixed((t[n]-e.fill.origX)/e.width*100,2)+"%";else if(n==="y1"||n==="y2")t[n]=fabric.util.toFixed((t[n]-e.fill.origY)/e.height*100,2)+"%"}fabric.Gradient=fabric.util.createClass({origX:0,origY:0,initialize:function(e){e||(e={});var t={};this.id=fabric.Object.__uid++,this.type=e.type||"linear",t={x1:e.coords.x1||0,y1:e.coords.y1||0,x2:e.coords.x2||0,y2:e.coords.y2||0},this.type==="radial"&&(t.r1=e.coords.r1||0,t.r2=e.coords.r2||0),this.coords=t,this.gradientUnits=e.gradientUnits||"objectBoundingBox",this.colorStops=e.colorStops.slice(),e.gradientTransform&&(this.gradientTransform=e.gradientTransform),this.origX=e.left||this.origX,this.origY=e.top||this.origY},addColorStop:function(e){for(var t in e){var n=new fabric.Color(e[t]);this.colorStops.push({offset:t,color:n.toRgb(),opacity:n.getAlpha()})}return this},toObject:function(){return{type:this.type,coords:this.coords,gradientUnits:this.gradientUnits,colorStops:this.colorStops}},toSVG:function(e,t){var n=fabric.util.object.clone(this.coords),r,s;this.colorStops.sort(function(e,t){return e.offset-t.offset}),t&&this.gradientUnits==="userSpaceOnUse"?(n.x1+=e.width/2,n.y1+=e.height/2,n.x2+=e.width/2,n.y2+=e.height/2):this.gradientUnits==="objectBoundingBox"&&i(e,n),s='id="SVGID_'+this.id+'" gradientUnits="'+this.gradientUnits+'"',this.gradientTransform&&(s+=' gradientTransform="matrix('+this.gradientTransform.join(" ")+')" '),this.type==="linear"?r=["<linearGradient ",s,' x1="',n.x1,'" y1="',n.y1,'" x2="',n.x2,'" y2="',n.y2,'">\n']:this.type==="radial"&&(r=["<radialGradient ",s,' cx="',n.x2,'" cy="',n.y2,'" r="',n.r2,'" fx="',n.x1,'" fy="',n.y1,'">\n']);for(var o=0;o<this.colorStops.length;o++)r.push("<stop ",'offset="',this.colorStops[o].offset*100+"%",'" style="stop-color:',this.colorStops[o].color,this.colorStops[o].opacity!=null?";stop-opacity: "+this.colorStops[o].opacity:";",'"/>\n');return r.push(this.type==="linear"?"</linearGradient>\n":"</radialGradient>\n"),r.join("")},toLive:function(e){var t;if(!this.type)return;this.type==="linear"?t=e.createLinearGradient(this.coords.x1,this.coords.y1,this.coords.x2,this.coords.y2):this.type==="radial"&&(t=e.createRadialGradient(this.coords.x1,this.coords.y1,this.coords.r1,this.coords.x2,this.coords.y2,this.coords.r2));for(var n=0,r=this.colorStops.length;n<r;n++){var i=this.colorStops[n].color,s=this.colorStops[n].opacity,o=this.colorStops[n].offset;typeof s!="undefined"&&(i=(new fabric.Color(i)).setAlpha(s).toRgba()),t.addColorStop(parseFloat(o),i)}return t}}),fabric.util.object.extend(fabric.Gradient,{fromElement:function(i,s){var o=i.getElementsByTagName("stop"),u=i.nodeName==="linearGradient"?"linear":"radial",a=i.getAttribute("gradientUnits")||"objectBoundingBox",f=i.getAttribute("gradientTransform"),l=[],c={};u==="linear"?c=t(i):u==="radial"&&(c=n(i));for(var h=o.length;h--;)l.push(e(o[h]));r(s,c);var p=new fabric.Gradient({type:u,coords:c,gradientUnits:a,colorStops:l});return f&&(p.gradientTransform=fabric.parseTransformAttribute(f)),p},forObject:function(e,t){return t||(t={}),r(e,t),new fabric.Gradient(t)}})}(),fabric.Pattern=fabric.util.createClass({repeat:"repeat",offsetX:0,offsetY:0,initialize:function(e){e||(e={}),this.id=fabric.Object.__uid++;if(e.source)if(typeof e.source=="string")if(typeof fabric.util.getFunctionBody(e.source)!="undefined")this.source=new Function(fabric.util.getFunctionBody(e.source));else{var t=this;this.source=fabric.util.createImage(),fabric.util.loadImage(e.source,function(e){t.source=e})}else this.source=e.source;e.repeat&&(this.repeat=e.repeat),e.offsetX&&(this.offsetX=e.offsetX),e.offsetY&&(this.offsetY=e.offsetY)},toObject:function(){var e;return typeof this.source=="function"?e=String(this.source):typeof this.source.src=="string"&&(e=this.source.src),{source:e,repeat:this.repeat,offsetX:this.offsetX,offsetY:this.offsetY}},toSVG:function(e){var t=typeof this.source=="function"?this.source():this.source,n=t.width/e.getWidth(),r=t.height/e.getHeight(),i="";return t.src?i=t.src:t.toDataURL&&(i=t.toDataURL()),'<pattern id="SVGID_'+this.id+'" x="'+this.offsetX+'" y="'+this.offsetY+'" width="'+n+'" height="'+r+'">'+'<image x="0" y="0"'+' width="'+t.width+'" height="'+t.height+'" xlink:href="'+i+'"></image>'+"</pattern>"},toLive:function(e){var t=typeof this.source=="function"?this.source():this.source;if(!t)return"";if(typeof t.src!="undefined"){if(!t.complete)return"";if(t.naturalWidth===0||t.naturalHeight===0)return""}return e.createPattern(t,this.repeat)}}),function(e){"use strict";var t=e.fabric||(e.fabric={});if(t.Shadow){t.warn("fabric.Shadow is already defined.");return}t.Shadow=t.util.createClass({color:"rgb(0,0,0)",blur:0,offsetX:0,offsetY:0,affectStroke:!1,includeDefaultValues:!0,initialize:function(e){typeof e=="string"&&(e=this._parseShadow(e));for(var n in e)this[n]=e[n];this.id=t.Object.__uid++},_parseShadow:function(e){var n=e.trim(),r=t.Shadow.reOffsetsAndBlur.exec(n)||[],i=n.replace(t.Shadow.reOffsetsAndBlur,"")||"rgb(0,0,0)";return{color:i.trim(),offsetX:parseInt(r[1],10)||0,offsetY:parseInt(r[2],10)||0,blur:parseInt(r[3],10)||0}},toString:function(){return[this.offsetX,this.offsetY,this.blur,this.color].join("px ")},toSVG:function(e){var t="SourceAlpha";return e&&(e.fill===this.color||e.stroke===this.color)&&(t="SourceGraphic"),'<filter id="SVGID_'+this.id+'" y="-40%" height="180%">'+'<feGaussianBlur in="'+t+'" stdDeviation="'+(this.blur?this.blur/3:0)+'"></feGaussianBlur>'+'<feOffset dx="'+this.offsetX+'" dy="'+this.offsetY+'"></feOffset>'+"<feMerge>"+"<feMergeNode></feMergeNode>"+'<feMergeNode in="SourceGraphic"></feMergeNode>'+"</feMerge>"+"</filter>"},toObject:function(){if(this.includeDefaultValues)return{color:this.color,blur:this.blur,offsetX:this.offsetX,offsetY:this.offsetY};var e={},n=t.Shadow.prototype;return this.color!==n.color&&(e.color=this.color),this.blur!==n.blur&&(e.blur=this.blur),this.offsetX!==n.offsetX&&(e.offsetX=this.offsetX),this.offsetY!==n.offsetY&&(e.offsetY=this.offsetY),e}}),t.Shadow.reOffsetsAndBlur=/(?:\s|^)(-?\d+(?:px)?(?:\s?|$))?(-?\d+(?:px)?(?:\s?|$))?(\d+(?:px)?)?(?:\s?|$)(?:$|\s)/}(typeof exports!="undefined"?exports:this),function(){"use strict";if(fabric.StaticCanvas){fabric.warn("fabric.StaticCanvas is already defined.");return}var e=fabric.util.object.extend,t=fabric.util.getElementOffset,n=fabric.util.removeFromArray,r=new Error("Could not initialize `canvas` element");fabric.StaticCanvas=fabric.util.createClass({initialize:function(e,t){t||(t={}),this._initStatic(e,t),fabric.StaticCanvas.activeInstance=this},backgroundColor:"",backgroundImage:null,overlayColor:"",overlayImage:null,includeDefaultValues:!0,stateful:!0,renderOnAddRemove:!0,clipTo:null,controlsAboveOverlay:!1,allowTouchScrolling:!1,imageSmoothingEnabled:!0,viewportTransform:[1,0,0,1,0,0],onBeforeScaleRotate:function(){},_initStatic:function(e,t){this._objects=[],this._createLowerCanvas(e),this._initOptions(t),this._setImageSmoothing(),t.overlayImage&&this.setOverlayImage(t.overlayImage,this.renderAll.bind(this)),t.backgroundImage&&this.setBackgroundImage(t.backgroundImage,this.renderAll.bind(this)),t.backgroundColor&&this.setBackgroundColor(t.backgroundColor,this.renderAll.bind(this)),t.overlayColor&&this.setOverlayColor(t.overlayColor,this.renderAll.bind(this)),this.calcOffset()},calcOffset:function(){return this._offset=t(this.lowerCanvasEl),this},setOverlayImage:function(e,t,n){return this.__setBgOverlayImage("overlayImage",e,t,n)},setBackgroundImage:function(e,t,n){return this.__setBgOverlayImage("backgroundImage",e,t,n)},setOverlayColor:function(e,t){return this.__setBgOverlayColor("overlayColor",e,t)},setBackgroundColor:function(e,t){return this.__setBgOverlayColor("backgroundColor",e,t)},_setImageSmoothing:function(){var e=this.getContext();e.imageSmoothingEnabled=this.imageSmoothingEnabled,e.webkitImageSmoothingEnabled=this.imageSmoothingEnabled,e.mozImageSmoothingEnabled=this.imageSmoothingEnabled,e.msImageSmoothingEnabled=this.imageSmoothingEnabled,e.oImageSmoothingEnabled=this.imageSmoothingEnabled},__setBgOverlayImage:function(e,t,n,r){return typeof t=="string"?fabric.util.loadImage(t,function(t){this[e]=new fabric.Image(t,r),n&&n()},this):(this[e]=t,n&&n()),this},__setBgOverlayColor:function(e,t,n){if(t&&t.source){var r=this;fabric.util.loadImage(t.source,function(i){r[e]=new fabric.Pattern({source:i,repeat:t.repeat,offsetX:t.offsetX,offsetY:t.offsetY}),n&&n()})}else this[e]=t,n&&n();return this},_createCanvasElement:function(){var e=fabric.document.createElement("canvas");e.style||(e.style={});if(!e)throw r;return this._initCanvasElement(e),e},_initCanvasElement:function(e){fabric.util.createCanvasElement(e);if(typeof e.getContext=="undefined")throw r},_initOptions:function(e){for(var t in e)this[t]=e[t];this.width=this.width||parseInt(this.lowerCanvasEl.width,10)||0,this.height=this.height||parseInt(this.lowerCanvasEl.height,10)||0;if(!this.lowerCanvasEl.style)return;this.lowerCanvasEl.width=this.width,this.lowerCanvasEl.height=this.height,this.lowerCanvasEl.style.width=this.width+"px",this.lowerCanvasEl.style.height=this.height+"px",this.viewportTransform=this.viewportTransform.slice()},_createLowerCanvas:function(e){this.lowerCanvasEl=fabric.util.getById(e)||this._createCanvasElement(),this._initCanvasElement(this.lowerCanvasEl),fabric.util.addClass(this.lowerCanvasEl,"lower-canvas"),this.interactive&&this._applyCanvasStyle(this.lowerCanvasEl),this.contextContainer=this.lowerCanvasEl.getContext("2d")},getWidth:function(){return this.width},getHeight:function(){return this.height},setWidth:function(e,t){return this.setDimensions({width:e},t)},setHeight:function(e,t){return this.setDimensions({height:e},t)},setDimensions:function(e,t){var n;t=t||{};for(var r in e)n=e[r],t.cssOnly||(this._setBackstoreDimension(r,e[r]),n+="px"),t.backstoreOnly||this._setCssDimension(r,n);return t.cssOnly||this.renderAll(),this.calcOffset(),this},_setBackstoreDimension:function(e,t){return this.lowerCanvasEl[e]=t,this.upperCanvasEl&&(this.upperCanvasEl[e]=t),this.cacheCanvasEl&&(this.cacheCanvasEl[e]=t),this[e]=t,this},_setCssDimension:function(e,t){return this.lowerCanvasEl.style[e]=t,this.upperCanvasEl&&(this.upperCanvasEl.style[e]=t),this.wrapperEl&&(this.wrapperEl.style[e]=t),this},getZoom:function(){return Math.sqrt(this.viewportTransform[0]*this.viewportTransform[3])},setViewportTransform:function(e){this.viewportTransform=e,this.renderAll();for(var t=0,n=this._objects.length;t<n;t++)this._objects[t].setCoords();return this},zoomToPoint:function(e,t){var n=e;e=fabric.util.transformPoint(e,fabric.util.invertTransform(this.viewportTransform)),this.viewportTransform[0]=t,this.viewportTransform[3]=t;var r=fabric.util.transformPoint(e,this.viewportTransform);this.viewportTransform[4]+=n.x-r.x,this.viewportTransform[5]+=n.y-r.y,this.renderAll();for(var i=0,s=this._objects.length;i<s;i++)this._objects[i].setCoords();return this},setZoom:function(e){return this.zoomToPoint(new fabric.Point(0,0),e),this},absolutePan:function(e){this.viewportTransform[4]=-e.x,this.viewportTransform[5]=-e.y,this.renderAll();for(var t=0,n=this._objects.length;t<n;t++)this._objects[t].setCoords();return this},relativePan:function(e){return this.absolutePan(new fabric.Point(-e.x-this.viewportTransform[4],-e.y-this.viewportTransform[5]))},getElement:function(){return this.lowerCanvasEl},getActiveObject:function(){return null},getActiveGroup:function(){return null},_draw:function(e,t){if(!t)return;e.save();var n=this.viewportTransform;e.transform(n[0],n[1],n[2],n[3],n[4],n[5]),t.render(e),e.restore(),this.controlsAboveOverlay||t._renderControls(e)},_onObjectAdded:function(e){this.stateful&&e.setupState(),e.canvas=this,e.setCoords(),this.fire("object:added",{target:e}),e.fire("added")},_onObjectRemoved:function(e){this.getActiveObject()===e&&(this.fire("before:selection:cleared",{target:e}),this._discardActiveObject(),this.fire("selection:cleared")),this.fire("object:removed",{target:e}),e.fire("removed")},clearContext:function(e){return e.clearRect(0,0,this.width,this.height),this},getContext:function(){return this.contextContainer},clear:function(){return this._objects.length=0,this.discardActiveGroup&&this.discardActiveGroup(),this.discardActiveObject&&this.discardActiveObject(),this.clearContext(this.contextContainer),this.contextTop&&this.clearContext(this.contextTop),this.fire("canvas:cleared"),this.renderAll(),this},renderAll:function(e){var t=this[e===!0&&this.interactive?"contextTop":"contextContainer"],n=this.getActiveGroup();return this.contextTop&&this.selection&&!this._groupSelector&&this.clearContext(this.contextTop),e||this.clearContext(t),this.fire("before:render"),this.clipTo&&fabric.util.clipContext(this,t),this._renderBackground(t),this._renderObjects(t,n),this._renderActiveGroup(t,n),this.clipTo&&t.restore(),this._renderOverlay(t),this.controlsAboveOverlay&&this.interactive&&this.drawControls(t),this.fire("after:render"),this},_renderObjects:function(e,t){var n,r;if(!t)for(n=0,r=this._objects.length;n<r;++n)this._draw(e,this._objects[n]);else for(n=0,r=this._objects.length;n<r;++n)this._objects[n]&&!t.contains(this._objects[n])&&this._draw(e,this._objects[n])},_renderActiveGroup:function(e,t){if(t){var n=[];this.forEachObject(function(e){t.contains(e)&&n.push(e)}),t._set("objects",n),this._draw(e,t)}},_renderBackground:function(e){this.backgroundColor&&(e.fillStyle=this.backgroundColor.toLive?this.backgroundColor.toLive(e):this.backgroundColor,e.fillRect(this.backgroundColor.offsetX||0,this.backgroundColor.offsetY||0,this.width,this.height)),this.backgroundImage&&this._draw(e,this.backgroundImage)},_renderOverlay:function(e){this.overlayColor&&(e.fillStyle=this.overlayColor.toLive?this.overlayColor.toLive(e):this.overlayColor,e.fillRect(this.overlayColor.offsetX||0,this.overlayColor.offsetY||0,this.width,this.height)),this.overlayImage&&this._draw(e,this.overlayImage)},renderTop:function(){var e=this.contextTop||this.contextContainer;this.clearContext(e),this.selection&&this._groupSelector&&this._drawSelection();var t=this.getActiveGroup();return t&&t.render(e),this._renderOverlay(e),this.fire("after:render"),this},getCenter:function(){return{top:this.getHeight()/2,left:this.getWidth()/2}},centerObjectH:function(e){return this._centerObject(e,new fabric.Point(this.getCenter().left,e.getCenterPoint().y)),this.renderAll(),this},centerObjectV:function(e){return this._centerObject(e,new fabric.Point(e.getCenterPoint().x,this.getCenter().top)),this.renderAll(),this},centerObject:function(e){var t=this.getCenter();return this._centerObject(e,new fabric.Point(t.left,t.top)),this.renderAll(),this},_centerObject:function(e,t){return e.setPositionByOrigin(t,"center","center"),this},toDatalessJSON:function(e){return this.toDatalessObject(e)},toObject:function(e){return this._toObjectMethod("toObject",e)},toDatalessObject:function(e){return this._toObjectMethod("toDatalessObject",e)},_toObjectMethod:function(t,n){var r=this.getActiveGroup();r&&this.discardActiveGroup();var i={objects:this._toObjects(t,n)};return e(i,this.__serializeBgOverlay()),fabric.util.populateWithProperties(this,i,n),r&&(this.setActiveGroup(new fabric.Group(r.getObjects(),{originX:"center",originY:"center"})),r.forEachObject(function(e){e.set("active",!0)}),this._currentTransform&&(this._currentTransform.target=this.getActiveGroup())),i},_toObjects:function(e,t){return this.getObjects().map(function(n){return this._toObject(n,e,t)},this)},_toObject:function(e,t,n){var r;this.includeDefaultValues||(r=e.includeDefaultValues,e.includeDefaultValues=!1);var i=e[t](n);return this.includeDefaultValues||(e.includeDefaultValues=r),i},__serializeBgOverlay:function(){var e={background:this.backgroundColor&&this.backgroundColor.toObject?this.backgroundColor.toObject():this.backgroundColor};return this.overlayColor&&(e.overlay=this.overlayColor.toObject?this.overlayColor.toObject():this.overlayColor),this.backgroundImage&&(e.backgroundImage=this.backgroundImage.toObject()),this.overlayImage&&(e.overlayImage=this.overlayImage.toObject()),e},toSVG:function(e,t){e||(e={});var n=[];return this._setSVGPreamble(n,e),this._setSVGHeader(n,e),this._setSVGBgOverlayColor(n,"backgroundColor"),this._setSVGBgOverlayImage(n,"backgroundImage"),this._setSVGObjects(n,t),this._setSVGBgOverlayColor(n,"overlayColor"),this._setSVGBgOverlayImage(n,"overlayImage"),n.push("</svg>"),n.join("")},_setSVGPreamble:function(e,t){t.suppressPreamble||e.push('<?xml version="1.0" encoding="',t.encoding||"UTF-8",'" standalone="no" ?>','<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" ','"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n')},_setSVGHeader:function(e,t){e.push("<svg ",'xmlns="http://www.w3.org/2000/svg" ','xmlns:xlink="http://www.w3.org/1999/xlink" ','version="1.1" ','width="',t.viewBox?t.viewBox.width:this.width,'" ','height="',t.viewBox?t.viewBox.height:this.height,'" ',this.backgroundColor&&!this.backgroundColor.toLive?'style="background-color: '+this.backgroundColor+'" ':null,t.viewBox?'viewBox="'+t.viewBox.x+" "+t.viewBox.y+" "+t.viewBox.width+" "+t.viewBox.height+'" ':null,'xml:space="preserve">',"<desc>Created with Fabric.js ",fabric.version,"</desc>","<defs>",fabric.createSVGFontFacesMarkup(this.getObjects()),fabric.createSVGRefElementsMarkup(this),"</defs>")},_setSVGObjects:function(e,t){var n=this.getActiveGroup();n&&this.discardActiveGroup();for(var r=0,i=this.getObjects(),s=i.length;r<s;r++)e.push(i[r].toSVG(t));n&&(this.setActiveGroup(new fabric.Group(n.getObjects())),n.forEachObject(function(e){e.set("active",!0)}))},_setSVGBgOverlayImage:function(e,t){this[t]&&this[t].toSVG&&e.push(this[t].toSVG())},_setSVGBgOverlayColor:function(e,t){this[t]&&this[t].source?e.push('<rect x="',this[t].offsetX,'" y="',this[t].offsetY,'" ','width="',this[t].repeat==="repeat-y"||this[t].repeat==="no-repeat"?this[t].source.width:this.width,'" height="',this[t].repeat==="repeat-x"||this[t].repeat==="no-repeat"?this[t].source.height:this.height,'" fill="url(#'+t+'Pattern)"',"></rect>"):this[t]&&t==="overlayColor"&&e.push('<rect x="0" y="0" ','width="',this.width,'" height="',this.height,'" fill="',this[t],'"',"></rect>")},sendToBack:function(e){return n(this._objects,e),this._objects.unshift(e),this.renderAll&&this.renderAll()},bringToFront:function(e){return n(this._objects,e),this._objects.push(e),this.renderAll&&this.renderAll()},sendBackwards:function(e,t){var r=this._objects.indexOf(e);if(r!==0){var i=this._findNewLowerIndex(e,r,t);n(this._objects,e),this._objects.splice(i,0,e),this.renderAll&&this.renderAll()}return this},_findNewLowerIndex:function(e,t,n){var r;if(n){r=t;for(var i=t-1;i>=0;--i){var s=e.intersectsWithObject(this._objects[i])||e.isContainedWithinObject(this._objects[i])||this._objects[i].isContainedWithinObject(e);if(s){r=i;break}}}else r=t-1;return r},bringForward:function(e,t){var r=this._objects.indexOf(e);if(r!==this._objects.length-1){var i=this._findNewUpperIndex(e,r,t);n(this._objects,e),this._objects.splice(i,0,e),this.renderAll&&this.renderAll()}return this},_findNewUpperIndex:function(e,t,n){var r;if(n){r=t;for(var i=t+1;i<this._objects.length;++i){var s=e.intersectsWithObject(this._objects[i])||e.isContainedWithinObject(this._objects[i])||this._objects[i].isContainedWithinObject(e);if(s){r=i;break}}}else r=t+1;return r},moveTo:function(e,t){return n(this._objects,e),this._objects.splice(t,0,e),this.renderAll&&this.renderAll()},dispose:function(){return this.clear(),this.interactive&&this.removeListeners(),this},toString:function(){return"#<fabric.Canvas ("+this.complexity()+"): "+"{ objects: "+this.getObjects().length+" }>"}}),e(fabric.StaticCanvas.prototype,fabric.Observable),e(fabric.StaticCanvas.prototype,fabric.Collection),e(fabric.StaticCanvas.prototype,fabric.DataURLExporter),e(fabric.StaticCanvas,{EMPTY_JSON:'{"objects": [], "background": "white"}',supports:function(e){var t=fabric.util.createCanvasElement();if(!t||!t.getContext)return null;var n=t.getContext("2d");if(!n)return null;switch(e){case"getImageData":return typeof n.getImageData!="undefined";case"setLineDash":return typeof n.setLineDash!="undefined";case"toDataURL":return typeof t.toDataURL!="undefined";case"toDataURLWithQuality":try{return t.toDataURL("image/jpeg",0),!0}catch(r){}return!1;default:return null}}}),fabric.StaticCanvas.prototype.toJSON=fabric.StaticCanvas.prototype.toObject}(),fabric.BaseBrush=fabric.util.createClass({color:"rgb(0, 0, 0)",width:1,shadow:null,strokeLineCap:"round",strokeLineJoin:"round",setShadow:function(e){return this.shadow=new fabric.Shadow(e),this},_setBrushStyles:function(){var e=this.canvas.contextTop;e.strokeStyle=this.color,e.lineWidth=this.width,e.lineCap=this.strokeLineCap,e.lineJoin=this.strokeLineJoin},_setShadow:function(){if(!this.shadow)return;var e=this.canvas.contextTop;e.shadowColor=this.shadow.color,e.shadowBlur=this.shadow.blur,e.shadowOffsetX=this.shadow.offsetX,e.shadowOffsetY=this.shadow.offsetY},_resetShadow:function(){var e=this.canvas.contextTop;e.shadowColor="",e.shadowBlur=e.shadowOffsetX=e.shadowOffsetY=0}}),function(){var e=fabric.util.array.min,t=fabric.util.array.max;fabric.PencilBrush=fabric.util.createClass(fabric.BaseBrush,{initialize:function(e){this.canvas=e,this._points=[]},onMouseDown:function(e){this._prepareForDrawing(e),this._captureDrawingPath(e),this._render()},onMouseMove:function(e){this._captureDrawingPath(e),this.canvas.clearContext(this.canvas.contextTop),this._render
()},onMouseUp:function(){this._finalizeAndAddPath()},_prepareForDrawing:function(e){var t=new fabric.Point(e.x,e.y);this._reset(),this._addPoint(t),this.canvas.contextTop.moveTo(t.x,t.y)},_addPoint:function(e){this._points.push(e)},_reset:function(){this._points.length=0,this._setBrushStyles(),this._setShadow()},_captureDrawingPath:function(e){var t=new fabric.Point(e.x,e.y);this._addPoint(t)},_render:function(){var e=this.canvas.contextTop,t=this.canvas.viewportTransform,n=this._points[0],r=this._points[1];e.save(),e.transform(t[0],t[1],t[2],t[3],t[4],t[5]),e.beginPath(),this._points.length===2&&n.x===r.x&&n.y===r.y&&(n.x-=.5,r.x+=.5),e.moveTo(n.x,n.y);for(var i=1,s=this._points.length;i<s;i++){var o=n.midPointFrom(r);e.quadraticCurveTo(n.x,n.y,o.x,o.y),n=this._points[i],r=this._points[i+1]}e.lineTo(n.x,n.y),e.stroke(),e.restore()},_getSVGPathData:function(){return this.box=this.getPathBoundingBox(this._points),this.convertPointsToSVGPath(this._points,this.box.minX,this.box.minY)},getPathBoundingBox:function(n){var r=[],i=[],s=n[0],o=n[1],u=s;for(var a=1,f=n.length;a<f;a++){var l=s.midPointFrom(o);r.push(u.x),r.push(l.x),i.push(u.y),i.push(l.y),s=n[a],o=n[a+1],u=l}return r.push(s.x),i.push(s.y),{minX:e(r),minY:e(i),maxX:t(r),maxY:t(i)}},convertPointsToSVGPath:function(e,t,n){var r=[],i=new fabric.Point(e[0].x-t,e[0].y-n),s=new fabric.Point(e[1].x-t,e[1].y-n);r.push("M ",e[0].x-t," ",e[0].y-n," ");for(var o=1,u=e.length;o<u;o++){var a=i.midPointFrom(s);r.push("Q ",i.x," ",i.y," ",a.x," ",a.y," "),i=new fabric.Point(e[o].x-t,e[o].y-n),o+1<e.length&&(s=new fabric.Point(e[o+1].x-t,e[o+1].y-n))}return r.push("L ",i.x," ",i.y," "),r},createPath:function(e){var t=new fabric.Path(e);return t.fill=null,t.stroke=this.color,t.strokeWidth=this.width,t.strokeLineCap=this.strokeLineCap,t.strokeLineJoin=this.strokeLineJoin,this.shadow&&(this.shadow.affectStroke=!0,t.setShadow(this.shadow)),t},_finalizeAndAddPath:function(){var e=this.canvas.contextTop;e.closePath();var t=this._getSVGPathData().join("");if(t==="M 0 0 Q 0 0 0 0 L 0 0"){this.canvas.renderAll();return}var n=this.box.minX+(this.box.maxX-this.box.minX)/2,r=this.box.minY+(this.box.maxY-this.box.minY)/2;this.canvas.contextTop.arc(n,r,3,0,Math.PI*2,!1);var i=this.createPath(t);i.set({left:n,top:r,originX:"center",originY:"center"}),this.canvas.add(i),i.setCoords(),this.canvas.clearContext(this.canvas.contextTop),this._resetShadow(),this.canvas.renderAll(),this.canvas.fire("path:created",{path:i})}})}(),fabric.CircleBrush=fabric.util.createClass(fabric.BaseBrush,{width:10,initialize:function(e){this.canvas=e,this.points=[]},drawDot:function(e){var t=this.addPoint(e),n=this.canvas.contextTop,r=this.canvas.viewportTransform;n.save(),n.transform(r[0],r[1],r[2],r[3],r[4],r[5]),n.fillStyle=t.fill,n.beginPath(),n.arc(t.x,t.y,t.radius,0,Math.PI*2,!1),n.closePath(),n.fill(),n.restore()},onMouseDown:function(e){this.points.length=0,this.canvas.clearContext(this.canvas.contextTop),this._setShadow(),this.drawDot(e)},onMouseMove:function(e){this.drawDot(e)},onMouseUp:function(){var e=this.canvas.renderOnAddRemove;this.canvas.renderOnAddRemove=!1;var t=[];for(var n=0,r=this.points.length;n<r;n++){var i=this.points[n],s=new fabric.Circle({radius:i.radius,left:i.x,top:i.y,originX:"center",originY:"center",fill:i.fill});this.shadow&&s.setShadow(this.shadow),t.push(s)}var o=new fabric.Group(t,{originX:"center",originY:"center"});o.canvas=this.canvas,this.canvas.add(o),this.canvas.fire("path:created",{path:o}),this.canvas.clearContext(this.canvas.contextTop),this._resetShadow(),this.canvas.renderOnAddRemove=e,this.canvas.renderAll()},addPoint:function(e){var t=new fabric.Point(e.x,e.y),n=fabric.util.getRandomInt(Math.max(0,this.width-20),this.width+20)/2,r=(new fabric.Color(this.color)).setAlpha(fabric.util.getRandomInt(0,100)/100).toRgba();return t.radius=n,t.fill=r,this.points.push(t),t}}),fabric.SprayBrush=fabric.util.createClass(fabric.BaseBrush,{width:10,density:20,dotWidth:1,dotWidthVariance:1,randomOpacity:!1,optimizeOverlapping:!0,initialize:function(e){this.canvas=e,this.sprayChunks=[]},onMouseDown:function(e){this.sprayChunks.length=0,this.canvas.clearContext(this.canvas.contextTop),this._setShadow(),this.addSprayChunk(e),this.render()},onMouseMove:function(e){this.addSprayChunk(e),this.render()},onMouseUp:function(){var e=this.canvas.renderOnAddRemove;this.canvas.renderOnAddRemove=!1;var t=[];for(var n=0,r=this.sprayChunks.length;n<r;n++){var i=this.sprayChunks[n];for(var s=0,o=i.length;s<o;s++){var u=new fabric.Rect({width:i[s].width,height:i[s].width,left:i[s].x+1,top:i[s].y+1,originX:"center",originY:"center",fill:this.color});this.shadow&&u.setShadow(this.shadow),t.push(u)}}this.optimizeOverlapping&&(t=this._getOptimizedRects(t));var a=new fabric.Group(t,{originX:"center",originY:"center"});a.canvas=this.canvas,this.canvas.add(a),this.canvas.fire("path:created",{path:a}),this.canvas.clearContext(this.canvas.contextTop),this._resetShadow(),this.canvas.renderOnAddRemove=e,this.canvas.renderAll()},_getOptimizedRects:function(e){var t={},n;for(var r=0,i=e.length;r<i;r++)n=e[r].left+""+e[r].top,t[n]||(t[n]=e[r]);var s=[];for(n in t)s.push(t[n]);return s},render:function(){var e=this.canvas.contextTop;e.fillStyle=this.color;var t=this.canvas.viewportTransform;e.save(),e.transform(t[0],t[1],t[2],t[3],t[4],t[5]);for(var n=0,r=this.sprayChunkPoints.length;n<r;n++){var i=this.sprayChunkPoints[n];typeof i.opacity!="undefined"&&(e.globalAlpha=i.opacity),e.fillRect(i.x,i.y,i.width,i.width)}e.restore()},addSprayChunk:function(e){this.sprayChunkPoints=[];var t,n,r,i=this.width/2;for(var s=0;s<this.density;s++){t=fabric.util.getRandomInt(e.x-i,e.x+i),n=fabric.util.getRandomInt(e.y-i,e.y+i),this.dotWidthVariance?r=fabric.util.getRandomInt(Math.max(1,this.dotWidth-this.dotWidthVariance),this.dotWidth+this.dotWidthVariance):r=this.dotWidth;var o=new fabric.Point(t,n);o.width=r,this.randomOpacity&&(o.opacity=fabric.util.getRandomInt(0,100)/100),this.sprayChunkPoints.push(o)}this.sprayChunks.push(this.sprayChunkPoints)}}),fabric.PatternBrush=fabric.util.createClass(fabric.PencilBrush,{getPatternSrc:function(){var e=20,t=5,n=fabric.document.createElement("canvas"),r=n.getContext("2d");return n.width=n.height=e+t,r.fillStyle=this.color,r.beginPath(),r.arc(e/2,e/2,e/2,0,Math.PI*2,!1),r.closePath(),r.fill(),n},getPatternSrcFunction:function(){return String(this.getPatternSrc).replace("this.color",'"'+this.color+'"')},getPattern:function(){return this.canvas.contextTop.createPattern(this.source||this.getPatternSrc(),"repeat")},_setBrushStyles:function(){this.callSuper("_setBrushStyles"),this.canvas.contextTop.strokeStyle=this.getPattern()},createPath:function(e){var t=this.callSuper("createPath",e);return t.stroke=new fabric.Pattern({source:this.source||this.getPatternSrcFunction()}),t}}),function(){var e=fabric.util.getPointer,t=fabric.util.degreesToRadians,n=fabric.util.radiansToDegrees,r=Math.atan2,i=Math.abs,s=.5;fabric.Canvas=fabric.util.createClass(fabric.StaticCanvas,{initialize:function(e,t){t||(t={}),this._initStatic(e,t),this._initInteractive(),this._createCacheCanvas(),fabric.Canvas.activeInstance=this},uniScaleTransform:!1,centeredScaling:!1,centeredRotation:!1,interactive:!0,selection:!0,selectionColor:"rgba(100, 100, 255, 0.3)",selectionDashArray:[],selectionBorderColor:"rgba(255, 255, 255, 0.3)",selectionLineWidth:1,hoverCursor:"move",moveCursor:"move",defaultCursor:"default",freeDrawingCursor:"crosshair",rotationCursor:"crosshair",containerClass:"canvas-container",perPixelTargetFind:!1,targetFindTolerance:0,skipTargetFind:!1,_initInteractive:function(){this._currentTransform=null,this._groupSelector=null,this._initWrapperElement(),this._createUpperCanvas(),this._initEventListeners(),this.freeDrawingBrush=fabric.PencilBrush&&new fabric.PencilBrush(this),this.calcOffset()},_resetCurrentTransform:function(e){var t=this._currentTransform;t.target.set({scaleX:t.original.scaleX,scaleY:t.original.scaleY,left:t.original.left,top:t.original.top}),this._shouldCenterTransform(e,t.target)?t.action==="rotate"?this._setOriginToCenter(t.target):(t.originX!=="center"&&(t.originX==="right"?t.mouseXSign=-1:t.mouseXSign=1),t.originY!=="center"&&(t.originY==="bottom"?t.mouseYSign=-1:t.mouseYSign=1),t.originX="center",t.originY="center"):(t.originX=t.original.originX,t.originY=t.original.originY)},containsPoint:function(e,t){var n=this.getPointer(e,!0),r=this._normalizePointer(t,n);return t.containsPoint(r)||t._findTargetCorner(n)},_normalizePointer:function(e,t){var n=this.getActiveGroup(),r=t.x,i=t.y,s=n&&e.type!=="group"&&n.contains(e),o;return s&&(o=new fabric.Point(n.left,n.top),o=fabric.util.transformPoint(o,this.viewportTransform,!0),r-=o.x,i-=o.y),{x:r,y:i}},isTargetTransparent:function(e,t,n){var r=e.hasBorders,i=e.transparentCorners;e.hasBorders=e.transparentCorners=!1,this._draw(this.contextCache,e),e.hasBorders=r,e.transparentCorners=i;var s=fabric.util.isTransparent(this.contextCache,t,n,this.targetFindTolerance);return this.clearContext(this.contextCache),s},_shouldClearSelection:function(e,t){var n=this.getActiveGroup(),r=this.getActiveObject();return!t||t&&n&&!n.contains(t)&&n!==t&&!e.shiftKey||t&&!t.evented||t&&!t.selectable&&r&&r!==t},_shouldCenterTransform:function(e,t){if(!t)return;var n=this._currentTransform,r;return n.action==="scale"||n.action==="scaleX"||n.action==="scaleY"?r=this.centeredScaling||t.centeredScaling:n.action==="rotate"&&(r=this.centeredRotation||t.centeredRotation),r?!e.altKey:e.altKey},_getOriginFromCorner:function(e,t){var n={x:e.originX,y:e.originY};if(t==="ml"||t==="tl"||t==="bl")n.x="right";else if(t==="mr"||t==="tr"||t==="br")n.x="left";if(t==="tl"||t==="mt"||t==="tr")n.y="bottom";else if(t==="bl"||t==="mb"||t==="br")n.y="top";return n},_getActionFromCorner:function(e,t){var n="drag";return t&&(n=t==="ml"||t==="mr"?"scaleX":t==="mt"||t==="mb"?"scaleY":t==="mtr"?"rotate":"scale"),n},_setupCurrentTransform:function(e,n){if(!n)return;var r=this.getPointer(e),i=n._findTargetCorner(this.getPointer(e,!0)),s=this._getActionFromCorner(n,i),o=this._getOriginFromCorner(n,i);this._currentTransform={target:n,action:s,scaleX:n.scaleX,scaleY:n.scaleY,offsetX:r.x-n.left,offsetY:r.y-n.top,originX:o.x,originY:o.y,ex:r.x,ey:r.y,left:n.left,top:n.top,theta:t(n.angle),width:n.width*n.scaleX,mouseXSign:1,mouseYSign:1},this._currentTransform.original={left:n.left,top:n.top,scaleX:n.scaleX,scaleY:n.scaleY,originX:o.x,originY:o.y},this._resetCurrentTransform(e)},_translateObject:function(e,t){var n=this._currentTransform.target;n.get("lockMovementX")||n.set("left",e-this._currentTransform.offsetX),n.get("lockMovementY")||n.set("top",t-this._currentTransform.offsetY)},_scaleObject:function(e,t,n){var r=this._currentTransform,i=r.target,s=i.get("lockScalingX"),o=i.get("lockScalingY"),u=i.get("lockScalingFlip");if(s&&o)return;var a=i.translateToOriginPoint(i.getCenterPoint(),r.originX,r.originY),f=i.toLocalPoint(new fabric.Point(e,t),r.originX,r.originY);this._setLocalMouse(f,r),this._setObjectScale(f,r,s,o,n,u),i.setPositionByOrigin(a,r.originX,r.originY)},_setObjectScale:function(e,t,n,r,i,s){var o=t.target,u=!1,a=!1;t.newScaleX=e.x/(o.width+o.strokeWidth),t.newScaleY=e.y/(o.height+o.strokeWidth),s&&t.newScaleX<=0&&t.newScaleX<o.scaleX&&(u=!0),s&&t.newScaleY<=0&&t.newScaleY<o.scaleY&&(a=!0),i==="equally"&&!n&&!r?u||a||this._scaleObjectEqually(e,o,t):i?i==="x"&&!o.get("lockUniScaling")?u||n||o.set("scaleX",t.newScaleX):i==="y"&&!o.get("lockUniScaling")&&(a||r||o.set("scaleY",t.newScaleY)):(u||n||o.set("scaleX",t.newScaleX),a||r||o.set("scaleY",t.newScaleY)),u||a||this._flipObject(t)},_scaleObjectEqually:function(e,t,n){var r=e.y+e.x,i=(t.height+t.strokeWidth)*n.original.scaleY+(t.width+t.strokeWidth)*n.original.scaleX;n.newScaleX=n.original.scaleX*r/i,n.newScaleY=n.original.scaleY*r/i,t.set("scaleX",n.newScaleX),t.set("scaleY",n.newScaleY)},_flipObject:function(e){e.newScaleX<0&&(e.originX==="left"?e.originX="right":e.originX==="right"&&(e.originX="left")),e.newScaleY<0&&(e.originY==="top"?e.originY="bottom":e.originY==="bottom"&&(e.originY="top"))},_setLocalMouse:function(e,t){var n=t.target;t.originX==="right"?e.x*=-1:t.originX==="center"&&(e.x*=t.mouseXSign*2,e.x<0&&(t.mouseXSign=-t.mouseXSign)),t.originY==="bottom"?e.y*=-1:t.originY==="center"&&(e.y*=t.mouseYSign*2,e.y<0&&(t.mouseYSign=-t.mouseYSign)),i(e.x)>n.padding?e.x<0?e.x+=n.padding:e.x-=n.padding:e.x=0,i(e.y)>n.padding?e.y<0?e.y+=n.padding:e.y-=n.padding:e.y=0},_rotateObject:function(e,t){var i=this._currentTransform;if(i.target.get("lockRotation"))return;var s=r(i.ey-i.top,i.ex-i.left),o=r(t-i.top,e-i.left),u=n(o-s+i.theta);u<0&&(u=360+u),i.target.angle=u},setCursor:function(e){this.upperCanvasEl.style.cursor=e},_resetObjectTransform:function(e){e.scaleX=1,e.scaleY=1,e.setAngle(0)},_drawSelection:function(){var e=this.contextTop,t=this._groupSelector,n=t.left,r=t.top,o=i(n),u=i(r);e.fillStyle=this.selectionColor,e.fillRect(t.ex-(n>0?0:-n),t.ey-(r>0?0:-r),o,u),e.lineWidth=this.selectionLineWidth,e.strokeStyle=this.selectionBorderColor;if(this.selectionDashArray.length>1){var a=t.ex+s-(n>0?0:o),f=t.ey+s-(r>0?0:u);e.beginPath(),fabric.util.drawDashedLine(e,a,f,a+o,f,this.selectionDashArray),fabric.util.drawDashedLine(e,a,f+u-1,a+o,f+u-1,this.selectionDashArray),fabric.util.drawDashedLine(e,a,f,a,f+u,this.selectionDashArray),fabric.util.drawDashedLine(e,a+o-1,f,a+o-1,f+u,this.selectionDashArray),e.closePath(),e.stroke()}else e.strokeRect(t.ex+s-(n>0?0:o),t.ey+s-(r>0?0:u),o,u)},_isLastRenderedObject:function(e){return this.controlsAboveOverlay&&this.lastRenderedObjectWithControlsAboveOverlay&&this.lastRenderedObjectWithControlsAboveOverlay.visible&&this.containsPoint(e,this.lastRenderedObjectWithControlsAboveOverlay)&&this.lastRenderedObjectWithControlsAboveOverlay._findTargetCorner(this.getPointer(e,!0))},findTarget:function(e,t){if(this.skipTargetFind)return;if(this._isLastRenderedObject(e))return this.lastRenderedObjectWithControlsAboveOverlay;var n=this.getActiveGroup();if(n&&!t&&this.containsPoint(e,n))return n;var r=this._searchPossibleTargets(e);return this._fireOverOutEvents(r),r},_fireOverOutEvents:function(e){e?this._hoveredTarget!==e&&(this.fire("mouse:over",{target:e}),e.fire("mouseover"),this._hoveredTarget&&(this.fire("mouse:out",{target:this._hoveredTarget}),this._hoveredTarget.fire("mouseout")),this._hoveredTarget=e):this._hoveredTarget&&(this.fire("mouse:out",{target:this._hoveredTarget}),this._hoveredTarget.fire("mouseout"),this._hoveredTarget=null)},_checkTarget:function(e,t,n){if(t&&t.visible&&t.evented&&this.containsPoint(e,t)){if(!this.perPixelTargetFind&&!t.perPixelTargetFind||!!t.isEditing)return!0;var r=this.isTargetTransparent(t,n.x,n.y);if(!r)return!0}},_searchPossibleTargets:function(e){var t,n=this.getPointer(e,!0),r=this._objects.length;while(r--)if(this._checkTarget(e,this._objects[r],n)){this.relatedTarget=this._objects[r],t=this._objects[r];break}return t},getPointer:function(t,n,r){r||(r=this.upperCanvasEl);var i=e(t,r),s=r.getBoundingClientRect(),o;return this.calcOffset(),i.x=i.x-this._offset.left,i.y=i.y-this._offset.top,n||(i=fabric.util.transformPoint(i,fabric.util.invertTransform(this.viewportTransform))),s.width===0||s.height===0?o={width:1,height:1}:o={width:r.width/s.width,height:r.height/s.height},{x:i.x*o.width,y:i.y*o.height}},_createUpperCanvas:function(){var e=this.lowerCanvasEl.className.replace(/\s*lower-canvas\s*/,"");this.upperCanvasEl=this._createCanvasElement(),fabric.util.addClass(this.upperCanvasEl,"upper-canvas "+e),this.wrapperEl.appendChild(this.upperCanvasEl),this._copyCanvasStyle(this.lowerCanvasEl,this.upperCanvasEl),this._applyCanvasStyle(this.upperCanvasEl),this.contextTop=this.upperCanvasEl.getContext("2d")},_createCacheCanvas:function(){this.cacheCanvasEl=this._createCanvasElement(),this.cacheCanvasEl.setAttribute("width",this.width),this.cacheCanvasEl.setAttribute("height",this.height),this.contextCache=this.cacheCanvasEl.getContext("2d")},_initWrapperElement:function(){this.wrapperEl=fabric.util.wrapElement(this.lowerCanvasEl,"div",{"class":this.containerClass}),fabric.util.setStyle(this.wrapperEl,{width:this.getWidth()+"px",height:this.getHeight()+"px",position:"relative"}),fabric.util.makeElementUnselectable(this.wrapperEl)},_applyCanvasStyle:function(e){var t=this.getWidth()||e.width,n=this.getHeight()||e.height;fabric.util.setStyle(e,{position:"absolute",width:t+"px",height:n+"px",left:0,top:0}),e.width=t,e.height=n,fabric.util.makeElementUnselectable(e)},_copyCanvasStyle:function(e,t){t.style.cssText=e.style.cssText},getSelectionContext:function(){return this.contextTop},getSelectionElement:function(){return this.upperCanvasEl},_setActiveObject:function(e){this._activeObject&&this._activeObject.set("active",!1),this._activeObject=e,e.set("active",!0)},setActiveObject:function(e,t){return this._setActiveObject(e),this.renderAll(),this.fire("object:selected",{target:e,e:t}),e.fire("selected",{e:t}),this},getActiveObject:function(){return this._activeObject},_discardActiveObject:function(){this._activeObject&&this._activeObject.set("active",!1),this._activeObject=null},discardActiveObject:function(e){return this._discardActiveObject(),this.renderAll(),this.fire("selection:cleared",{e:e}),this},_setActiveGroup:function(e){this._activeGroup=e,e&&e.set("active",!0)},setActiveGroup:function(e,t){return this._setActiveGroup(e),e&&(this.fire("object:selected",{target:e,e:t}),e.fire("selected",{e:t})),this},getActiveGroup:function(){return this._activeGroup},_discardActiveGroup:function(){var e=this.getActiveGroup();e&&e.destroy(),this.setActiveGroup(null)},discardActiveGroup:function(e){return this._discardActiveGroup(),this.fire("selection:cleared",{e:e}),this},deactivateAll:function(){var e=this.getObjects(),t=0,n=e.length;for(;t<n;t++)e[t].set("active",!1);return this._discardActiveGroup(),this._discardActiveObject(),this},deactivateAllWithDispatch:function(e){var t=this.getActiveGroup()||this.getActiveObject();return t&&this.fire("before:selection:cleared",{target:t,e:e}),this.deactivateAll(),t&&this.fire("selection:cleared",{e:e}),this},drawControls:function(e){var t=this.getActiveGroup();t?this._drawGroupControls(e,t):this._drawObjectsControls(e)},_drawGroupControls:function(e,t){t._renderControls(e)},_drawObjectsControls:function(e){for(var t=0,n=this._objects.length;t<n;++t){if(!this._objects[t]||!this._objects[t].active)continue;this._objects[t]._renderControls(e),this.lastRenderedObjectWithControlsAboveOverlay=this._objects[t]}}});for(var o in fabric.StaticCanvas)o!=="prototype"&&(fabric.Canvas[o]=fabric.StaticCanvas[o]);fabric.isTouchSupported&&(fabric.Canvas.prototype._setCursorFromEvent=function(){}),fabric.Element=fabric.Canvas}(),function(){var e={mt:0,tr:1,mr:2,br:3,mb:4,bl:5,ml:6,tl:7},t=fabric.util.addListener,n=fabric.util.removeListener;fabric.util.object.extend(fabric.Canvas.prototype,{cursorMap:["n-resize","ne-resize","e-resize","se-resize","s-resize","sw-resize","w-resize","nw-resize"],_initEventListeners:function(){this._bindEvents(),t(fabric.window,"resize",this._onResize),t(this.upperCanvasEl,"mousedown",this._onMouseDown),t(this.upperCanvasEl,"mousemove",this._onMouseMove),t(this.upperCanvasEl,"mousewheel",this._onMouseWheel),t(this.upperCanvasEl,"touchstart",this._onMouseDown),t(this.upperCanvasEl,"touchmove",this._onMouseMove),typeof Event!="undefined"&&"add"in Event&&(Event.add(this.upperCanvasEl,"gesture",this._onGesture),Event.add(this.upperCanvasEl,"drag",this._onDrag),Event.add(this.upperCanvasEl,"orientation",this._onOrientationChange),Event.add(this.upperCanvasEl,"shake",this._onShake))},_bindEvents:function(){this._onMouseDown=this._onMouseDown.bind(this),this._onMouseMove=this._onMouseMove.bind(this),this._onMouseUp=this._onMouseUp.bind(this),this._onResize=this._onResize.bind(this),this._onGesture=this._onGesture.bind(this),this._onDrag=this._onDrag.bind(this),this._onShake=this._onShake.bind(this),this._onOrientationChange=this._onOrientationChange.bind(this),this._onMouseWheel=this._onMouseWheel.bind(this)},removeListeners:function(){n(fabric.window,"resize",this._onResize),n(this.upperCanvasEl,"mousedown",this._onMouseDown),n(this.upperCanvasEl,"mousemove",this._onMouseMove),n(this.upperCanvasEl,"mousewheel",this._onMouseWheel),n(this.upperCanvasEl,"touchstart",this._onMouseDown),n(this.upperCanvasEl,"touchmove",this._onMouseMove),typeof Event!="undefined"&&"remove"in Event&&(Event.remove(this.upperCanvasEl,"gesture",this._onGesture),Event.remove(this.upperCanvasEl,"drag",this._onDrag),Event.remove(this.upperCanvasEl,"orientation",this._onOrientationChange),Event.remove(this.upperCanvasEl,"shake",this._onShake))},_onGesture:function(e,t){this.__onTransformGesture&&this.__onTransformGesture(e,t)},_onDrag:function(e,t){this.__onDrag&&this.__onDrag(e,t)},_onMouseWheel:function(e,t){this.__onMouseWheel&&this.__onMouseWheel(e,t)},_onOrientationChange:function(e,t){this.__onOrientationChange&&this.__onOrientationChange(e,t)},_onShake:function(e,t){this.__onShake&&this.__onShake(e,t)},_onMouseDown:function(e){this.__onMouseDown(e),t(fabric.document,"touchend",this._onMouseUp),t(fabric.document,"touchmove",this._onMouseMove),n(this.upperCanvasEl,"mousemove",this._onMouseMove),n(this.upperCanvasEl,"touchmove",this._onMouseMove),e.type==="touchstart"?n(this.upperCanvasEl,"mousedown",this._onMouseDown):(t(fabric.document,"mouseup",this._onMouseUp),t(fabric.document,"mousemove",this._onMouseMove))},_onMouseUp:function(e){this.__onMouseUp(e),n(fabric.document,"mouseup",this._onMouseUp),n(fabric.document,"touchend",this._onMouseUp),n(fabric.document,"mousemove",this._onMouseMove),n(fabric.document,"touchmove",this._onMouseMove),t(this.upperCanvasEl,"mousemove",this._onMouseMove),t(this.upperCanvasEl,"touchmove",this._onMouseMove);if(e.type==="touchend"){var r=this;setTimeout(function(){t(r.upperCanvasEl,"mousedown",r._onMouseDown)},400)}},_onMouseMove:function(e){!this.allowTouchScrolling&&e.preventDefault&&e.preventDefault(),this.__onMouseMove(e)},_onResize:function(){this.calcOffset()},_shouldRender:function(e,t){var n=this.getActiveGroup()||this.getActiveObject();return!!(e&&(e.isMoving||e!==n)||!e&&!!n||!e&&!n&&!this._groupSelector||t&&this._previousPointer&&this.selection&&(t.x!==this._previousPointer.x||t.y!==this._previousPointer.y))},__onMouseUp:function(e){var t;if(this.isDrawingMode&&this._isCurrentlyDrawing){this._onMouseUpInDrawingMode(e);return}this._currentTransform?(this._finalizeCurrentTransform(),t=this._currentTransform.target):t=this.findTarget(e,!0);var n=this._shouldRender(t,this.getPointer(e));this._maybeGroupObjects(e),t&&(t.isMoving=!1),n&&this.renderAll(),this._handleCursorAndEvent(e,t)},_handleCursorAndEvent:function(e,t){this._setCursorFromEvent(e,t);var n=this;setTimeout(function(){n._setCursorFromEvent(e,t)},50),this.fire("mouse:up",{target:t,e:e}),t&&t.fire("mouseup",{e:e})},_finalizeCurrentTransform:function(){var e=this._currentTransform,t=e.target;t._scaling&&(t._scaling=!1),t.setCoords(),this.stateful&&t.hasStateChanged()&&(this.fire("object:modified",{target:t}),t.fire("modified")),this._restoreOriginXY(t)},_restoreOriginXY:function(e){if(this._previousOriginX&&this._previousOriginY){var t=e.translateToOriginPoint(e.getCenterPoint(),this._previousOriginX,this._previousOriginY);e.originX=this._previousOriginX,e.originY=this._previousOriginY,e.left=t.x,e.top=t.y,this._previousOriginX=null,this._previousOriginY=null}},_onMouseDownInDrawingMode:function(e){this._isCurrentlyDrawing=!0,this.discardActiveObject(e).renderAll(),this.clipTo&&fabric.util.clipContext(this,this.contextTop);var t=fabric.util.invertTransform(this.viewportTransform),n=fabric.util.transformPoint(this.getPointer(e,!0),t);this.freeDrawingBrush.onMouseDown(n),this.fire("mouse:down",{e:e})},_onMouseMoveInDrawingMode:function(e){if(this._isCurrentlyDrawing){var t=fabric.util.invertTransform(this.viewportTransform),n=fabric.util.transformPoint(this.getPointer(e,!0),t);this.freeDrawingBrush.onMouseMove(n)}this.setCursor(this.freeDrawingCursor),this.fire("mouse:move",{e:e})},_onMouseUpInDrawingMode:function(e){this._isCurrentlyDrawing=!1,this.clipTo&&this.contextTop.restore(),this.freeDrawingBrush.onMouseUp(),this.fire("mouse:up",{e:e})},__onMouseDown:function(e){var t="which"in e?e.which===1:e.button===1;if(!t&&!fabric.isTouchSupported)return;if(this.isDrawingMode){this._onMouseDownInDrawingMode(e);return}if(this._currentTransform)return;var n=this.findTarget(e),r=this.getPointer(e,!0);this._previousPointer=r;var i=this._shouldRender(n,r),s=this._shouldGroup(e,n);this._shouldClearSelection(e,n)?this._clearSelection(e,n,r):s&&(this._handleGrouping(e,n),n=this.getActiveGroup()),n&&n.selectable&&!s&&(this._beforeTransform(e,n),this._setupCurrentTransform(e,n)),i&&this.renderAll(),this.fire("mouse:down",{target:n,e:e}),n&&n.fire("mousedown",{e:e})},_beforeTransform:function(e,t){var n;this.stateful&&t.saveState(),(n=t._findTargetCorner(this.getPointer(e)))&&this.onBeforeScaleRotate(t),t!==this.getActiveGroup()&&t!==this.getActiveObject()&&(this.deactivateAll(),this.setActiveObject(t,e))},_clearSelection:function(e,t,n){this.deactivateAllWithDispatch(e),t&&t.selectable?this.setActiveObject(t,e):this.selection&&(this._groupSelector={ex:n.x,ey:n.y,top:0,left:0})},_setOriginToCenter:function(e){this._previousOriginX=this._currentTransform.target.originX,this._previousOriginY=this._currentTransform.target.originY;var t=e.getCenterPoint();e.originX="center",e.originY="center",e.left=t.x,e.top=t.y,this._currentTransform.left=e.left,this._currentTransform.top=e.top},_setCenterToOrigin:function(e){var t=e.translateToOriginPoint(e.getCenterPoint(),this._previousOriginX,this._previousOriginY);e.originX=this._previousOriginX,e.originY=this._previousOriginY,e.left=t.x,e.top=t.y,this._previousOriginX=null,this._previousOriginY=null},__onMouseMove:function(e){var t,n;if(this.isDrawingMode){this._onMouseMoveInDrawingMode(e);return}var r=this._groupSelector;r?(n=this.getPointer(e,!0),r.left=n.x-r.ex,r.top=n.y-r.ey,this.renderTop()):this._currentTransform?this._transformObject(e):(t=this.findTarget(e),!t||t&&!t.selectable?this.setCursor(this.defaultCursor):this._setCursorFromEvent(e,t)),this.fire("mouse:move",{target:t,e:e}),t&&t.fire("mousemove",{e:e})},_transformObject:function(e){var t=this.getPointer(e),n=this._currentTransform;n.reset=!1,n.target.isMoving=!0,this._beforeScaleTransform(e,n),this._performTransformAction(e,n,t),this.renderAll()},_performTransformAction:function(e,t,n){var r=n.x,i=n.y,s=t.target,o=t.action;o==="rotate"?(this._rotateObject(r,i),this._fire("rotating",s,e)):o==="scale"?(this._onScale(e,t,r,i),this._fire("scaling",s,e)):o==="scaleX"?(this._scaleObject(r,i,"x"),this._fire("scaling",s,e)):o==="scaleY"?(this._scaleObject(r,i,"y"),this._fire("scaling",s,e)):(this._translateObject(r,i),this._fire("moving",s,e),this.setCursor(this.moveCursor))},_fire:function(e,t,n){this.fire("object:"+e,{target:t,e:n}),t.fire(e,{e:n})},_beforeScaleTransform:function(e,t){if(t.action==="scale"||t.action==="scaleX"||t.action==="scaleY"){var n=this._shouldCenterTransform(e,t.target);if(n&&(t.originX!=="center"||t.originY!=="center")||!n&&t.originX==="center"&&t.originY==="center")this._resetCurrentTransform(e),t.reset=!0}},_onScale:function(e,t,n,r){(e.shiftKey||this.uniScaleTransform)&&!t.target.get("lockUniScaling")?(t.currentAction="scale",this._scaleObject(n,r)):(!t.reset&&t.currentAction==="scale"&&this._resetCurrentTransform(e,t.target),t.currentAction="scaleEqually",this._scaleObject(n,r,"equally"))},_setCursorFromEvent:function(e,t){if(!t||!t.selectable)return this.setCursor(this.defaultCursor),!1;var n=this.getActiveGroup(),r=t._findTargetCorner&&(!n||!n.contains(t))&&t._findTargetCorner(this.getPointer(e,!0));return r?this._setCornerCursor(r,t):this.setCursor(t.hoverCursor||this.hoverCursor),!0},_setCornerCursor:function(t,n){if(t in e)this.setCursor(this._getRotatedCornerCursor(t,n));else{if(t!=="mtr"||!n.hasRotatingPoint)return this.setCursor(this.defaultCursor),!1;this.setCursor(this.rotationCursor)}},_getRotatedCornerCursor:function(t,n){var r=Math.round(n.getAngle()%360/45);return r<0&&(r+=8),r+=e[t],r%=8,this.cursorMap[r]}})}(),function(){var e=Math.min,t=Math.max;fabric.util.object.extend(fabric.Canvas.prototype,{_shouldGroup:function(e,t){var n=this.getActiveObject();return e.shiftKey&&(this.getActiveGroup()||n&&n!==t)&&this.selection},_handleGrouping:function(e,t){if(t===this.getActiveGroup()){t=this.findTarget(e,!0);if(!t||t.isType("group"))return}this.getActiveGroup()?this._updateActiveGroup(t,e):this._createActiveGroup(t,e),this._activeGroup&&this._activeGroup.saveCoords()},_updateActiveGroup:function(e,t){var n=this.getActiveGroup();if(n.contains(e)){n.removeWithUpdate(e),this._resetObjectTransform(n),e.set("active",!1);if(n.size()===1){this.discardActiveGroup(t),this.setActiveObject(n.item(0));return}}else n.addWithUpdate(e),this._resetObjectTransform(n);this.fire("selection:created",{target:n,e:t}),n.set("active",!0)},_createActiveGroup:function(e,t){if(this._activeObject&&e!==this._activeObject){var n=this._createGroup(e);n.addWithUpdate(),this.setActiveGroup(n),this._activeObject=null,this.fire("selection:created",{target:n,e:t})}e.set("active",!0)},_createGroup:function(e){var t=this.getObjects(),n=t.indexOf(this._activeObject)<t.indexOf(e),r=n?[this._activeObject,e]:[e,this._activeObject];return new fabric.Group(r,{originX:"center",originY:"center",canvas:this})},_groupSelectedObjects:function(e){var t=this._collectObjects();t.length===1?this.setActiveObject(t[0],e):t.length>1&&(t=new fabric.Group(t.reverse(),{originX:"center",originY:"center",canvas:this}),t.addWithUpdate(),this.setActiveGroup(t,e),t.saveCoords(),this.fire("selection:created",{target:t}),this.renderAll())},_collectObjects:function(){var n=[],r,i=this._groupSelector.ex,s=this._groupSelector.ey,o=i+this._groupSelector.left,u=s+this._groupSelector.top,a=new fabric.Point(e(i,o),e(s,u)),f=new fabric.Point(t(i,o),t(s,u)),l=i===o&&s===u;for(var c=this._objects.length;c--;){r=this._objects[c];if(!r||!r.selectable||!r.visible)continue;if(r.intersectsWithRect(a,f)||r.isContainedWithinRect(a,f)||r.containsPoint(a)||r.containsPoint(f)){r.set("active",!0),n.push(r);if(l)break}}return n},_maybeGroupObjects:function(e){this.selection&&this._groupSelector&&this._groupSelectedObjects(e);var t=this.getActiveGroup();t&&(t.setObjectsCoords().setCoords(),t.isMoving=!1,this.setCursor(this.defaultCursor)),this._groupSelector=null,this._currentTransform=null}})}(),fabric.util.object.extend(fabric.StaticCanvas.prototype,{toDataURL:function(e){e||(e={});var t=e.format||"png",n=e.quality||1,r=e.multiplier||1,i={left:e.left,top:e.top,width:e.width,height:e.height};return r!==1?this.__toDataURLWithMultiplier(t,n,i,r):this.__toDataURL(t,n,i)},__toDataURL:function(e,t,n){this.renderAll(!0);var r=this.upperCanvasEl||this.lowerCanvasEl,i=this.__getCroppedCanvas(r,n);e==="jpg"&&(e="jpeg");var s=fabric.StaticCanvas.supports("toDataURLWithQuality")?(i||r).toDataURL("image/"+e,t):(i||r).toDataURL("image/"+e);return this.contextTop&&this.clearContext(this.contextTop),this.renderAll(),i&&(i=null),s},__getCroppedCanvas:function(e,t){var n,r,i="left"in t||"top"in t||"width"in t||"height"in t;return i&&(n=fabric.util.createCanvasElement(),r=n.getContext("2d"),n.width=t.width||this.width,n.height=t.height||this.height,r.drawImage(e,-t.left||0,-t.top||0)),n},__toDataURLWithMultiplier:function(e,t,n,r){var i=this.getWidth(),s=this.getHeight(),o=i*r,u=s*r,a=this.getActiveObject(),f=this.getActiveGroup(),l=this.contextTop||this.contextContainer;r>1&&this.setWidth(o).setHeight(u),l.scale(r,r),n.left&&(n.left*=r),n.top&&(n.top*=r),n.width?n.width*=r:r<1&&(n.width=o),n.height?n.height*=r:r<1&&(n.height=u),f?this._tempRemoveBordersControlsFromGroup(f):a&&this.deactivateAll&&this.deactivateAll(),this.renderAll(!0);var c=this.__toDataURL(e,t,n);return this.width=i,this.height=s,l.scale(1/r,1/r),this.setWidth(i).setHeight(s),f?this._restoreBordersControlsOnGroup(f):a&&this.setActiveObject&&this.setActiveObject(a),this.contextTop&&this.clearContext(this.contextTop),this.renderAll(),c},toDataURLWithMultiplier:function(e,t,n){return this.toDataURL({format:e,multiplier:t,quality:n})},_tempRemoveBordersControlsFromGroup:function(e){e.origHasControls=e.hasControls,e.origBorderColor=e.borderColor,e.hasControls=!0,e.borderColor="rgba(0,0,0,0)",e.forEachObject(function(e){e.origBorderColor=e.borderColor,e.borderColor="rgba(0,0,0,0)"})},_restoreBordersControlsOnGroup:function(e){e.hideControls=e.origHideControls,e.borderColor=e.origBorderColor,e.forEachObject(function(e){e.borderColor=e.origBorderColor,delete e.origBorderColor})}}),fabric.util
.object.extend(fabric.StaticCanvas.prototype,{loadFromDatalessJSON:function(e,t,n){return this.loadFromJSON(e,t,n)},loadFromJSON:function(e,t,n){if(!e)return;var r=typeof e=="string"?JSON.parse(e):e;this.clear();var i=this;return this._enlivenObjects(r.objects,function(){i._setBgOverlay(r,t)},n),this},_setBgOverlay:function(e,t){var n=this,r={backgroundColor:!1,overlayColor:!1,backgroundImage:!1,overlayImage:!1};if(!e.backgroundImage&&!e.overlayImage&&!e.background&&!e.overlay){t&&t();return}var i=function(){r.backgroundImage&&r.overlayImage&&r.backgroundColor&&r.overlayColor&&(n.renderAll(),t&&t())};this.__setBgOverlay("backgroundImage",e.backgroundImage,r,i),this.__setBgOverlay("overlayImage",e.overlayImage,r,i),this.__setBgOverlay("backgroundColor",e.background,r,i),this.__setBgOverlay("overlayColor",e.overlay,r,i),i()},__setBgOverlay:function(e,t,n,r){var i=this;if(!t){n[e]=!0;return}e==="backgroundImage"||e==="overlayImage"?fabric.Image.fromObject(t,function(t){i[e]=t,n[e]=!0,r&&r()}):this["set"+fabric.util.string.capitalize(e,!0)](t,function(){n[e]=!0,r&&r()})},_enlivenObjects:function(e,t,n){var r=this;if(!e||e.length===0){t&&t();return}var i=this.renderOnAddRemove;this.renderOnAddRemove=!1,fabric.util.enlivenObjects(e,function(e){e.forEach(function(e,t){r.insertAt(e,t,!0)}),r.renderOnAddRemove=i,t&&t()},null,n)},_toDataURL:function(e,t){this.clone(function(n){t(n.toDataURL(e))})},_toDataURLWithMultiplier:function(e,t,n){this.clone(function(r){n(r.toDataURLWithMultiplier(e,t))})},clone:function(e,t){var n=JSON.stringify(this.toJSON(t));this.cloneWithoutData(function(t){t.loadFromJSON(n,function(){e&&e(t)})})},cloneWithoutData:function(e){var t=fabric.document.createElement("canvas");t.width=this.getWidth(),t.height=this.getHeight();var n=new fabric.Canvas(t);n.clipTo=this.clipTo,this.backgroundImage?(n.setBackgroundImage(this.backgroundImage.src,function(){n.renderAll(),e&&e(n)}),n.backgroundImageOpacity=this.backgroundImageOpacity,n.backgroundImageStretch=this.backgroundImageStretch):e&&e(n)}}),function(e){"use strict";var t=e.fabric||(e.fabric={}),n=t.util.object.extend,r=t.util.toFixed,i=t.util.string.capitalize,s=t.util.degreesToRadians,o=t.StaticCanvas.supports("setLineDash");if(t.Object)return;t.Object=t.util.createClass({type:"object",originX:"left",originY:"top",top:0,left:0,width:0,height:0,scaleX:1,scaleY:1,flipX:!1,flipY:!1,opacity:1,angle:0,cornerSize:12,transparentCorners:!0,hoverCursor:null,padding:0,borderColor:"rgba(102,153,255,0.75)",cornerColor:"rgba(102,153,255,0.5)",centeredScaling:!1,centeredRotation:!0,fill:"rgb(0,0,0)",fillRule:"source-over",backgroundColor:"",stroke:null,strokeWidth:1,strokeDashArray:null,strokeLineCap:"butt",strokeLineJoin:"miter",strokeMiterLimit:10,shadow:null,borderOpacityWhenMoving:.4,borderScaleFactor:1,transformMatrix:null,minScaleLimit:.01,selectable:!0,evented:!0,visible:!0,hasControls:!0,hasBorders:!0,hasRotatingPoint:!0,rotatingPointOffset:40,perPixelTargetFind:!1,includeDefaultValues:!0,clipTo:null,lockMovementX:!1,lockMovementY:!1,lockRotation:!1,lockScalingX:!1,lockScalingY:!1,lockUniScaling:!1,lockScalingFlip:!1,stateProperties:"top left width height scaleX scaleY flipX flipY originX originY transformMatrix stroke strokeWidth strokeDashArray strokeLineCap strokeLineJoin strokeMiterLimit angle opacity fill fillRule shadow clipTo visible backgroundColor".split(" "),initialize:function(e){e&&this.setOptions(e)},_initGradient:function(e){e.fill&&e.fill.colorStops&&!(e.fill instanceof t.Gradient)&&this.set("fill",new t.Gradient(e.fill))},_initPattern:function(e){e.fill&&e.fill.source&&!(e.fill instanceof t.Pattern)&&this.set("fill",new t.Pattern(e.fill)),e.stroke&&e.stroke.source&&!(e.stroke instanceof t.Pattern)&&this.set("stroke",new t.Pattern(e.stroke))},_initClipping:function(e){if(!e.clipTo||typeof e.clipTo!="string")return;var n=t.util.getFunctionBody(e.clipTo);typeof n!="undefined"&&(this.clipTo=new Function("ctx",n))},setOptions:function(e){for(var t in e)this.set(t,e[t]);this._initGradient(e),this._initPattern(e),this._initClipping(e)},transform:function(e,t){this.group&&this.group.transform(e,t),e.globalAlpha=this.opacity;var n=t?this._getLeftTopCoords():this.getCenterPoint();e.translate(n.x,n.y),e.rotate(s(this.angle)),e.scale(this.scaleX*(this.flipX?-1:1),this.scaleY*(this.flipY?-1:1))},toObject:function(e){var n=t.Object.NUM_FRACTION_DIGITS,i={type:this.type,originX:this.originX,originY:this.originY,left:r(this.left,n),top:r(this.top,n),width:r(this.width,n),height:r(this.height,n),fill:this.fill&&this.fill.toObject?this.fill.toObject():this.fill,stroke:this.stroke&&this.stroke.toObject?this.stroke.toObject():this.stroke,strokeWidth:r(this.strokeWidth,n),strokeDashArray:this.strokeDashArray,strokeLineCap:this.strokeLineCap,strokeLineJoin:this.strokeLineJoin,strokeMiterLimit:r(this.strokeMiterLimit,n),scaleX:r(this.scaleX,n),scaleY:r(this.scaleY,n),angle:r(this.getAngle(),n),flipX:this.flipX,flipY:this.flipY,opacity:r(this.opacity,n),shadow:this.shadow&&this.shadow.toObject?this.shadow.toObject():this.shadow,visible:this.visible,clipTo:this.clipTo&&String(this.clipTo),backgroundColor:this.backgroundColor};return this.includeDefaultValues||(i=this._removeDefaultValues(i)),t.util.populateWithProperties(this,i,e),i},toDatalessObject:function(e){return this.toObject(e)},_removeDefaultValues:function(e){var n=t.util.getKlass(e.type).prototype,r=n.stateProperties;return r.forEach(function(t){e[t]===n[t]&&delete e[t]}),e},toString:function(){return"#<fabric."+i(this.type)+">"},get:function(e){return this[e]},_setObject:function(e){for(var t in e)this._set(t,e[t])},set:function(e,t){return typeof e=="object"?this._setObject(e):typeof t=="function"&&e!=="clipTo"?this._set(e,t(this.get(e))):this._set(e,t),this},_set:function(e,n){var i=e==="scaleX"||e==="scaleY";return i&&(n=this._constrainScale(n)),e==="scaleX"&&n<0?(this.flipX=!this.flipX,n*=-1):e==="scaleY"&&n<0?(this.flipY=!this.flipY,n*=-1):e==="width"||e==="height"?this.minScaleLimit=r(Math.min(.1,1/Math.max(this.width,this.height)),2):e==="shadow"&&n&&!(n instanceof t.Shadow)&&(n=new t.Shadow(n)),this[e]=n,this},toggle:function(e){var t=this.get(e);return typeof t=="boolean"&&this.set(e,!t),this},setSourcePath:function(e){return this.sourcePath=e,this},getViewportTransform:function(){return this.canvas&&this.canvas.viewportTransform?this.canvas.viewportTransform:[1,0,0,1,0,0]},render:function(e,n){if(this.width===0||this.height===0||!this.visible)return;e.save(),this._setupFillRule(e),this._transform(e,n),this._setStrokeStyles(e),this._setFillStyles(e);if(this.group&&this.group.type==="path-group"){e.translate(-this.group.width/2,-this.group.height/2);var r=this.transformMatrix;r&&e.transform.apply(e,r)}e.globalAlpha=this.group?e.globalAlpha*this.opacity:this.opacity,this._setShadow(e),this.clipTo&&t.util.clipContext(this,e),this._render(e,n),this.clipTo&&e.restore(),this._removeShadow(e),this._restoreFillRule(e),e.restore()},_transform:function(e,t){var n=this.transformMatrix;n&&!this.group&&e.setTransform.apply(e,n),t||this.transform(e)},_setStrokeStyles:function(e){this.stroke&&(e.lineWidth=this.strokeWidth,e.lineCap=this.strokeLineCap,e.lineJoin=this.strokeLineJoin,e.miterLimit=this.strokeMiterLimit,e.strokeStyle=this.stroke.toLive?this.stroke.toLive(e):this.stroke)},_setFillStyles:function(e){this.fill&&(e.fillStyle=this.fill.toLive?this.fill.toLive(e):this.fill)},_renderControls:function(e,n){var r=this.getViewportTransform();e.save();if(this.active&&!n){var i;this.group&&(i=t.util.transformPoint(this.group.getCenterPoint(),r),e.translate(i.x,i.y),e.rotate(s(this.group.angle))),i=t.util.transformPoint(this.getCenterPoint(),r,null!=this.group),this.group&&(i.x*=this.group.scaleX,i.y*=this.group.scaleY),e.translate(i.x,i.y),e.rotate(s(this.angle)),this.drawBorders(e),this.drawControls(e)}e.restore()},_setShadow:function(e){if(!this.shadow)return;e.shadowColor=this.shadow.color,e.shadowBlur=this.shadow.blur,e.shadowOffsetX=this.shadow.offsetX,e.shadowOffsetY=this.shadow.offsetY},_removeShadow:function(e){if(!this.shadow)return;e.shadowColor="",e.shadowBlur=e.shadowOffsetX=e.shadowOffsetY=0},_renderFill:function(e){if(!this.fill)return;e.save(),this.fill.toLive&&e.translate(-this.width/2+this.fill.offsetX||0,-this.height/2+this.fill.offsetY||0);if(this.fill.gradientTransform){var t=this.fill.gradientTransform;e.transform.apply(e,t)}this.fillRule==="destination-over"?e.fill("evenodd"):e.fill(),e.restore(),this.shadow&&!this.shadow.affectStroke&&this._removeShadow(e)},_renderStroke:function(e){if(!this.stroke||this.strokeWidth===0)return;e.save();if(this.strokeDashArray)1&this.strokeDashArray.length&&this.strokeDashArray.push.apply(this.strokeDashArray,this.strokeDashArray),o?(e.setLineDash(this.strokeDashArray),this._stroke&&this._stroke(e)):this._renderDashedStroke&&this._renderDashedStroke(e),e.stroke();else{if(this.stroke.gradientTransform){var t=this.stroke.gradientTransform;e.transform.apply(e,t)}this._stroke?this._stroke(e):e.stroke()}this._removeShadow(e),e.restore()},clone:function(e,n){return this.constructor.fromObject?this.constructor.fromObject(this.toObject(n),e):new t.Object(this.toObject(n))},cloneAsImage:function(e){var n=this.toDataURL();return t.util.loadImage(n,function(n){e&&e(new t.Image(n))}),this},toDataURL:function(e){e||(e={});var n=t.util.createCanvasElement(),r=this.getBoundingRect();n.width=r.width,n.height=r.height,t.util.wrapElement(n,"div");var i=new t.Canvas(n);e.format==="jpg"&&(e.format="jpeg"),e.format==="jpeg"&&(i.backgroundColor="#fff");var s={active:this.get("active"),left:this.getLeft(),top:this.getTop()};this.set("active",!1),this.setPositionByOrigin(new t.Point(n.width/2,n.height/2),"center","center");var o=this.canvas;i.add(this);var u=i.toDataURL(e);return this.set(s).setCoords(),this.canvas=o,i.dispose(),i=null,u},isType:function(e){return this.type===e},complexity:function(){return 0},toJSON:function(e){return this.toObject(e)},setGradient:function(e,n){n||(n={});var r={colorStops:[]};r.type=n.type||(n.r1||n.r2?"radial":"linear"),r.coords={x1:n.x1,y1:n.y1,x2:n.x2,y2:n.y2};if(n.r1||n.r2)r.coords.r1=n.r1,r.coords.r2=n.r2;for(var i in n.colorStops){var s=new t.Color(n.colorStops[i]);r.colorStops.push({offset:i,color:s.toRgb(),opacity:s.getAlpha()})}return this.set(e,t.Gradient.forObject(this,r))},setPatternFill:function(e){return this.set("fill",new t.Pattern(e))},setShadow:function(e){return this.set("shadow",e?new t.Shadow(e):null)},setColor:function(e){return this.set("fill",e),this},setAngle:function(e){var t=(this.originX!=="center"||this.originY!=="center")&&this.centeredRotation;return t&&this._setOriginToCenter(),this.set("angle",e),t&&this._resetOrigin(),this},centerH:function(){return this.canvas.centerObjectH(this),this},centerV:function(){return this.canvas.centerObjectV(this),this},center:function(){return this.canvas.centerObject(this),this},remove:function(){return this.canvas.remove(this),this},getLocalPointer:function(e,t){t=t||this.canvas.getPointer(e);var n=this.translateToOriginPoint(this.getCenterPoint(),"left","top");return{x:t.x-n.x,y:t.y-n.y}},_setupFillRule:function(e){this.fillRule&&(this._prevFillRule=e.globalCompositeOperation,e.globalCompositeOperation=this.fillRule)},_restoreFillRule:function(e){this.fillRule&&this._prevFillRule&&(e.globalCompositeOperation=this._prevFillRule)}}),t.util.createAccessors(t.Object),t.Object.prototype.rotate=t.Object.prototype.setAngle,n(t.Object.prototype,t.Observable),t.Object.NUM_FRACTION_DIGITS=2,t.Object.__uid=0}(typeof exports!="undefined"?exports:this),function(){var e=fabric.util.degreesToRadians;fabric.util.object.extend(fabric.Object.prototype,{translateToCenterPoint:function(t,n,r){var i=t.x,s=t.y,o=this.stroke?this.strokeWidth:0;return n==="left"?i=t.x+(this.getWidth()+o*this.scaleX)/2:n==="right"&&(i=t.x-(this.getWidth()+o*this.scaleX)/2),r==="top"?s=t.y+(this.getHeight()+o*this.scaleY)/2:r==="bottom"&&(s=t.y-(this.getHeight()+o*this.scaleY)/2),fabric.util.rotatePoint(new fabric.Point(i,s),t,e(this.angle))},translateToOriginPoint:function(t,n,r){var i=t.x,s=t.y,o=this.stroke?this.strokeWidth:0;return n==="left"?i=t.x-(this.getWidth()+o*this.scaleX)/2:n==="right"&&(i=t.x+(this.getWidth()+o*this.scaleX)/2),r==="top"?s=t.y-(this.getHeight()+o*this.scaleY)/2:r==="bottom"&&(s=t.y+(this.getHeight()+o*this.scaleY)/2),fabric.util.rotatePoint(new fabric.Point(i,s),t,e(this.angle))},getCenterPoint:function(){var e=new fabric.Point(this.left,this.top);return this.translateToCenterPoint(e,this.originX,this.originY)},getPointByOrigin:function(e,t){var n=this.getCenterPoint();return this.translateToOriginPoint(n,e,t)},toLocalPoint:function(t,n,r){var i=this.getCenterPoint(),s=this.stroke?this.strokeWidth:0,o,u;return n&&r?(n==="left"?o=i.x-(this.getWidth()+s*this.scaleX)/2:n==="right"?o=i.x+(this.getWidth()+s*this.scaleX)/2:o=i.x,r==="top"?u=i.y-(this.getHeight()+s*this.scaleY)/2:r==="bottom"?u=i.y+(this.getHeight()+s*this.scaleY)/2:u=i.y):(o=this.left,u=this.top),fabric.util.rotatePoint(new fabric.Point(t.x,t.y),i,-e(this.angle)).subtractEquals(new fabric.Point(o,u))},setPositionByOrigin:function(e,t,n){var r=this.translateToCenterPoint(e,t,n),i=this.translateToOriginPoint(r,this.originX,this.originY);this.set("left",i.x),this.set("top",i.y)},adjustPosition:function(t){var n=e(this.angle),r=this.getWidth()/2,i=Math.cos(n)*r,s=Math.sin(n)*r,o=this.getWidth(),u=Math.cos(n)*o,a=Math.sin(n)*o;this.originX==="center"&&t==="left"||this.originX==="right"&&t==="center"?(this.left-=i,this.top-=s):this.originX==="left"&&t==="center"||this.originX==="center"&&t==="right"?(this.left+=i,this.top+=s):this.originX==="left"&&t==="right"?(this.left+=u,this.top+=a):this.originX==="right"&&t==="left"&&(this.left-=u,this.top-=a),this.setCoords(),this.originX=t},_setOriginToCenter:function(){this._originalOriginX=this.originX,this._originalOriginY=this.originY;var e=this.getCenterPoint();this.originX="center",this.originY="center",this.left=e.x,this.top=e.y},_resetOrigin:function(){var e=this.translateToOriginPoint(this.getCenterPoint(),this._originalOriginX,this._originalOriginY);this.originX=this._originalOriginX,this.originY=this._originalOriginY,this.left=e.x,this.top=e.y,this._originalOriginX=null,this._originalOriginY=null},_getLeftTopCoords:function(){return this.translateToOriginPoint(this.getCenterPoint(),"left","center")}})}(),function(){var e=fabric.util.degreesToRadians;fabric.util.object.extend(fabric.Object.prototype,{oCoords:null,intersectsWithRect:function(e,t){var n=this.oCoords,r=new fabric.Point(n.tl.x,n.tl.y),i=new fabric.Point(n.tr.x,n.tr.y),s=new fabric.Point(n.bl.x,n.bl.y),o=new fabric.Point(n.br.x,n.br.y),u=fabric.Intersection.intersectPolygonRectangle([r,i,o,s],e,t);return u.status==="Intersection"},intersectsWithObject:function(e){function t(e){return{tl:new fabric.Point(e.tl.x,e.tl.y),tr:new fabric.Point(e.tr.x,e.tr.y),bl:new fabric.Point(e.bl.x,e.bl.y),br:new fabric.Point(e.br.x,e.br.y)}}var n=t(this.oCoords),r=t(e.oCoords),i=fabric.Intersection.intersectPolygonPolygon([n.tl,n.tr,n.br,n.bl],[r.tl,r.tr,r.br,r.bl]);return i.status==="Intersection"},isContainedWithinObject:function(e){var t=e.getBoundingRect(),n=new fabric.Point(t.left,t.top),r=new fabric.Point(t.left+t.width,t.top+t.height);return this.isContainedWithinRect(n,r)},isContainedWithinRect:function(e,t){var n=this.getBoundingRect();return n.left>=e.x&&n.left+n.width<=t.x&&n.top>=e.y&&n.top+n.height<=t.y},containsPoint:function(e){var t=this._getImageLines(this.oCoords),n=this._findCrossPoints(e,t);return n!==0&&n%2===1},_getImageLines:function(e){return{topline:{o:e.tl,d:e.tr},rightline:{o:e.tr,d:e.br},bottomline:{o:e.br,d:e.bl},leftline:{o:e.bl,d:e.tl}}},_findCrossPoints:function(e,t){var n,r,i,s,o,u,a=0,f;for(var l in t){f=t[l];if(f.o.y<e.y&&f.d.y<e.y)continue;if(f.o.y>=e.y&&f.d.y>=e.y)continue;f.o.x===f.d.x&&f.o.x>=e.x?(o=f.o.x,u=e.y):(n=0,r=(f.d.y-f.o.y)/(f.d.x-f.o.x),i=e.y-n*e.x,s=f.o.y-r*f.o.x,o=-(i-s)/(n-r),u=i+n*o),o>=e.x&&(a+=1);if(a===2)break}return a},getBoundingRectWidth:function(){return this.getBoundingRect().width},getBoundingRectHeight:function(){return this.getBoundingRect().height},getBoundingRect:function(){this.oCoords||this.setCoords();var e=[this.oCoords.tl.x,this.oCoords.tr.x,this.oCoords.br.x,this.oCoords.bl.x],t=fabric.util.array.min(e),n=fabric.util.array.max(e),r=Math.abs(t-n),i=[this.oCoords.tl.y,this.oCoords.tr.y,this.oCoords.br.y,this.oCoords.bl.y],s=fabric.util.array.min(i),o=fabric.util.array.max(i),u=Math.abs(s-o);return{left:t,top:s,width:r,height:u}},getWidth:function(){return this.width*this.scaleX},getHeight:function(){return this.height*this.scaleY},_constrainScale:function(e){return Math.abs(e)<this.minScaleLimit?e<0?-this.minScaleLimit:this.minScaleLimit:e},scale:function(e){return e=this._constrainScale(e),e<0&&(this.flipX=!this.flipX,this.flipY=!this.flipY,e*=-1),this.scaleX=e,this.scaleY=e,this.setCoords(),this},scaleToWidth:function(e){var t=this.getBoundingRectWidth()/this.getWidth();return this.scale(e/this.width/t)},scaleToHeight:function(e){var t=this.getBoundingRectHeight()/this.getHeight();return this.scale(e/this.height/t)},setCoords:function(){var t=this.strokeWidth>1?this.strokeWidth:0,n=e(this.angle),r=this.getViewportTransform(),i=function(e){return fabric.util.transformPoint(e,r)},s=this.width,o=this.height,u=this.strokeLineCap==="round"||this.strokeLineCap==="square",a=this.type==="line"&&this.width===1,f=this.type==="line"&&this.height===1,l=u&&f||this.type!=="line",c=u&&a||this.type!=="line";a?s=t:f&&(o=t),l&&(s+=t),c&&(o+=t),this.currentWidth=s*this.scaleX,this.currentHeight=o*this.scaleY,this.currentWidth<0&&(this.currentWidth=Math.abs(this.currentWidth));var h=Math.sqrt(Math.pow(this.currentWidth/2,2)+Math.pow(this.currentHeight/2,2)),p=Math.atan(isFinite(this.currentHeight/this.currentWidth)?this.currentHeight/this.currentWidth:0),d=Math.cos(p+n)*h,v=Math.sin(p+n)*h,m=Math.sin(n),g=Math.cos(n),y=this.getCenterPoint(),b=new fabric.Point(this.currentWidth,this.currentHeight),w=new fabric.Point(y.x-d,y.y-v),E=new fabric.Point(w.x+b.x*g,w.y+b.x*m),S=new fabric.Point(w.x-b.y*m,w.y+b.y*g),x=new fabric.Point(w.x+b.x/2*g,w.y+b.x/2*m),T=i(w),N=i(E),C=i(new fabric.Point(E.x-b.y*m,E.y+b.y*g)),k=i(S),L=i(new fabric.Point(w.x-b.y/2*m,w.y+b.y/2*g)),A=i(x),O=i(new fabric.Point(E.x-b.y/2*m,E.y+b.y/2*g)),M=i(new fabric.Point(S.x+b.x/2*g,S.y+b.x/2*m)),_=i(new fabric.Point(x.x,x.y)),D=Math.cos(p+n)*this.padding*Math.sqrt(2),P=Math.sin(p+n)*this.padding*Math.sqrt(2);return T=T.add(new fabric.Point(-D,-P)),N=N.add(new fabric.Point(P,-D)),C=C.add(new fabric.Point(D,P)),k=k.add(new fabric.Point(-P,D)),L=L.add(new fabric.Point((-D-P)/2,(-P+D)/2)),A=A.add(new fabric.Point((P-D)/2,-(P+D)/2)),O=O.add(new fabric.Point((P+D)/2,(P-D)/2)),M=M.add(new fabric.Point((D-P)/2,(D+P)/2)),_=_.add(new fabric.Point((P-D)/2,-(P+D)/2)),this.oCoords={tl:T,tr:N,br:C,bl:k,ml:L,mt:A,mr:O,mb:M,mtr:_},this._setCornerCoords&&this._setCornerCoords(),this}})}(),fabric.util.object.extend(fabric.Object.prototype,{sendToBack:function(){return this.group?fabric.StaticCanvas.prototype.sendToBack.call(this.group,this):this.canvas.sendToBack(this),this},bringToFront:function(){return this.group?fabric.StaticCanvas.prototype.bringToFront.call(this.group,this):this.canvas.bringToFront(this),this},sendBackwards:function(e){return this.group?fabric.StaticCanvas.prototype.sendBackwards.call(this.group,this,e):this.canvas.sendBackwards(this,e),this},bringForward:function(e){return this.group?fabric.StaticCanvas.prototype.bringForward.call(this.group,this,e):this.canvas.bringForward(this,e),this},moveTo:function(e){return this.group?fabric.StaticCanvas.prototype.moveTo.call(this.group,this,e):this.canvas.moveTo(this,e),this}}),fabric.util.object.extend(fabric.Object.prototype,{getSvgStyles:function(){var e=this.fill?this.fill.toLive?"url(#SVGID_"+this.fill.id+")":this.fill:"none",t=this.fillRule==="destination-over"?"evenodd":this.fillRule,n=this.stroke?this.stroke.toLive?"url(#SVGID_"+this.stroke.id+")":this.stroke:"none",r=this.strokeWidth?this.strokeWidth:"0",i=this.strokeDashArray?this.strokeDashArray.join(" "):"",s=this.strokeLineCap?this.strokeLineCap:"butt",o=this.strokeLineJoin?this.strokeLineJoin:"miter",u=this.strokeMiterLimit?this.strokeMiterLimit:"4",a=typeof this.opacity!="undefined"?this.opacity:"1",f=this.visible?"":" visibility: hidden;",l=this.shadow&&this.type!=="text"?"filter: url(#SVGID_"+this.shadow.id+");":"";return["stroke: ",n,"; ","stroke-width: ",r,"; ","stroke-dasharray: ",i,"; ","stroke-linecap: ",s,"; ","stroke-linejoin: ",o,"; ","stroke-miterlimit: ",u,"; ","fill: ",e,"; ","fill-rule: ",t,"; ","opacity: ",a,";",l,f].join("")},getSvgTransform:function(){if(this.group)return"";var e=fabric.util.toFixed,t=this.getAngle(),n=this.getViewportTransform(),r=fabric.util.transformPoint(this.getCenterPoint(),n),i=fabric.Object.NUM_FRACTION_DIGITS,s=this.type==="path-group"?"":"translate("+e(r.x,i)+" "+e(r.y,i)+")",o=t!==0?" rotate("+e(t,i)+")":"",u=this.scaleX===1&&this.scaleY===1&&n[0]===1&&n[3]===1?"":" scale("+e(this.scaleX*n[0],i)+" "+e(this.scaleY*n[3],i)+")",a=this.type==="path-group"?this.width*n[0]:0,f=this.flipX?" matrix(-1 0 0 1 "+a+" 0) ":"",l=this.type==="path-group"?this.height*n[3]:0,c=this.flipY?" matrix(1 0 0 -1 0 "+l+")":"";return[s,o,u,f,c].join("")},getSvgTransformMatrix:function(){return this.transformMatrix?" matrix("+this.transformMatrix.join(" ")+")":""},_createBaseSVGMarkup:function(){var e=[];return this.fill&&this.fill.toLive&&e.push(this.fill.toSVG(this,!1)),this.stroke&&this.stroke.toLive&&e.push(this.stroke.toSVG(this,!1)),this.shadow&&e.push(this.shadow.toSVG(this)),e}}),fabric.util.object.extend(fabric.Object.prototype,{hasStateChanged:function(){return this.stateProperties.some(function(e){return this.get(e)!==this.originalState[e]},this)},saveState:function(e){return this.stateProperties.forEach(function(e){this.originalState[e]=this.get(e)},this),e&&e.stateProperties&&e.stateProperties.forEach(function(e){this.originalState[e]=this.get(e)},this),this},setupState:function(){return this.originalState={},this.saveState(),this}}),function(){var e=fabric.util.degreesToRadians,t=function(){return typeof G_vmlCanvasManager!="undefined"};fabric.util.object.extend(fabric.Object.prototype,{_controlsVisibility:null,_findTargetCorner:function(e){if(!this.hasControls||!this.active)return!1;var t=e.x,n=e.y,r,i;for(var s in this.oCoords){if(!this.isControlVisible(s))continue;if(s==="mtr"&&!this.hasRotatingPoint)continue;if(!(!this.get("lockUniScaling")||s!=="mt"&&s!=="mr"&&s!=="mb"&&s!=="ml"))continue;i=this._getImageLines(this.oCoords[s].corner),r=this._findCrossPoints({x:t,y:n},i);if(r!==0&&r%2===1)return this.__corner=s,s}return!1},_setCornerCoords:function(){var t=this.oCoords,n=e(this.angle),r=e(45-this.angle),i=Math.sqrt(2*Math.pow(this.cornerSize,2))/2,s=i*Math.cos(r),o=i*Math.sin(r),u=Math.sin(n),a=Math.cos(n);t.tl.corner={tl:{x:t.tl.x-o,y:t.tl.y-s},tr:{x:t.tl.x+s,y:t.tl.y-o},bl:{x:t.tl.x-s,y:t.tl.y+o},br:{x:t.tl.x+o,y:t.tl.y+s}},t.tr.corner={tl:{x:t.tr.x-o,y:t.tr.y-s},tr:{x:t.tr.x+s,y:t.tr.y-o},br:{x:t.tr.x+o,y:t.tr.y+s},bl:{x:t.tr.x-s,y:t.tr.y+o}},t.bl.corner={tl:{x:t.bl.x-o,y:t.bl.y-s},bl:{x:t.bl.x-s,y:t.bl.y+o},br:{x:t.bl.x+o,y:t.bl.y+s},tr:{x:t.bl.x+s,y:t.bl.y-o}},t.br.corner={tr:{x:t.br.x+s,y:t.br.y-o},bl:{x:t.br.x-s,y:t.br.y+o},br:{x:t.br.x+o,y:t.br.y+s},tl:{x:t.br.x-o,y:t.br.y-s}},t.ml.corner={tl:{x:t.ml.x-o,y:t.ml.y-s},tr:{x:t.ml.x+s,y:t.ml.y-o},bl:{x:t.ml.x-s,y:t.ml.y+o},br:{x:t.ml.x+o,y:t.ml.y+s}},t.mt.corner={tl:{x:t.mt.x-o,y:t.mt.y-s},tr:{x:t.mt.x+s,y:t.mt.y-o},bl:{x:t.mt.x-s,y:t.mt.y+o},br:{x:t.mt.x+o,y:t.mt.y+s}},t.mr.corner={tl:{x:t.mr.x-o,y:t.mr.y-s},tr:{x:t.mr.x+s,y:t.mr.y-o},bl:{x:t.mr.x-s,y:t.mr.y+o},br:{x:t.mr.x+o,y:t.mr.y+s}},t.mb.corner={tl:{x:t.mb.x-o,y:t.mb.y-s},tr:{x:t.mb.x+s,y:t.mb.y-o},bl:{x:t.mb.x-s,y:t.mb.y+o},br:{x:t.mb.x+o,y:t.mb.y+s}},t.mtr.corner={tl:{x:t.mtr.x-o+u*this.rotatingPointOffset,y:t.mtr.y-s-a*this.rotatingPointOffset},tr:{x:t.mtr.x+s+u*this.rotatingPointOffset,y:t.mtr.y-o-a*this.rotatingPointOffset},bl:{x:t.mtr.x-s+u*this.rotatingPointOffset,y:t.mtr.y+o-a*this.rotatingPointOffset},br:{x:t.mtr.x+o+u*this.rotatingPointOffset,y:t.mtr.y+s-a*this.rotatingPointOffset}}},drawBorders:function(e){if(!this.hasBorders)return this;var t=this.padding,n=t*2,r=this.getViewportTransform();e.save(),e.globalAlpha=this.isMoving?this.borderOpacityWhenMoving:1,e.strokeStyle=this.borderColor;var i=1/this._constrainScale(this.scaleX),s=1/this._constrainScale(this.scaleY);e.lineWidth=1/this.borderScaleFactor;var o=this.getWidth(),u=this.getHeight(),a=this.strokeWidth>1?this.strokeWidth:0,f=this.strokeLineCap==="round"||this.strokeLineCap==="square",l=this.type==="line"&&this.width===1,c=this.type==="line"&&this.height===1,h=f&&c||this.type!=="line",p=f&&l||this.type!=="line";l?o=a/i:c&&(u=a/s),h&&(o+=a/i),p&&(u+=a/s);var d=fabric.util.transformPoint(new fabric.Point(o,u),r,!0),v=d.x,m=d.y;this.group&&(v*=this.group.scaleX,m*=this.group.scaleY),e.strokeRect(~~(-(v/2)-t)-.5,~~(-(m/2)-t)-.5,~~(v+n)+1,~~(m+n)+1);if(this.hasRotatingPoint&&this.isControlVisible("mtr")&&!this.get("lockRotation")&&this.hasControls){var g=(-m-t*2)/2;e.beginPath(),e.moveTo(0,g),e.lineTo(0,g-this.rotatingPointOffset),e.closePath(),e.stroke()}return e.restore(),this},drawControls:function(e){if(!this.hasControls)return this;var t=this.cornerSize,n=t/2,r=this.getViewportTransform(),i=this.strokeWidth>1?this.strokeWidth:0,s=this.width,o=this.height,u=this.strokeLineCap==="round"||this.strokeLineCap==="square",a=this.type==="line"&&this.width===1,f=this.type==="line"&&this.height===1,l=u&&f||this.type!=="line",c=u&&a||this.type!=="line";a?s=i:f&&(o=i),l&&(s+=i),c&&(o+=i),s*=this.scaleX,o*=this.scaleY;var h=fabric.util.transformPoint(new fabric.Point(s,o),r,!0),p=h.x,d=h.y,v=-(p/2),m=-(d/2),g=this.padding,y=n,b=n-t,w=this.transparentCorners?"strokeRect":"fillRect";return e.save(),e.lineWidth=1,e.globalAlpha=this.isMoving?this.borderOpacityWhenMoving:1,e.strokeStyle=e.fillStyle=this.cornerColor,this._drawControl("tl",e,w,v-y-g,m-y-g),this._drawControl("tr",e,w,v+p-y+g,m-y-g),this._drawControl("bl",e,w,v-y-g,m+d+b+g),this._drawControl("br",e,w,v+p+b+g,m+d+b+g),this.get("lockUniScaling")||(this._drawControl("mt",e,w,v+p/2-y,m-y-g),this._drawControl("mb",e,w,v+p/2-y,m+d+b+g),this._drawControl("mr",e,w,v+p+b+g,m+d/2-y),this._drawControl("ml",e,w,v-y-g,m+d/2-y)),this.hasRotatingPoint&&this._drawControl("mtr",e,w,v+p/2-y,m-this.rotatingPointOffset-this.cornerSize/2-g),e.restore(),this},_drawControl:function(e,n,r,i,s){var o=this.cornerSize;this.isControlVisible(e)&&(t()||this.transparentCorners||n.clearRect(i,s,o,o),n[r](i,s,o,o))},isControlVisible:function(e){return this._getControlsVisibility()[e]},setControlVisible:function(e,t){return this._getControlsVisibility()[e]=t,this},setControlsVisibility:function(e){e||(e={});for(var t in e)this.setControlVisible(t,e[t]);return this},_getControlsVisibility:function(){return this._controlsVisibility||(this._controlsVisibility={tl:!0,tr:!0,br:!0,bl:!0,ml:!0,mt:!0,mr:!0,mb:!0,mtr:!0}),this._controlsVisibility}})}(),fabric.util.object.extend(fabric.StaticCanvas.prototype,{FX_DURATION:500,fxCenterObjectH:function(e,t){t=t||{};var n=function(){},r=t.onComplete||n,i=t.onChange||n,s=this;return fabric.util.animate({startValue:e.get("left"),endValue:this.getCenter().left,duration:this.FX_DURATION,onChange:function(t){e.set("left",t),s.renderAll(),i()},onComplete:function(){e.setCoords(),r()}}),this},fxCenterObjectV:function(e,t){t=t||{};var n=function(){},r=t.onComplete||n,i=t.onChange||n,s=this;return fabric.util.animate({startValue:e.get("top"),endValue:this.getCenter().top,duration:this.FX_DURATION,onChange:function(t){e.set("top",t),s.renderAll(),i()},onComplete:function(){e.setCoords(),r()}}),this},fxRemove:function(e,t){t=t||{};var n=function(){},r=t.onComplete||n,i=t.onChange||n,s=this;return fabric.util.animate({startValue:e.get("opacity"),endValue:0,duration:this.FX_DURATION,onStart:function(){e.set("active",!1)},onChange:function(t){e.set("opacity",t),s.renderAll(),i()},onComplete:function(){s.remove(e),r()}}),this}}),fabric.util.object.extend(fabric.Object.prototype,{animate:function(){if(arguments[0]&&typeof arguments[0]=="object"){var e=[],t,n;for(t in arguments[0])e.push(t);for(var r=0,i=e.length;r<i;r++)t=e[r],n=r!==i-1,this._animate(t,arguments[0][t],arguments[1],n)}else this._animate.apply(this,arguments);return this},_animate:function(e,t,n,r){var i=this,s;t=t.toString(),n?n=fabric.util.object.clone(n):n={},~e.indexOf(".")&&(s=e.split("."));var o=s?this.get(s[0])[s[1]]:this.get(e);"from"in n||(n.from=o),~t.indexOf("=")?t=o+parseFloat(t.replace("=","")):t=parseFloat(t),fabric.util.animate({startValue:n.from,endValue:t,byValue:n.by,easing:n.easing,duration:n.duration,abort:n.abort&&function(){return n.abort.call(i)},onChange:function(t){s?i[s[0]][s[1]]=t:i.set(e,t);if(r)return;n.onChange&&n.onChange()},onComplete:function(){if(r)return;i.setCoords(),n.onComplete&&n.onComplete()}})}}),function(e){"use strict";function s(e,t){var n=e.origin,r=e.axis1,i=e.axis2,s=e.dimension,o=t.nearest,u=t.center,a=t.farthest;return function(){switch(this.get(n)){case o:return Math.min(this.get(r),this.get(i));case u:return Math.min(this.get(r),this.get(i))+.5*this.get(s);case a:return Math.max(this.get(r),this.get(i))}}}var t=e.fabric||(e.fabric={}),n=t.util.object.extend,r={x1:1,x2:1,y1:1,y2:1},i=t.StaticCanvas.supports("setLineDash");if(t.Line){t.warn("fabric.Line is already defined");return}t.Line=t.util.createClass(t.Object,{type:"line",x1:0,y1:0,x2:0,y2:0,initialize:function(e,t){t=t||{},e||(e=[0,0,0,0]),this.callSuper("initialize",t),this.set("x1",e[0]),this.set("y1",e[1]),this.set("x2",e[2]),this.set("y2",e[3]),this._setWidthHeight(t)},_setWidthHeight:function(e){e||(e={}),this.width=Math.abs(this.x2-this.x1)||1,this.height=Math.abs(this.y2-this.y1)||1,this.left="left"in e?e.left:this._getLeftToOriginX(),this.top="top"in e?e.top:this._getTopToOriginY()},_set:function(e,t){return this[e]=t,typeof r[e]!="undefined"&&this._setWidthHeight(),this},_getLeftToOriginX:s({origin:"originX",axis1:"x1",axis2:"x2",dimension:"width"},{nearest:"left",center:"center",farthest:"right"}),_getTopToOriginY:s({origin:"originY",axis1:"y1",axis2:"y2",dimension:"height"},{nearest:"top",center:"center",farthest:"bottom"}),_render:function(e,t){e.beginPath();if(t){var n=this.getCenterPoint();e.translate(n.x,n.y)}if(!this.strokeDashArray||this.strokeDashArray&&i){var r=this.x1<=this.x2?-1:1,s=this.y1<=this.y2?-1:1;e.moveTo(this.width===1?0:r*this.width/2,this.height===1?0:s*this.height/2),e.lineTo(this.width===1?0:r*-1*this.width/2,this.height===1?0:s*-1*this.height/2)}e.lineWidth=this.strokeWidth;var o=e.strokeStyle;e.strokeStyle=this.stroke||e.fillStyle,this.stroke&&this._renderStroke(e),e.strokeStyle=o},_renderDashedStroke:function(e){var n=this.x1<=this.x2?-1:1,r=this.y1<=this.y2?-1:1,i=this.width===1?0:n*this.width/2,s=this.height===1?0:r*this.height/2;e.beginPath(),t.util.drawDashedLine(e,i,s,-i,-s,this.strokeDashArray),e.closePath()},toObject:function(e){return n(this.callSuper("toObject",e),{x1:this.get("x1"),y1:this.get("y1"),x2:this.get("x2"),y2:this.get("y2")})},toSVG:function(e){var t=this._createBaseSVGMarkup(),n="";if(!this.group){var r=-this.width/2-(this.x1>this.x2?this.x2:this.x1),i=-this.height/2-(this.y1>this.y2?this.y2:this.y1);n="translate("+r+", "+i+") "}return t.push("<line ",'x1="',this.x1,'" y1="',this.y1,'" x2="',this.x2,'" y2="',this.y2,'" style="',this.getSvgStyles(),'" transform="',this.getSvgTransform(),n,this.getSvgTransformMatrix(),'"/>\n'),e?e(t.join("")):t.join("")},complexity:function(){return 1}}),t.Line.ATTRIBUTE_NAMES=t.SHARED_ATTRIBUTES.concat("x1 y1 x2 y2".split(" ")),t.Line.fromElement=function(e,r){var i=t.parseAttributes(e,t.Line.ATTRIBUTE_NAMES),s=[i.x1||0,i.y1||0,i.x2||0,i.y2||0];return new t.Line(s,n(i,r))},t.Line.fromObject=function(e){var n=[e.x1,e.y1,e.x2,e.y2];return new t.Line(n,e)}}(typeof exports!="undefined"?exports:this),function(e){"use strict";function i(e){return"radius"in e&&e.radius>0}var t=e.fabric||(e.fabric={}),n=Math.PI*2,r=t.util.object.extend;if(t.Circle){t.warn("fabric.Circle is already defined.");return}t.Circle=t.util.createClass(t.Object,{type:"circle",radius:0,initialize:function(e){e=e||{},this.callSuper("initialize",e),this.set("radius",e.radius||0)},_set:function(e,t){return this.callSuper("_set",e,t),e==="radius"&&this.setRadius(t),this},toObject:function(e){return r(this.callSuper("toObject",e),{radius:this.get("radius")})},toSVG:function(e){var t=this._createBaseSVGMarkup(),n=0,r=0;return this.group&&(n=this.left+this.radius,r=this.top+
this.radius),t.push("<circle ",'cx="'+n+'" cy="'+r+'" ','r="',this.radius,'" style="',this.getSvgStyles(),'" transform="',this.getSvgTransform()," ",this.getSvgTransformMatrix(),'"/>\n'),e?e(t.join("")):t.join("")},_render:function(e,t){e.beginPath(),e.arc(t?this.left+this.radius:0,t?this.top+this.radius:0,this.radius,0,n,!1),this._renderFill(e),this._renderStroke(e)},getRadiusX:function(){return this.get("radius")*this.get("scaleX")},getRadiusY:function(){return this.get("radius")*this.get("scaleY")},setRadius:function(e){this.radius=e,this.set("width",e*2).set("height",e*2)},complexity:function(){return 1}}),t.Circle.ATTRIBUTE_NAMES=t.SHARED_ATTRIBUTES.concat("cx cy r".split(" ")),t.Circle.fromElement=function(e,n){n||(n={});var s=t.parseAttributes(e,t.Circle.ATTRIBUTE_NAMES);if(!i(s))throw new Error("value of `r` attribute is required and can not be negative");s.left=s.left||0,s.top=s.top||0;var o=new t.Circle(r(s,n));return o.left-=o.radius,o.top-=o.radius,o},t.Circle.fromObject=function(e){return new t.Circle(e)}}(typeof exports!="undefined"?exports:this),function(e){"use strict";var t=e.fabric||(e.fabric={});if(t.Triangle){t.warn("fabric.Triangle is already defined");return}t.Triangle=t.util.createClass(t.Object,{type:"triangle",initialize:function(e){e=e||{},this.callSuper("initialize",e),this.set("width",e.width||100).set("height",e.height||100)},_render:function(e){var t=this.width/2,n=this.height/2;e.beginPath(),e.moveTo(-t,n),e.lineTo(0,-n),e.lineTo(t,n),e.closePath(),this._renderFill(e),this._renderStroke(e)},_renderDashedStroke:function(e){var n=this.width/2,r=this.height/2;e.beginPath(),t.util.drawDashedLine(e,-n,r,0,-r,this.strokeDashArray),t.util.drawDashedLine(e,0,-r,n,r,this.strokeDashArray),t.util.drawDashedLine(e,n,r,-n,r,this.strokeDashArray),e.closePath()},toSVG:function(e){var t=this._createBaseSVGMarkup(),n=this.width/2,r=this.height/2,i=[-n+" "+r,"0 "+ -r,n+" "+r].join(",");return t.push("<polygon ",'points="',i,'" style="',this.getSvgStyles(),'" transform="',this.getSvgTransform(),'"/>'),e?e(t.join("")):t.join("")},complexity:function(){return 1}}),t.Triangle.fromObject=function(e){return new t.Triangle(e)}}(typeof exports!="undefined"?exports:this),function(e){"use strict";var t=e.fabric||(e.fabric={}),n=Math.PI*2,r=t.util.object.extend;if(t.Ellipse){t.warn("fabric.Ellipse is already defined.");return}t.Ellipse=t.util.createClass(t.Object,{type:"ellipse",rx:0,ry:0,initialize:function(e){e=e||{},this.callSuper("initialize",e),this.set("rx",e.rx||0),this.set("ry",e.ry||0),this.set("width",this.get("rx")*2),this.set("height",this.get("ry")*2)},toObject:function(e){return r(this.callSuper("toObject",e),{rx:this.get("rx"),ry:this.get("ry")})},toSVG:function(e){var t=this._createBaseSVGMarkup(),n=0,r=0;return this.group&&(n=this.left+this.rx,r=this.top+this.ry),t.push("<ellipse ",'cx="',n,'" cy="',r,'" ','rx="',this.rx,'" ry="',this.ry,'" style="',this.getSvgStyles(),'" transform="',this.getSvgTransform(),this.getSvgTransformMatrix(),'"/>\n'),e?e(t.join("")):t.join("")},_render:function(e,t){e.beginPath(),e.save(),e.transform(1,0,0,this.ry/this.rx,0,0),e.arc(t?this.left+this.rx:0,t?(this.top+this.ry)*this.rx/this.ry:0,this.rx,0,n,!1),e.restore(),this._renderFill(e),this._renderStroke(e)},complexity:function(){return 1}}),t.Ellipse.ATTRIBUTE_NAMES=t.SHARED_ATTRIBUTES.concat("cx cy rx ry".split(" ")),t.Ellipse.fromElement=function(e,n){n||(n={});var i=t.parseAttributes(e,t.Ellipse.ATTRIBUTE_NAMES);i.left=i.left||0,i.top=i.top||0;var s=new t.Ellipse(r(i,n));return s.top-=s.ry,s.left-=s.rx,s},t.Ellipse.fromObject=function(e){return new t.Ellipse(e)}}(typeof exports!="undefined"?exports:this),function(e){"use strict";var t=e.fabric||(e.fabric={}),n=t.util.object.extend;if(t.Rect){console.warn("fabric.Rect is already defined");return}var r=t.Object.prototype.stateProperties.concat();r.push("rx","ry","x","y"),t.Rect=t.util.createClass(t.Object,{stateProperties:r,type:"rect",rx:0,ry:0,strokeDashArray:null,initialize:function(e){e=e||{},this.callSuper("initialize",e),this._initRxRy()},_initRxRy:function(){this.rx&&!this.ry?this.ry=this.rx:this.ry&&!this.rx&&(this.rx=this.ry)},_render:function(e,t){if(this.width===1&&this.height===1){e.fillRect(0,0,1,1);return}var n=this.rx?Math.min(this.rx,this.width/2):0,r=this.ry?Math.min(this.ry,this.height/2):0,i=this.width,s=this.height,o=t?this.left:0,u=t?this.top:0,a=n!==0||r!==0,f=.4477152502;e.beginPath(),t||e.translate(-this.width/2,-this.height/2),e.moveTo(o+n,u),e.lineTo(o+i-n,u),a&&e.bezierCurveTo(o+i-f*n,u,o+i,u+f*r,o+i,u+r),e.lineTo(o+i,u+s-r),a&&e.bezierCurveTo(o+i,u+s-f*r,o+i-f*n,u+s,o+i-n,u+s),e.lineTo(o+n,u+s),a&&e.bezierCurveTo(o+f*n,u+s,o,u+s-f*r,o,u+s-r),e.lineTo(o,u+r),a&&e.bezierCurveTo(o,u+f*r,o+f*n,u,o+n,u),e.closePath(),this._renderFill(e),this._renderStroke(e)},_renderDashedStroke:function(e){var n=-this.width/2,r=-this.height/2,i=this.width,s=this.height;e.beginPath(),t.util.drawDashedLine(e,n,r,n+i,r,this.strokeDashArray),t.util.drawDashedLine(e,n+i,r,n+i,r+s,this.strokeDashArray),t.util.drawDashedLine(e,n+i,r+s,n,r+s,this.strokeDashArray),t.util.drawDashedLine(e,n,r+s,n,r,this.strokeDashArray),e.closePath()},toObject:function(e){var t=n(this.callSuper("toObject",e),{rx:this.get("rx")||0,ry:this.get("ry")||0});return this.includeDefaultValues||this._removeDefaultValues(t),t},toSVG:function(e){var t=this._createBaseSVGMarkup(),n=this.left,r=this.top;return this.group||(n=-this.width/2,r=-this.height/2),t.push("<rect ",'x="',n,'" y="',r,'" rx="',this.get("rx"),'" ry="',this.get("ry"),'" width="',this.width,'" height="',this.height,'" style="',this.getSvgStyles(),'" transform="',this.getSvgTransform(),this.getSvgTransformMatrix(),'"/>\n'),e?e(t.join("")):t.join("")},complexity:function(){return 1}}),t.Rect.ATTRIBUTE_NAMES=t.SHARED_ATTRIBUTES.concat("x y rx ry width height".split(" ")),t.Rect.fromElement=function(e,r){if(!e)return null;r=r||{};var i=t.parseAttributes(e,t.Rect.ATTRIBUTE_NAMES);return i.left=i.left||0,i.top=i.top||0,new t.Rect(n(r?t.util.object.clone(r):{},i))},t.Rect.fromObject=function(e){return new t.Rect(e)}}(typeof exports!="undefined"?exports:this),function(e){"use strict";var t=e.fabric||(e.fabric={}),n=t.util.toFixed;if(t.Polyline){t.warn("fabric.Polyline is already defined");return}t.Polyline=t.util.createClass(t.Object,{type:"polyline",points:null,initialize:function(e,t,n){t=t||{},this.set("points",e),this.callSuper("initialize",t),this._calcDimensions(n)},_calcDimensions:function(e){return t.Polygon.prototype._calcDimensions.call(this,e)},toObject:function(e){return t.Polygon.prototype.toObject.call(this,e)},toSVG:function(e){var t=[],r=this._createBaseSVGMarkup();for(var i=0,s=this.points.length;i<s;i++)t.push(n(this.points[i].x,2),",",n(this.points[i].y,2)," ");return r.push("<polyline ",'points="',t.join(""),'" style="',this.getSvgStyles(),'" transform="',this.getSvgTransform()," ",this.getSvgTransformMatrix(),'"/>\n'),e?e(r.join("")):r.join("")},_render:function(e){var t;e.beginPath(),e.moveTo(this.points[0].x,this.points[0].y);for(var n=0,r=this.points.length;n<r;n++)t=this.points[n],e.lineTo(t.x,t.y);this._renderFill(e),this._renderStroke(e)},_renderDashedStroke:function(e){var n,r;e.beginPath();for(var i=0,s=this.points.length;i<s;i++)n=this.points[i],r=this.points[i+1]||n,t.util.drawDashedLine(e,n.x,n.y,r.x,r.y,this.strokeDashArray)},complexity:function(){return this.get("points").length}}),t.Polyline.ATTRIBUTE_NAMES=t.SHARED_ATTRIBUTES.concat(),t.Polyline.fromElement=function(e,n){if(!e)return null;n||(n={});var r=t.parsePointsAttribute(e.getAttribute("points")),i=t.parseAttributes(e,t.Polyline.ATTRIBUTE_NAMES);return r===null?null:new t.Polyline(r,t.util.object.extend(i,n),!0)},t.Polyline.fromObject=function(e){var n=e.points;return new t.Polyline(n,e,!0)}}(typeof exports!="undefined"?exports:this),function(e){"use strict";var t=e.fabric||(e.fabric={}),n=t.util.object.extend,r=t.util.array.min,i=t.util.array.max,s=t.util.toFixed;if(t.Polygon){t.warn("fabric.Polygon is already defined");return}t.Polygon=t.util.createClass(t.Object,{type:"polygon",points:null,initialize:function(e,t,n){t=t||{},this.points=e,this.callSuper("initialize",t),this._calcDimensions(n)},_calcDimensions:function(e){var t=this.points,n=r(t,"x"),s=r(t,"y"),o=i(t,"x"),u=i(t,"y");this.width=o-n||1,this.height=u-s||1,this.minX=n,this.minY=s;if(e)return;var a=this.width/2+this.minX,f=this.height/2+this.minY;this.points.forEach(function(e){e.x-=a,e.y-=f},this)},toObject:function(e){return n(this.callSuper("toObject",e),{points:this.points.concat()})},toSVG:function(e){var t=[],n=this._createBaseSVGMarkup();for(var r=0,i=this.points.length;r<i;r++)t.push(s(this.points[r].x,2),",",s(this.points[r].y,2)," ");return n.push("<polygon ",'points="',t.join(""),'" style="',this.getSvgStyles(),'" transform="',this.getSvgTransform()," ",this.getSvgTransformMatrix(),'"/>\n'),e?e(n.join("")):n.join("")},_render:function(e){var t;e.beginPath(),e.moveTo(this.points[0].x,this.points[0].y);for(var n=0,r=this.points.length;n<r;n++)t=this.points[n],e.lineTo(t.x,t.y);this._renderFill(e);if(this.stroke||this.strokeDashArray)e.closePath(),this._renderStroke(e)},_renderDashedStroke:function(e){var n,r;e.beginPath();for(var i=0,s=this.points.length;i<s;i++)n=this.points[i],r=this.points[i+1]||this.points[0],t.util.drawDashedLine(e,n.x,n.y,r.x,r.y,this.strokeDashArray);e.closePath()},complexity:function(){return this.points.length}}),t.Polygon.ATTRIBUTE_NAMES=t.SHARED_ATTRIBUTES.concat(),t.Polygon.fromElement=function(e,r){if(!e)return null;r||(r={});var i=t.parsePointsAttribute(e.getAttribute("points")),s=t.parseAttributes(e,t.Polygon.ATTRIBUTE_NAMES);return i===null?null:new t.Polygon(i,n(s,r),!0)},t.Polygon.fromObject=function(e){return new t.Polygon(e.points,e,!0)}}(typeof exports!="undefined"?exports:this),function(e){"use strict";function f(e){return e[0]==="H"?e[1]:e[e.length-2]}function l(e){return e[0]==="V"?e[1]:e[e.length-1]}var t=e.fabric||(e.fabric={}),n=t.util.array.min,r=t.util.array.max,i=t.util.object.extend,s=Object.prototype.toString,o=t.util.drawArc,u={m:2,l:2,h:1,v:1,c:6,s:4,q:4,t:2,a:7},a={m:"l",M:"L"};if(t.Path){t.warn("fabric.Path is already defined");return}t.Path=t.util.createClass(t.Object,{type:"path",path:null,initialize:function(e,t){t=t||{},this.setOptions(t);if(!e)throw new Error("`path` argument is required");var n=s.call(e)==="[object Array]";this.path=n?e:e.match&&e.match(/[mzlhvcsqta][^mzlhvcsqta]*/gi);if(!this.path)return;n||(this.path=this._parsePath()),this._initializePath(t),t.sourcePath&&this.setSourcePath(t.sourcePath)},_initializePath:function(e){var t="width"in e&&e.width!=null,n="height"in e&&e.width!=null,r="left"in e,s="top"in e,o=r?this.left:0,u=s?this.top:0;!t||!n?(i(this,this._parseDimensions()),t&&(this.width=e.width),n&&(this.height=e.height)):(s||(this.top=this.height/2),r||(this.left=this.width/2)),this.pathOffset=this.pathOffset||this._calculatePathOffset(o,u)},_calculatePathOffset:function(e,t){return{x:this.left-e-this.width/2,y:this.top-t-this.height/2}},_render:function(e,t){var n,r=null,i=0,s=0,u=0,a=0,f=0,l=0,c,h,p,d,v=-(this.width/2+this.pathOffset.x),m=-(this.height/2+this.pathOffset.y);t&&(v+=this.width/2,m+=this.height/2);for(var g=0,y=this.path.length;g<y;++g){n=this.path[g];switch(n[0]){case"l":u+=n[1],a+=n[2],e.lineTo(u+v,a+m);break;case"L":u=n[1],a=n[2],e.lineTo(u+v,a+m);break;case"h":u+=n[1],e.lineTo(u+v,a+m);break;case"H":u=n[1],e.lineTo(u+v,a+m);break;case"v":a+=n[1],e.lineTo(u+v,a+m);break;case"V":a=n[1],e.lineTo(u+v,a+m);break;case"m":u+=n[1],a+=n[2],i=u,s=a,e.moveTo(u+v,a+m);break;case"M":u=n[1],a=n[2],i=u,s=a,e.moveTo(u+v,a+m);break;case"c":c=u+n[5],h=a+n[6],f=u+n[3],l=a+n[4],e.bezierCurveTo(u+n[1]+v,a+n[2]+m,f+v,l+m,c+v,h+m),u=c,a=h;break;case"C":u=n[5],a=n[6],f=n[3],l=n[4],e.bezierCurveTo(n[1]+v,n[2]+m,f+v,l+m,u+v,a+m);break;case"s":c=u+n[3],h=a+n[4],f=f?2*u-f:u,l=l?2*a-l:a,e.bezierCurveTo(f+v,l+m,u+n[1]+v,a+n[2]+m,c+v,h+m),f=u+n[1],l=a+n[2],u=c,a=h;break;case"S":c=n[3],h=n[4],f=2*u-f,l=2*a-l,e.bezierCurveTo(f+v,l+m,n[1]+v,n[2]+m,c+v,h+m),u=c,a=h,f=n[1],l=n[2];break;case"q":c=u+n[3],h=a+n[4],f=u+n[1],l=a+n[2],e.quadraticCurveTo(f+v,l+m,c+v,h+m),u=c,a=h;break;case"Q":c=n[3],h=n[4],e.quadraticCurveTo(n[1]+v,n[2]+m,c+v,h+m),u=c,a=h,f=n[1],l=n[2];break;case"t":c=u+n[1],h=a+n[2],r[0].match(/[QqTt]/)===null?(f=u,l=a):r[0]==="t"?(f=2*u-p,l=2*a-d):r[0]==="q"&&(f=2*u-f,l=2*a-l),p=f,d=l,e.quadraticCurveTo(f+v,l+m,c+v,h+m),u=c,a=h,f=u+n[1],l=a+n[2];break;case"T":c=n[1],h=n[2],f=2*u-f,l=2*a-l,e.quadraticCurveTo(f+v,l+m,c+v,h+m),u=c,a=h;break;case"a":o(e,u+v,a+m,[n[1],n[2],n[3],n[4],n[5],n[6]+u+v,n[7]+a+m]),u+=n[6],a+=n[7];break;case"A":o(e,u+v,a+m,[n[1],n[2],n[3],n[4],n[5],n[6]+v,n[7]+m]),u=n[6],a=n[7];break;case"z":case"Z":u=i,a=s,e.closePath()}r=n}},render:function(e,n){if(!this.visible)return;e.save(),n&&e.translate(-this.width/2,-this.height/2);var r=this.transformMatrix;r&&e.transform(r[0],r[1],r[2],r[3],r[4],r[5]),n||this.transform(e),this._setStrokeStyles(e),this._setFillStyles(e),this._setShadow(e),this.clipTo&&t.util.clipContext(this,e),e.beginPath(),e.globalAlpha=this.group?e.globalAlpha*this.opacity:this.opacity,this._render(e,n),this._renderFill(e),this._renderStroke(e),this.clipTo&&e.restore(),this._removeShadow(e),e.restore()},toString:function(){return"#<fabric.Path ("+this.complexity()+'): { "top": '+this.top+', "left": '+this.left+" }>"},toObject:function(e){var t=i(this.callSuper("toObject",e),{path:this.path.map(function(e){return e.slice()}),pathOffset:this.pathOffset});return this.sourcePath&&(t.sourcePath=this.sourcePath),this.transformMatrix&&(t.transformMatrix=this.transformMatrix),t},toDatalessObject:function(e){var t=this.toObject(e);return this.sourcePath&&(t.path=this.sourcePath),delete t.sourcePath,t},toSVG:function(e){var t=[],n=this._createBaseSVGMarkup();for(var r=0,i=this.path.length;r<i;r++)t.push(this.path[r].join(" "));var s=t.join(" ");return n.push("<path ",'d="',s,'" style="',this.getSvgStyles(),'" transform="',this.getSvgTransform(),this.getSvgTransformMatrix(),'" stroke-linecap="round" ',"/>\n"),e?e(n.join("")):n.join("")},complexity:function(){return this.path.length},_parsePath:function(){var e=[],t=[],n,r,i=/([-+]?((\d+\.\d+)|((\d+)|(\.\d+)))(?:e[-+]?\d+)?)/ig,s,o;for(var f=0,l,c=this.path.length;f<c;f++){n=this.path[f],o=n.slice(1).trim(),t.length=0;while(s=i.exec(o))t.push(s[0]);l=[n.charAt(0)];for(var h=0,p=t.length;h<p;h++)r=parseFloat(t[h]),isNaN(r)||l.push(r);var d=l[0],v=u[d.toLowerCase()],m=a[d]||d;if(l.length-1>v)for(var g=1,y=l.length;g<y;g+=v)e.push([d].concat(l.slice(g,g+v))),d=m;else e.push(l)}return e},_parseDimensions:function(){var e=[],t=[],i={};this.path.forEach(function(n,r){this._getCoordsFromCommand(n,r,e,t,i)},this);var s=n(e),o=n(t),u=r(e),a=r(t),f=u-s,l=a-o,c={left:this.left+(s+f/2),top:this.top+(o+l/2),width:f,height:l};return c},_getCoordsFromCommand:function(e,t,n,r,i){var s=!1;e[0]!=="H"&&(i.x=t===0?f(e):f(this.path[t-1])),e[0]!=="V"&&(i.y=t===0?l(e):l(this.path[t-1])),e[0]===e[0].toLowerCase()&&(s=!0);var o=this._getXY(e,s,i),u;u=parseInt(o.x,10),isNaN(u)||n.push(u),u=parseInt(o.y,10),isNaN(u)||r.push(u)},_getXY:function(e,t,n){var r=t?n.x+f(e):e[0]==="V"?n.x:f(e),i=t?n.y+l(e):e[0]==="H"?n.y:l(e);return{x:r,y:i}}}),t.Path.fromObject=function(e,n){typeof e.path=="string"?t.loadSVGFromURL(e.path,function(r){var i=r[0],s=e.path;delete e.path,t.util.object.extend(i,e),i.setSourcePath(s),n(i)}):n(new t.Path(e.path,e))},t.Path.ATTRIBUTE_NAMES=t.SHARED_ATTRIBUTES.concat(["d"]),t.Path.fromElement=function(e,n,r){var s=t.parseAttributes(e,t.Path.ATTRIBUTE_NAMES);n&&n(new t.Path(s.d,i(s,r)))},t.Path.async=!0}(typeof exports!="undefined"?exports:this),function(e){"use strict";var t=e.fabric||(e.fabric={}),n=t.util.object.extend,r=t.util.array.invoke,i=t.Object.prototype.toObject;if(t.PathGroup){t.warn("fabric.PathGroup is already defined");return}t.PathGroup=t.util.createClass(t.Path,{type:"path-group",fill:"",initialize:function(e,t){t=t||{},this.paths=e||[];for(var n=this.paths.length;n--;)this.paths[n].group=this;this.setOptions(t),t.widthAttr&&(this.scaleX=t.widthAttr/t.width),t.heightAttr&&(this.scaleY=t.heightAttr/t.height),this.setCoords(),t.sourcePath&&this.setSourcePath(t.sourcePath)},render:function(e){if(!this.visible)return;e.save();var n=this.transformMatrix;n&&e.transform(n[0],n[1],n[2],n[3],n[4],n[5]),this.transform(e),this._setShadow(e),this.clipTo&&t.util.clipContext(this,e);for(var r=0,i=this.paths.length;r<i;++r)this.paths[r].render(e,!0);this.clipTo&&e.restore(),this._removeShadow(e),e.restore()},_set:function(e,t){if(e==="fill"&&t&&this.isSameColor()){var n=this.paths.length;while(n--)this.paths[n]._set(e,t)}return this.callSuper("_set",e,t)},toObject:function(e){var t=n(i.call(this,e),{paths:r(this.getObjects(),"toObject",e)});return this.sourcePath&&(t.sourcePath=this.sourcePath),t},toDatalessObject:function(e){var t=this.toObject(e);return this.sourcePath&&(t.paths=this.sourcePath),t},toSVG:function(e){var t=this.getObjects(),n="translate("+this.left+" "+this.top+")",r=["<g ",'style="',this.getSvgStyles(),'" ','transform="',n,this.getSvgTransform(),'" ',">\n"];for(var i=0,s=t.length;i<s;i++)r.push(t[i].toSVG(e));return r.push("</g>\n"),e?e(r.join("")):r.join("")},toString:function(){return"#<fabric.PathGroup ("+this.complexity()+"): { top: "+this.top+", left: "+this.left+" }>"},isSameColor:function(){var e=(this.getObjects()[0].get("fill")||"").toLowerCase();return this.getObjects().every(function(t){return(t.get("fill")||"").toLowerCase()===e})},complexity:function(){return this.paths.reduce(function(e,t){return e+(t&&t.complexity?t.complexity():0)},0)},getObjects:function(){return this.paths}}),t.PathGroup.fromObject=function(e,n){typeof e.paths=="string"?t.loadSVGFromURL(e.paths,function(r){var i=e.paths;delete e.paths;var s=t.util.groupSVGElements(r,e,i);n(s)}):t.util.enlivenObjects(e.paths,function(r){delete e.paths,n(new t.PathGroup(r,e))})},t.PathGroup.async=!0}(typeof exports!="undefined"?exports:this),function(e){"use strict";var t=e.fabric||(e.fabric={}),n=t.util.object.extend,r=t.util.array.min,i=t.util.array.max,s=t.util.array.invoke;if(t.Group)return;var o={lockMovementX:!0,lockMovementY:!0,lockRotation:!0,lockScalingX:!0,lockScalingY:!0,lockUniScaling:!0};t.Group=t.util.createClass(t.Object,t.Collection,{type:"group",initialize:function(e,t){t=t||{},this._objects=e||[];for(var r=this._objects.length;r--;)this._objects[r].group=this;this.originalState={},this.callSuper("initialize"),this._calcBounds(),this._updateObjectsCoords(),t&&n(this,t),this._setOpacityIfSame(),this.setCoords(),this.saveCoords()},_updateObjectsCoords:function(){this.forEachObject(this._updateObjectCoords,this)},_updateObjectCoords:function(e){var t=e.getLeft(),n=e.getTop();e.set({originalLeft:t,originalTop:n,left:t-this.left,top:n-this.top}),e.setCoords(),e.__origHasControls=e.hasControls,e.hasControls=!1},toString:function(){return"#<fabric.Group: ("+this.complexity()+")>"},addWithUpdate:function(e){return this._restoreObjectsState(),e&&(this._objects.push(e),e.group=this),this.forEachObject(this._setObjectActive,this),this._calcBounds(),this._updateObjectsCoords(),this},_setObjectActive:function(e){e.set("active",!0),e.group=this},removeWithUpdate:function(e){return this._moveFlippedObject(e),this._restoreObjectsState(),this.forEachObject(this._setObjectActive,this),this.remove(e),this._calcBounds(),this._updateObjectsCoords(),this},_onObjectAdded:function(e){e.group=this},_onObjectRemoved:function(e){delete e.group,e.set("active",!1)},delegatedProperties:{fill:!0,opacity:!0,fontFamily:!0,fontWeight:!0,fontSize:!0,fontStyle:!0,lineHeight:!0,textDecoration:!0,textAlign:!0,backgroundColor:!0},_set:function(e,t){if(e in this.delegatedProperties){var n=this._objects.length;this[e]=t;while(n--)this._objects[n].set(e,t)}else this[e]=t},toObject:function(e){return n(this.callSuper("toObject",e),{objects:s(this._objects,"toObject",e)})},render:function(e){if(!this.visible)return;e.save(),this.clipTo&&t.util.clipContext(this,e);for(var n=0,r=this._objects.length;n<r;n++)this._renderObject(this._objects[n],e);this.clipTo&&e.restore(),e.restore()},_renderControls:function(e,t){this.callSuper("_renderControls",e,t);for(var n=0,r=this._objects.length;n<r;n++)this._objects[n]._renderControls(e)},_renderObject:function(e,t){var n=e.hasRotatingPoint;if(!e.visible)return;e.hasRotatingPoint=!1,e.render(t),e.hasRotatingPoint=n},_restoreObjectsState:function(){return this._objects.forEach(this._restoreObjectState,this),this},_moveFlippedObject:function(e){var t=e.get("originX"),n=e.get("originY"),r=e.getCenterPoint();e.set({originX:"center",originY:"center",left:r.x,top:r.y}),this._toggleFlipping(e);var i=e.getPointByOrigin(t,n);return e.set({originX:t,originY:n,left:i.x,top:i.y}),this},_toggleFlipping:function(e){this.flipX&&(e.toggle("flipX"),e.set("left",-e.get("left")),e.setAngle(-e.getAngle())),this.flipY&&(e.toggle("flipY"),e.set("top",-e.get("top")),e.setAngle(-e.getAngle()))},_restoreObjectState:function(e){return this._setObjectPosition(e),e.setCoords(),e.hasControls=e.__origHasControls,delete e.__origHasControls,e.set("active",!1),e.setCoords(),delete e.group,this},_setObjectPosition:function(e){var t=this.getLeft(),n=this.getTop(),r=this._getRotatedLeftTop(e);e.set({angle:e.getAngle()+this.getAngle(),left:t+r.left,top:n+r.top,scaleX:e.get("scaleX")*this.get("scaleX"),scaleY:e.get("scaleY")*this.get("scaleY")})},_getRotatedLeftTop:function(e){var t=this.getAngle()*(Math.PI/180);return{left:-Math.sin(t)*e.getTop()*this.get("scaleY")+Math.cos(t)*e.getLeft()*this.get("scaleX"),top:Math.cos(t)*e.getTop()*this.get("scaleY")+Math.sin(t)*e.getLeft()*this.get("scaleX")}},destroy:function(){return this._objects.forEach(this._moveFlippedObject,this),this._restoreObjectsState()},saveCoords:function(){return this._originalLeft=this.get("left"),this._originalTop=this.get("top"),this},hasMoved:function(){return this._originalLeft!==this.get("left")||this._originalTop!==this.get("top")},setObjectsCoords:function(){return this.forEachObject(function(e){e.setCoords()}),this},_setOpacityIfSame:function(){var e=this.getObjects(),t=e[0]?e[0].get("opacity"):1,n=e.every(function(e){return e.get("opacity")===t});n&&(this.opacity=t)},_calcBounds:function(e){var t=[],n=[],r;for(var i=0,s=this._objects.length;i<s;++i){r=this._objects[i],r.setCoords();for(var o in r.oCoords)t.push(r.oCoords[o].x),n.push(r.oCoords[o].y)}this.set(this._getBounds(t,n,e))},_getBounds:function(e,n,s){var o=t.util.invertTransform(this.getViewportTransform()),u=t.util.transformPoint(new t.Point(r(e),r(n)),o),a=t.util.transformPoint(new t.Point(i(e),i(n)),o),f={width:a.x-u.x||0,height:a.y-u.y||0};return s||(f.left=(u.x+a.x)/2||0,f.top=(u.y+a.y)/2||0),f},toSVG:function(e){var t=["<g ",'transform="',this.getSvgTransform(),'">\n'];for(var n=0,r=this._objects.length;n<r;n++)t.push(this._objects[n].toSVG(e));return t.push("</g>\n"),e?e(t.join("")):t.join("")},get:function(e){if(e in o){if(this[e])return this[e];for(var t=0,n=this._objects.length;t<n;t++)if(this._objects[t][e])return!0;return!1}return e in this.delegatedProperties?this._objects[0]&&this._objects[0].get(e):this[e]}}),t.Group.fromObject=function(e,n){t.util.enlivenObjects(e.objects,function(r){delete e.objects,n&&n(new t.Group(r,e))})},t.Group.async=!0}(typeof exports!="undefined"?exports:this),function(e){"use strict";var t=fabric.util.object.extend;e.fabric||(e.fabric={});if(e.fabric.Image){fabric.warn("fabric.Image is already defined.");return}fabric.Image=fabric.util.createClass(fabric.Object,{type:"image",crossOrigin:"",initialize:function(e,t){t||(t={}),this.filters=[],this.callSuper("initialize",t),this._initElement(e,t),this._initConfig(t),t.filters&&(this.filters=t.filters,this.applyFilters())},getElement:function(){return this._element},setElement:function(e,t){return this._element=e,this._originalElement=e,this._initConfig(),this.filters.length!==0&&this.applyFilters(t),this},setCrossOrigin:function(e){return this.crossOrigin=e,this._element.crossOrigin=e,this},getOriginalSize:function(){var e=this.getElement();return{width:e.width,height:e.height}},_stroke:function(e){e.save(),this._setStrokeStyles(e),e.beginPath(),e.strokeRect(-this.width/2,-this.height/2,this.width,this.height),e.closePath(),e.restore()},_renderDashedStroke:function(e){var t=-this.width/2,n=-this.height/2,r=this.width,i=this.height;e.save(),this._setStrokeStyles(e),e.beginPath(),fabric.util.drawDashedLine(e,t,n,t+r,n,this.strokeDashArray),fabric.util.drawDashedLine(e,t+r,n,t+r,n+i,this.strokeDashArray),fabric.util.drawDashedLine(e,t+r,n+i,t,n+i,this.strokeDashArray),fabric.util.drawDashedLine(e,t,n+i,t,n,this.strokeDashArray),e.closePath(),e.restore()},toObject:function(e){return t(this.callSuper("toObject",e),{src:this._originalElement.src||this._originalElement._src,filters:this.filters.map(function(e){return e&&e.toObject()}),crossOrigin:this.crossOrigin})},toSVG:function(e){var t=[],n=-this.width/2,r=-this.height/2;this.group&&(n=this.left,r=this.top),t.push('<g transform="',this.getSvgTransform(),this.getSvgTransformMatrix(),'">\n','<image xlink:href="',this.getSvgSrc(),'" x="',n,'" y="',r,'" style="',this.getSvgStyles(),'" width="',this.width,'" height="',this.height,'" preserveAspectRatio="none"',"></image>\n");if(this.stroke||this.strokeDashArray){var i=this.fill;this.fill=null,t.push("<rect ",'x="',n,'" y="',r,'" width="',this.width,'" height="',this.height,'" style="',this.getSvgStyles(),'"/>\n'),this.fill=i}return t.push("</g>\n"),e?e(t.join("")):t.join("")},getSrc:function(){if(this.getElement())return this.getElement().src||this.getElement()._src},toString:function(){return'#<fabric.Image: { src: "'+this.getSrc()+'" }>'},clone:function(e,t){this.constructor.fromObject(this.toObject(t),e)},applyFilters:function(e){if(!this._originalElement)return;if(this.filters.length===0){this._element=this._originalElement,e&&e();return}var t=this._originalElement,n=fabric.util.createCanvasElement(),r=fabric.util.createImage(),i=this;return n.width=t.width,n.height=t.height,n.getContext("2d").drawImage(t,0,0,t.width,t.height),this.filters.forEach(function(e){e&&e.applyTo(n)}),r.width=t.width,r.height=t.height,fabric.isLikelyNode?(r.src=n.toBuffer(undefined,fabric.Image.pngCompression),i._element=r,e&&e()):(r.onload=function(){i._element=r,e&&e(),r.onload=n=t=null},r.src=n.toDataURL("image/png")),this},_render:function(e,t){this._element&&e.drawImage(this._element,t?this.left:-this.width/2,t?this.top:-this.height/2,this.width,this.height),this._renderStroke(e)},_resetWidthHeight:function(){var e=this.getElement();this.set("width",e.width),this.set("height",e.height)},_initElement:function(e){this.setElement(fabric.util.getById(e)),fabric.util.addClass(this.getElement(),fabric.Image.CSS_CANVAS)},_initConfig:function(e){e||(e={}),this.setOptions(e),this._setWidthHeight(e),this._element&&this.crossOrigin&&(this._element.crossOrigin=this.crossOrigin)},_initFilters:function(e,t){e.filters&&e.filters.length?fabric.util.enlivenObjects(e.filters,function(e){t&&t(e)},"fabric.Image.filters"):t&&t()},_setWidthHeight:function(e){this.width="width"in e?e.width:this.getElement()?this.getElement().width||0:0,this.height="height"in e?e.height:this.getElement()?this.getElement().height||0:0},complexity:function(){return 1}}),fabric.Image.CSS_CANVAS="canvas-img",fabric.Image.prototype.getSvgSrc=fabric.Image.prototype.getSrc,fabric.Image.fromObject=function(e,t){fabric.util.loadImage(e.src,function(n){fabric.Image.prototype._initFilters.call(e,e,function(r){e.filters=r||[];var i=new fabric.Image(n,e);t&&t(i)})},null,e.crossOrigin)},fabric.Image.fromURL=function(e,t,n){fabric.util.loadImage(e,function(e){t(new fabric.Image(e,n))},null,n&&n.crossOrigin)},fabric.Image.ATTRIBUTE_NAMES=fabric.SHARED_ATTRIBUTES.concat("x y width height xlink:href".split(" ")),fabric.Image.fromElement=function(e,n,r){var i=fabric.parseAttributes(e,fabric.Image.ATTRIBUTE_NAMES);fabric.Image.fromURL(i["xlink:href"],n,t(r?fabric.util.object.clone(r):{},i))},fabric.Image.async=!0,fabric.Image.pngCompression=1}(typeof exports!="undefined"?exports:this),fabric.util.object.extend(fabric.Object.prototype,{_getAngleValueForStraighten:function(){var e=this.getAngle()%360;return e>0?Math.round((e-1)/90)*90:Math.round(e/90)*90},straighten:function(){return this.setAngle(this._getAngleValueForStraighten()),this},fxStraighten:function(e){e=e||{};var t=function(){},n=e.onComplete||t,r=e.onChange||t,i=this;return fabric.util.animate({startValue:this.get("angle"),endValue:this._getAngleValueForStraighten(),duration:this.FX_DURATION,onChange:function(e){i.setAngle(e),r()},onComplete:function(){i.setCoords(),n()},onStart:function(){i.set("active",!1)}}),this}}),fabric.util.object.extend(fabric.StaticCanvas.prototype,{straightenObject:function(e){return e.straighten(),this.renderAll(),this},fxStraightenObject:function(e){return e.fxStraighten({onChange:this.renderAll.bind(this)}),this}}),fabric.Image.filters=fabric.Image.filters||{},fabric.Image.filters.BaseFilter=fabric.util.createClass({type:"BaseFilter",toObject:function(){return{type:this.type}},toJSON:function(){return this.toObject()}}),function(e){"use strict";var t=e.fabric||(e.fabric={}),n=t.util.object.extend;t.Image.filters.Brightness=t.util.createClass(t.Image.filters.BaseFilter,{type:"Brightness",initialize:function(e){e=e||{},this.brightness=e.brightness||0},applyTo:function(e){var t=e.getContext("2d"),n=t.getImageData(0,0,e.width,e.height),r=n.data,i=this.brightness;for(var s=0,o=r.length;s<o;s+=4)r[s]+=i,r[s+1]+=i,r[s+2]+=i;t.putImageData(n,0,0)},toObject:function(){return n(this.callSuper("toObject"),{brightness:this.brightness})}}),t.Image.filters.Brightness.fromObject=function(e){return new t.Image.filters.Brightness(e)}}(typeof exports!="undefined"?exports:this),function(e){"use strict";var t=e.fabric||(e.fabric={}),n=t.util.object.extend;t.Image.filters.Convolute=t.util.createClass(t.Image.filters.BaseFilter,{type:"Convolute",initialize:function(e){e=e||{},this.opaque=e.opaque,this.matrix=e.matrix||[0,0,0,0,1,0,0,0,0];var n=t.util.createCanvasElement();this.tmpCtx=n.getContext("2d")},_createImageData:function(e,t){return this.tmpCtx.createImageData(e,t)},applyTo:function(e){var t=this.matrix,n=e.getContext("2d"),r=n.getImageData(0,0,e.width,e.height),i=Math.round(Math.sqrt(t.length)),s=Math.floor(i/2),o=r.data,u=r.width,a=r.height,f=u,l=a,c=this._createImageData(f,l),h=c.data,p=this.opaque?1:0;for(var d=0;d<l;d++)for(var v=0;v<f;v++){var m=d,g=v,y=(d*f+v)*4,b=0,w=0,E=0,S=0;for(var x=0;x<i;x++)for(var T=0;T<i;T++){var N=m+x-s,C=g+T-s;if(N<0||N>a||C<0||C>u)continue;var k=(N*u+C)*4,L=t[x*i+T];b+=o[k]*L,w+=o[k+1]*L,E+=o[k+2]*L,S+=o[k+3]*L}h[y]=b,h[y+1]=w,h[y+2]=E,h[y+3]=S+p*(255-S)}n.putImageData(c,0,0)},toObject:function(){return n(this.callSuper("toObject"),{opaque:this.opaque,matrix:this.matrix})}}),t.Image.filters.Convolute.fromObject=function(e){return new t.Image.filters.Convolute(e)}}(typeof exports!="undefined"?exports:this),function(e){"use strict";var t=e.fabric||(e.fabric={}),n=t.util.object.extend;t.Image.filters.GradientTransparency=t.util.createClass(t.Image.filters.BaseFilter,{type:"GradientTransparency",initialize:function(e){e=e||{},this.threshold=e.threshold||100},applyTo:function(e){var t=e.getContext("2d"),n=t.getImageData(0,0,e.width,e.height),r=n.data,i=this.threshold,s=r.length;for(var o=0,u=r.length;o<u;o+=4)r[o+3]=i+255*(s-o)/s;t.putImageData(n,0,0)},toObject:function(){return n(this.callSuper("toObject"),{threshold:this.threshold})}}),t.Image.filters.GradientTransparency.fromObject=function(e){return new t.Image.filters.GradientTransparency(e)}}(typeof exports!="undefined"?exports:this),function(e){"use strict";var t=e.fabric||(e.fabric={});t.Image.filters.Grayscale=t.util.createClass(t.Image.filters.BaseFilter,{type:"Grayscale",applyTo:function(e){var t=e.getContext("2d"),n=t.getImageData(0,0,e.width,e.height),r=n.data,i=n.width*n.height*4,s=0,o;while(s<i)o=(r[s]+r[s+1]+r[s+2])/3,r[s]=o,r[s+1]=o,r[s+2]=o,s+=4;t.putImageData(n,0,0)}}),t.Image.filters.Grayscale.fromObject=function(){return new t.Image.filters.Grayscale}}(typeof exports!="undefined"?exports:this),function(e){"use strict";var t=e.fabric||(e.fabric={});t.Image.filters.Invert=t.util.createClass(t.Image.filters.BaseFilter,{type:"Invert",applyTo:function(e){var t=e.getContext("2d"),n=t.getImageData(0,0,e.width,e.height),r=n.data,i=r.length,s;for(s=0;s<i;s+=4)r[s]=255-r[s],r[s+1]=255-r[s+1],r[s+2]=255-r[s+2];t.putImageData(n,0,0)}}),t.Image.filters.Invert.fromObject=function(){return new t.Image.filters.Invert}}(typeof exports!="undefined"?exports:this),function(e){"use strict";var t=
e.fabric||(e.fabric={}),n=t.util.object.extend;t.Image.filters.Mask=t.util.createClass(t.Image.filters.BaseFilter,{type:"Mask",initialize:function(e){e=e||{},this.mask=e.mask,this.channel=[0,1,2,3].indexOf(e.channel)>-1?e.channel:0},applyTo:function(e){if(!this.mask)return;var n=e.getContext("2d"),r=n.getImageData(0,0,e.width,e.height),i=r.data,s=this.mask.getElement(),o=t.util.createCanvasElement(),u=this.channel,a,f=r.width*r.height*4;o.width=s.width,o.height=s.height,o.getContext("2d").drawImage(s,0,0,s.width,s.height);var l=o.getContext("2d").getImageData(0,0,s.width,s.height),c=l.data;for(a=0;a<f;a+=4)i[a+3]=c[a+u];n.putImageData(r,0,0)},toObject:function(){return n(this.callSuper("toObject"),{mask:this.mask.toObject(),channel:this.channel})}}),t.Image.filters.Mask.fromObject=function(e,n){t.util.loadImage(e.mask.src,function(r){e.mask=new t.Image(r,e.mask),n&&n(new t.Image.filters.Mask(e))})},t.Image.filters.Mask.async=!0}(typeof exports!="undefined"?exports:this),function(e){"use strict";var t=e.fabric||(e.fabric={}),n=t.util.object.extend;t.Image.filters.Noise=t.util.createClass(t.Image.filters.BaseFilter,{type:"Noise",initialize:function(e){e=e||{},this.noise=e.noise||0},applyTo:function(e){var t=e.getContext("2d"),n=t.getImageData(0,0,e.width,e.height),r=n.data,i=this.noise,s;for(var o=0,u=r.length;o<u;o+=4)s=(.5-Math.random())*i,r[o]+=s,r[o+1]+=s,r[o+2]+=s;t.putImageData(n,0,0)},toObject:function(){return n(this.callSuper("toObject"),{noise:this.noise})}}),t.Image.filters.Noise.fromObject=function(e){return new t.Image.filters.Noise(e)}}(typeof exports!="undefined"?exports:this),function(e){"use strict";var t=e.fabric||(e.fabric={}),n=t.util.object.extend;t.Image.filters.Pixelate=t.util.createClass(t.Image.filters.BaseFilter,{type:"Pixelate",initialize:function(e){e=e||{},this.blocksize=e.blocksize||4},applyTo:function(e){var t=e.getContext("2d"),n=t.getImageData(0,0,e.width,e.height),r=n.data,i=n.height,s=n.width,o,u,a,f,l,c,h;for(u=0;u<i;u+=this.blocksize)for(a=0;a<s;a+=this.blocksize){o=u*4*s+a*4,f=r[o],l=r[o+1],c=r[o+2],h=r[o+3];for(var p=u,d=u+this.blocksize;p<d;p++)for(var v=a,m=a+this.blocksize;v<m;v++)o=p*4*s+v*4,r[o]=f,r[o+1]=l,r[o+2]=c,r[o+3]=h}t.putImageData(n,0,0)},toObject:function(){return n(this.callSuper("toObject"),{blocksize:this.blocksize})}}),t.Image.filters.Pixelate.fromObject=function(e){return new t.Image.filters.Pixelate(e)}}(typeof exports!="undefined"?exports:this),function(e){"use strict";var t=e.fabric||(e.fabric={}),n=t.util.object.extend;t.Image.filters.RemoveWhite=t.util.createClass(t.Image.filters.BaseFilter,{type:"RemoveWhite",initialize:function(e){e=e||{},this.threshold=e.threshold||30,this.distance=e.distance||20},applyTo:function(e){var t=e.getContext("2d"),n=t.getImageData(0,0,e.width,e.height),r=n.data,i=this.threshold,s=this.distance,o=255-i,u=Math.abs,a,f,l;for(var c=0,h=r.length;c<h;c+=4)a=r[c],f=r[c+1],l=r[c+2],a>o&&f>o&&l>o&&u(a-f)<s&&u(a-l)<s&&u(f-l)<s&&(r[c+3]=1);t.putImageData(n,0,0)},toObject:function(){return n(this.callSuper("toObject"),{threshold:this.threshold,distance:this.distance})}}),t.Image.filters.RemoveWhite.fromObject=function(e){return new t.Image.filters.RemoveWhite(e)}}(typeof exports!="undefined"?exports:this),function(e){"use strict";var t=e.fabric||(e.fabric={});t.Image.filters.Sepia=t.util.createClass(t.Image.filters.BaseFilter,{type:"Sepia",applyTo:function(e){var t=e.getContext("2d"),n=t.getImageData(0,0,e.width,e.height),r=n.data,i=r.length,s,o;for(s=0;s<i;s+=4)o=.3*r[s]+.59*r[s+1]+.11*r[s+2],r[s]=o+100,r[s+1]=o+50,r[s+2]=o+255;t.putImageData(n,0,0)}}),t.Image.filters.Sepia.fromObject=function(){return new t.Image.filters.Sepia}}(typeof exports!="undefined"?exports:this),function(e){"use strict";var t=e.fabric||(e.fabric={});t.Image.filters.Sepia2=t.util.createClass(t.Image.filters.BaseFilter,{type:"Sepia2",applyTo:function(e){var t=e.getContext("2d"),n=t.getImageData(0,0,e.width,e.height),r=n.data,i=r.length,s,o,u,a;for(s=0;s<i;s+=4)o=r[s],u=r[s+1],a=r[s+2],r[s]=(o*.393+u*.769+a*.189)/1.351,r[s+1]=(o*.349+u*.686+a*.168)/1.203,r[s+2]=(o*.272+u*.534+a*.131)/2.14;t.putImageData(n,0,0)}}),t.Image.filters.Sepia2.fromObject=function(){return new t.Image.filters.Sepia2}}(typeof exports!="undefined"?exports:this),function(e){"use strict";var t=e.fabric||(e.fabric={}),n=t.util.object.extend;t.Image.filters.Tint=t.util.createClass(t.Image.filters.BaseFilter,{type:"Tint",initialize:function(e){e=e||{},this.color=e.color||"#000000",this.opacity=typeof e.opacity!="undefined"?e.opacity:(new t.Color(this.color)).getAlpha()},applyTo:function(e){var n=e.getContext("2d"),r=n.getImageData(0,0,e.width,e.height),i=r.data,s=i.length,o,u,a,f,l,c,h,p,d;d=(new t.Color(this.color)).getSource(),u=d[0]*this.opacity,a=d[1]*this.opacity,f=d[2]*this.opacity,p=1-this.opacity;for(o=0;o<s;o+=4)l=i[o],c=i[o+1],h=i[o+2],i[o]=u+l*p,i[o+1]=a+c*p,i[o+2]=f+h*p;n.putImageData(r,0,0)},toObject:function(){return n(this.callSuper("toObject"),{color:this.color,opacity:this.opacity})}}),t.Image.filters.Tint.fromObject=function(e){return new t.Image.filters.Tint(e)}}(typeof exports!="undefined"?exports:this),function(e){"use strict";var t=e.fabric||(e.fabric={}),n=t.util.object.extend;t.Image.filters.Multiply=t.util.createClass(t.Image.filters.BaseFilter,{type:"Multiply",initialize:function(e){e=e||{},this.color=e.color||"#000000"},applyTo:function(e){var n=e.getContext("2d"),r=n.getImageData(0,0,e.width,e.height),i=r.data,s=i.length,o,u;u=(new t.Color(this.color)).getSource();for(o=0;o<s;o+=4)i[o]*=u[0]/255,i[o+1]*=u[1]/255,i[o+2]*=u[2]/255;n.putImageData(r,0,0)},toObject:function(){return n(this.callSuper("toObject"),{color:this.color})}}),t.Image.filters.Multiply.fromObject=function(e){return new t.Image.filters.Multiply(e)}}(typeof exports!="undefined"?exports:this),function(e){"use strict";var t=e.fabric;t.Image.filters.Blend=t.util.createClass({type:"Blend",initialize:function(e){e=e||{},this.color=e.color||"#000",this.image=e.image||!1,this.mode=e.mode||"multiply",this.alpha=e.alpha||1},applyTo:function(e){var n=e.getContext("2d"),r=n.getImageData(0,0,e.width,e.height),i=r.data,s,o,u,a,f,l,c,h=!1;if(this.image){h=!0;var p=t.util.createCanvasElement();p.width=this.image.width,p.height=this.image.height;var d=new t.StaticCanvas(p);d.add(this.image);var v=d.getContext("2d");c=v.getImageData(0,0,d.width,d.height).data}else c=(new t.Color(this.color)).getSource(),s=c[0]*this.alpha,o=c[1]*this.alpha,u=c[2]*this.alpha;for(var m=0,g=i.length;m<g;m+=4){a=i[m],f=i[m+1],l=i[m+2],h&&(s=c[m]*this.alpha,o=c[m+1]*this.alpha,u=c[m+2]*this.alpha);switch(this.mode){case"multiply":i[m]=a*s/255,i[m+1]=f*o/255,i[m+2]=l*u/255;break;case"screen":i[m]=1-(1-a)*(1-s),i[m+1]=1-(1-f)*(1-o),i[m+2]=1-(1-l)*(1-u);break;case"add":i[m]=Math.min(255,a+s),i[m+1]=Math.min(255,f+o),i[m+2]=Math.min(255,l+u);break;case"diff":case"difference":i[m]=Math.abs(a-s),i[m+1]=Math.abs(f-o),i[m+2]=Math.abs(l-u);break;case"subtract":var y=a-s,b=f-o,w=l-u;i[m]=y<0?0:y,i[m+1]=b<0?0:b,i[m+2]=w<0?0:w;break;case"darken":i[m]=Math.min(a,s),i[m+1]=Math.min(f,o),i[m+2]=Math.min(l,u);break;case"lighten":i[m]=Math.max(a,s),i[m+1]=Math.max(f,o),i[m+2]=Math.max(l,u)}}n.putImageData(r,0,0)}}),t.Image.filters.Blend.fromObject=function(e){return new t.Image.filters.Blend(e)}}(typeof exports!="undefined"?exports:this),function(e){"use strict";var t=e.fabric||(e.fabric={}),n=t.util.object.extend,r=t.util.object.clone,i=t.util.toFixed,s=t.StaticCanvas.supports("setLineDash");if(t.Text){t.warn("fabric.Text is already defined");return}var o=t.Object.prototype.stateProperties.concat();o.push("fontFamily","fontWeight","fontSize","text","textDecoration","textAlign","fontStyle","lineHeight","textBackgroundColor","useNative","path"),t.Text=t.util.createClass(t.Object,{_dimensionAffectingProps:{fontSize:!0,fontWeight:!0,fontFamily:!0,textDecoration:!0,fontStyle:!0,lineHeight:!0,stroke:!0,strokeWidth:!0,text:!0},_reNewline:/\r?\n/,type:"text",fontSize:40,fontWeight:"normal",fontFamily:"Times New Roman",textDecoration:"",textAlign:"left",fontStyle:"",lineHeight:1.3,textBackgroundColor:"",path:null,useNative:!0,stateProperties:o,stroke:null,shadow:null,initialize:function(e,t){t=t||{},this.text=e,this.__skipDimension=!0,this.setOptions(t),this.__skipDimension=!1,this._initDimensions()},_initDimensions:function(){if(this.__skipDimension)return;var e=t.util.createCanvasElement();this._render(e.getContext("2d"))},toString:function(){return"#<fabric.Text ("+this.complexity()+'): { "text": "'+this.text+'", "fontFamily": "'+this.fontFamily+'" }>'},_render:function(e){typeof Cufon=="undefined"||this.useNative===!0?this._renderViaNative(e):this._renderViaCufon(e)},_renderViaNative:function(e){var n=this.text.split(this._reNewline);this._setTextStyles(e),this.width=this._getTextWidth(e,n),this.height=this._getTextHeight(e,n),this.clipTo&&t.util.clipContext(this,e),this._renderTextBackground(e,n),this._translateForTextAlign(e),this._renderText(e,n),this.textAlign!=="left"&&this.textAlign!=="justify"&&e.restore(),this._renderTextDecoration(e,n),this.clipTo&&e.restore(),this._setBoundaries(e,n),this._totalLineHeight=0},_renderText:function(e,t){e.save(),this._setShadow(e),this._setupFillRule(e),this._renderTextFill(e,t),this._renderTextStroke(e,t),this._restoreFillRule(e),this._removeShadow(e),e.restore()},_translateForTextAlign:function(e){this.textAlign!=="left"&&this.textAlign!=="justify"&&(e.save(),e.translate(this.textAlign==="center"?this.width/2:this.width,0))},_setBoundaries:function(e,t){this._boundaries=[];for(var n=0,r=t.length;n<r;n++){var i=this._getLineWidth(e,t[n]),s=this._getLineLeftOffset(i);this._boundaries.push({height:this.fontSize*this.lineHeight,width:i,left:s})}},_setTextStyles:function(e){this._setFillStyles(e),this._setStrokeStyles(e),e.textBaseline="alphabetic",this.skipTextAlign||(e.textAlign=this.textAlign),e.font=this._getFontDeclaration()},_getTextHeight:function(e,t){return this.fontSize*t.length*this.lineHeight},_getTextWidth:function(e,t){var n=e.measureText(t[0]||"|").width;for(var r=1,i=t.length;r<i;r++){var s=e.measureText(t[r]).width;s>n&&(n=s)}return n},_renderChars:function(e,t,n,r,i){t[e](n,r,i)},_renderTextLine:function(e,t,n,r,i,s){i-=this.fontSize/4;if(this.textAlign!=="justify"){this._renderChars(e,t,n,r,i,s);return}var o=t.measureText(n).width,u=this.width;if(u>o){var a=n.split(/\s+/),f=t.measureText(n.replace(/\s+/g,"")).width,l=u-f,c=a.length-1,h=l/c,p=0;for(var d=0,v=a.length;d<v;d++)this._renderChars(e,t,a[d],r+p,i,s),p+=t.measureText(a[d]).width+h}else this._renderChars(e,t,n,r,i,s)},_getLeftOffset:function(){return t.isLikelyNode?0:-this.width/2},_getTopOffset:function(){return-this.height/2},_renderTextFill:function(e,t){if(!this.fill&&!this._skipFillStrokeCheck)return;this._boundaries=[];var n=0;for(var r=0,i=t.length;r<i;r++){var s=this._getHeightOfLine(e,r,t);n+=s,this._renderTextLine("fillText",e,t[r],this._getLeftOffset(),this._getTopOffset()+n,r)}},_renderTextStroke:function(e,t){if((!this.stroke||this.strokeWidth===0)&&!this._skipFillStrokeCheck)return;var n=0;e.save(),this.strokeDashArray&&(1&this.strokeDashArray.length&&this.strokeDashArray.push.apply(this.strokeDashArray,this.strokeDashArray),s&&e.setLineDash(this.strokeDashArray)),e.beginPath();for(var r=0,i=t.length;r<i;r++){var o=this._getHeightOfLine(e,r,t);n+=o,this._renderTextLine("strokeText",e,t[r],this._getLeftOffset(),this._getTopOffset()+n,r)}e.closePath(),e.restore()},_getHeightOfLine:function(){return this.fontSize*this.lineHeight},_renderTextBackground:function(e,t){this._renderTextBoxBackground(e),this._renderTextLinesBackground(e,t)},_renderTextBoxBackground:function(e){if(!this.backgroundColor)return;e.save(),e.fillStyle=this.backgroundColor,e.fillRect(this._getLeftOffset(),this._getTopOffset(),this.width,this.height),e.restore()},_renderTextLinesBackground:function(e,t){if(!this.textBackgroundColor)return;e.save(),e.fillStyle=this.textBackgroundColor;for(var n=0,r=t.length;n<r;n++)if(t[n]!==""){var i=this._getLineWidth(e,t[n]),s=this._getLineLeftOffset(i);e.fillRect(this._getLeftOffset()+s,this._getTopOffset()+n*this.fontSize*this.lineHeight,i,this.fontSize*this.lineHeight)}e.restore()},_getLineLeftOffset:function(e){return this.textAlign==="center"?(this.width-e)/2:this.textAlign==="right"?this.width-e:0},_getLineWidth:function(e,t){return this.textAlign==="justify"?this.width:e.measureText(t).width},_renderTextDecoration:function(e,t){function i(i){for(var s=0,o=t.length;s<o;s++){var u=r._getLineWidth(e,t[s]),a=r._getLineLeftOffset(u);e.fillRect(r._getLeftOffset()+a,~~(i+s*r._getHeightOfLine(e,s,t)-n),u,1)}}if(!this.textDecoration)return;var n=this._getTextHeight(e,t)/2,r=this;this.textDecoration.indexOf("underline")>-1&&i(this.fontSize*this.lineHeight),this.textDecoration.indexOf("line-through")>-1&&i(this.fontSize*this.lineHeight-this.fontSize/2),this.textDecoration.indexOf("overline")>-1&&i(this.fontSize*this.lineHeight-this.fontSize)},_getFontDeclaration:function(){return[t.isLikelyNode?this.fontWeight:this.fontStyle,t.isLikelyNode?this.fontStyle:this.fontWeight,this.fontSize+"px",t.isLikelyNode?'"'+this.fontFamily+'"':this.fontFamily].join(" ")},render:function(e,t){if(!this.visible)return;e.save(),this._transform(e,t);var n=this.transformMatrix,r=this.group&&this.group.type==="path-group";r&&e.translate(-this.group.width/2,-this.group.height/2),n&&e.transform(n[0],n[1],n[2],n[3],n[4],n[5]),r&&e.translate(this.left,this.top),this._render(e),e.restore()},toObject:function(e){var t=n(this.callSuper("toObject",e),{text:this.text,fontSize:this.fontSize,fontWeight:this.fontWeight,fontFamily:this.fontFamily,fontStyle:this.fontStyle,lineHeight:this.lineHeight,textDecoration:this.textDecoration,textAlign:this.textAlign,path:this.path,textBackgroundColor:this.textBackgroundColor,useNative:this.useNative});return this.includeDefaultValues||this._removeDefaultValues(t),t},toSVG:function(e){var t=[],n=this.text.split(this._reNewline),r=this._getSVGLeftTopOffsets(n),i=this._getSVGTextAndBg(r.lineTop,r.textLeft,n),s=this._getSVGShadows(r.lineTop,n);return r.textTop+=this._fontAscent?this._fontAscent/5*this.lineHeight:0,this._wrapSVGTextAndBg(t,i,s,r),e?e(t.join("")):t.join("")},_getSVGLeftTopOffsets:function(e){var t=this.useNative?this.fontSize*this.lineHeight:-this._fontAscent-this._fontAscent/5*this.lineHeight,n=-(this.width/2),r=this.useNative?this.fontSize-1:this.height/2-e.length*this.fontSize-this._totalLineHeight;return{textLeft:n+(this.group?this.left:0),textTop:r+(this.group?this.top:0),lineTop:t}},_wrapSVGTextAndBg:function(e,t,n,r){e.push('<g transform="',this.getSvgTransform(),this.getSvgTransformMatrix(),'">\n',t.textBgRects.join(""),"<text ",this.fontFamily?'font-family="'+this.fontFamily.replace(/"/g,"'")+'" ':"",this.fontSize?'font-size="'+this.fontSize+'" ':"",this.fontStyle?'font-style="'+this.fontStyle+'" ':"",this.fontWeight?'font-weight="'+this.fontWeight+'" ':"",this.textDecoration?'text-decoration="'+this.textDecoration+'" ':"",'style="',this.getSvgStyles(),'" ','transform="translate(',i(r.textLeft,2)," ",i(r.textTop,2),')">',n.join(""),t.textSpans.join(""),"</text>\n","</g>\n")},_getSVGShadows:function(e,n){var r=[],s,o,u=1;if(!this.shadow||!this._boundaries)return r;for(s=0,o=n.length;s<o;s++)if(n[s]!==""){var a=this._boundaries&&this._boundaries[s]?this._boundaries[s].left:0;r.push('<tspan x="',i(a+u+this.shadow.offsetX,2),s===0||this.useNative?'" y':'" dy','="',i(this.useNative?e*s-this.height/2+this.shadow.offsetY:e+(s===0?this.shadow.offsetY:0),2),'" ',this._getFillAttributes(this.shadow.color),">",t.util.string.escapeXml(n[s]),"</tspan>"),u=1}else u++;return r},_getSVGTextAndBg:function(e,t,n){var r=[],i=[],s=1;this._setSVGBg(i);for(var o=0,u=n.length;o<u;o++){n[o]!==""?(this._setSVGTextLineText(n[o],o,r,e,s,i),s=1):s++;if(!this.textBackgroundColor||!this._boundaries)continue;this._setSVGTextLineBg(i,o,t,e)}return{textSpans:r,textBgRects:i}},_setSVGTextLineText:function(e,n,r,s,o){var u=this._boundaries&&this._boundaries[n]?i(this._boundaries[n].left,2):0;r.push('<tspan x="',u,'" ',n===0||this.useNative?"y":"dy",'="',i(this.useNative?s*n-this.height/2:s*o,2),'" ',this._getFillAttributes(this.fill),">",t.util.string.escapeXml(e),"</tspan>")},_setSVGTextLineBg:function(e,t,n,r){e.push("<rect ",this._getFillAttributes(this.textBackgroundColor),' x="',i(n+this._boundaries[t].left,2),'" y="',i(r*t-this.height/2,2),'" width="',i(this._boundaries[t].width,2),'" height="',i(this._boundaries[t].height,2),'"></rect>\n')},_setSVGBg:function(e){this.backgroundColor&&this._boundaries&&e.push("<rect ",this._getFillAttributes(this.backgroundColor),' x="',i(-this.width/2,2),'" y="',i(-this.height/2,2),'" width="',i(this.width,2),'" height="',i(this.height,2),'"></rect>')},_getFillAttributes:function(e){var n=e&&typeof e=="string"?new t.Color(e):"";return!n||!n.getSource()||n.getAlpha()===1?'fill="'+e+'"':'opacity="'+n.getAlpha()+'" fill="'+n.setAlpha(1).toRgb()+'"'},_set:function(e,t){e==="fontFamily"&&this.path&&(this.path=this.path.replace(/(.*?)([^\/]*)(\.font\.js)/,"$1"+t+"$3")),this.callSuper("_set",e,t),e in this._dimensionAffectingProps&&(this._initDimensions(),this.setCoords())},complexity:function(){return 1}}),t.Text.ATTRIBUTE_NAMES=t.SHARED_ATTRIBUTES.concat("x y dx dy font-family font-style font-weight font-size text-decoration text-anchor".split(" ")),t.Text.DEFAULT_SVG_FONT_SIZE=16,t.Text.fromElement=function(e,n){if(!e)return null;var r=t.parseAttributes(e,t.Text.ATTRIBUTE_NAMES);n=t.util.object.extend(n?t.util.object.clone(n):{},r),"dx"in r&&(n.left+=r.dx),"dy"in r&&(n.top+=r.dy),"fontSize"in n||(n.fontSize=t.Text.DEFAULT_SVG_FONT_SIZE),n.originX||(n.originX="left");var i=new t.Text(e.textContent,n),s=0;return i.originX==="left"&&(s=i.getWidth()/2),i.originX==="right"&&(s=-i.getWidth()/2),i.set({left:i.getLeft()+s,top:i.getTop()-i.getHeight()/2}),i},t.Text.fromObject=function(e){return new t.Text(e.text,r(e))},t.util.createAccessors(t.Text)}(typeof exports!="undefined"?exports:this),function(){var e=fabric.util.object.clone;fabric.IText=fabric.util.createClass(fabric.Text,fabric.Observable,{type:"i-text",selectionStart:0,selectionEnd:0,selectionColor:"rgba(17,119,255,0.3)",isEditing:!1,editable:!0,editingBorderColor:"rgba(102,153,255,0.25)",cursorWidth:2,cursorColor:"#333",cursorDelay:1e3,cursorDuration:600,styles:null,caching:!0,_skipFillStrokeCheck:!0,_reSpace:/\s|\n/,_fontSizeFraction:4,_currentCursorOpacity:0,_selectionDirection:null,_abortCursorAnimation:!1,_charWidthsCache:{},initialize:function(e,t){this.styles=t?t.styles||{}:{},this.callSuper("initialize",e,t),this.initBehavior(),fabric.IText.instances.push(this),this.__lineWidths={},this.__lineHeights={},this.__lineOffsets={}},isEmptyStyles:function(){if(!this.styles)return!0;var e=this.styles;for(var t in e)for(var n in e[t])for(var r in e[t][n])return!1;return!0},setSelectionStart:function(e){this.selectionStart!==e&&(this.fire("selection:changed"),this.canvas&&this.canvas.fire("text:selection:changed",{target:this})),this.selectionStart=e,this.hiddenTextarea&&(this.hiddenTextarea.selectionStart=e)},setSelectionEnd:function(e){this.selectionEnd!==e&&(this.fire("selection:changed"),this.canvas&&this.canvas.fire("text:selection:changed",{target:this})),this.selectionEnd=e,this.hiddenTextarea&&(this.hiddenTextarea.selectionEnd=e)},getSelectionStyles:function(e,t){if(arguments.length===2){var n=[];for(var r=e;r<t;r++)n.push(this.getSelectionStyles(r));return n}var i=this.get2DCursorLocation(e);return this.styles[i.lineIndex]?this.styles[i.lineIndex][i.charIndex]||{}:{}},setSelectionStyles:function(e){if(this.selectionStart===this.selectionEnd)this._extendStyles(this.selectionStart,e);else for(var t=this.selectionStart;t<this.selectionEnd;t++)this._extendStyles(t,e);return this},_extendStyles:function(e,t){var n=this.get2DCursorLocation(e);this.styles[n.lineIndex]||(this.styles[n.lineIndex]={}),this.styles[n.lineIndex][n.charIndex]||(this.styles[n.lineIndex][n.charIndex]={}),fabric.util.object.extend(this.styles[n.lineIndex][n.charIndex],t)},_render:function(e){this.callSuper("_render",e),this.ctx=e,this.isEditing&&this.renderCursorOrSelection()},renderCursorOrSelection:function(){if(!this.active)return;var e=this.text.split(""),t;this.selectionStart===this.selectionEnd?(t=this._getCursorBoundaries(e,"cursor"),this.renderCursor(t)):(t=this._getCursorBoundaries(e,"selection"),this.renderSelection(e,t))},get2DCursorLocation:function(e){typeof e=="undefined"&&(e=this.selectionStart);var t=this.text.slice(0,e),n=t.split(this._reNewline);return{lineIndex:n.length-1,charIndex:n[n.length-1].length}},getCurrentCharStyle:function(e,t){var n=this.styles[e]&&this.styles[e][t===0?0:t-1];return{fontSize:n&&n.fontSize||this.fontSize,fill:n&&n.fill||this.fill,textBackgroundColor:n&&n.textBackgroundColor||this.textBackgroundColor,textDecoration:n&&n.textDecoration||this.textDecoration,fontFamily:n&&n.fontFamily||this.fontFamily,fontWeight:n&&n.fontWeight||this.fontWeight,fontStyle:n&&n.fontStyle||this.fontStyle,stroke:n&&n.stroke||this.stroke,strokeWidth:n&&n.strokeWidth||this.strokeWidth}},getCurrentCharFontSize:function(e,t){return this.styles[e]&&this.styles[e][t===0?0:t-1]&&this.styles[e][t===0?0:t-1].fontSize||this.fontSize},getCurrentCharColor:function(e,t){return this.styles[e]&&this.styles[e][t===0?0:t-1]&&this.styles[e][t===0?0:t-1].fill||this.cursorColor},_getCursorBoundaries:function(e,t){var n=this.get2DCursorLocation(),r=this.text.split(this._reNewline),i=Math.round(this._getLeftOffset()),s=-this.height/2,o=this._getCursorBoundariesOffsets(e,t,n,r);return{left:i,top:s,leftOffset:o.left+o.lineLeft,topOffset:o.top}},_getCursorBoundariesOffsets:function(e,t,n,r){var i=0,s=0,o=0,u=0,a=t==="cursor"?this._getHeightOfLine(this.ctx,0)-this.getCurrentCharFontSize(n.lineIndex,n.charIndex):0;for(var f=0;f<this.selectionStart;f++){if(e[f]==="\n"){u=0;var l=s+(t==="cursor"?1:0);a+=this._getCachedLineHeight(l),s++,o=0}else u+=this._getWidthOfChar(this.ctx,e[f],s,o),o++;i=this._getCachedLineOffset(s,r)}return this._clearCache(),{top:a,left:u,lineLeft:i}},_clearCache:function(){this.__lineWidths={},this.__lineHeights={},this.__lineOffsets={}},_getCachedLineHeight:function(e){return this.__lineHeights[e]||(this.__lineHeights[e]=this._getHeightOfLine(this.ctx,e))},_getCachedLineWidth:function(e,t){return this.__lineWidths[e]||(this.__lineWidths[e]=this._getWidthOfLine(this.ctx,e,t))},_getCachedLineOffset:function(e,t){var n=this._getCachedLineWidth(e,t);return this.__lineOffsets[e]||(this.__lineOffsets[e]=this._getLineLeftOffset(n))},renderCursor:function(e){var t=this.ctx;t.save();var n=this.get2DCursorLocation(),r=n.lineIndex,i=n.charIndex,s=this.getCurrentCharFontSize(r,i),o=r===0&&i===0?this._getCachedLineOffset(r,this.text.split(this._reNewline)):e.leftOffset;t.fillStyle=this.getCurrentCharColor(r,i),t.globalAlpha=this.__isMousedown?1:this._currentCursorOpacity,t.fillRect(e.left+o,e.top+e.topOffset,this.cursorWidth/this.scaleX,s),t.restore()},renderSelection:function(e,t){var n=this.ctx;n.save(),n.fillStyle=this.selectionColor;var r=this.get2DCursorLocation(this.selectionStart),i=this.get2DCursorLocation(this.selectionEnd),s=r.lineIndex,o=i.lineIndex,u=this.text.split(this._reNewline);for(var a=s;a<=o;a++){var f=this._getCachedLineOffset(a,u)||0,l=this._getCachedLineHeight(a),c=0;if(a===s)for(var h=0,p=u[a].length;h<p;h++)h>=r.charIndex&&(a!==o||h<i.charIndex)&&(c+=this._getWidthOfChar(n,u[a][h],a,h)),h<r.charIndex&&(f+=this._getWidthOfChar(n,u[a][h],a,h));else if(a>s&&a<o)c+=this._getCachedLineWidth(a,u)||5;else if(a===o)for(var d=0,v=i.charIndex;d<v;d++)c+=this._getWidthOfChar(n,u[a][d],a,d);n.fillRect(t.left+f,t.top+t.topOffset,c,l),t.topOffset+=l}n.restore()},_renderChars:function(e,t,n,r,i,s){if(this.isEmptyStyles())return this._renderCharsFast(e,t,n,r,i);this.skipTextAlign=!0,r-=this.textAlign==="center"?this.width/2:this.textAlign==="right"?this.width:0;var o=this.text.split(this._reNewline),u=this._getWidthOfLine(t,s,o),a=this._getHeightOfLine(t,s,o),f=this._getLineLeftOffset(u),l=n.split(""),c,h="";r+=f||0,t.save();for(var p=0,d=l.length;p<=d;p++){c=c||this.getCurrentCharStyle(s,p);var v=this.getCurrentCharStyle(s,p+1);if(this._hasStyleChanged(c,v)||p===d)this._renderChar(e,t,s,p-1,h,r,i,a),h="",c=v;h+=l[p]}t.restore()},_renderCharsFast:function(e,t,n,r,i){this.skipTextAlign=!1,e==="fillText"&&this.fill&&this.callSuper("_renderChars",e,t,n,r,i),e==="strokeText"&&this.stroke&&this.callSuper("_renderChars",e,t,n,r,i)},_renderChar:function(e,t,n,r,i,s,o,u){var a,f,l;if(this.styles&&this.styles[n]&&(a=this.styles[n][r])){var c=a.stroke||this.stroke,h=a.fill||this.fill;t.save(),f=this._applyCharStylesGetWidth(t,i,n,r,a),l=this._getHeightOfChar(t,i,n,r),h&&t.fillText(i,s,o),c&&t.strokeText(i,s,o),this._renderCharDecoration(t,a,s,o,f,u,l),t.restore(),t.translate(f,0)}else e==="strokeText"&&this.stroke&&t[e](i,s,o),e==="fillText"&&this.fill&&t[e](i,s,o),f=this._applyCharStylesGetWidth(t,i,n,r),this._renderCharDecoration(t,null,s,o,f,u),t.translate(t.measureText(i).width,0)},_hasStyleChanged:function(e,t){return e.fill!==t.fill||e.fontSize!==t.fontSize||e.textBackgroundColor!==t.textBackgroundColor||e.textDecoration!==t.textDecoration||e.fontFamily!==t.fontFamily||e.fontWeight!==t.fontWeight||e.fontStyle!==t.fontStyle||e.stroke!==t.stroke||e.strokeWidth!==t.strokeWidth},_renderCharDecoration:function(e,t,n,r,i,s,o){var u=t?t.textDecoration||this.textDecoration:this.textDecoration,a=(t?t.fontSize:null)||this.fontSize;if(!u)return;u.indexOf("underline")>-1&&this._renderCharDecorationAtOffset(e,n,r+this.fontSize/this._fontSizeFraction,i,0,this.fontSize/20),u.indexOf("line-through")>-1&&this._renderCharDecorationAtOffset(e,n,r+this.fontSize/this._fontSizeFraction,i,o/2,a/20),u.indexOf("overline")>-1&&this._renderCharDecorationAtOffset(e,n,r,i,s-this.fontSize/this._fontSizeFraction,this.fontSize/20)},_renderCharDecorationAtOffset:function(e,t,n,r,i,s){e.fillRect(t,n-i,r,s)},_renderTextLine:function(e,t,n,r,i,s){i+=this.fontSize/4,this.callSuper("_renderTextLine",e,t,n,r,i,s)},_renderTextDecoration:function(e,t){if(this.isEmptyStyles())return this.callSuper("_renderTextDecoration",e,t)},_renderTextLinesBackground:function(e,t){if(!this.textBackgroundColor&&!this.styles)return;e.save(),this.textBackgroundColor&&(e.fillStyle=this.textBackgroundColor);var n=0,r=this.fontSize/this._fontSizeFraction;for(var i=0,s=t.length;i<s;i++){var o=this._getHeightOfLine(e,i,t);if(t[i]===""){n+=o;continue}var u=this._getWidthOfLine(e,i,t),a=this._getLineLeftOffset(u);this.textBackgroundColor&&(e.fillStyle=this.textBackgroundColor,e.fillRect(this._getLeftOffset()+a,this._getTopOffset()+n+r,u,o));if(this.styles[i])for(var f=0,l=t[i].length;f<l;f++)if(this.styles[i]&&this.styles[i][f]&&this.styles[i][f].textBackgroundColor){var c=t[i][f];e.fillStyle=this.styles[i][f].textBackgroundColor,e.fillRect(this._getLeftOffset()+a+this._getWidthOfCharsAt(e,i,f,t),this._getTopOffset()+n+r,this._getWidthOfChar(e,c,i,f,t)+1,o)}n+=o}e.restore()},_getCacheProp:function(e,t){return e+t.fontFamily+t.fontSize+t.fontWeight+t.fontStyle+t.shadow},_applyCharStylesGetWidth:function(t,n,r,i,s){var o=s||this.styles[r]&&this.styles[r][i];o?o=e(o):o={},this._applyFontStyles(o);var u=this._getCacheProp(n,o);if(this.isEmptyStyles()&&this._charWidthsCache[u]&&this.caching)return this._charWidthsCache[u];typeof o.shadow=="string"&&(o.shadow=new fabric.Shadow(o.shadow));var a=o.fill||this.fill;return t.fillStyle=a.toLive?a.toLive(t):a,o.stroke&&(t.strokeStyle=o.stroke&&o.stroke.toLive?o.stroke.toLive(t):o.stroke),t.lineWidth=o.strokeWidth||this.strokeWidth,t.font=this._getFontDeclaration.call(o),this._setShadow.call(o,t),this.caching?(this._charWidthsCache[u]||(this._charWidthsCache[u]=t.measureText(n).width),this._charWidthsCache[u]):t.measureText(n).width},_applyFontStyles:function(e){e.fontFamily||(e.fontFamily=this.fontFamily),e.fontSize||(e.fontSize=this.fontSize),e.fontWeight||(e.fontWeight=this.fontWeight),e.fontStyle||(e.fontStyle=this.fontStyle)},_getStyleDeclaration:function(t,n){return this.styles[t]&&this.styles[t][n]?e(this.styles[t][n]):{}},_getWidthOfChar:function(e,t,n,r){var i=this._getStyleDeclaration(n,r);this._applyFontStyles(i);var s=this._getCacheProp(t,i);if(this._charWidthsCache[s]&&this.caching)return this._charWidthsCache[s];if(e){e.save();var o=this._applyCharStylesGetWidth(e,t,n,r);return e.restore(),o}},_getHeightOfChar:function(e,t,n,r){return this.styles[n]&&this.styles[n][r]?this.styles[n][r].fontSize||this.fontSize:this.fontSize},_getWidthOfCharAt:function(e,t,n,r){r=r||this.text.split(this._reNewline);var i=r[t].split("")[n];return this._getWidthOfChar(e,i,t,n)},_getHeightOfCharAt:function(e,t,n,r){r=r||this.text.split(this._reNewline);var i=r[t].split("")[n];return this._getHeightOfChar(e,i,t,n)},_getWidthOfCharsAt:function(e,t,n,r){var i=0;for(var s=0;s<n;s++)i+=this._getWidthOfCharAt(e,t,s,r);return i},_getWidthOfLine:function(e,t,n){return this._getWidthOfCharsAt(e,t,n[t].length,n)},_getTextWidth:function(e,t){if(this.isEmptyStyles())return this.callSuper("_getTextWidth",e,t);var n=this._getWidthOfLine(e,0,t);for(var r=1,i=t.length;r<i;r++){var s=this._getWidthOfLine(e,r,t);s>n&&(n=s)}return n},_getHeightOfLine:function(e,t,n){n=n||this.text.split(this._reNewline);var r=this._getHeightOfChar(e,n[t][0],t,0),i=n[t],s=i.split("");for(var o=1,u=s.length;o<u;o++){var a=this._getHeightOfChar(e,s[o],t,o);a>r&&(r=a)}return r*this.lineHeight},_getTextHeight:function(e,t){var n=0;for(var r=0,i=t.length;r<i;r++)n+=this._getHeightOfLine(e,r,t);return n},_getTopOffset:function(){var e=fabric.Text.prototype._getTopOffset.call(this);return e-this.fontSize/this._fontSizeFraction},_renderTextBoxBackground:function(e){if(!this.backgroundColor)return;e.save(),e.fillStyle=this.backgroundColor,e.fillRect(this._getLeftOffset(),this._getTopOffset()+this.fontSize/this._fontSizeFraction,this.width,this.height),e.restore()},toObject:function(t){return fabric.util.object.extend(this.callSuper("toObject",t),{styles:e(this.styles)})}}),fabric.IText.fromObject=function(t){return new fabric.IText(t.text,e(t))},fabric.IText.instances=[]}(),function(){var e=fabric.util.object.clone;fabric.util.object.extend(fabric.IText.prototype,{initBehavior:function(){this.initAddedHandler(),this.initCursorSelectionHandlers(),this.initDoubleClickSimulation()},initSelectedHandler:function(){this.on("selected",function(){var e=this;setTimeout(function(){e.selected=!0},100)})},initAddedHandler:function(){this.on("added",function(){this.canvas&&!this.canvas._hasITextHandlers&&(this.canvas._hasITextHandlers=!0,this._initCanvasHandlers())})},_initCanvasHandlers:function(){this.canvas.on("selection:cleared",function(){fabric.IText.prototype.exitEditingOnOthers.call()}),this.canvas.on("mouse:up",function(){fabric.IText.instances.forEach(function(e){e.__isMousedown=!1})}),this.canvas.on("object:selected",function(e){fabric.IText.prototype.exitEditingOnOthers.call(e.target)})},_tick:function(){if(this._abortCursorAnimation)return;var e=this;this.animate("_currentCursorOpacity",1,{duration:this.cursorDuration,onComplete:function(){e._onTickComplete()},onChange:function(){e.canvas&&e.canvas.renderAll()},abort:function(){return e._abortCursorAnimation}})},_onTickComplete:function(){if(this._abortCursorAnimation)return;var e=this;this._cursorTimeout1&&clearTimeout(this._cursorTimeout1),this._cursorTimeout1=setTimeout(function(){e.animate("_currentCursorOpacity",0,{duration:this.cursorDuration/2,onComplete:function(){e._tick()},onChange:function(){e.canvas&&e.canvas.renderAll()},abort:function(){return e._abortCursorAnimation}})},100)},initDelayedCursor:function(e){var t=this,n=e?0:this.cursorDelay;e&&(this._abortCursorAnimation=!0,clearTimeout(this._cursorTimeout1),this._currentCursorOpacity=1,this.canvas&&this.canvas.renderAll()),this._cursorTimeout2&&clearTimeout(this._cursorTimeout2),this._cursorTimeout2=setTimeout(function(){t._abortCursorAnimation=!1,t._tick()},n)},abortCursorAnimation:function(){this._abortCursorAnimation=!0,clearTimeout(this._cursorTimeout1),clearTimeout(this._cursorTimeout2),this._currentCursorOpacity=0,this.canvas&&this.canvas.renderAll();var e=this;setTimeout(function(){e._abortCursorAnimation=!1},10)},selectAll:function(){this.selectionStart=0,this.selectionEnd=this.text.length,this.fire("selection:changed"),this.canvas&&this.canvas.fire("text:selection:changed",{target:this})},getSelectedText:function(){return this.text.slice(this.selectionStart,this.selectionEnd)},findWordBoundaryLeft:function(e){var t=0,n=e-1;if(this._reSpace.test(this.text.charAt(n)))while(this._reSpace.test(this.text.charAt(n)))t++,n--;while(/\S/.test(this.text.charAt(
n))&&n>-1)t++,n--;return e-t},findWordBoundaryRight:function(e){var t=0,n=e;if(this._reSpace.test(this.text.charAt(n)))while(this._reSpace.test(this.text.charAt(n)))t++,n++;while(/\S/.test(this.text.charAt(n))&&n<this.text.length)t++,n++;return e+t},findLineBoundaryLeft:function(e){var t=0,n=e-1;while(!/\n/.test(this.text.charAt(n))&&n>-1)t++,n--;return e-t},findLineBoundaryRight:function(e){var t=0,n=e;while(!/\n/.test(this.text.charAt(n))&&n<this.text.length)t++,n++;return e+t},getNumNewLinesInSelectedText:function(){var e=this.getSelectedText(),t=0;for(var n=0,r=e.split(""),i=r.length;n<i;n++)r[n]==="\n"&&t++;return t},searchWordBoundary:function(e,t){var n=this._reSpace.test(this.text.charAt(e))?e-1:e,r=this.text.charAt(n),i=/[ \n\.,;!\?\-]/;while(!i.test(r)&&n>0&&n<this.text.length)n+=t,r=this.text.charAt(n);return i.test(r)&&r!=="\n"&&(n+=t===1?0:1),n},selectWord:function(e){var t=this.searchWordBoundary(e,-1),n=this.searchWordBoundary(e,1);this.setSelectionStart(t),this.setSelectionEnd(n),this.initDelayedCursor(!0)},selectLine:function(e){var t=this.findLineBoundaryLeft(e),n=this.findLineBoundaryRight(e);this.setSelectionStart(t),this.setSelectionEnd(n),this.initDelayedCursor(!0)},enterEditing:function(){if(this.isEditing||!this.editable)return;return this.exitEditingOnOthers(),this.isEditing=!0,this.initHiddenTextarea(),this._updateTextarea(),this._saveEditingProps(),this._setEditingProps(),this._tick(),this.canvas&&this.canvas.renderAll(),this.fire("editing:entered"),this.canvas&&this.canvas.fire("text:editing:entered",{target:this}),this},exitEditingOnOthers:function(){fabric.IText.instances.forEach(function(e){e.selected=!1,e.isEditing&&e.exitEditing()},this)},_setEditingProps:function(){this.hoverCursor="text",this.canvas&&(this.canvas.defaultCursor=this.canvas.moveCursor="text"),this.borderColor=this.editingBorderColor,this.hasControls=this.selectable=!1,this.lockMovementX=this.lockMovementY=!0},_updateTextarea:function(){if(!this.hiddenTextarea)return;this.hiddenTextarea.value=this.text,this.hiddenTextarea.selectionStart=this.selectionStart},_saveEditingProps:function(){this._savedProps={hasControls:this.hasControls,borderColor:this.borderColor,lockMovementX:this.lockMovementX,lockMovementY:this.lockMovementY,hoverCursor:this.hoverCursor,defaultCursor:this.canvas&&this.canvas.defaultCursor,moveCursor:this.canvas&&this.canvas.moveCursor}},_restoreEditingProps:function(){if(!this._savedProps)return;this.hoverCursor=this._savedProps.overCursor,this.hasControls=this._savedProps.hasControls,this.borderColor=this._savedProps.borderColor,this.lockMovementX=this._savedProps.lockMovementX,this.lockMovementY=this._savedProps.lockMovementY,this.canvas&&(this.canvas.defaultCursor=this._savedProps.defaultCursor,this.canvas.moveCursor=this._savedProps.moveCursor)},exitEditing:function(){return this.selected=!1,this.isEditing=!1,this.selectable=!0,this.selectionEnd=this.selectionStart,this.hiddenTextarea&&this.canvas&&this.hiddenTextarea.parentNode.removeChild(this.hiddenTextarea),this.hiddenTextarea=null,this.abortCursorAnimation(),this._restoreEditingProps(),this._currentCursorOpacity=0,this.fire("editing:exited"),this.canvas&&this.canvas.fire("text:editing:exited",{target:this}),this},_removeExtraneousStyles:function(){var e=this.text.split(this._reNewline);for(var t in this.styles)e[t]||delete this.styles[t]},_removeCharsFromTo:function(e,t){var n=t;while(n!==e){var r=this.get2DCursorLocation(n).charIndex;n--;var i=this.get2DCursorLocation(n).charIndex,s=i>r;s?this.removeStyleObject(s,n+1):this.removeStyleObject(this.get2DCursorLocation(n).charIndex===0,n)}this.text=this.text.slice(0,e)+this.text.slice(t)},insertChars:function(e){var t=this.text.slice(this.selectionStart,this.selectionStart+1)==="\n";this.text=this.text.slice(0,this.selectionStart)+e+this.text.slice(this.selectionEnd),this.selectionStart===this.selectionEnd&&this.insertStyleObjects(e,t,this.copiedStyles),this.selectionStart+=e.length,this.selectionEnd=this.selectionStart,this.canvas&&this.canvas.renderAll().renderAll(),this.setCoords(),this.fire("changed"),this.canvas&&this.canvas.fire("text:changed",{target:this})},insertNewlineStyleObject:function(t,n,r){this.shiftLineStyles(t,1),this.styles[t+1]||(this.styles[t+1]={});var i=this.styles[t][n-1],s={};if(r)s[0]=e(i),this.styles[t+1]=s;else{for(var o in this.styles[t])parseInt(o,10)>=n&&(s[parseInt(o,10)-n]=this.styles[t][o],delete this.styles[t][o]);this.styles[t+1]=s}},insertCharStyleObject:function(t,n,r){var i=this.styles[t],s=e(i);n===0&&!r&&(n=1);for(var o in s){var u=parseInt(o,10);u>=n&&(i[u+1]=s[u])}this.styles[t][n]=r||e(i[n-1])},insertStyleObjects:function(e,t,n){if(this.isEmptyStyles())return;var r=this.get2DCursorLocation(),i=r.lineIndex,s=r.charIndex;this.styles[i]||(this.styles[i]={}),e==="\n"?this.insertNewlineStyleObject(i,s,t):n?this._insertStyles(n):this.insertCharStyleObject(i,s)},_insertStyles:function(e){for(var t=0,n=e.length;t<n;t++){var r=this.get2DCursorLocation(this.selectionStart+t),i=r.lineIndex,s=r.charIndex;this.insertCharStyleObject(i,s,e[t])}},shiftLineStyles:function(t,n){var r=e(this.styles);for(var i in this.styles){var s=parseInt(i,10);s>t&&(this.styles[s+n]=r[s])}},removeStyleObject:function(t,n){var r=this.get2DCursorLocation(n),i=r.lineIndex,s=r.charIndex;if(t){var o=this.text.split(this._reNewline),u=o[i-1],a=u?u.length:0;this.styles[i-1]||(this.styles[i-1]={});for(s in this.styles[i])this.styles[i-1][parseInt(s,10)+a]=this.styles[i][s];this.shiftLineStyles(i,-1)}else{var f=this.styles[i];if(f){var l=this.selectionStart===this.selectionEnd?-1:0;delete f[s+l]}var c=e(f);for(var h in c){var p=parseInt(h,10);p>=s&&p!==0&&(f[p-1]=c[p],delete f[p])}}},insertNewline:function(){this.insertChars("\n")}})}(),fabric.util.object.extend(fabric.IText.prototype,{initDoubleClickSimulation:function(){this.__lastClickTime=+(new Date),this.__lastLastClickTime=+(new Date),this.__lastPointer={},this.on("mousedown",this.onMouseDown.bind(this))},onMouseDown:function(e){this.__newClickTime=+(new Date);var t=this.canvas.getPointer(e.e);this.isTripleClick(t)?(this.fire("tripleclick",e),this._stopEvent(e.e)):this.isDoubleClick(t)&&(this.fire("dblclick",e),this._stopEvent(e.e)),this.__lastLastClickTime=this.__lastClickTime,this.__lastClickTime=this.__newClickTime,this.__lastPointer=t,this.__lastIsEditing=this.isEditing,this.__lastSelected=this.selected},isDoubleClick:function(e){return this.__newClickTime-this.__lastClickTime<500&&this.__lastPointer.x===e.x&&this.__lastPointer.y===e.y&&this.__lastIsEditing},isTripleClick:function(e){return this.__newClickTime-this.__lastClickTime<500&&this.__lastClickTime-this.__lastLastClickTime<500&&this.__lastPointer.x===e.x&&this.__lastPointer.y===e.y},_stopEvent:function(e){e.preventDefault&&e.preventDefault(),e.stopPropagation&&e.stopPropagation()},initCursorSelectionHandlers:function(){this.initSelectedHandler(),this.initMousedownHandler(),this.initMousemoveHandler(),this.initMouseupHandler(),this.initClicks()},initClicks:function(){this.on("dblclick",function(e){this.selectWord(this.getSelectionStartFromPointer(e.e))}),this.on("tripleclick",function(e){this.selectLine(this.getSelectionStartFromPointer(e.e))})},initMousedownHandler:function(){this.on("mousedown",function(e){var t=this.canvas.getPointer(e.e);this.__mousedownX=t.x,this.__mousedownY=t.y,this.__isMousedown=!0,this.hiddenTextarea&&this.canvas&&this.canvas.wrapperEl.appendChild(this.hiddenTextarea),this.selected&&this.setCursorByClick(e.e),this.isEditing&&(this.__selectionStartOnMouseDown=this.selectionStart,this.initDelayedCursor(!0))})},initMousemoveHandler:function(){this.on("mousemove",function(e){if(!this.__isMousedown||!this.isEditing)return;var t=this.getSelectionStartFromPointer(e.e);t>=this.__selectionStartOnMouseDown?(this.setSelectionStart(this.__selectionStartOnMouseDown),this.setSelectionEnd(t)):(this.setSelectionStart(t),this.setSelectionEnd(this.__selectionStartOnMouseDown))})},_isObjectMoved:function(e){var t=this.canvas.getPointer(e);return this.__mousedownX!==t.x||this.__mousedownY!==t.y},initMouseupHandler:function(){this.on("mouseup",function(e){this.__isMousedown=!1;if(this._isObjectMoved(e.e))return;this.__lastSelected&&(this.enterEditing(),this.initDelayedCursor(!0)),this.selected=!0})},setCursorByClick:function(e){var t=this.getSelectionStartFromPointer(e);e.shiftKey?t<this.selectionStart?(this.setSelectionEnd(this.selectionStart),this.setSelectionStart(t)):this.setSelectionEnd(t):(this.setSelectionStart(t),this.setSelectionEnd(t))},_getLocalRotatedPointer:function(e){var t=this.canvas.getPointer(e),n=new fabric.Point(t.x,t.y),r=new fabric.Point(this.left,this.top),i=fabric.util.rotatePoint(n,r,fabric.util.degreesToRadians(-this.angle));return this.getLocalPointer(e,i)},getSelectionStartFromPointer:function(e){var t=this._getLocalRotatedPointer(e),n=this.text.split(this._reNewline),r=0,i=0,s=0,o=0,u;for(var a=0,f=n.length;a<f;a++){s+=this._getHeightOfLine(this.ctx,a)*this.scaleY;var l=this._getWidthOfLine(this.ctx,a,n),c=this._getLineLeftOffset(l);i=c*this.scaleX,this.flipX&&(n[a]=n[a].split("").reverse().join(""));for(var h=0,p=n[a].length;h<p;h++){var d=n[a][h];r=i,i+=this._getWidthOfChar(this.ctx,d,a,this.flipX?p-h:h)*this.scaleX;if(s<=t.y||i<=t.x){o++;continue}return this._getNewSelectionStartFromOffset(t,r,i,o+a,p)}if(t.y<s)return this._getNewSelectionStartFromOffset(t,r,i,o+a,p)}if(typeof u=="undefined")return this.text.length},_getNewSelectionStartFromOffset:function(e,t,n,r,i){var s=e.x-t,o=n-e.x,u=o>s?0:1,a=r+u;return this.flipX&&(a=i-a),a>this.text.length&&(a=this.text.length),a}}),fabric.util.object.extend(fabric.IText.prototype,{initHiddenTextarea:function(){this.hiddenTextarea=fabric.document.createElement("textarea"),this.hiddenTextarea.setAttribute("autocapitalize","off"),this.hiddenTextarea.style.cssText="position: absolute; top: 0; left: -9999px",fabric.document.body.appendChild(this.hiddenTextarea),fabric.util.addListener(this.hiddenTextarea,"keydown",this.onKeyDown.bind(this)),fabric.util.addListener(this.hiddenTextarea,"keypress",this.onKeyPress.bind(this)),fabric.util.addListener(this.hiddenTextarea,"copy",this.copy.bind(this)),fabric.util.addListener(this.hiddenTextarea,"paste",this.paste.bind(this)),!this._clickHandlerInitialized&&this.canvas&&(fabric.util.addListener(this.canvas.upperCanvasEl,"click",this.onClick.bind(this)),this._clickHandlerInitialized=!0)},_keysMap:{8:"removeChars",13:"insertNewline",37:"moveCursorLeft",38:"moveCursorUp",39:"moveCursorRight",40:"moveCursorDown",46:"forwardDelete"},_ctrlKeysMap:{65:"selectAll",88:"cut"},onClick:function(){this.hiddenTextarea&&this.hiddenTextarea.focus()},onKeyDown:function(e){if(!this.isEditing)return;if(e.keyCode in this._keysMap&&e.charCode===0)this[this._keysMap[e.keyCode]](e);else{if(!(e.keyCode in this._ctrlKeysMap&&(e.ctrlKey||e.metaKey)))return;this[this._ctrlKeysMap[e.keyCode]](e)}e.stopPropagation(),this.canvas&&this.canvas.renderAll()},forwardDelete:function(e){this.selectionStart===this.selectionEnd&&this.moveCursorRight(e),this.removeChars(e)},copy:function(e){var t=this.getSelectedText(),n=this._getClipboardData(e);n&&n.setData("text",t),this.copiedText=t,this.copiedStyles=this.getSelectionStyles(this.selectionStart,this.selectionEnd)},paste:function(e){var t=null,n=this._getClipboardData(e);n?t=n.getData("text"):t=this.copiedText,t&&this.insertChars(t)},cut:function(e){if(this.selectionStart===this.selectionEnd)return;this.copy(),this.removeChars(e)},_getClipboardData:function(e){return e&&(e.clipboardData||fabric.window.clipboardData)},onKeyPress:function(e){if(!this.isEditing||e.metaKey||e.ctrlKey||e.keyCode in this._keysMap&&e.charCode===0)return;this.insertChars(String.fromCharCode(e.which)),e.stopPropagation()},getDownCursorOffset:function(e,t){var n=t?this.selectionEnd:this.selectionStart,r=this.text.split(this._reNewline),i,s,o=this.text.slice(0,n),u=this.text.slice(n),a=o.slice(o.lastIndexOf("\n")+1),f=u.match(/(.*)\n?/)[1],l=(u.match(/.*\n(.*)\n?/)||{})[1]||"",c=this.get2DCursorLocation(n);if(c.lineIndex===r.length-1||e.metaKey)return this.text.length-n;var h=this._getWidthOfLine(this.ctx,c.lineIndex,r);s=this._getLineLeftOffset(h);var p=s,d=c.lineIndex;for(var v=0,m=a.length;v<m;v++)i=a[v],p+=this._getWidthOfChar(this.ctx,i,d,v);var g=this._getIndexOnNextLine(c,l,p,r);return f.length+1+g},_getIndexOnNextLine:function(e,t,n,r){var i=e.lineIndex+1,s=this._getWidthOfLine(this.ctx,i,r),o=this._getLineLeftOffset(s),u=o,a=0,f;for(var l=0,c=t.length;l<c;l++){var h=t[l],p=this._getWidthOfChar(this.ctx,h,i,l);u+=p;if(u>n){f=!0;var d=u-p,v=u,m=Math.abs(d-n),g=Math.abs(v-n);a=g<m?l+1:l;break}}return f||(a=t.length),a},moveCursorDown:function(e){this.abortCursorAnimation(),this._currentCursorOpacity=1;var t=this.getDownCursorOffset(e,this._selectionDirection==="right");e.shiftKey?this.moveCursorDownWithShift(t):this.moveCursorDownWithoutShift(t),this.initDelayedCursor()},moveCursorDownWithoutShift:function(e){this._selectionDirection="right",this.selectionStart+=e,this.selectionStart>this.text.length&&(this.selectionStart=this.text.length),this.selectionEnd=this.selectionStart},moveCursorDownWithShift:function(e){if(this._selectionDirection==="left"&&this.selectionStart!==this.selectionEnd){this.selectionStart+=e,this._selectionDirection="left";return}this._selectionDirection="right",this.selectionEnd+=e,this.selectionEnd>this.text.length&&(this.selectionEnd=this.text.length)},getUpCursorOffset:function(e,t){var n=t?this.selectionEnd:this.selectionStart,r=this.get2DCursorLocation(n);if(r.lineIndex===0||e.metaKey)return n;var i=this.text.slice(0,n),s=i.slice(i.lastIndexOf("\n")+1),o=(i.match(/\n?(.*)\n.*$/)||{})[1]||"",u=this.text.split(this._reNewline),a,f=this._getWidthOfLine(this.ctx,r.lineIndex,u),l=this._getLineLeftOffset(f),c=l,h=r.lineIndex;for(var p=0,d=s.length;p<d;p++)a=s[p],c+=this._getWidthOfChar(this.ctx,a,h,p);var v=this._getIndexOnPrevLine(r,o,c,u);return o.length-v+s.length},_getIndexOnPrevLine:function(e,t,n,r){var i=e.lineIndex-1,s=this._getWidthOfLine(this.ctx,i,r),o=this._getLineLeftOffset(s),u=o,a=0,f;for(var l=0,c=t.length;l<c;l++){var h=t[l],p=this._getWidthOfChar(this.ctx,h,i,l);u+=p;if(u>n){f=!0;var d=u-p,v=u,m=Math.abs(d-n),g=Math.abs(v-n);a=g<m?l:l-1;break}}return f||(a=t.length-1),a},moveCursorUp:function(e){this.abortCursorAnimation(),this._currentCursorOpacity=1;var t=this.getUpCursorOffset(e,this._selectionDirection==="right");e.shiftKey?this.moveCursorUpWithShift(t):this.moveCursorUpWithoutShift(t),this.initDelayedCursor()},moveCursorUpWithShift:function(e){if(this.selectionStart===this.selectionEnd)this.selectionStart-=e;else{if(this._selectionDirection==="right"){this.selectionEnd-=e,this._selectionDirection="right";return}this.selectionStart-=e}this.selectionStart<0&&(this.selectionStart=0),this._selectionDirection="left"},moveCursorUpWithoutShift:function(e){this.selectionStart===this.selectionEnd&&(this.selectionStart-=e),this.selectionStart<0&&(this.selectionStart=0),this.selectionEnd=this.selectionStart,this._selectionDirection="left"},moveCursorLeft:function(e){if(this.selectionStart===0&&this.selectionEnd===0)return;this.abortCursorAnimation(),this._currentCursorOpacity=1,e.shiftKey?this.moveCursorLeftWithShift(e):this.moveCursorLeftWithoutShift(e),this.initDelayedCursor()},_move:function(e,t,n){e.altKey?this[t]=this["findWordBoundary"+n](this[t]):e.metaKey?this[t]=this["findLineBoundary"+n](this[t]):this[t]+=n==="Left"?-1:1},_moveLeft:function(e,t){this._move(e,t,"Left")},_moveRight:function(e,t){this._move(e,t,"Right")},moveCursorLeftWithoutShift:function(e){this._selectionDirection="left",this.selectionEnd===this.selectionStart&&this._moveLeft(e,"selectionStart"),this.selectionEnd=this.selectionStart},moveCursorLeftWithShift:function(e){this._selectionDirection==="right"&&this.selectionStart!==this.selectionEnd?this._moveLeft(e,"selectionEnd"):(this._selectionDirection="left",this._moveLeft(e,"selectionStart"),this.text.charAt(this.selectionStart)==="\n"&&this.selectionStart--,this.selectionStart<0&&(this.selectionStart=0))},moveCursorRight:function(e){if(this.selectionStart>=this.text.length&&this.selectionEnd>=this.text.length)return;this.abortCursorAnimation(),this._currentCursorOpacity=1,e.shiftKey?this.moveCursorRightWithShift(e):this.moveCursorRightWithoutShift(e),this.initDelayedCursor()},moveCursorRightWithShift:function(e){this._selectionDirection==="left"&&this.selectionStart!==this.selectionEnd?this._moveRight(e,"selectionStart"):(this._selectionDirection="right",this._moveRight(e,"selectionEnd"),this.text.charAt(this.selectionEnd-1)==="\n"&&this.selectionEnd++,this.selectionEnd>this.text.length&&(this.selectionEnd=this.text.length))},moveCursorRightWithoutShift:function(e){this._selectionDirection="right",this.selectionStart===this.selectionEnd?(this._moveRight(e,"selectionStart"),this.selectionEnd=this.selectionStart):(this.selectionEnd+=this.getNumNewLinesInSelectedText(),this.selectionEnd>this.text.length&&(this.selectionEnd=this.text.length),this.selectionStart=this.selectionEnd)},removeChars:function(e){this.selectionStart===this.selectionEnd?this._removeCharsNearCursor(e):this._removeCharsFromTo(this.selectionStart,this.selectionEnd),this.selectionEnd=this.selectionStart,this._removeExtraneousStyles(),this.canvas&&this.canvas.renderAll().renderAll(),this.setCoords(),this.fire("changed"),this.canvas&&this.canvas.fire("text:changed",{target:this})},_removeCharsNearCursor:function(e){if(this.selectionStart!==0)if(e.metaKey){var t=this.findLineBoundaryLeft(this.selectionStart);this._removeCharsFromTo(t,this.selectionStart),this.selectionStart=t}else if(e.altKey){var n=this.findWordBoundaryLeft(this.selectionStart);this._removeCharsFromTo(n,this.selectionStart),this.selectionStart=n}else{var r=this.text.slice(this.selectionStart-1,this.selectionStart)==="\n";this.removeStyleObject(r),this.selectionStart--,this.text=this.text.slice(0,this.selectionStart)+this.text.slice(this.selectionStart+1)}}}),fabric.util.object.extend(fabric.IText.prototype,{_setSVGTextLineText:function(e,t,n,r,i,s){this.styles[t]?this._setSVGTextLineChars(e,t,n,r,i,s):this.callSuper("_setSVGTextLineText",e,t,n,r,i)},_setSVGTextLineChars:function(e,t,n,r,i,s){var o=t===0||this.useNative?"y":"dy",u=e.split(""),a=0,f=this._getSVGLineLeftOffset(t),l=this._getSVGLineTopOffset(t),c=this._getHeightOfLine(this.ctx,t);for(var h=0,p=u.length;h<p;h++){var d=this.styles[t][h]||{};n.push(this._createTextCharSpan(u[h],d,f,l,o,a));var v=this._getWidthOfChar(this.ctx,u[h],t,h);d.textBackgroundColor&&s.push(this._createTextCharBg(d,f,l,c,v,a)),a+=v}},_getSVGLineLeftOffset:function(e){return this._boundaries&&this._boundaries[e]?fabric.util.toFixed(this._boundaries[e].left,2):0},_getSVGLineTopOffset:function(e){var t=0;for(var n=0;n<=e;n++)t+=this._getHeightOfLine(this.ctx,n);return t-this.height/2},_createTextCharBg:function(e,t,n,r,i,s){return['<rect fill="',e.textBackgroundColor,'" transform="translate(',-this.width/2," ",-this.height+r,")",'" x="',t+s,'" y="',n+r,'" width="',i,'" height="',r,'"></rect>'].join("")},_createTextCharSpan:function(e,t,n,r,i,s){var o=this.getSvgStyles.call(fabric.util.object.extend({visible:!0,fill:this.fill,stroke:this.stroke,type:"text"},t));return['<tspan x="',n+s,'" ',i,'="',r,'" ',t.fontFamily?'font-family="'+t.fontFamily.replace(/"/g,"'")+'" ':"",t.fontSize?'font-size="'+t.fontSize+'" ':"",t.fontStyle?'font-style="'+t.fontStyle+'" ':"",t.fontWeight?'font-weight="'+t.fontWeight+'" ':"",t.textDecoration?'text-decoration="'+t.textDecoration+'" ':"",'style="',o,'">',fabric.util.string.escapeXml(e),"</tspan>"].join("")}}),function(){function request(e,t,n){var r=URL.parse(e);r.port||(r.port=r.protocol.indexOf("https:")===0?443:80);var i=r.port===443?HTTPS:HTTP,s=i.request({hostname:r.hostname,port:r.port,path:r.path,method:"GET"},function(e){var r="";t&&e.setEncoding(t),e.on("end",function(){n(r)}),e.on("data",function(t){e.statusCode===200&&(r+=t)})});s.on("error",function(e){e.errno===process.ECONNREFUSED?fabric.log("ECONNREFUSED: connection refused to "+r.hostname+":"+r.port):fabric.log(e.message)}),s.end()}function requestFs(e,t){var n=require("fs");n.readFile(e,function(e,n){if(e)throw fabric.log(e),e;t(n)})}if(typeof document!="undefined"&&typeof window!="undefined")return;var DOMParser=require("xmldom").DOMParser,URL=require("url"),HTTP=require("http"),HTTPS=require("https"),Canvas=require("canvas"),Image=require("canvas").Image;fabric.util.loadImage=function(e,t,n){function r(r){i.src=new Buffer(r,"binary"),i._src=e,t&&t.call(n,i)}var i=new Image;e&&(e instanceof Buffer||e.indexOf("data")===0)?(i.src=i._src=e,t&&t.call(n,i)):e&&e.indexOf("http")!==0?requestFs(e,r):e?request(e,"binary",r):t&&t.call(n,e)},fabric.loadSVGFromURL=function(e,t,n){e=e.replace(/^\n\s*/,"").replace(/\?.*$/,"").trim(),e.indexOf("http")!==0?requestFs(e,function(e){fabric.loadSVGFromString(e.toString(),t,n)}):request(e,"",function(e){fabric.loadSVGFromString(e,t,n)})},fabric.loadSVGFromString=function(e,t,n){var r=(new DOMParser).parseFromString(e);fabric.parseSVGDocument(r.documentElement,function(e,n){t&&t(e,n)},n)},fabric.util.getScript=function(url,callback){request(url,"",function(body){eval(body),callback&&callback()})},fabric.Image.fromObject=function(e,t){fabric.util.loadImage(e.src,function(n){var r=new fabric.Image(n);r._initConfig(e),r._initFilters(e,function(e){r.filters=e||[],t&&t(r)})})},fabric.createCanvasForNode=function(e,t,n,r){r=r||n;var i=fabric.document.createElement("canvas"),s=new Canvas(e||600,t||600,r);i.style={},i.width=s.width,i.height=s.height;var o=fabric.Canvas||fabric.StaticCanvas,u=new o(i,n);return u.contextContainer=s.getContext("2d"),u.nodeCanvas=s,u.Font=Canvas.Font,u},fabric.StaticCanvas.prototype.createPNGStream=function(){return this.nodeCanvas.createPNGStream()},fabric.StaticCanvas.prototype.createJPEGStream=function(e){return this.nodeCanvas.createJPEGStream(e)};var origSetWidth=fabric.StaticCanvas.prototype.setWidth;fabric.StaticCanvas.prototype.setWidth=function(e,t){return origSetWidth.call(this,e,t),this.nodeCanvas.width=e,this},fabric.Canvas&&(fabric.Canvas.prototype.setWidth=fabric.StaticCanvas.prototype.setWidth);var origSetHeight=fabric.StaticCanvas.prototype.setHeight;fabric.StaticCanvas.prototype.setHeight=function(e,t){return origSetHeight.call(this,e,t),this.nodeCanvas.height=e,this},fabric.Canvas&&(fabric.Canvas.prototype.setHeight=fabric.StaticCanvas.prototype.setHeight)}();
// TinyColor v1.0.0
// https://github.com/bgrins/TinyColor
// 2014-06-13, Brian Grinstead, MIT License

(function() {

var trimLeft = /^[\s,#]+/,
    trimRight = /\s+$/,
    tinyCounter = 0,
    math = Math,
    mathRound = math.round,
    mathMin = math.min,
    mathMax = math.max,
    mathRandom = math.random;

var tinycolor = function tinycolor (color, opts) {

    color = (color) ? color : '';
    opts = opts || { };

    // If input is already a tinycolor, return itself
    if (color instanceof tinycolor) {
       return color;
    }
    // If we are called as a function, call using new instead
    if (!(this instanceof tinycolor)) {
        return new tinycolor(color, opts);
    }

    var rgb = inputToRGB(color);
    this._r = rgb.r,
    this._g = rgb.g,
    this._b = rgb.b,
    this._a = rgb.a,
    this._roundA = mathRound(100*this._a) / 100,
    this._format = opts.format || rgb.format;
    this._gradientType = opts.gradientType;

    // Don't let the range of [0,255] come back in [0,1].
    // Potentially lose a little bit of precision here, but will fix issues where
    // .5 gets interpreted as half of the total, instead of half of 1
    // If it was supposed to be 128, this was already taken care of by `inputToRgb`
    if (this._r < 1) { this._r = mathRound(this._r); }
    if (this._g < 1) { this._g = mathRound(this._g); }
    if (this._b < 1) { this._b = mathRound(this._b); }

    this._ok = rgb.ok;
    this._tc_id = tinyCounter++;
};

tinycolor.prototype = {
    isDark: function() {
        return this.getBrightness() < 128;
    },
    isLight: function() {
        return !this.isDark();
    },
    isValid: function() {
        return this._ok;
    },
    getFormat: function() {
        return this._format;
    },
    getAlpha: function() {
        return this._a;
    },
    getBrightness: function() {
        var rgb = this.toRgb();
        return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    },
    setAlpha: function(value) {
        this._a = boundAlpha(value);
        this._roundA = mathRound(100*this._a) / 100;
        return this;
    },
    toHsv: function() {
        var hsv = rgbToHsv(this._r, this._g, this._b);
        return { h: hsv.h * 360, s: hsv.s, v: hsv.v, a: this._a };
    },
    toHsvString: function() {
        var hsv = rgbToHsv(this._r, this._g, this._b);
        var h = mathRound(hsv.h * 360), s = mathRound(hsv.s * 100), v = mathRound(hsv.v * 100);
        return (this._a == 1) ?
          "hsv("  + h + ", " + s + "%, " + v + "%)" :
          "hsva(" + h + ", " + s + "%, " + v + "%, "+ this._roundA + ")";
    },
    toHsl: function() {
        var hsl = rgbToHsl(this._r, this._g, this._b);
        return { h: hsl.h * 360, s: hsl.s, l: hsl.l, a: this._a };
    },
    toHslString: function() {
        var hsl = rgbToHsl(this._r, this._g, this._b);
        var h = mathRound(hsl.h * 360), s = mathRound(hsl.s * 100), l = mathRound(hsl.l * 100);
        return (this._a == 1) ?
          "hsl("  + h + ", " + s + "%, " + l + "%)" :
          "hsla(" + h + ", " + s + "%, " + l + "%, "+ this._roundA + ")";
    },
    toHex: function(allow3Char) {
        return rgbToHex(this._r, this._g, this._b, allow3Char);
    },
    toHexString: function(allow3Char) {
        return '#' + this.toHex(allow3Char);
    },
    toHex8: function() {
        return rgbaToHex(this._r, this._g, this._b, this._a);
    },
    toHex8String: function() {
        return '#' + this.toHex8();
    },
    toRgb: function() {
        return { r: mathRound(this._r), g: mathRound(this._g), b: mathRound(this._b), a: this._a };
    },
    toRgbString: function() {
        return (this._a == 1) ?
          "rgb("  + mathRound(this._r) + ", " + mathRound(this._g) + ", " + mathRound(this._b) + ")" :
          "rgba(" + mathRound(this._r) + ", " + mathRound(this._g) + ", " + mathRound(this._b) + ", " + this._roundA + ")";
    },
    toPercentageRgb: function() {
        return { r: mathRound(bound01(this._r, 255) * 100) + "%", g: mathRound(bound01(this._g, 255) * 100) + "%", b: mathRound(bound01(this._b, 255) * 100) + "%", a: this._a };
    },
    toPercentageRgbString: function() {
        return (this._a == 1) ?
          "rgb("  + mathRound(bound01(this._r, 255) * 100) + "%, " + mathRound(bound01(this._g, 255) * 100) + "%, " + mathRound(bound01(this._b, 255) * 100) + "%)" :
          "rgba(" + mathRound(bound01(this._r, 255) * 100) + "%, " + mathRound(bound01(this._g, 255) * 100) + "%, " + mathRound(bound01(this._b, 255) * 100) + "%, " + this._roundA + ")";
    },
    toName: function() {
        if (this._a === 0) {
            return "transparent";
        }

        if (this._a < 1) {
            return false;
        }

        return hexNames[rgbToHex(this._r, this._g, this._b, true)] || false;
    },
    toFilter: function(secondColor) {
        var hex8String = '#' + rgbaToHex(this._r, this._g, this._b, this._a);
        var secondHex8String = hex8String;
        var gradientType = this._gradientType ? "GradientType = 1, " : "";

        if (secondColor) {
            var s = tinycolor(secondColor);
            secondHex8String = s.toHex8String();
        }

        return "progid:DXImageTransform.Microsoft.gradient("+gradientType+"startColorstr="+hex8String+",endColorstr="+secondHex8String+")";
    },
    toString: function(format) {
        var formatSet = !!format;
        format = format || this._format;

        var formattedString = false;
        var hasAlpha = this._a < 1 && this._a >= 0;
        var needsAlphaFormat = !formatSet && hasAlpha && (format === "hex" || format === "hex6" || format === "hex3" || format === "name");

        if (needsAlphaFormat) {
            // Special case for "transparent", all other non-alpha formats
            // will return rgba when there is transparency.
            if (format === "name" && this._a === 0) {
                return this.toName();
            }
            return this.toRgbString();
        }
        if (format === "rgb") {
            formattedString = this.toRgbString();
        }
        if (format === "prgb") {
            formattedString = this.toPercentageRgbString();
        }
        if (format === "hex" || format === "hex6") {
            formattedString = this.toHexString();
        }
        if (format === "hex3") {
            formattedString = this.toHexString(true);
        }
        if (format === "hex8") {
            formattedString = this.toHex8String();
        }
        if (format === "name") {
            formattedString = this.toName();
        }
        if (format === "hsl") {
            formattedString = this.toHslString();
        }
        if (format === "hsv") {
            formattedString = this.toHsvString();
        }

        return formattedString || this.toHexString();
    },

    _applyModification: function(fn, args) {
        var color = fn.apply(null, [this].concat([].slice.call(args)));
        this._r = color._r;
        this._g = color._g;
        this._b = color._b;
        this.setAlpha(color._a);
        return this;
    },
    lighten: function() {
        return this._applyModification(lighten, arguments);
    },
    brighten: function() {
        return this._applyModification(brighten, arguments);
    },
    darken: function() {
        return this._applyModification(darken, arguments);
    },
    desaturate: function() {
        return this._applyModification(desaturate, arguments);
    },
    saturate: function() {
        return this._applyModification(saturate, arguments);
    },
    greyscale: function() {
        return this._applyModification(greyscale, arguments);
    },
    spin: function() {
        return this._applyModification(spin, arguments);
    },

    _applyCombination: function(fn, args) {
        return fn.apply(null, [this].concat([].slice.call(args)));
    },
    analogous: function() {
        return this._applyCombination(analogous, arguments);
    },
    complement: function() {
        return this._applyCombination(complement, arguments);
    },
    monochromatic: function() {
        return this._applyCombination(monochromatic, arguments);
    },
    splitcomplement: function() {
        return this._applyCombination(splitcomplement, arguments);
    },
    triad: function() {
        return this._applyCombination(triad, arguments);
    },
    tetrad: function() {
        return this._applyCombination(tetrad, arguments);
    }
};

// If input is an object, force 1 into "1.0" to handle ratios properly
// String input requires "1.0" as input, so 1 will be treated as 1
tinycolor.fromRatio = function(color, opts) {
    if (typeof color == "object") {
        var newColor = {};
        for (var i in color) {
            if (color.hasOwnProperty(i)) {
                if (i === "a") {
                    newColor[i] = color[i];
                }
                else {
                    newColor[i] = convertToPercentage(color[i]);
                }
            }
        }
        color = newColor;
    }

    return tinycolor(color, opts);
};

// Given a string or object, convert that input to RGB
// Possible string inputs:
//
//     "red"
//     "#f00" or "f00"
//     "#ff0000" or "ff0000"
//     "#ff000000" or "ff000000"
//     "rgb 255 0 0" or "rgb (255, 0, 0)"
//     "rgb 1.0 0 0" or "rgb (1, 0, 0)"
//     "rgba (255, 0, 0, 1)" or "rgba 255, 0, 0, 1"
//     "rgba (1.0, 0, 0, 1)" or "rgba 1.0, 0, 0, 1"
//     "hsl(0, 100%, 50%)" or "hsl 0 100% 50%"
//     "hsla(0, 100%, 50%, 1)" or "hsla 0 100% 50%, 1"
//     "hsv(0, 100%, 100%)" or "hsv 0 100% 100%"
//
function inputToRGB(color) {

    var rgb = { r: 0, g: 0, b: 0 };
    var a = 1;
    var ok = false;
    var format = false;

    if (typeof color == "string") {
        color = stringInputToObject(color);
    }

    if (typeof color == "object") {
        if (color.hasOwnProperty("r") && color.hasOwnProperty("g") && color.hasOwnProperty("b")) {
            rgb = rgbToRgb(color.r, color.g, color.b);
            ok = true;
            format = String(color.r).substr(-1) === "%" ? "prgb" : "rgb";
        }
        else if (color.hasOwnProperty("h") && color.hasOwnProperty("s") && color.hasOwnProperty("v")) {
            color.s = convertToPercentage(color.s);
            color.v = convertToPercentage(color.v);
            rgb = hsvToRgb(color.h, color.s, color.v);
            ok = true;
            format = "hsv";
        }
        else if (color.hasOwnProperty("h") && color.hasOwnProperty("s") && color.hasOwnProperty("l")) {
            color.s = convertToPercentage(color.s);
            color.l = convertToPercentage(color.l);
            rgb = hslToRgb(color.h, color.s, color.l);
            ok = true;
            format = "hsl";
        }

        if (color.hasOwnProperty("a")) {
            a = color.a;
        }
    }

    a = boundAlpha(a);

    return {
        ok: ok,
        format: color.format || format,
        r: mathMin(255, mathMax(rgb.r, 0)),
        g: mathMin(255, mathMax(rgb.g, 0)),
        b: mathMin(255, mathMax(rgb.b, 0)),
        a: a
    };
}


// Conversion Functions
// --------------------

// `rgbToHsl`, `rgbToHsv`, `hslToRgb`, `hsvToRgb` modified from:
// <http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript>

// `rgbToRgb`
// Handle bounds / percentage checking to conform to CSS color spec
// <http://www.w3.org/TR/css3-color/>
// *Assumes:* r, g, b in [0, 255] or [0, 1]
// *Returns:* { r, g, b } in [0, 255]
function rgbToRgb(r, g, b){
    return {
        r: bound01(r, 255) * 255,
        g: bound01(g, 255) * 255,
        b: bound01(b, 255) * 255
    };
}

// `rgbToHsl`
// Converts an RGB color value to HSL.
// *Assumes:* r, g, and b are contained in [0, 255] or [0, 1]
// *Returns:* { h, s, l } in [0,1]
function rgbToHsl(r, g, b) {

    r = bound01(r, 255);
    g = bound01(g, 255);
    b = bound01(b, 255);

    var max = mathMax(r, g, b), min = mathMin(r, g, b);
    var h, s, l = (max + min) / 2;

    if(max == min) {
        h = s = 0; // achromatic
    }
    else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }

        h /= 6;
    }

    return { h: h, s: s, l: l };
}

// `hslToRgb`
// Converts an HSL color value to RGB.
// *Assumes:* h is contained in [0, 1] or [0, 360] and s and l are contained [0, 1] or [0, 100]
// *Returns:* { r, g, b } in the set [0, 255]
function hslToRgb(h, s, l) {
    var r, g, b;

    h = bound01(h, 360);
    s = bound01(s, 100);
    l = bound01(l, 100);

    function hue2rgb(p, q, t) {
        if(t < 0) t += 1;
        if(t > 1) t -= 1;
        if(t < 1/6) return p + (q - p) * 6 * t;
        if(t < 1/2) return q;
        if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    }

    if(s === 0) {
        r = g = b = l; // achromatic
    }
    else {
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return { r: r * 255, g: g * 255, b: b * 255 };
}

// `rgbToHsv`
// Converts an RGB color value to HSV
// *Assumes:* r, g, and b are contained in the set [0, 255] or [0, 1]
// *Returns:* { h, s, v } in [0,1]
function rgbToHsv(r, g, b) {

    r = bound01(r, 255);
    g = bound01(g, 255);
    b = bound01(b, 255);

    var max = mathMax(r, g, b), min = mathMin(r, g, b);
    var h, s, v = max;

    var d = max - min;
    s = max === 0 ? 0 : d / max;

    if(max == min) {
        h = 0; // achromatic
    }
    else {
        switch(max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h, s: s, v: v };
}

// `hsvToRgb`
// Converts an HSV color value to RGB.
// *Assumes:* h is contained in [0, 1] or [0, 360] and s and v are contained in [0, 1] or [0, 100]
// *Returns:* { r, g, b } in the set [0, 255]
 function hsvToRgb(h, s, v) {

    h = bound01(h, 360) * 6;
    s = bound01(s, 100);
    v = bound01(v, 100);

    var i = math.floor(h),
        f = h - i,
        p = v * (1 - s),
        q = v * (1 - f * s),
        t = v * (1 - (1 - f) * s),
        mod = i % 6,
        r = [v, q, p, p, t, v][mod],
        g = [t, v, v, q, p, p][mod],
        b = [p, p, t, v, v, q][mod];

    return { r: r * 255, g: g * 255, b: b * 255 };
}

// `rgbToHex`
// Converts an RGB color to hex
// Assumes r, g, and b are contained in the set [0, 255]
// Returns a 3 or 6 character hex
function rgbToHex(r, g, b, allow3Char) {

    var hex = [
        pad2(mathRound(r).toString(16)),
        pad2(mathRound(g).toString(16)),
        pad2(mathRound(b).toString(16))
    ];

    // Return a 3 character hex if possible
    if (allow3Char && hex[0].charAt(0) == hex[0].charAt(1) && hex[1].charAt(0) == hex[1].charAt(1) && hex[2].charAt(0) == hex[2].charAt(1)) {
        return hex[0].charAt(0) + hex[1].charAt(0) + hex[2].charAt(0);
    }

    return hex.join("");
}
    // `rgbaToHex`
    // Converts an RGBA color plus alpha transparency to hex
    // Assumes r, g, b and a are contained in the set [0, 255]
    // Returns an 8 character hex
    function rgbaToHex(r, g, b, a) {

        var hex = [
            pad2(convertDecimalToHex(a)),
            pad2(mathRound(r).toString(16)),
            pad2(mathRound(g).toString(16)),
            pad2(mathRound(b).toString(16))
        ];

        return hex.join("");
    }

// `equals`
// Can be called with any tinycolor input
tinycolor.equals = function (color1, color2) {
    if (!color1 || !color2) { return false; }
    return tinycolor(color1).toRgbString() == tinycolor(color2).toRgbString();
};
tinycolor.random = function() {
    return tinycolor.fromRatio({
        r: mathRandom(),
        g: mathRandom(),
        b: mathRandom()
    });
};


// Modification Functions
// ----------------------
// Thanks to less.js for some of the basics here
// <https://github.com/cloudhead/less.js/blob/master/lib/less/functions.js>

function desaturate(color, amount) {
    amount = (amount === 0) ? 0 : (amount || 10);
    var hsl = tinycolor(color).toHsl();
    hsl.s -= amount / 100;
    hsl.s = clamp01(hsl.s);
    return tinycolor(hsl);
}

function saturate(color, amount) {
    amount = (amount === 0) ? 0 : (amount || 10);
    var hsl = tinycolor(color).toHsl();
    hsl.s += amount / 100;
    hsl.s = clamp01(hsl.s);
    return tinycolor(hsl);
}

function greyscale(color) {
    return tinycolor(color).desaturate(100);
}

function lighten (color, amount) {
    amount = (amount === 0) ? 0 : (amount || 10);
    var hsl = tinycolor(color).toHsl();
    hsl.l += amount / 100;
    hsl.l = clamp01(hsl.l);
    return tinycolor(hsl);
}

function brighten(color, amount) {
    amount = (amount === 0) ? 0 : (amount || 10);
    var rgb = tinycolor(color).toRgb();
    rgb.r = mathMax(0, mathMin(255, rgb.r - mathRound(255 * - (amount / 100))));
    rgb.g = mathMax(0, mathMin(255, rgb.g - mathRound(255 * - (amount / 100))));
    rgb.b = mathMax(0, mathMin(255, rgb.b - mathRound(255 * - (amount / 100))));
    return tinycolor(rgb);
}

function darken (color, amount) {
    amount = (amount === 0) ? 0 : (amount || 10);
    var hsl = tinycolor(color).toHsl();
    hsl.l -= amount / 100;
    hsl.l = clamp01(hsl.l);
    return tinycolor(hsl);
}

// Spin takes a positive or negative amount within [-360, 360] indicating the change of hue.
// Values outside of this range will be wrapped into this range.
function spin(color, amount) {
    var hsl = tinycolor(color).toHsl();
    var hue = (mathRound(hsl.h) + amount) % 360;
    hsl.h = hue < 0 ? 360 + hue : hue;
    return tinycolor(hsl);
}

// Combination Functions
// ---------------------
// Thanks to jQuery xColor for some of the ideas behind these
// <https://github.com/infusion/jQuery-xcolor/blob/master/jquery.xcolor.js>

function complement(color) {
    var hsl = tinycolor(color).toHsl();
    hsl.h = (hsl.h + 180) % 360;
    return tinycolor(hsl);
}

function triad(color) {
    var hsl = tinycolor(color).toHsl();
    var h = hsl.h;
    return [
        tinycolor(color),
        tinycolor({ h: (h + 120) % 360, s: hsl.s, l: hsl.l }),
        tinycolor({ h: (h + 240) % 360, s: hsl.s, l: hsl.l })
    ];
}

function tetrad(color) {
    var hsl = tinycolor(color).toHsl();
    var h = hsl.h;
    return [
        tinycolor(color),
        tinycolor({ h: (h + 90) % 360, s: hsl.s, l: hsl.l }),
        tinycolor({ h: (h + 180) % 360, s: hsl.s, l: hsl.l }),
        tinycolor({ h: (h + 270) % 360, s: hsl.s, l: hsl.l })
    ];
}

function splitcomplement(color) {
    var hsl = tinycolor(color).toHsl();
    var h = hsl.h;
    return [
        tinycolor(color),
        tinycolor({ h: (h + 72) % 360, s: hsl.s, l: hsl.l}),
        tinycolor({ h: (h + 216) % 360, s: hsl.s, l: hsl.l})
    ];
}

function analogous(color, results, slices) {
    results = results || 6;
    slices = slices || 30;

    var hsl = tinycolor(color).toHsl();
    var part = 360 / slices;
    var ret = [tinycolor(color)];

    for (hsl.h = ((hsl.h - (part * results >> 1)) + 720) % 360; --results; ) {
        hsl.h = (hsl.h + part) % 360;
        ret.push(tinycolor(hsl));
    }
    return ret;
}

function monochromatic(color, results) {
    results = results || 6;
    var hsv = tinycolor(color).toHsv();
    var h = hsv.h, s = hsv.s, v = hsv.v;
    var ret = [];
    var modification = 1 / results;

    while (results--) {
        ret.push(tinycolor({ h: h, s: s, v: v}));
        v = (v + modification) % 1;
    }

    return ret;
}

// Utility Functions
// ---------------------

tinycolor.mix = function(color1, color2, amount) {
    amount = (amount === 0) ? 0 : (amount || 50);

    var rgb1 = tinycolor(color1).toRgb();
    var rgb2 = tinycolor(color2).toRgb();

    var p = amount / 100;
    var w = p * 2 - 1;
    var a = rgb2.a - rgb1.a;

    var w1;

    if (w * a == -1) {
        w1 = w;
    } else {
        w1 = (w + a) / (1 + w * a);
    }

    w1 = (w1 + 1) / 2;

    var w2 = 1 - w1;

    var rgba = {
        r: rgb2.r * w1 + rgb1.r * w2,
        g: rgb2.g * w1 + rgb1.g * w2,
        b: rgb2.b * w1 + rgb1.b * w2,
        a: rgb2.a * p  + rgb1.a * (1 - p)
    };

    return tinycolor(rgba);
};


// Readability Functions
// ---------------------
// <http://www.w3.org/TR/AERT#color-contrast>

// `readability`
// Analyze the 2 colors and returns an object with the following properties:
//    `brightness`: difference in brightness between the two colors
//    `color`: difference in color/hue between the two colors
tinycolor.readability = function(color1, color2) {
    var c1 = tinycolor(color1);
    var c2 = tinycolor(color2);
    var rgb1 = c1.toRgb();
    var rgb2 = c2.toRgb();
    var brightnessA = c1.getBrightness();
    var brightnessB = c2.getBrightness();
    var colorDiff = (
        Math.max(rgb1.r, rgb2.r) - Math.min(rgb1.r, rgb2.r) +
        Math.max(rgb1.g, rgb2.g) - Math.min(rgb1.g, rgb2.g) +
        Math.max(rgb1.b, rgb2.b) - Math.min(rgb1.b, rgb2.b)
    );

    return {
        brightness: Math.abs(brightnessA - brightnessB),
        color: colorDiff
    };
};

// `readable`
// http://www.w3.org/TR/AERT#color-contrast
// Ensure that foreground and background color combinations provide sufficient contrast.
// *Example*
//    tinycolor.isReadable("#000", "#111") => false
tinycolor.isReadable = function(color1, color2) {
    var readability = tinycolor.readability(color1, color2);
    return readability.brightness > 125 && readability.color > 500;
};

// `mostReadable`
// Given a base color and a list of possible foreground or background
// colors for that base, returns the most readable color.
// *Example*
//    tinycolor.mostReadable("#123", ["#fff", "#000"]) => "#000"
tinycolor.mostReadable = function(baseColor, colorList) {
    var bestColor = null;
    var bestScore = 0;
    var bestIsReadable = false;
    for (var i=0; i < colorList.length; i++) {

        // We normalize both around the "acceptable" breaking point,
        // but rank brightness constrast higher than hue.

        var readability = tinycolor.readability(baseColor, colorList[i]);
        var readable = readability.brightness > 125 && readability.color > 500;
        var score = 3 * (readability.brightness / 125) + (readability.color / 500);

        if ((readable && ! bestIsReadable) ||
            (readable && bestIsReadable && score > bestScore) ||
            ((! readable) && (! bestIsReadable) && score > bestScore)) {
            bestIsReadable = readable;
            bestScore = score;
            bestColor = tinycolor(colorList[i]);
        }
    }
    return bestColor;
};


// Big List of Colors
// ------------------
// <http://www.w3.org/TR/css3-color/#svg-color>
var names = tinycolor.names = {
    aliceblue: "f0f8ff",
    antiquewhite: "faebd7",
    aqua: "0ff",
    aquamarine: "7fffd4",
    azure: "f0ffff",
    beige: "f5f5dc",
    bisque: "ffe4c4",
    black: "000",
    blanchedalmond: "ffebcd",
    blue: "00f",
    blueviolet: "8a2be2",
    brown: "a52a2a",
    burlywood: "deb887",
    burntsienna: "ea7e5d",
    cadetblue: "5f9ea0",
    chartreuse: "7fff00",
    chocolate: "d2691e",
    coral: "ff7f50",
    cornflowerblue: "6495ed",
    cornsilk: "fff8dc",
    crimson: "dc143c",
    cyan: "0ff",
    darkblue: "00008b",
    darkcyan: "008b8b",
    darkgoldenrod: "b8860b",
    darkgray: "a9a9a9",
    darkgreen: "006400",
    darkgrey: "a9a9a9",
    darkkhaki: "bdb76b",
    darkmagenta: "8b008b",
    darkolivegreen: "556b2f",
    darkorange: "ff8c00",
    darkorchid: "9932cc",
    darkred: "8b0000",
    darksalmon: "e9967a",
    darkseagreen: "8fbc8f",
    darkslateblue: "483d8b",
    darkslategray: "2f4f4f",
    darkslategrey: "2f4f4f",
    darkturquoise: "00ced1",
    darkviolet: "9400d3",
    deeppink: "ff1493",
    deepskyblue: "00bfff",
    dimgray: "696969",
    dimgrey: "696969",
    dodgerblue: "1e90ff",
    firebrick: "b22222",
    floralwhite: "fffaf0",
    forestgreen: "228b22",
    fuchsia: "f0f",
    gainsboro: "dcdcdc",
    ghostwhite: "f8f8ff",
    gold: "ffd700",
    goldenrod: "daa520",
    gray: "808080",
    green: "008000",
    greenyellow: "adff2f",
    grey: "808080",
    honeydew: "f0fff0",
    hotpink: "ff69b4",
    indianred: "cd5c5c",
    indigo: "4b0082",
    ivory: "fffff0",
    khaki: "f0e68c",
    lavender: "e6e6fa",
    lavenderblush: "fff0f5",
    lawngreen: "7cfc00",
    lemonchiffon: "fffacd",
    lightblue: "add8e6",
    lightcoral: "f08080",
    lightcyan: "e0ffff",
    lightgoldenrodyellow: "fafad2",
    lightgray: "d3d3d3",
    lightgreen: "90ee90",
    lightgrey: "d3d3d3",
    lightpink: "ffb6c1",
    lightsalmon: "ffa07a",
    lightseagreen: "20b2aa",
    lightskyblue: "87cefa",
    lightslategray: "789",
    lightslategrey: "789",
    lightsteelblue: "b0c4de",
    lightyellow: "ffffe0",
    lime: "0f0",
    limegreen: "32cd32",
    linen: "faf0e6",
    magenta: "f0f",
    maroon: "800000",
    mediumaquamarine: "66cdaa",
    mediumblue: "0000cd",
    mediumorchid: "ba55d3",
    mediumpurple: "9370db",
    mediumseagreen: "3cb371",
    mediumslateblue: "7b68ee",
    mediumspringgreen: "00fa9a",
    mediumturquoise: "48d1cc",
    mediumvioletred: "c71585",
    midnightblue: "191970",
    mintcream: "f5fffa",
    mistyrose: "ffe4e1",
    moccasin: "ffe4b5",
    navajowhite: "ffdead",
    navy: "000080",
    oldlace: "fdf5e6",
    olive: "808000",
    olivedrab: "6b8e23",
    orange: "ffa500",
    orangered: "ff4500",
    orchid: "da70d6",
    palegoldenrod: "eee8aa",
    palegreen: "98fb98",
    paleturquoise: "afeeee",
    palevioletred: "db7093",
    papayawhip: "ffefd5",
    peachpuff: "ffdab9",
    peru: "cd853f",
    pink: "ffc0cb",
    plum: "dda0dd",
    powderblue: "b0e0e6",
    purple: "800080",
    red: "f00",
    rosybrown: "bc8f8f",
    royalblue: "4169e1",
    saddlebrown: "8b4513",
    salmon: "fa8072",
    sandybrown: "f4a460",
    seagreen: "2e8b57",
    seashell: "fff5ee",
    sienna: "a0522d",
    silver: "c0c0c0",
    skyblue: "87ceeb",
    slateblue: "6a5acd",
    slategray: "708090",
    slategrey: "708090",
    snow: "fffafa",
    springgreen: "00ff7f",
    steelblue: "4682b4",
    tan: "d2b48c",
    teal: "008080",
    thistle: "d8bfd8",
    tomato: "ff6347",
    turquoise: "40e0d0",
    violet: "ee82ee",
    wheat: "f5deb3",
    white: "fff",
    whitesmoke: "f5f5f5",
    yellow: "ff0",
    yellowgreen: "9acd32"
};

// Make it easy to access colors via `hexNames[hex]`
var hexNames = tinycolor.hexNames = flip(names);


// Utilities
// ---------

// `{ 'name1': 'val1' }` becomes `{ 'val1': 'name1' }`
function flip(o) {
    var flipped = { };
    for (var i in o) {
        if (o.hasOwnProperty(i)) {
            flipped[o[i]] = i;
        }
    }
    return flipped;
}

// Return a valid alpha value [0,1] with all invalid values being set to 1
function boundAlpha(a) {
    a = parseFloat(a);

    if (isNaN(a) || a < 0 || a > 1) {
        a = 1;
    }

    return a;
}

// Take input from [0, n] and return it as [0, 1]
function bound01(n, max) {
    if (isOnePointZero(n)) { n = "100%"; }

    var processPercent = isPercentage(n);
    n = mathMin(max, mathMax(0, parseFloat(n)));

    // Automatically convert percentage into number
    if (processPercent) {
        n = parseInt(n * max, 10) / 100;
    }

    // Handle floating point rounding errors
    if ((math.abs(n - max) < 0.000001)) {
        return 1;
    }

    // Convert into [0, 1] range if it isn't already
    return (n % max) / parseFloat(max);
}

// Force a number between 0 and 1
function clamp01(val) {
    return mathMin(1, mathMax(0, val));
}

// Parse a base-16 hex value into a base-10 integer
function parseIntFromHex(val) {
    return parseInt(val, 16);
}

// Need to handle 1.0 as 100%, since once it is a number, there is no difference between it and 1
// <http://stackoverflow.com/questions/7422072/javascript-how-to-detect-number-as-a-decimal-including-1-0>
function isOnePointZero(n) {
    return typeof n == "string" && n.indexOf('.') != -1 && parseFloat(n) === 1;
}

// Check to see if string passed in is a percentage
function isPercentage(n) {
    return typeof n === "string" && n.indexOf('%') != -1;
}

// Force a hex value to have 2 characters
function pad2(c) {
    return c.length == 1 ? '0' + c : '' + c;
}

// Replace a decimal with it's percentage value
function convertToPercentage(n) {
    if (n <= 1) {
        n = (n * 100) + "%";
    }

    return n;
}

// Converts a decimal to a hex value
function convertDecimalToHex(d) {
    return Math.round(parseFloat(d) * 255).toString(16);
}
// Converts a hex value to a decimal
function convertHexToDecimal(h) {
    return (parseIntFromHex(h) / 255);
}

var matchers = (function() {

    // <http://www.w3.org/TR/css3-values/#integers>
    var CSS_INTEGER = "[-\\+]?\\d+%?";

    // <http://www.w3.org/TR/css3-values/#number-value>
    var CSS_NUMBER = "[-\\+]?\\d*\\.\\d+%?";

    // Allow positive/negative integer/number.  Don't capture the either/or, just the entire outcome.
    var CSS_UNIT = "(?:" + CSS_NUMBER + ")|(?:" + CSS_INTEGER + ")";

    // Actual matching.
    // Parentheses and commas are optional, but not required.
    // Whitespace can take the place of commas or opening paren
    var PERMISSIVE_MATCH3 = "[\\s|\\(]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")\\s*\\)?";
    var PERMISSIVE_MATCH4 = "[\\s|\\(]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")\\s*\\)?";

    return {
        rgb: new RegExp("rgb" + PERMISSIVE_MATCH3),
        rgba: new RegExp("rgba" + PERMISSIVE_MATCH4),
        hsl: new RegExp("hsl" + PERMISSIVE_MATCH3),
        hsla: new RegExp("hsla" + PERMISSIVE_MATCH4),
        hsv: new RegExp("hsv" + PERMISSIVE_MATCH3),
        hex3: /^([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,
        hex6: /^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/,
        hex8: /^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/
    };
})();

// `stringInputToObject`
// Permissive string parsing.  Take in a number of formats, and output an object
// based on detected format.  Returns `{ r, g, b }` or `{ h, s, l }` or `{ h, s, v}`
function stringInputToObject(color) {

    color = color.replace(trimLeft,'').replace(trimRight, '').toLowerCase();
    var named = false;
    if (names[color]) {
        color = names[color];
        named = true;
    }
    else if (color == 'transparent') {
        return { r: 0, g: 0, b: 0, a: 0, format: "name" };
    }

    // Try to match string input using regular expressions.
    // Keep most of the number bounding out of this function - don't worry about [0,1] or [0,100] or [0,360]
    // Just return an object and let the conversion functions handle that.
    // This way the result will be the same whether the tinycolor is initialized with string or object.
    var match;
    if ((match = matchers.rgb.exec(color))) {
        return { r: match[1], g: match[2], b: match[3] };
    }
    if ((match = matchers.rgba.exec(color))) {
        return { r: match[1], g: match[2], b: match[3], a: match[4] };
    }
    if ((match = matchers.hsl.exec(color))) {
        return { h: match[1], s: match[2], l: match[3] };
    }
    if ((match = matchers.hsla.exec(color))) {
        return { h: match[1], s: match[2], l: match[3], a: match[4] };
    }
    if ((match = matchers.hsv.exec(color))) {
        return { h: match[1], s: match[2], v: match[3] };
    }
    if ((match = matchers.hex8.exec(color))) {
        return {
            a: convertHexToDecimal(match[1]),
            r: parseIntFromHex(match[2]),
            g: parseIntFromHex(match[3]),
            b: parseIntFromHex(match[4]),
            format: named ? "name" : "hex8"
        };
    }
    if ((match = matchers.hex6.exec(color))) {
        return {
            r: parseIntFromHex(match[1]),
            g: parseIntFromHex(match[2]),
            b: parseIntFromHex(match[3]),
            format: named ? "name" : "hex"
        };
    }
    if ((match = matchers.hex3.exec(color))) {
        return {
            r: parseIntFromHex(match[1] + '' + match[1]),
            g: parseIntFromHex(match[2] + '' + match[2]),
            b: parseIntFromHex(match[3] + '' + match[3]),
            format: named ? "name" : "hex"
        };
    }

    return false;
}

// Node: Export function
if (typeof module !== "undefined" && module.exports) {
    module.exports = tinycolor;
}
// AMD/requirejs: Define the module
else if (typeof define === 'function' && define.amd) {
    define(function () {return tinycolor;});
}
// Browser: Expose to window
else {
    window.tinycolor = tinycolor;
}

})();

/*!
 * Bootstrap v3.2.0 (http://getbootstrap.com)
 * Copyright 2011-2014 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 */
if("undefined"==typeof jQuery)throw new Error("Bootstrap's JavaScript requires jQuery");+function(a){"use strict";function b(){var a=document.createElement("bootstrap"),b={WebkitTransition:"webkitTransitionEnd",MozTransition:"transitionend",OTransition:"oTransitionEnd otransitionend",transition:"transitionend"};for(var c in b)if(void 0!==a.style[c])return{end:b[c]};return!1}a.fn.emulateTransitionEnd=function(b){var c=!1,d=this;a(this).one("bsTransitionEnd",function(){c=!0});var e=function(){c||a(d).trigger(a.support.transition.end)};return setTimeout(e,b),this},a(function(){a.support.transition=b(),a.support.transition&&(a.event.special.bsTransitionEnd={bindType:a.support.transition.end,delegateType:a.support.transition.end,handle:function(b){return a(b.target).is(this)?b.handleObj.handler.apply(this,arguments):void 0}})})}(jQuery),+function(a){"use strict";function b(b){return this.each(function(){var c=a(this),e=c.data("bs.alert");e||c.data("bs.alert",e=new d(this)),"string"==typeof b&&e[b].call(c)})}var c='[data-dismiss="alert"]',d=function(b){a(b).on("click",c,this.close)};d.VERSION="3.2.0",d.prototype.close=function(b){function c(){f.detach().trigger("closed.bs.alert").remove()}var d=a(this),e=d.attr("data-target");e||(e=d.attr("href"),e=e&&e.replace(/.*(?=#[^\s]*$)/,""));var f=a(e);b&&b.preventDefault(),f.length||(f=d.hasClass("alert")?d:d.parent()),f.trigger(b=a.Event("close.bs.alert")),b.isDefaultPrevented()||(f.removeClass("in"),a.support.transition&&f.hasClass("fade")?f.one("bsTransitionEnd",c).emulateTransitionEnd(150):c())};var e=a.fn.alert;a.fn.alert=b,a.fn.alert.Constructor=d,a.fn.alert.noConflict=function(){return a.fn.alert=e,this},a(document).on("click.bs.alert.data-api",c,d.prototype.close)}(jQuery),+function(a){"use strict";function b(b){return this.each(function(){var d=a(this),e=d.data("bs.button"),f="object"==typeof b&&b;e||d.data("bs.button",e=new c(this,f)),"toggle"==b?e.toggle():b&&e.setState(b)})}var c=function(b,d){this.$element=a(b),this.options=a.extend({},c.DEFAULTS,d),this.isLoading=!1};c.VERSION="3.2.0",c.DEFAULTS={loadingText:"loading..."},c.prototype.setState=function(b){var c="disabled",d=this.$element,e=d.is("input")?"val":"html",f=d.data();b+="Text",null==f.resetText&&d.data("resetText",d[e]()),d[e](null==f[b]?this.options[b]:f[b]),setTimeout(a.proxy(function(){"loadingText"==b?(this.isLoading=!0,d.addClass(c).attr(c,c)):this.isLoading&&(this.isLoading=!1,d.removeClass(c).removeAttr(c))},this),0)},c.prototype.toggle=function(){var a=!0,b=this.$element.closest('[data-toggle="buttons"]');if(b.length){var c=this.$element.find("input");"radio"==c.prop("type")&&(c.prop("checked")&&this.$element.hasClass("active")?a=!1:b.find(".active").removeClass("active")),a&&c.prop("checked",!this.$element.hasClass("active")).trigger("change")}a&&this.$element.toggleClass("active")};var d=a.fn.button;a.fn.button=b,a.fn.button.Constructor=c,a.fn.button.noConflict=function(){return a.fn.button=d,this},a(document).on("click.bs.button.data-api",'[data-toggle^="button"]',function(c){var d=a(c.target);d.hasClass("btn")||(d=d.closest(".btn")),b.call(d,"toggle"),c.preventDefault()})}(jQuery),+function(a){"use strict";function b(b){return this.each(function(){var d=a(this),e=d.data("bs.carousel"),f=a.extend({},c.DEFAULTS,d.data(),"object"==typeof b&&b),g="string"==typeof b?b:f.slide;e||d.data("bs.carousel",e=new c(this,f)),"number"==typeof b?e.to(b):g?e[g]():f.interval&&e.pause().cycle()})}var c=function(b,c){this.$element=a(b).on("keydown.bs.carousel",a.proxy(this.keydown,this)),this.$indicators=this.$element.find(".carousel-indicators"),this.options=c,this.paused=this.sliding=this.interval=this.$active=this.$items=null,"hover"==this.options.pause&&this.$element.on("mouseenter.bs.carousel",a.proxy(this.pause,this)).on("mouseleave.bs.carousel",a.proxy(this.cycle,this))};c.VERSION="3.2.0",c.DEFAULTS={interval:5e3,pause:"hover",wrap:!0},c.prototype.keydown=function(a){switch(a.which){case 37:this.prev();break;case 39:this.next();break;default:return}a.preventDefault()},c.prototype.cycle=function(b){return b||(this.paused=!1),this.interval&&clearInterval(this.interval),this.options.interval&&!this.paused&&(this.interval=setInterval(a.proxy(this.next,this),this.options.interval)),this},c.prototype.getItemIndex=function(a){return this.$items=a.parent().children(".item"),this.$items.index(a||this.$active)},c.prototype.to=function(b){var c=this,d=this.getItemIndex(this.$active=this.$element.find(".item.active"));return b>this.$items.length-1||0>b?void 0:this.sliding?this.$element.one("slid.bs.carousel",function(){c.to(b)}):d==b?this.pause().cycle():this.slide(b>d?"next":"prev",a(this.$items[b]))},c.prototype.pause=function(b){return b||(this.paused=!0),this.$element.find(".next, .prev").length&&a.support.transition&&(this.$element.trigger(a.support.transition.end),this.cycle(!0)),this.interval=clearInterval(this.interval),this},c.prototype.next=function(){return this.sliding?void 0:this.slide("next")},c.prototype.prev=function(){return this.sliding?void 0:this.slide("prev")},c.prototype.slide=function(b,c){var d=this.$element.find(".item.active"),e=c||d[b](),f=this.interval,g="next"==b?"left":"right",h="next"==b?"first":"last",i=this;if(!e.length){if(!this.options.wrap)return;e=this.$element.find(".item")[h]()}if(e.hasClass("active"))return this.sliding=!1;var j=e[0],k=a.Event("slide.bs.carousel",{relatedTarget:j,direction:g});if(this.$element.trigger(k),!k.isDefaultPrevented()){if(this.sliding=!0,f&&this.pause(),this.$indicators.length){this.$indicators.find(".active").removeClass("active");var l=a(this.$indicators.children()[this.getItemIndex(e)]);l&&l.addClass("active")}var m=a.Event("slid.bs.carousel",{relatedTarget:j,direction:g});return a.support.transition&&this.$element.hasClass("slide")?(e.addClass(b),e[0].offsetWidth,d.addClass(g),e.addClass(g),d.one("bsTransitionEnd",function(){e.removeClass([b,g].join(" ")).addClass("active"),d.removeClass(["active",g].join(" ")),i.sliding=!1,setTimeout(function(){i.$element.trigger(m)},0)}).emulateTransitionEnd(1e3*d.css("transition-duration").slice(0,-1))):(d.removeClass("active"),e.addClass("active"),this.sliding=!1,this.$element.trigger(m)),f&&this.cycle(),this}};var d=a.fn.carousel;a.fn.carousel=b,a.fn.carousel.Constructor=c,a.fn.carousel.noConflict=function(){return a.fn.carousel=d,this},a(document).on("click.bs.carousel.data-api","[data-slide], [data-slide-to]",function(c){var d,e=a(this),f=a(e.attr("data-target")||(d=e.attr("href"))&&d.replace(/.*(?=#[^\s]+$)/,""));if(f.hasClass("carousel")){var g=a.extend({},f.data(),e.data()),h=e.attr("data-slide-to");h&&(g.interval=!1),b.call(f,g),h&&f.data("bs.carousel").to(h),c.preventDefault()}}),a(window).on("load",function(){a('[data-ride="carousel"]').each(function(){var c=a(this);b.call(c,c.data())})})}(jQuery),+function(a){"use strict";function b(b){return this.each(function(){var d=a(this),e=d.data("bs.collapse"),f=a.extend({},c.DEFAULTS,d.data(),"object"==typeof b&&b);!e&&f.toggle&&"show"==b&&(b=!b),e||d.data("bs.collapse",e=new c(this,f)),"string"==typeof b&&e[b]()})}var c=function(b,d){this.$element=a(b),this.options=a.extend({},c.DEFAULTS,d),this.transitioning=null,this.options.parent&&(this.$parent=a(this.options.parent)),this.options.toggle&&this.toggle()};c.VERSION="3.2.0",c.DEFAULTS={toggle:!0},c.prototype.dimension=function(){var a=this.$element.hasClass("width");return a?"width":"height"},c.prototype.show=function(){if(!this.transitioning&&!this.$element.hasClass("in")){var c=a.Event("show.bs.collapse");if(this.$element.trigger(c),!c.isDefaultPrevented()){var d=this.$parent&&this.$parent.find("> .panel > .in");if(d&&d.length){var e=d.data("bs.collapse");if(e&&e.transitioning)return;b.call(d,"hide"),e||d.data("bs.collapse",null)}var f=this.dimension();this.$element.removeClass("collapse").addClass("collapsing")[f](0),this.transitioning=1;var g=function(){this.$element.removeClass("collapsing").addClass("collapse in")[f](""),this.transitioning=0,this.$element.trigger("shown.bs.collapse")};if(!a.support.transition)return g.call(this);var h=a.camelCase(["scroll",f].join("-"));this.$element.one("bsTransitionEnd",a.proxy(g,this)).emulateTransitionEnd(350)[f](this.$element[0][h])}}},c.prototype.hide=function(){if(!this.transitioning&&this.$element.hasClass("in")){var b=a.Event("hide.bs.collapse");if(this.$element.trigger(b),!b.isDefaultPrevented()){var c=this.dimension();this.$element[c](this.$element[c]())[0].offsetHeight,this.$element.addClass("collapsing").removeClass("collapse").removeClass("in"),this.transitioning=1;var d=function(){this.transitioning=0,this.$element.trigger("hidden.bs.collapse").removeClass("collapsing").addClass("collapse")};return a.support.transition?void this.$element[c](0).one("bsTransitionEnd",a.proxy(d,this)).emulateTransitionEnd(350):d.call(this)}}},c.prototype.toggle=function(){this[this.$element.hasClass("in")?"hide":"show"]()};var d=a.fn.collapse;a.fn.collapse=b,a.fn.collapse.Constructor=c,a.fn.collapse.noConflict=function(){return a.fn.collapse=d,this},a(document).on("click.bs.collapse.data-api",'[data-toggle="collapse"]',function(c){var d,e=a(this),f=e.attr("data-target")||c.preventDefault()||(d=e.attr("href"))&&d.replace(/.*(?=#[^\s]+$)/,""),g=a(f),h=g.data("bs.collapse"),i=h?"toggle":e.data(),j=e.attr("data-parent"),k=j&&a(j);h&&h.transitioning||(k&&k.find('[data-toggle="collapse"][data-parent="'+j+'"]').not(e).addClass("collapsed"),e[g.hasClass("in")?"addClass":"removeClass"]("collapsed")),b.call(g,i)})}(jQuery),+function(a){"use strict";function b(b){b&&3===b.which||(a(e).remove(),a(f).each(function(){var d=c(a(this)),e={relatedTarget:this};d.hasClass("open")&&(d.trigger(b=a.Event("hide.bs.dropdown",e)),b.isDefaultPrevented()||d.removeClass("open").trigger("hidden.bs.dropdown",e))}))}function c(b){var c=b.attr("data-target");c||(c=b.attr("href"),c=c&&/#[A-Za-z]/.test(c)&&c.replace(/.*(?=#[^\s]*$)/,""));var d=c&&a(c);return d&&d.length?d:b.parent()}function d(b){return this.each(function(){var c=a(this),d=c.data("bs.dropdown");d||c.data("bs.dropdown",d=new g(this)),"string"==typeof b&&d[b].call(c)})}var e=".dropdown-backdrop",f='[data-toggle="dropdown"]',g=function(b){a(b).on("click.bs.dropdown",this.toggle)};g.VERSION="3.2.0",g.prototype.toggle=function(d){var e=a(this);if(!e.is(".disabled, :disabled")){var f=c(e),g=f.hasClass("open");if(b(),!g){"ontouchstart"in document.documentElement&&!f.closest(".navbar-nav").length&&a('<div class="dropdown-backdrop"/>').insertAfter(a(this)).on("click",b);var h={relatedTarget:this};if(f.trigger(d=a.Event("show.bs.dropdown",h)),d.isDefaultPrevented())return;e.trigger("focus"),f.toggleClass("open").trigger("shown.bs.dropdown",h)}return!1}},g.prototype.keydown=function(b){if(/(38|40|27)/.test(b.keyCode)){var d=a(this);if(b.preventDefault(),b.stopPropagation(),!d.is(".disabled, :disabled")){var e=c(d),g=e.hasClass("open");if(!g||g&&27==b.keyCode)return 27==b.which&&e.find(f).trigger("focus"),d.trigger("click");var h=" li:not(.divider):visible a",i=e.find('[role="menu"]'+h+', [role="listbox"]'+h);if(i.length){var j=i.index(i.filter(":focus"));38==b.keyCode&&j>0&&j--,40==b.keyCode&&j<i.length-1&&j++,~j||(j=0),i.eq(j).trigger("focus")}}}};var h=a.fn.dropdown;a.fn.dropdown=d,a.fn.dropdown.Constructor=g,a.fn.dropdown.noConflict=function(){return a.fn.dropdown=h,this},a(document).on("click.bs.dropdown.data-api",b).on("click.bs.dropdown.data-api",".dropdown form",function(a){a.stopPropagation()}).on("click.bs.dropdown.data-api",f,g.prototype.toggle).on("keydown.bs.dropdown.data-api",f+', [role="menu"], [role="listbox"]',g.prototype.keydown)}(jQuery),+function(a){"use strict";function b(b,d){return this.each(function(){var e=a(this),f=e.data("bs.modal"),g=a.extend({},c.DEFAULTS,e.data(),"object"==typeof b&&b);f||e.data("bs.modal",f=new c(this,g)),"string"==typeof b?f[b](d):g.show&&f.show(d)})}var c=function(b,c){this.options=c,this.$body=a(document.body),this.$element=a(b),this.$backdrop=this.isShown=null,this.scrollbarWidth=0,this.options.remote&&this.$element.find(".modal-content").load(this.options.remote,a.proxy(function(){this.$element.trigger("loaded.bs.modal")},this))};c.VERSION="3.2.0",c.DEFAULTS={backdrop:!0,keyboard:!0,show:!0},c.prototype.toggle=function(a){return this.isShown?this.hide():this.show(a)},c.prototype.show=function(b){var c=this,d=a.Event("show.bs.modal",{relatedTarget:b});this.$element.trigger(d),this.isShown||d.isDefaultPrevented()||(this.isShown=!0,this.checkScrollbar(),this.$body.addClass("modal-open"),this.setScrollbar(),this.escape(),this.$element.on("click.dismiss.bs.modal",'[data-dismiss="modal"]',a.proxy(this.hide,this)),this.backdrop(function(){var d=a.support.transition&&c.$element.hasClass("fade");c.$element.parent().length||c.$element.appendTo(c.$body),c.$element.show().scrollTop(0),d&&c.$element[0].offsetWidth,c.$element.addClass("in").attr("aria-hidden",!1),c.enforceFocus();var e=a.Event("shown.bs.modal",{relatedTarget:b});d?c.$element.find(".modal-dialog").one("bsTransitionEnd",function(){c.$element.trigger("focus").trigger(e)}).emulateTransitionEnd(300):c.$element.trigger("focus").trigger(e)}))},c.prototype.hide=function(b){b&&b.preventDefault(),b=a.Event("hide.bs.modal"),this.$element.trigger(b),this.isShown&&!b.isDefaultPrevented()&&(this.isShown=!1,this.$body.removeClass("modal-open"),this.resetScrollbar(),this.escape(),a(document).off("focusin.bs.modal"),this.$element.removeClass("in").attr("aria-hidden",!0).off("click.dismiss.bs.modal"),a.support.transition&&this.$element.hasClass("fade")?this.$element.one("bsTransitionEnd",a.proxy(this.hideModal,this)).emulateTransitionEnd(300):this.hideModal())},c.prototype.enforceFocus=function(){a(document).off("focusin.bs.modal").on("focusin.bs.modal",a.proxy(function(a){this.$element[0]===a.target||this.$element.has(a.target).length||this.$element.trigger("focus")},this))},c.prototype.escape=function(){this.isShown&&this.options.keyboard?this.$element.on("keyup.dismiss.bs.modal",a.proxy(function(a){27==a.which&&this.hide()},this)):this.isShown||this.$element.off("keyup.dismiss.bs.modal")},c.prototype.hideModal=function(){var a=this;this.$element.hide(),this.backdrop(function(){a.$element.trigger("hidden.bs.modal")})},c.prototype.removeBackdrop=function(){this.$backdrop&&this.$backdrop.remove(),this.$backdrop=null},c.prototype.backdrop=function(b){var c=this,d=this.$element.hasClass("fade")?"fade":"";if(this.isShown&&this.options.backdrop){var e=a.support.transition&&d;if(this.$backdrop=a('<div class="modal-backdrop '+d+'" />').appendTo(this.$body),this.$element.on("click.dismiss.bs.modal",a.proxy(function(a){a.target===a.currentTarget&&("static"==this.options.backdrop?this.$element[0].focus.call(this.$element[0]):this.hide.call(this))},this)),e&&this.$backdrop[0].offsetWidth,this.$backdrop.addClass("in"),!b)return;e?this.$backdrop.one("bsTransitionEnd",b).emulateTransitionEnd(150):b()}else if(!this.isShown&&this.$backdrop){this.$backdrop.removeClass("in");var f=function(){c.removeBackdrop(),b&&b()};a.support.transition&&this.$element.hasClass("fade")?this.$backdrop.one("bsTransitionEnd",f).emulateTransitionEnd(150):f()}else b&&b()},c.prototype.checkScrollbar=function(){document.body.clientWidth>=window.innerWidth||(this.scrollbarWidth=this.scrollbarWidth||this.measureScrollbar())},c.prototype.setScrollbar=function(){var a=parseInt(this.$body.css("padding-right")||0,10);this.scrollbarWidth&&this.$body.css("padding-right",a+this.scrollbarWidth)},c.prototype.resetScrollbar=function(){this.$body.css("padding-right","")},c.prototype.measureScrollbar=function(){var a=document.createElement("div");a.className="modal-scrollbar-measure",this.$body.append(a);var b=a.offsetWidth-a.clientWidth;return this.$body[0].removeChild(a),b};var d=a.fn.modal;a.fn.modal=b,a.fn.modal.Constructor=c,a.fn.modal.noConflict=function(){return a.fn.modal=d,this},a(document).on("click.bs.modal.data-api",'[data-toggle="modal"]',function(c){var d=a(this),e=d.attr("href"),f=a(d.attr("data-target")||e&&e.replace(/.*(?=#[^\s]+$)/,"")),g=f.data("bs.modal")?"toggle":a.extend({remote:!/#/.test(e)&&e},f.data(),d.data());d.is("a")&&c.preventDefault(),f.one("show.bs.modal",function(a){a.isDefaultPrevented()||f.one("hidden.bs.modal",function(){d.is(":visible")&&d.trigger("focus")})}),b.call(f,g,this)})}(jQuery),+function(a){"use strict";function b(b){return this.each(function(){var d=a(this),e=d.data("bs.tooltip"),f="object"==typeof b&&b;(e||"destroy"!=b)&&(e||d.data("bs.tooltip",e=new c(this,f)),"string"==typeof b&&e[b]())})}var c=function(a,b){this.type=this.options=this.enabled=this.timeout=this.hoverState=this.$element=null,this.init("tooltip",a,b)};c.VERSION="3.2.0",c.DEFAULTS={animation:!0,placement:"top",selector:!1,template:'<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',trigger:"hover focus",title:"",delay:0,html:!1,container:!1,viewport:{selector:"body",padding:0}},c.prototype.init=function(b,c,d){this.enabled=!0,this.type=b,this.$element=a(c),this.options=this.getOptions(d),this.$viewport=this.options.viewport&&a(this.options.viewport.selector||this.options.viewport);for(var e=this.options.trigger.split(" "),f=e.length;f--;){var g=e[f];if("click"==g)this.$element.on("click."+this.type,this.options.selector,a.proxy(this.toggle,this));else if("manual"!=g){var h="hover"==g?"mouseenter":"focusin",i="hover"==g?"mouseleave":"focusout";this.$element.on(h+"."+this.type,this.options.selector,a.proxy(this.enter,this)),this.$element.on(i+"."+this.type,this.options.selector,a.proxy(this.leave,this))}}this.options.selector?this._options=a.extend({},this.options,{trigger:"manual",selector:""}):this.fixTitle()},c.prototype.getDefaults=function(){return c.DEFAULTS},c.prototype.getOptions=function(b){return b=a.extend({},this.getDefaults(),this.$element.data(),b),b.delay&&"number"==typeof b.delay&&(b.delay={show:b.delay,hide:b.delay}),b},c.prototype.getDelegateOptions=function(){var b={},c=this.getDefaults();return this._options&&a.each(this._options,function(a,d){c[a]!=d&&(b[a]=d)}),b},c.prototype.enter=function(b){var c=b instanceof this.constructor?b:a(b.currentTarget).data("bs."+this.type);return c||(c=new this.constructor(b.currentTarget,this.getDelegateOptions()),a(b.currentTarget).data("bs."+this.type,c)),clearTimeout(c.timeout),c.hoverState="in",c.options.delay&&c.options.delay.show?void(c.timeout=setTimeout(function(){"in"==c.hoverState&&c.show()},c.options.delay.show)):c.show()},c.prototype.leave=function(b){var c=b instanceof this.constructor?b:a(b.currentTarget).data("bs."+this.type);return c||(c=new this.constructor(b.currentTarget,this.getDelegateOptions()),a(b.currentTarget).data("bs."+this.type,c)),clearTimeout(c.timeout),c.hoverState="out",c.options.delay&&c.options.delay.hide?void(c.timeout=setTimeout(function(){"out"==c.hoverState&&c.hide()},c.options.delay.hide)):c.hide()},c.prototype.show=function(){var b=a.Event("show.bs."+this.type);if(this.hasContent()&&this.enabled){this.$element.trigger(b);var c=a.contains(document.documentElement,this.$element[0]);if(b.isDefaultPrevented()||!c)return;var d=this,e=this.tip(),f=this.getUID(this.type);this.setContent(),e.attr("id",f),this.$element.attr("aria-describedby",f),this.options.animation&&e.addClass("fade");var g="function"==typeof this.options.placement?this.options.placement.call(this,e[0],this.$element[0]):this.options.placement,h=/\s?auto?\s?/i,i=h.test(g);i&&(g=g.replace(h,"")||"top"),e.detach().css({top:0,left:0,display:"block"}).addClass(g).data("bs."+this.type,this),this.options.container?e.appendTo(this.options.container):e.insertAfter(this.$element);var j=this.getPosition(),k=e[0].offsetWidth,l=e[0].offsetHeight;if(i){var m=g,n=this.$element.parent(),o=this.getPosition(n);g="bottom"==g&&j.top+j.height+l-o.scroll>o.height?"top":"top"==g&&j.top-o.scroll-l<0?"bottom":"right"==g&&j.right+k>o.width?"left":"left"==g&&j.left-k<o.left?"right":g,e.removeClass(m).addClass(g)}var p=this.getCalculatedOffset(g,j,k,l);this.applyPlacement(p,g);var q=function(){d.$element.trigger("shown.bs."+d.type),d.hoverState=null};a.support.transition&&this.$tip.hasClass("fade")?e.one("bsTransitionEnd",q).emulateTransitionEnd(150):q()}},c.prototype.applyPlacement=function(b,c){var d=this.tip(),e=d[0].offsetWidth,f=d[0].offsetHeight,g=parseInt(d.css("margin-top"),10),h=parseInt(d.css("margin-left"),10);isNaN(g)&&(g=0),isNaN(h)&&(h=0),b.top=b.top+g,b.left=b.left+h,a.offset.setOffset(d[0],a.extend({using:function(a){d.css({top:Math.round(a.top),left:Math.round(a.left)})}},b),0),d.addClass("in");var i=d[0].offsetWidth,j=d[0].offsetHeight;"top"==c&&j!=f&&(b.top=b.top+f-j);var k=this.getViewportAdjustedDelta(c,b,i,j);k.left?b.left+=k.left:b.top+=k.top;var l=k.left?2*k.left-e+i:2*k.top-f+j,m=k.left?"left":"top",n=k.left?"offsetWidth":"offsetHeight";d.offset(b),this.replaceArrow(l,d[0][n],m)},c.prototype.replaceArrow=function(a,b,c){this.arrow().css(c,a?50*(1-a/b)+"%":"")},c.prototype.setContent=function(){var a=this.tip(),b=this.getTitle();a.find(".tooltip-inner")[this.options.html?"html":"text"](b),a.removeClass("fade in top bottom left right")},c.prototype.hide=function(){function b(){"in"!=c.hoverState&&d.detach(),c.$element.trigger("hidden.bs."+c.type)}var c=this,d=this.tip(),e=a.Event("hide.bs."+this.type);return this.$element.removeAttr("aria-describedby"),this.$element.trigger(e),e.isDefaultPrevented()?void 0:(d.removeClass("in"),a.support.transition&&this.$tip.hasClass("fade")?d.one("bsTransitionEnd",b).emulateTransitionEnd(150):b(),this.hoverState=null,this)},c.prototype.fixTitle=function(){var a=this.$element;(a.attr("title")||"string"!=typeof a.attr("data-original-title"))&&a.attr("data-original-title",a.attr("title")||"").attr("title","")},c.prototype.hasContent=function(){return this.getTitle()},c.prototype.getPosition=function(b){b=b||this.$element;var c=b[0],d="BODY"==c.tagName;return a.extend({},"function"==typeof c.getBoundingClientRect?c.getBoundingClientRect():null,{scroll:d?document.documentElement.scrollTop||document.body.scrollTop:b.scrollTop(),width:d?a(window).width():b.outerWidth(),height:d?a(window).height():b.outerHeight()},d?{top:0,left:0}:b.offset())},c.prototype.getCalculatedOffset=function(a,b,c,d){return"bottom"==a?{top:b.top+b.height,left:b.left+b.width/2-c/2}:"top"==a?{top:b.top-d,left:b.left+b.width/2-c/2}:"left"==a?{top:b.top+b.height/2-d/2,left:b.left-c}:{top:b.top+b.height/2-d/2,left:b.left+b.width}},c.prototype.getViewportAdjustedDelta=function(a,b,c,d){var e={top:0,left:0};if(!this.$viewport)return e;var f=this.options.viewport&&this.options.viewport.padding||0,g=this.getPosition(this.$viewport);if(/right|left/.test(a)){var h=b.top-f-g.scroll,i=b.top+f-g.scroll+d;h<g.top?e.top=g.top-h:i>g.top+g.height&&(e.top=g.top+g.height-i)}else{var j=b.left-f,k=b.left+f+c;j<g.left?e.left=g.left-j:k>g.width&&(e.left=g.left+g.width-k)}return e},c.prototype.getTitle=function(){var a,b=this.$element,c=this.options;return a=b.attr("data-original-title")||("function"==typeof c.title?c.title.call(b[0]):c.title)},c.prototype.getUID=function(a){do a+=~~(1e6*Math.random());while(document.getElementById(a));return a},c.prototype.tip=function(){return this.$tip=this.$tip||a(this.options.template)},c.prototype.arrow=function(){return this.$arrow=this.$arrow||this.tip().find(".tooltip-arrow")},c.prototype.validate=function(){this.$element[0].parentNode||(this.hide(),this.$element=null,this.options=null)},c.prototype.enable=function(){this.enabled=!0},c.prototype.disable=function(){this.enabled=!1},c.prototype.toggleEnabled=function(){this.enabled=!this.enabled},c.prototype.toggle=function(b){var c=this;b&&(c=a(b.currentTarget).data("bs."+this.type),c||(c=new this.constructor(b.currentTarget,this.getDelegateOptions()),a(b.currentTarget).data("bs."+this.type,c))),c.tip().hasClass("in")?c.leave(c):c.enter(c)},c.prototype.destroy=function(){clearTimeout(this.timeout),this.hide().$element.off("."+this.type).removeData("bs."+this.type)};var d=a.fn.tooltip;a.fn.tooltip=b,a.fn.tooltip.Constructor=c,a.fn.tooltip.noConflict=function(){return a.fn.tooltip=d,this}}(jQuery),+function(a){"use strict";function b(b){return this.each(function(){var d=a(this),e=d.data("bs.popover"),f="object"==typeof b&&b;(e||"destroy"!=b)&&(e||d.data("bs.popover",e=new c(this,f)),"string"==typeof b&&e[b]())})}var c=function(a,b){this.init("popover",a,b)};if(!a.fn.tooltip)throw new Error("Popover requires tooltip.js");c.VERSION="3.2.0",c.DEFAULTS=a.extend({},a.fn.tooltip.Constructor.DEFAULTS,{placement:"right",trigger:"click",content:"",template:'<div class="popover" role="tooltip"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>'}),c.prototype=a.extend({},a.fn.tooltip.Constructor.prototype),c.prototype.constructor=c,c.prototype.getDefaults=function(){return c.DEFAULTS},c.prototype.setContent=function(){var a=this.tip(),b=this.getTitle(),c=this.getContent();a.find(".popover-title")[this.options.html?"html":"text"](b),a.find(".popover-content").empty()[this.options.html?"string"==typeof c?"html":"append":"text"](c),a.removeClass("fade top bottom left right in"),a.find(".popover-title").html()||a.find(".popover-title").hide()},c.prototype.hasContent=function(){return this.getTitle()||this.getContent()},c.prototype.getContent=function(){var a=this.$element,b=this.options;return a.attr("data-content")||("function"==typeof b.content?b.content.call(a[0]):b.content)},c.prototype.arrow=function(){return this.$arrow=this.$arrow||this.tip().find(".arrow")},c.prototype.tip=function(){return this.$tip||(this.$tip=a(this.options.template)),this.$tip};var d=a.fn.popover;a.fn.popover=b,a.fn.popover.Constructor=c,a.fn.popover.noConflict=function(){return a.fn.popover=d,this}}(jQuery),+function(a){"use strict";function b(c,d){var e=a.proxy(this.process,this);this.$body=a("body"),this.$scrollElement=a(a(c).is("body")?window:c),this.options=a.extend({},b.DEFAULTS,d),this.selector=(this.options.target||"")+" .nav li > a",this.offsets=[],this.targets=[],this.activeTarget=null,this.scrollHeight=0,this.$scrollElement.on("scroll.bs.scrollspy",e),this.refresh(),this.process()}function c(c){return this.each(function(){var d=a(this),e=d.data("bs.scrollspy"),f="object"==typeof c&&c;e||d.data("bs.scrollspy",e=new b(this,f)),"string"==typeof c&&e[c]()})}b.VERSION="3.2.0",b.DEFAULTS={offset:10},b.prototype.getScrollHeight=function(){return this.$scrollElement[0].scrollHeight||Math.max(this.$body[0].scrollHeight,document.documentElement.scrollHeight)},b.prototype.refresh=function(){var b="offset",c=0;a.isWindow(this.$scrollElement[0])||(b="position",c=this.$scrollElement.scrollTop()),this.offsets=[],this.targets=[],this.scrollHeight=this.getScrollHeight();var d=this;this.$body.find(this.selector).map(function(){var d=a(this),e=d.data("target")||d.attr("href"),f=/^#./.test(e)&&a(e);return f&&f.length&&f.is(":visible")&&[[f[b]().top+c,e]]||null}).sort(function(a,b){return a[0]-b[0]}).each(function(){d.offsets.push(this[0]),d.targets.push(this[1])})},b.prototype.process=function(){var a,b=this.$scrollElement.scrollTop()+this.options.offset,c=this.getScrollHeight(),d=this.options.offset+c-this.$scrollElement.height(),e=this.offsets,f=this.targets,g=this.activeTarget;if(this.scrollHeight!=c&&this.refresh(),b>=d)return g!=(a=f[f.length-1])&&this.activate(a);if(g&&b<=e[0])return g!=(a=f[0])&&this.activate(a);for(a=e.length;a--;)g!=f[a]&&b>=e[a]&&(!e[a+1]||b<=e[a+1])&&this.activate(f[a])},b.prototype.activate=function(b){this.activeTarget=b,a(this.selector).parentsUntil(this.options.target,".active").removeClass("active");var c=this.selector+'[data-target="'+b+'"],'+this.selector+'[href="'+b+'"]',d=a(c).parents("li").addClass("active");d.parent(".dropdown-menu").length&&(d=d.closest("li.dropdown").addClass("active")),d.trigger("activate.bs.scrollspy")};var d=a.fn.scrollspy;a.fn.scrollspy=c,a.fn.scrollspy.Constructor=b,a.fn.scrollspy.noConflict=function(){return a.fn.scrollspy=d,this},a(window).on("load.bs.scrollspy.data-api",function(){a('[data-spy="scroll"]').each(function(){var b=a(this);c.call(b,b.data())})})}(jQuery),+function(a){"use strict";function b(b){return this.each(function(){var d=a(this),e=d.data("bs.tab");e||d.data("bs.tab",e=new c(this)),"string"==typeof b&&e[b]()})}var c=function(b){this.element=a(b)};c.VERSION="3.2.0",c.prototype.show=function(){var b=this.element,c=b.closest("ul:not(.dropdown-menu)"),d=b.data("target");if(d||(d=b.attr("href"),d=d&&d.replace(/.*(?=#[^\s]*$)/,"")),!b.parent("li").hasClass("active")){var e=c.find(".active:last a")[0],f=a.Event("show.bs.tab",{relatedTarget:e});if(b.trigger(f),!f.isDefaultPrevented()){var g=a(d);this.activate(b.closest("li"),c),this.activate(g,g.parent(),function(){b.trigger({type:"shown.bs.tab",relatedTarget:e})})}}},c.prototype.activate=function(b,c,d){function e(){f.removeClass("active").find("> .dropdown-menu > .active").removeClass("active"),b.addClass("active"),g?(b[0].offsetWidth,b.addClass("in")):b.removeClass("fade"),b.parent(".dropdown-menu")&&b.closest("li.dropdown").addClass("active"),d&&d()}var f=c.find("> .active"),g=d&&a.support.transition&&f.hasClass("fade");g?f.one("bsTransitionEnd",e).emulateTransitionEnd(150):e(),f.removeClass("in")};var d=a.fn.tab;a.fn.tab=b,a.fn.tab.Constructor=c,a.fn.tab.noConflict=function(){return a.fn.tab=d,this},a(document).on("click.bs.tab.data-api",'[data-toggle="tab"], [data-toggle="pill"]',function(c){c.preventDefault(),b.call(a(this),"show")})}(jQuery),+function(a){"use strict";function b(b){return this.each(function(){var d=a(this),e=d.data("bs.affix"),f="object"==typeof b&&b;e||d.data("bs.affix",e=new c(this,f)),"string"==typeof b&&e[b]()})}var c=function(b,d){this.options=a.extend({},c.DEFAULTS,d),this.$target=a(this.options.target).on("scroll.bs.affix.data-api",a.proxy(this.checkPosition,this)).on("click.bs.affix.data-api",a.proxy(this.checkPositionWithEventLoop,this)),this.$element=a(b),this.affixed=this.unpin=this.pinnedOffset=null,this.checkPosition()};c.VERSION="3.2.0",c.RESET="affix affix-top affix-bottom",c.DEFAULTS={offset:0,target:window},c.prototype.getPinnedOffset=function(){if(this.pinnedOffset)return this.pinnedOffset;this.$element.removeClass(c.RESET).addClass("affix");var a=this.$target.scrollTop(),b=this.$element.offset();return this.pinnedOffset=b.top-a},c.prototype.checkPositionWithEventLoop=function(){setTimeout(a.proxy(this.checkPosition,this),1)},c.prototype.checkPosition=function(){if(this.$element.is(":visible")){var b=a(document).height(),d=this.$target.scrollTop(),e=this.$element.offset(),f=this.options.offset,g=f.top,h=f.bottom;"object"!=typeof f&&(h=g=f),"function"==typeof g&&(g=f.top(this.$element)),"function"==typeof h&&(h=f.bottom(this.$element));var i=null!=this.unpin&&d+this.unpin<=e.top?!1:null!=h&&e.top+this.$element.height()>=b-h?"bottom":null!=g&&g>=d?"top":!1;if(this.affixed!==i){null!=this.unpin&&this.$element.css("top","");var j="affix"+(i?"-"+i:""),k=a.Event(j+".bs.affix");this.$element.trigger(k),k.isDefaultPrevented()||(this.affixed=i,this.unpin="bottom"==i?this.getPinnedOffset():null,this.$element.removeClass(c.RESET).addClass(j).trigger(a.Event(j.replace("affix","affixed"))),"bottom"==i&&this.$element.offset({top:b-this.$element.height()-h}))}}};var d=a.fn.affix;a.fn.affix=b,a.fn.affix.Constructor=c,a.fn.affix.noConflict=function(){return a.fn.affix=d,this},a(window).on("load",function(){a('[data-spy="affix"]').each(function(){var c=a(this),d=c.data();d.offset=d.offset||{},d.offsetBottom&&(d.offset.bottom=d.offsetBottom),d.offsetTop&&(d.offset.top=d.offsetTop),b.call(c,d)})})}(jQuery);
/*!
 * Bootstrap-select v1.6.2 (http://silviomoreto.github.io/bootstrap-select/)
 *
 * Copyright 2013-2014 bootstrap-select
 * Licensed under MIT (https://github.com/silviomoreto/bootstrap-select/blob/master/LICENSE)
 */
!function(a){"use strict";function b(b,d){var e=arguments,b=e[0],d=e[1];[].shift.apply(e);var f,g=this.each(function(){var g=a(this);if(g.is("select")){var h=g.data("selectpicker"),i="object"==typeof b&&b;if(h){if(i)for(var j in i)i.hasOwnProperty(j)&&(h.options[j]=i[j])}else{var k=a.extend({},c.DEFAULTS,a.fn.selectpicker.defaults,g.data(),i);g.data("selectpicker",h=new c(this,k,d))}"string"==typeof b&&(f=h[b]instanceof Function?h[b].apply(h,e):h.options[b])}});return"undefined"!=typeof f?f:g}a.expr[":"].icontains=function(b,c,d){return a(b).text().toUpperCase().indexOf(d[3].toUpperCase())>=0};var c=function(b,d,e){e&&(e.stopPropagation(),e.preventDefault()),this.$element=a(b),this.$newElement=null,this.$button=null,this.$menu=null,this.$lis=null,this.options=d,null===this.options.title&&(this.options.title=this.$element.attr("title")),this.val=c.prototype.val,this.render=c.prototype.render,this.refresh=c.prototype.refresh,this.setStyle=c.prototype.setStyle,this.selectAll=c.prototype.selectAll,this.deselectAll=c.prototype.deselectAll,this.destroy=c.prototype.remove,this.remove=c.prototype.remove,this.show=c.prototype.show,this.hide=c.prototype.hide,this.init()};c.VERSION="1.6.2",c.DEFAULTS={noneSelectedText:"Nothing selected",noneResultsText:"No results match",countSelectedText:"{0} of {1} selected",maxOptionsText:["Limit reached ({n} {var} max)","Group limit reached ({n} {var} max)",["items","item"]],multipleSeparator:", ",style:"btn-default",size:"auto",title:null,selectedTextFormat:"values",width:!1,container:!1,hideDisabled:!1,showSubtext:!1,showIcon:!0,showContent:!0,dropupAuto:!0,header:!1,liveSearch:!1,actionsBox:!1,iconBase:"glyphicon",tickIcon:"glyphicon-ok",maxOptions:!1,mobile:!1,selectOnTab:!1,dropdownAlignRight:!1},c.prototype={constructor:c,init:function(){var b=this,c=this.$element.attr("id");this.$element.hide(),this.multiple=this.$element.prop("multiple"),this.autofocus=this.$element.prop("autofocus"),this.$newElement=this.createView(),this.$element.after(this.$newElement),this.$menu=this.$newElement.find("> .dropdown-menu"),this.$button=this.$newElement.find("> button"),this.$searchbox=this.$newElement.find("input"),this.options.dropdownAlignRight&&this.$menu.addClass("pull-right"),"undefined"!=typeof c&&(this.$button.attr("data-id",c),a('label[for="'+c+'"]').click(function(a){a.preventDefault(),b.$button.focus()})),this.checkDisabled(),this.clickListener(),this.options.liveSearch&&this.liveSearchListener(),this.render(),this.liHeight(),this.setStyle(),this.setWidth(),this.options.container&&this.selectPosition(),this.$menu.data("this",this),this.$newElement.data("this",this),this.options.mobile&&this.mobile()},createDropdown:function(){var b=this.multiple?" show-tick":"",c=this.$element.parent().hasClass("input-group")?" input-group-btn":"",d=this.autofocus?" autofocus":"",e=this.options.header?'<div class="popover-title"><button type="button" class="close" aria-hidden="true">&times;</button>'+this.options.header+"</div>":"",f=this.options.liveSearch?'<div class="bootstrap-select-searchbox"><input type="text" class="input-block-level form-control" autocomplete="off" /></div>':"",g=this.options.actionsBox?'<div class="bs-actionsbox"><div class="btn-group btn-block"><button class="actions-btn bs-select-all btn btn-sm btn-default">Select All</button><button class="actions-btn bs-deselect-all btn btn-sm btn-default">Deselect All</button></div></div>':"",h='<div class="btn-group bootstrap-select'+b+c+'"><button type="button" class="btn dropdown-toggle selectpicker" data-toggle="dropdown"'+d+'><span class="filter-option pull-left"></span>&nbsp;<span class="caret"></span></button><div class="dropdown-menu open">'+e+f+g+'<ul class="dropdown-menu inner selectpicker" role="menu"></ul></div></div>';return a(h)},createView:function(){var a=this.createDropdown(),b=this.createLi();return a.find("ul").append(b),a},reloadLi:function(){this.destroyLi();var a=this.createLi();this.$menu.find("ul").append(a)},destroyLi:function(){this.$menu.find("li").remove()},createLi:function(){var b=this,c=[],d="",e=0;return this.$element.find("option").each(function(){var d=a(this),f=d.attr("class")||"",g=d.attr("style")||"",h=d.data("content")?d.data("content"):d.html(),i="undefined"!=typeof d.data("subtext")?'<small class="muted text-muted">'+d.data("subtext")+"</small>":"",j="undefined"!=typeof d.data("icon")?'<i class="'+b.options.iconBase+" "+d.data("icon")+'"></i> ':"";if(""!==j&&(d.is(":disabled")||d.parent().is(":disabled"))&&(j="<span>"+j+"</span>"),d.data("content")||(h=j+'<span class="text">'+h+i+"</span>"),b.options.hideDisabled&&(d.is(":disabled")||d.parent().is(":disabled")))c.push('<a style="min-height: 0; padding: 0"></a>');else if(d.parent().is("optgroup")&&d.data("divider")!==!0)if(0===d.index()){var k=d.parent().attr("label"),l="undefined"!=typeof d.parent().data("subtext")?'<small class="muted text-muted">'+d.parent().data("subtext")+"</small>":"",m=d.parent().data("icon")?'<i class="'+b.options.iconBase+" "+d.parent().data("icon")+'"></i> ':"";k=m+'<span class="text">'+k+l+"</span>",e+=1,c.push(0!==d[0].index?'<div class="div-contain"><div class="divider"></div></div><dt>'+k+"</dt>"+b.createA(h,"opt "+f,g,e):"<dt>"+k+"</dt>"+b.createA(h,"opt "+f,g,e))}else c.push(b.createA(h,"opt "+f,g,e));else c.push(d.data("divider")===!0?'<div class="div-contain"><div class="divider"></div></div>':a(this).data("hidden")===!0?"<a></a>":b.createA(h,f,g))}),a.each(c,function(a,b){var c="<a></a>"===b?'class="hide is-hidden"':"";d+='<li rel="'+a+'"'+c+">"+b+"</li>"}),this.multiple||0!==this.$element.find("option:selected").length||this.options.title||this.$element.find("option").eq(0).prop("selected",!0).attr("selected","selected"),a(d)},createA:function(a,b,c,d){return'<a tabindex="0" class="'+b+'" style="'+c+'"'+("undefined"!=typeof d?'data-optgroup="'+d+'"':"")+">"+a+'<i class="'+this.options.iconBase+" "+this.options.tickIcon+' icon-ok check-mark"></i></a>'},render:function(b){var c=this;b!==!1&&this.$element.find("option").each(function(b){c.setDisabled(b,a(this).is(":disabled")||a(this).parent().is(":disabled")),c.setSelected(b,a(this).is(":selected"))}),this.tabIndex();var d=this.$element.find("option:selected").map(function(){var b,d=a(this),e=d.data("icon")&&c.options.showIcon?'<i class="'+c.options.iconBase+" "+d.data("icon")+'"></i> ':"";return b=c.options.showSubtext&&d.attr("data-subtext")&&!c.multiple?' <small class="muted text-muted">'+d.data("subtext")+"</small>":"",d.data("content")&&c.options.showContent?d.data("content"):"undefined"!=typeof d.attr("title")?d.attr("title"):e+d.html()+b}).toArray(),e=this.multiple?d.join(this.options.multipleSeparator):d[0];if(this.multiple&&this.options.selectedTextFormat.indexOf("count")>-1){var f=this.options.selectedTextFormat.split(">"),g=this.options.hideDisabled?":not([disabled])":"";(f.length>1&&d.length>f[1]||1==f.length&&d.length>=2)&&(e=this.options.countSelectedText.replace("{0}",d.length).replace("{1}",this.$element.find('option:not([data-divider="true"], [data-hidden="true"])'+g).length))}this.options.title=this.$element.attr("title"),"static"==this.options.selectedTextFormat&&(e=this.options.title),e||(e="undefined"!=typeof this.options.title?this.options.title:this.options.noneSelectedText),this.$button.attr("title",a.trim(a("<div/>").html(e).text()).replace(/\s\s+/g," ")),this.$newElement.find(".filter-option").html(e)},setStyle:function(a,b){this.$element.attr("class")&&this.$newElement.addClass(this.$element.attr("class").replace(/selectpicker|mobile-device|validate\[.*\]/gi,""));var c=a?a:this.options.style;"add"==b?this.$button.addClass(c):"remove"==b?this.$button.removeClass(c):(this.$button.removeClass(this.options.style),this.$button.addClass(c))},liHeight:function(){if(this.options.size!==!1){var a=this.$menu.parent().clone().find("> .dropdown-toggle").prop("autofocus",!1).end().appendTo("body"),b=a.addClass("open").find("> .dropdown-menu"),c=b.find("li > a").outerHeight(),d=this.options.header?b.find(".popover-title").outerHeight():0,e=this.options.liveSearch?b.find(".bootstrap-select-searchbox").outerHeight():0,f=this.options.actionsBox?b.find(".bs-actionsbox").outerHeight():0;a.remove(),this.$newElement.data("liHeight",c).data("headerHeight",d).data("searchHeight",e).data("actionsHeight",f)}},setSize:function(){var b,c,d,e=this,f=this.$menu,g=f.find(".inner"),h=this.$newElement.outerHeight(),i=this.$newElement.data("liHeight"),j=this.$newElement.data("headerHeight"),k=this.$newElement.data("searchHeight"),l=this.$newElement.data("actionsHeight"),m=f.find("li .divider").outerHeight(!0),n=parseInt(f.css("padding-top"))+parseInt(f.css("padding-bottom"))+parseInt(f.css("border-top-width"))+parseInt(f.css("border-bottom-width")),o=this.options.hideDisabled?":not(.disabled)":"",p=a(window),q=n+parseInt(f.css("margin-top"))+parseInt(f.css("margin-bottom"))+2,r=function(){c=e.$newElement.offset().top-p.scrollTop(),d=p.height()-c-h};if(r(),this.options.header&&f.css("padding-top",0),"auto"==this.options.size){var s=function(){var a,h=e.$lis.not(".hide");r(),b=d-q,e.options.dropupAuto&&e.$newElement.toggleClass("dropup",c>d&&b-q<f.height()),e.$newElement.hasClass("dropup")&&(b=c-q),a=h.length+h.find("dt").length>3?3*i+q-2:0,f.css({"max-height":b+"px",overflow:"hidden","min-height":a+j+k+l+"px"}),g.css({"max-height":b-j-k-l-n+"px","overflow-y":"auto","min-height":Math.max(a-n,0)+"px"})};s(),this.$searchbox.off("input.getSize propertychange.getSize").on("input.getSize propertychange.getSize",s),a(window).off("resize.getSize").on("resize.getSize",s),a(window).off("scroll.getSize").on("scroll.getSize",s)}else if(this.options.size&&"auto"!=this.options.size&&f.find("li"+o).length>this.options.size){var t=f.find("li"+o+" > *").not(".div-contain").slice(0,this.options.size).last().parent().index(),u=f.find("li").slice(0,t+1).find(".div-contain").length;b=i*this.options.size+u*m+n,e.options.dropupAuto&&this.$newElement.toggleClass("dropup",c>d&&b<f.height()),f.css({"max-height":b+j+k+l+"px",overflow:"hidden"}),g.css({"max-height":b-n+"px","overflow-y":"auto"})}},setWidth:function(){if("auto"==this.options.width){this.$menu.css("min-width","0");var a=this.$newElement.clone().appendTo("body"),b=a.find("> .dropdown-menu").css("width"),c=a.css("width","auto").find("> button").css("width");a.remove(),this.$newElement.css("width",Math.max(parseInt(b),parseInt(c))+"px")}else"fit"==this.options.width?(this.$menu.css("min-width",""),this.$newElement.css("width","").addClass("fit-width")):this.options.width?(this.$menu.css("min-width",""),this.$newElement.css("width",this.options.width)):(this.$menu.css("min-width",""),this.$newElement.css("width",""));this.$newElement.hasClass("fit-width")&&"fit"!==this.options.width&&this.$newElement.removeClass("fit-width")},selectPosition:function(){var b,c,d=this,e="<div />",f=a(e),g=function(a){f.addClass(a.attr("class").replace(/form-control/gi,"")).toggleClass("dropup",a.hasClass("dropup")),b=a.offset(),c=a.hasClass("dropup")?0:a[0].offsetHeight,f.css({top:b.top+c,left:b.left,width:a[0].offsetWidth,position:"absolute"})};this.$newElement.on("click",function(){d.isDisabled()||(g(a(this)),f.appendTo(d.options.container),f.toggleClass("open",!a(this).hasClass("open")),f.append(d.$menu))}),a(window).resize(function(){g(d.$newElement)}),a(window).on("scroll",function(){g(d.$newElement)}),a("html").on("click",function(b){a(b.target).closest(d.$newElement).length<1&&f.removeClass("open")})},setSelected:function(b,c){null==this.$lis&&(this.$lis=this.$menu.find("li")),a(this.$lis[b]).toggleClass("selected",c)},setDisabled:function(b,c){null==this.$lis&&(this.$lis=this.$menu.find("li")),c?a(this.$lis[b]).addClass("disabled").find("a").attr("href","#").attr("tabindex",-1):a(this.$lis[b]).removeClass("disabled").find("a").removeAttr("href").attr("tabindex",0)},isDisabled:function(){return this.$element.is(":disabled")},checkDisabled:function(){var a=this;this.isDisabled()?this.$button.addClass("disabled").attr("tabindex",-1):(this.$button.hasClass("disabled")&&this.$button.removeClass("disabled"),-1==this.$button.attr("tabindex")&&(this.$element.data("tabindex")||this.$button.removeAttr("tabindex"))),this.$button.click(function(){return!a.isDisabled()})},tabIndex:function(){this.$element.is("[tabindex]")&&(this.$element.data("tabindex",this.$element.attr("tabindex")),this.$button.attr("tabindex",this.$element.data("tabindex")))},clickListener:function(){var b=this;this.$newElement.on("touchstart.dropdown",".dropdown-menu",function(a){a.stopPropagation()}),this.$newElement.on("click",function(){b.setSize(),b.options.liveSearch||b.multiple||setTimeout(function(){b.$menu.find(".selected a").focus()},10)}),this.$menu.on("click","li a",function(c){var d=a(this).parent().index(),e=b.$element.val(),f=b.$element.prop("selectedIndex");if(b.multiple&&c.stopPropagation(),c.preventDefault(),!b.isDisabled()&&!a(this).parent().hasClass("disabled")){var g=b.$element.find("option"),h=g.eq(d),i=h.prop("selected"),j=h.parent("optgroup"),k=b.options.maxOptions,l=j.data("maxOptions")||!1;if(b.multiple){if(h.prop("selected",!i),b.setSelected(d,!i),a(this).blur(),k!==!1||l!==!1){var m=k<g.filter(":selected").length,n=l<j.find("option:selected").length,o=b.options.maxOptionsText,p=o[0].replace("{n}",k),q=o[1].replace("{n}",l),r=a('<div class="notify"></div>');if(k&&m||l&&n)if(k&&1==k)g.prop("selected",!1),h.prop("selected",!0),b.$menu.find(".selected").removeClass("selected"),b.setSelected(d,!0);else if(l&&1==l){j.find("option:selected").prop("selected",!1),h.prop("selected",!0);var s=a(this).data("optgroup");b.$menu.find(".selected").has('a[data-optgroup="'+s+'"]').removeClass("selected"),b.setSelected(d,!0)}else o[2]&&(p=p.replace("{var}",o[2][k>1?0:1]),q=q.replace("{var}",o[2][l>1?0:1])),h.prop("selected",!1),b.$menu.append(r),k&&m&&(r.append(a("<div>"+p+"</div>")),b.$element.trigger("maxReached.bs.select")),l&&n&&(r.append(a("<div>"+q+"</div>")),b.$element.trigger("maxReachedGrp.bs.select")),setTimeout(function(){b.setSelected(d,!1)},10),r.delay(750).fadeOut(300,function(){a(this).remove()})}}else g.prop("selected",!1),h.prop("selected",!0),b.$menu.find(".selected").removeClass("selected"),b.setSelected(d,!0);b.multiple?b.options.liveSearch&&b.$searchbox.focus():b.$button.focus(),(e!=b.$element.val()&&b.multiple||f!=b.$element.prop("selectedIndex")&&!b.multiple)&&b.$element.change()}}),this.$menu.on("click","li.disabled a, li dt, li .div-contain, .popover-title, .popover-title :not(.close)",function(a){a.target==this&&(a.preventDefault(),a.stopPropagation(),b.options.liveSearch?b.$searchbox.focus():b.$button.focus())}),this.$menu.on("click",".popover-title .close",function(){b.$button.focus()}),this.$searchbox.on("click",function(a){a.stopPropagation()}),this.$menu.on("click",".actions-btn",function(c){b.options.liveSearch?b.$searchbox.focus():b.$button.focus(),c.preventDefault(),c.stopPropagation(),a(this).is(".bs-select-all")?b.selectAll():b.deselectAll(),b.$element.change()}),this.$element.change(function(){b.render(!1)})},liveSearchListener:function(){var b=this,c=a('<li class="no-results"></li>');this.$newElement.on("click.dropdown.data-api",function(){b.$menu.find(".active").removeClass("active"),b.$searchbox.val()&&(b.$searchbox.val(""),b.$lis.not(".is-hidden").removeClass("hide"),c.parent().length&&c.remove()),b.multiple||b.$menu.find(".selected").addClass("active"),setTimeout(function(){b.$searchbox.focus()},10)}),this.$searchbox.on("input propertychange",function(){b.$searchbox.val()?(b.$lis.not(".is-hidden").removeClass("hide").find("a").not(":icontains("+b.$searchbox.val()+")").parent().addClass("hide"),b.$menu.find("li").filter(":visible:not(.no-results)").length?c.parent().length&&c.remove():(c.parent().length&&c.remove(),c.html(b.options.noneResultsText+' "'+b.$searchbox.val()+'"').show(),b.$menu.find("li").last().after(c))):(b.$lis.not(".is-hidden").removeClass("hide"),c.parent().length&&c.remove()),b.$menu.find("li.active").removeClass("active"),b.$menu.find("li").filter(":visible:not(.divider)").eq(0).addClass("active").find("a").focus(),a(this).focus()}),this.$menu.on("mouseenter","a",function(c){b.$menu.find(".active").removeClass("active"),a(c.currentTarget).parent().not(".disabled").addClass("active")}),this.$menu.on("mouseleave","a",function(){b.$menu.find(".active").removeClass("active")})},val:function(a){return"undefined"!=typeof a?(this.$element.val(a),this.render(),this.$element):this.$element.val()},selectAll:function(){null==this.$lis&&(this.$lis=this.$menu.find("li")),this.$element.find("option:enabled").prop("selected",!0),a(this.$lis).not(".disabled").addClass("selected"),this.render(!1)},deselectAll:function(){null==this.$lis&&(this.$lis=this.$menu.find("li")),this.$element.find("option:enabled").prop("selected",!1),a(this.$lis).not(".disabled").removeClass("selected"),this.render(!1)},keydown:function(b){var c,d,e,f,g,h,i,j,k,l,m,n,o={32:" ",48:"0",49:"1",50:"2",51:"3",52:"4",53:"5",54:"6",55:"7",56:"8",57:"9",59:";",65:"a",66:"b",67:"c",68:"d",69:"e",70:"f",71:"g",72:"h",73:"i",74:"j",75:"k",76:"l",77:"m",78:"n",79:"o",80:"p",81:"q",82:"r",83:"s",84:"t",85:"u",86:"v",87:"w",88:"x",89:"y",90:"z",96:"0",97:"1",98:"2",99:"3",100:"4",101:"5",102:"6",103:"7",104:"8",105:"9"};if(c=a(this),e=c.parent(),c.is("input")&&(e=c.parent().parent()),l=e.data("this"),l.options.liveSearch&&(e=c.parent().parent()),l.options.container&&(e=l.$menu),d=a("[role=menu] li:not(.divider) a",e),n=l.$menu.parent().hasClass("open"),!n&&/([0-9]|[A-z])/.test(String.fromCharCode(b.keyCode))&&(l.options.container?l.$newElement.trigger("click"):(l.setSize(),l.$menu.parent().addClass("open"),n=!0),l.$searchbox.focus()),l.options.liveSearch&&(/(^9$|27)/.test(b.keyCode.toString(10))&&n&&0===l.$menu.find(".active").length&&(b.preventDefault(),l.$menu.parent().removeClass("open"),l.$button.focus()),d=a("[role=menu] li:not(.divider):visible",e),c.val()||/(38|40)/.test(b.keyCode.toString(10))||0===d.filter(".active").length&&(d=l.$newElement.find("li").filter(":icontains("+o[b.keyCode]+")"))),d.length){if(/(38|40)/.test(b.keyCode.toString(10)))f=d.index(d.filter(":focus")),h=d.parent(":not(.disabled):visible").first().index(),i=d.parent(":not(.disabled):visible").last().index(),g=d.eq(f).parent().nextAll(":not(.disabled):visible").eq(0).index(),j=d.eq(f).parent().prevAll(":not(.disabled):visible").eq(0).index(),k=d.eq(g).parent().prevAll(":not(.disabled):visible").eq(0).index(),l.options.liveSearch&&(d.each(function(b){a(this).is(":not(.disabled)")&&a(this).data("index",b)}),f=d.index(d.filter(".active")),h=d.filter(":not(.disabled):visible").first().data("index"),i=d.filter(":not(.disabled):visible").last().data("index"),g=d.eq(f).nextAll(":not(.disabled):visible").eq(0).data("index"),j=d.eq(f).prevAll(":not(.disabled):visible").eq(0).data("index"),k=d.eq(g).prevAll(":not(.disabled):visible").eq(0).data("index")),m=c.data("prevIndex"),38==b.keyCode&&(l.options.liveSearch&&(f-=1),f!=k&&f>j&&(f=j),h>f&&(f=h),f==m&&(f=i)),40==b.keyCode&&(l.options.liveSearch&&(f+=1),-1==f&&(f=0),f!=k&&g>f&&(f=g),f>i&&(f=i),f==m&&(f=h)),c.data("prevIndex",f),l.options.liveSearch?(b.preventDefault(),c.is(".dropdown-toggle")||(d.removeClass("active"),d.eq(f).addClass("active").find("a").focus(),c.focus())):d.eq(f).focus();else if(!c.is("input")){var p,q,r=[];d.each(function(){a(this).parent().is(":not(.disabled)")&&a.trim(a(this).text().toLowerCase()).substring(0,1)==o[b.keyCode]&&r.push(a(this).parent().index())}),p=a(document).data("keycount"),p++,a(document).data("keycount",p),q=a.trim(a(":focus").text().toLowerCase()).substring(0,1),q!=o[b.keyCode]?(p=1,a(document).data("keycount",p)):p>=r.length&&(a(document).data("keycount",0),p>r.length&&(p=1)),d.eq(r[p-1]).focus()}(/(13|32)/.test(b.keyCode.toString(10))||l.options.selectOnTab&&/(^9$)/.test(b.keyCode.toString(10)))&&n&&(/(32)/.test(b.keyCode.toString(10))||b.preventDefault(),l.options.liveSearch?/(32)/.test(b.keyCode.toString(10))||(l.$menu.find(".active a").click(),c.focus()):a(":focus").click(),a(document).data("keycount",0)),(/(^9$|27)/.test(b.keyCode.toString(10))&&n&&(l.multiple||l.options.liveSearch)||/(27)/.test(b.keyCode.toString(10))&&!n)&&(l.$menu.parent().removeClass("open"),l.$button.focus())}},mobile:function(){this.$element.addClass("mobile-device").appendTo(this.$newElement),this.options.container&&this.$menu.hide()},refresh:function(){this.$lis=null,this.reloadLi(),this.render(),this.setWidth(),this.setStyle(),this.checkDisabled(),this.liHeight()},update:function(){this.reloadLi(),this.setWidth(),this.setStyle(),this.checkDisabled(),this.liHeight()},hide:function(){this.$newElement.hide()},show:function(){this.$newElement.show()},remove:function(){this.$newElement.remove(),this.$element.remove()}};var d=a.fn.selectpicker;a.fn.selectpicker=b,a.fn.selectpicker.Constructor=c,a.fn.selectpicker.noConflict=function(){return a.fn.selectpicker=d,this},a(document).data("keycount",0).on("keydown",".bootstrap-select [data-toggle=dropdown], .bootstrap-select [role=menu], .bootstrap-select-searchbox input",c.prototype.keydown).on("focusin.modal",".bootstrap-select [data-toggle=dropdown], .bootstrap-select [role=menu], .bootstrap-select-searchbox input",function(a){a.stopPropagation()})}(jQuery);
//# sourceMappingURL=bootstrap-select.js.map
(function(hscd) {
    'use strict';

    var ctx = {};

    function onAdjust(name, value) {
        ctx.searchParams[name] = value;

        var query = {
            searchParams: ctx.searchParams,
            searchRange:  ctx.searchRange,
            minScore:     ctx.minScore,
            hintSteps:    ctx.hintSteps,
            maxResults:   ctx.maxResults
        };

        $.getJSON('/node/search', query, function(results) {
            var hintData = {};
            for (var keyword in results.columns) {
                hintData[keyword] = results.columns[keyword].hints;
            }

            ctx.grapher.setColumnHints(hintData);
            outputResults(results.items, results.count);
        });
    }

    function onSearch() {
        var keywords     = $('#keywordsToSearch').val() || [];
        var searchParams = {};

        for (var i = 0, count = keywords.length; i < count; ++i) {
            searchParams[keywords[i]] = 1.0;
        }

        var query = {
            searchParams: searchParams,
            searchRange:  { min: -1.0, max: 1.0 },
            minScore:     parseFloat($('#minScore').val()),
            hintSteps:    parseInt($('#hintSteps').val()),
            maxResults:   parseInt($('#maxResults').val())
        };

        $.getJSON('/node/search', query, function(results) {
            ctx.searchParams = query.searchParams;
            ctx.searchRange  = query.searchRange;
            ctx.minScore     = query.minScore;
            ctx.hintSteps    = query.hintSteps;
            ctx.maxResults   = query.maxResults;

            ctx.grapher = new grapher.Grapher('grapher', ctx.searchRange, 150, true, true);
            ctx.grapher.setColumns(results.columns);
            ctx.grapher.setValueChangedListener(onAdjust);

            outputResults(results.items, results.count);

            $('#query').text(keywords.join(', '));
            $('#useLocalScale').click(function() {
                var useLocalScale = $('#useLocalScale').is(':checked');
                ctx.grapher.setUseLocalScale(useLocalScale);
            });
            $('#useRelativeScale').click(function() {
                var useRelativeScale = $('#useRelativeScale').is(':checked');
                ctx.grapher.setUseRelativeScale(useRelativeScale);
            });
            $('#input').fadeOut(function() {
                $('#output').fadeIn();
            });
        });
    }

    function onLearn() {
        $('#learnKeyword').prop('disabled', true);

        $('#learnError').slideUp(function() {
            var query = {
                keyword: $('#keywordToLearn').val(),
                params:  ctx.searchParams
            };

            $.getJSON('/node/addKeyword', query, function(results) {
                if (results.success) {
                    $('#learnDialog').modal('hide');
                }
                else {
                    $('#learnError').slideDown(function() {
                        $('#learnKeyword').prop('disabled', false);
                    });
                }
            });
        });
    }

    function onForget() {
        $('#forgetKeyword').prop('disabled', true);

        $('#forgetError').slideUp(function() {
            var query = {
                keyword: $('#keywordToForget').val()
            };

            $.getJSON('/node/removeKeyword', query, function(results) {
                if (results.success) {
                    $('#forgetDialog').modal('hide');
                }
                else {
                    $('#forgetError').slideDown(function() {
                        $('#forgetKeyword').prop('disabled', false);
                    });
                }
            });
        });
    }

    function outputResults(results, count) {
        var searchResultCnt = String(results.length);
        if (results.length < count) {
            searchResultCnt += ' of ' + count;
        }
        $('#count').text(searchResultCnt);

        var template = Handlebars.compile($('#template').html());
        $('#results').empty();
        $('#results').append(template({'results': results}));
    }

    $(document).on({
        ajaxStart: function() {
            $('#spinner').show();
        },

        ajaxStop: function() {
            $('#spinner').hide();
        },

        ready: function() {
            $('#keywordsToSearch').selectpicker();

            $.getJSON('/node/getKeywords', function(keywords) {
                $('#searchKeywords').click(onSearch);
                for (var i = 0, count = keywords.length; i < count; ++i) {
                    $('#keywordsToSearch').append($('<option></option>', {
                        value: keywords[i],
                        text:  keywords[i]
                    }));
                }
                $('#keywordsToSearch').selectpicker('refresh');
                $('#keywordsToSearch').change(function() {
                    $('#searchKeywords').prop('disabled', !$(this).val());
                });

                $('#forgetKeyword').click(onForget);
                $('#forgetDialog').on('show.bs.modal', function() {
                    $('#forgetError').hide();
                    $.getJSON('/node/getKeywords', function(keywords) {
                        $('#forgetKeyword').prop('disabled', keywords.length === 0);
                        $('#keywordToForget').empty();
                        for (var i = 0, count = keywords.length; i < count; ++i) {
                            $('#keywordToForget').append($('<option></option>', {
                                value: keywords[i],
                                text:  keywords[i]
                            }));
                        }
                    });
                });

                $('#learnKeyword').click(onLearn);
                $('#keywordToLearn').bind('input', function() {
                    $('#learnKeyword').prop('disabled', !$(this).val());
                });
                $('#learnDialog').on('show.bs.modal', function() {
                    $('#learnKeyword').prop('disabled', true);
                    $('#keywordToLearn').val('');
                    $('#learnError').hide();
                });
            });
        }
    });

}(window.hscd = window.hscd || {}));

/*
global
    $,
    Handlebars,
    document,
    grapher,
    window,
*/

(function(grapher) {
    'use strict';

    //
    //  Coord
    //

    function Coord(x, y) {
        this.x = x;
        this.y = y;
    }


    //
    //  Rect
    //

    function Rect(left, top, width, height) {
        this.left   = left;
        this.top    = top;
        this.width  = width;
        this.height = height;
        this.right  = left + width;
        this.bottom = top + height;

        this.contains = function(coord) {
            var contained =
                coord.x >= this.left &&
                coord.x < this.right &&
                coord.y >= this.top &&
                coord.y < this.bottom;

            return contained;
        };

        this.intersection = function(rect) {
            var left   = Math.max(this.left, rect.left);
            var top    = Math.max(this.top, rect.top);
            var right  = Math.min(this.right, rect.right);
            var bottom = Math.min(this.bottom, rect.bottom);

            return new Rect(left, top, right - left, bottom - top);
        };
    }


    //
    //  Range
    //

    function Range(start, end) {
        this.start = start;
        this.end   = end;

        this.containsPoint = function(value) {
            return value >= this.start && value <= this.end;
        };

        this.getLength = function() {
            return this.end - this.start;
        };

        this.clamp = function(value) {
            if (value < this.start) {
                return this.start;
            }

            if (value > this.end) {
                return this.end;
            }

            return value;
        };
    }


    //
    //  Column
    //

    function Column(canvas, name, params, scale, range, bounds) {
        this.clearShapes = function() {
            _.each(this.shapes, function(shape) {
                this.canvas.remove(shape);
            });

            this.shapes = [];
        };

        this.updateShapes = function(final) {
            this.columnBounds = this.getColumnBounds(this.bounds);
            this.labelBounds  = this.getLabelBounds(this.columnBounds);
            this.hintBounds   = this.getHintBounds(this.columnBounds);
            this.fillBounds   = this.getFillBounds(this.columnBounds);
            this.handleBounds = this.getHandleBounds(this.columnBounds, this.fillBounds);

            if (final) {
                this.updateRect('boundsRect', {
                    left:   this.columnBounds.left,
                    top:    this.columnBounds.top,
                    width:  this.columnBounds.width,
                    height: this.columnBounds.height,
                    stroke: this.strokeColor,
                    fill:   this.emptyColor
                });

                this.updateRect('hintRect', {
                    left:   this.hintBounds.left,
                    top:    this.hintBounds.top,
                    width:  this.hintBounds.width,
                    height: this.hintBounds.height,
                    stroke: this.strokeColor
                });

                this.hintRect.setGradient('fill', {
                    x1:         0.0,
                    y1:         0.0,
                    x2:         0.0,
                    y2:         this.hintRect.height,
                    colorStops: this.decimateHints(this.steps, this.scale)
                });

                this.updateRect('labelRect', {
                    left:   this.labelBounds.left,
                    top:    this.labelBounds.top,
                    width:  this.labelBounds.width,
                    height: this.labelBounds.height,
                    fill:   this.strokeColor
                });

                this.updateText('label', this.name, {
                    left:     this.fillBounds.left + this.fillBounds.width / 2,
                    top:      this.labelBounds.top + this.labelBounds.height / 2,
                    fontSize: this.labelFontSize,
                    originX:  'center',
                    originY:  'center',
                });
            }

            this.updateRect('fillRect', {
                left:   this.fillBounds.left,
                top:    this.fillBounds.top,
                width:  this.fillBounds.width,
                height: this.fillBounds.height,
                fill:   this.getFillColor()
            });

            this.updateRect('handleRect', {
                left:   this.handleBounds.left,
                top:    this.handleBounds.top,
                width:  this.handleBounds.width,
                height: this.handleBounds.height,
                fill:   this.getHandleColor()
            });

            if (final && this.range.containsPoint(0.0)) {
                var y = this.getPosFromValue(0.0);
                var p = [this.bounds.left, y, this.bounds.left + this.tickLength, y];
                this.updateLine('baseline', p, {
                    stroke: this.tickColor
                });
            }

            this.canvas.renderAll();
        };

        this.updateRect = function(name, args) {
            if (name in this) {
                this[name].set(args);
            }
            else {
                var rect = new fabric.Rect(args);
                this.canvas.add(rect);
                this.shapes.push(rect);
                this[name] = rect;
            }
        };

        this.updateText = function(name, str, args) {
            if (name in this) {
                this[name].set(args);
            }
            else {
                var text = new fabric.Text(str, args);
                this.canvas.add(text);
                this.shapes.push(text);
                this[name] = text;
            }
        };

        this.updateLine = function(name, points, args) {
            if (name in this) {
                this[name].set(args);
            }
            else {
                var line = new fabric.Line(points, args);
                this.canvas.add(line);
                this.shapes.push(line);
                this[name] = line;
            }
        };

        this.decimateHints = function(steps, scale) {
            var groups = this.groupHints(steps);

            var colorStops = {};
            _.each(groups, function(count, index) {
                var colorPercent = 0;
                if (scale.getLength() > 0) {
                    colorPercent = Math.max(0, count - scale.start) / scale.getLength();
                }

                var colorByte = 0xff - Math.min(0xff, Math.round(0xff * colorPercent));
                var colorObj  = tinycolor({ r: colorByte, g: colorByte, b: colorByte });
                var colorStr  = colorObj.toHexString();

                colorStops[index / steps] = colorStr;
            });

            return colorStops;
        };

        this.groupHints = function(steps) {
            var stepSize = this.range.getLength() / steps;

            var hintGroups = [];
            for (var i = 0; i < steps; ++i) {
                var stepMax = this.range.end - stepSize * i;
                var stepMin = stepMax - stepSize;

                var hintCount = 0;
                for (var j = 0, count = this.hints.length; j < count; ++j) {
                    var hint = this.hints[j];
                    if (hint.sample > stepMin && hint.sample <= stepMax) {
                        hintCount += hint.count;
                    }
                }

                hintGroups.push(hintCount);
            }

            return hintGroups;
        };

        this.setClampedValue = function(value, final) {
            this.value = this.range.clamp(value);
            this.updateShapes(final);

            if (this.onValueChanged && final) {
                this.onValueChanged(this.name, this.value);
            }
        };

        this.setHints = function(hints, scale) {
            this.hints = hints;
            this.scale = scale;
            this.updateShapes(true);
        };

        this.getLabelBounds = function(bounds) {
            return new Rect(
                bounds.left,
                bounds.top + bounds.height,
                bounds.width,
                this.labelSize
            );
        };

        this.getColumnBounds = function(bounds) {
            return new Rect(
                bounds.left + this.tickLength,
                bounds.top,
                bounds.width - this.tickLength,
                bounds.height - this.labelSize
            );
        };

        this.getHintBounds = function(bounds) {
            return new Rect(
                bounds.left + bounds.width - this.hintSize,
                bounds.top,
                this.hintSize,
                bounds.height
            );
        };

        this.getFillBounds = function(bounds) {
            var y1 = this.getPosFromValue(0.0);
            var y2 = this.getPosFromValue(this.value);
            return new Rect(
                bounds.left,
                Math.min(y1, y2),
                bounds.width - this.hintSize,
                Math.abs(y1 - y2)
            );
        };

        this.getHandleBounds = function(bounds, fillBounds) {
            var handleBounds = new Rect(
                fillBounds.left,
                this.getPosFromValue(this.value) - this.handleSize / 2,
                fillBounds.width,
                this.handleSize
            );
            handleBounds.intersection(bounds);
            return handleBounds;
        };

        this.valueColorAdjust = function(color, offset) {
            var colorObj = tinycolor(color);
            var rangeEnd = this.value >= 0.0 ? this.range.end : this.range.start;
            var rangeMid = (this.range.start + this.range.end) / 2.0;
            var rangeRat = (this.value - rangeMid) / (rangeEnd - rangeMid);
            var desatVal = Math.max(0.0, 1.0 - rangeRat + offset) * 100.0;
            return colorObj.desaturate(desatVal).toHexString();
        };

        this.getFillColor = function() {
            var color = this.value >= 0.0 ? this.fillColorPos : this.fillColorNeg;
            return this.valueColorAdjust(color, this.desatOffset);
        };

        this.getHandleColor = function() {
            var color = this.value >= 0.0 ? this.handleColorPos : this.handleColorNeg;
            return this.valueColorAdjust(color, this.desatOffset);
        };

        this.mouseDown = function(position) {
            if (this.isGrabbing(position)) {
                this.stateTransition(this.State.DRAG, position);
            }
        };

        this.mouseUp = function(position) {
            this.stateTransition(
                this.isHovering(position) ? this.State.HOVER : this.State.NORMAL,
                position
            );
        };

        this.mouseMove = function(position) {
            switch (this.state) {
                case this.State.NORMAL:
                    if (this.isHovering(position)) {
                    this.stateTransition(this.State.HOVER, position);
                }
                break;
                case this.State.HOVER:
                    if (!this.isHovering(position)) {
                    this.stateTransition(this.State.NORMAL, position);
                }
                break;
            }

            this.stateUpdate(position);
        };

        this.mouseOut = function(position) {
            this.mouseUp(position);
        };

        this.mouseDoubleClick = function(position) {
            if (this.isContained(position)) {
                this.setClampedValue(this.getValueFromPos(position.y), true);
            }
        };

        this.getValueFromPos = function(position) {
            var percent = 1.0 - (position - this.columnBounds.top) / this.columnBounds.height;
            return this.range.start + this.range.getLength() * percent;
        };

        this.getPosFromValue = function(value) {
            var percent = 1.0 - (value - this.range.start) / this.range.getLength();
            var range   = new Range(this.columnBounds.top, this.columnBounds.top + this.columnBounds.height);
            return range.clamp(this.columnBounds.top + this.columnBounds.height * percent);
        };

        this.isHovering = function(position) {
            return this.isGrabbing(position);
        };

        this.isGrabbing = function(position) {
            return this.handleBounds.contains(position);
        };

        this.isContained = function(position) {
            return this.columnBounds.contains(position);
        };

        this.stateUpdate = function(position) {
            switch (this.state) {
                case this.State.DRAG:
                    this.setClampedValue(this.getValueFromPos(position.y) + this.dragDelta, false);
                break;
            }
        };

        this.stateTransition = function(state, position) {
            if (state == this.state) {
                return;
            }

            switch (this.state) {
                case this.State.DRAG:
                    this.setClampedValue(this.getValueFromPos(position.y) + this.dragDelta, true);
                    /* falls through */
                case this.State.HOVER:
                    if (state == this.State.NORMAL) {
                        this.canvas.contextContainer.canvas.style.cursor = 'default';
                    }
                break;
            }

            switch (state) {
                case this.State.DRAG:
                    this.dragDelta = this.value - this.getValueFromPos(position.y);
                    /* falls through */
                case this.State.HOVER:
                    this.canvas.contextContainer.canvas.style.cursor = 'ns-resize';
                break;
            }

            this.state = state;
        };

        this.State = {
            NORMAL: 0,
            HOVER:  1,
            DRAG:   2
        };

        this.handleSize     = 10;
        this.desatOffset    = -0.3;
        this.hintSize       = 10;
        this.labelFontSize  = 15;
        this.labelSize      = 20;
        this.tickLength     = 5;
        this.emptyColor     = '#eeeeec';
        this.strokeColor    = '#d3d7cf';
        this.tickColor      = '#888a85';
        this.fillColorNeg   = '#3465a4';
        this.fillColorPos   = '#cc0000';
        this.handleColorNeg = '#204a87';
        this.handleColorPos = '#a40000';

        this.canvas = canvas;
        this.shapes = [];
        this.name   = name;
        this.value  = params.value;
        this.hints  = params.hints;
        this.steps  = params.steps;
        this.scale  = scale;
        this.range  = range;
        this.bounds = bounds;
        this.state  = this.State.NORMAL;

        this.updateShapes(true);
    }


    //
    //  Grapher
    //

    grapher.Grapher = function(canvas, range, columnWidth, useLocalScale, useRelativeScale) {
        this.setColumns = function(columns) {
            this.clearColumns();

            var scale = 0;
            if (!useLocalScale) {
                var hintData = {};
                _.each(columns, function(columnValue, columnName) {
                    hintData[columnName] = columnValue.hints || [];
                });

                scale = this.getGlobalScale(hintData);
            }

            var graphBounds = this.getGraphBounds(this.getCanvasBounds());

            var index = 0;
            var that  = this;
            _.each(columns, function(columnValue, columnName) {
                if (useLocalScale) {
                    scale = that.getLocalScale(columnValue.hints);
                }

                var columnBounds = that.getColumnBounds(graphBounds, index);
                that.columns.push(new Column(that.canvas, columnName, columnValue, scale, that.range, columnBounds));
                that.indexMap[columnName] = index++;
            });
        };

        this.clearColumns = function() {
            _.each(this.columns, function(column) {
                column.clearShapes();
            });

            this.columns  = [];
            this.indexMap = {};
        };

        this.setColumnHints = function(hintData) {
            var scale = 0;
            if (!this.useLocalScale) {
                scale = this.getGlobalScale(hintData);
            }

            var that    = this;
            _.each(hintData, function(hints, name) {
                var index = that.getColumnIndex(name);
                console.assert(index >= 0);

                if (that.useLocalScale) {
                    scale = that.getLocalScale(hints);
                }

                that.columns[index].setHints(hints, scale);
            });
        };

        this.setUseLocalScale = function(useLocalScale) {
            if (useLocalScale != this.useLocalScale) {
                this.useLocalScale = useLocalScale;
                this.invalidateHints();
            }
        };

        this.setUseRelativeScale = function(useRelativeScale) {
            if (useRelativeScale != this.useRelativeScale) {
                this.useRelativeScale = useRelativeScale;
                this.invalidateHints();
            }
        };

        this.invalidateHints = function() {
            var hintData = {};
            _.each(this.columns, function(column) {
                hintData[column.name] = column.hints;
            });

            this.setColumnHints(hintData);
        };

        this.setValueChangedListener = function(listener) {
            _.each(this.columns, function(column) {
                column.onValueChanged = listener;
            });
        };

        this.getLocalScale = function(hints) {
            var counts = _.pluck(hints, 'count');
            var min = this.useRelativeScale ? _.min(counts) : 0;
            return new Range(min, _.max(counts));
        };

        this.getGlobalScale = function(hintData) {
            var that        = this;
            var globalScale = null;

            _.each(hintData, function(hints) {
                var localScale = that.getLocalScale(hints);
                if (globalScale) {
                    globalScale.includeRange(localScale);
                }
                else {
                    globalScale = localScale;
                }
            });

            return globalScale;
        };

        this.getColumnCount = function() {
            return this.columns.length;
        };

        this.getColumnIndex = function(name) {
            console.assert(name in this.indexMap);
            return this.indexMap[name];
        };

        this.getColumnName = function(index) {
            return this.columns[index].name;
        };

        this.getColumnNames = function() {
            return _.pluck(this.columns, 'name');
        };

        this.getCanvasBounds = function() {
            return new Rect(0, 0, this.canvas.width - 1, this.canvas.height - 1);
        };

        this.getGraphBounds = function(bounds) {
            return this.getCanvasBounds();
        };

        this.getColumnBounds = function(bounds, index, count) {
            var width = this.columnWidth + this.padding * 2;
            return new Rect(
                bounds.left + width * index + this.padding,
                bounds.top,
                this.columnWidth,
                bounds.height
            );
        };

        this.getMousePos = function(e) {
            var rect = e.target.getBoundingClientRect();
            return new Coord(e.clientX - rect.left, e.clientY - rect.top);
        };

        this.mouseDown = function(e) {
            var position = this.grapher.getMousePos(e);
            _.each(this.grapher.columns, function(column) {
                column.mouseDown(position);
            });
        };

        this.mouseUp = function(e) {
            var position = this.grapher.getMousePos(e);
            _.each(this.grapher.columns, function(column) {
                column.mouseUp(position);
            });
        };

        this.mouseMove = function(e) {
            var position = this.grapher.getMousePos(e);
            _.each(this.grapher.columns, function(column) {
                column.mouseMove(position);
            });
        };

        this.mouseOut = function(e) {
            var position = this.grapher.getMousePos(e);
            _.each(this.grapher.columns, function(column) {
                column.mouseOut(position);
            });
        };

        this.mouseDoubleClick = function(e) {
            var position = this.grapher.getMousePos(e);
            _.each(this.grapher.columns, function(column) {
                column.mouseDoubleClick(position);
            });
        };

        this.useLocalScale    = useLocalScale;
        this.useRelativeScale = useRelativeScale;
        this.columnWidth      = columnWidth;
        this.canvas           = new fabric.StaticCanvas(canvas);
        this.range            = new Range(range.min, range.max);
        this.padding          = 10;
        this.indexMap         = {};
        this.columns          = [];

        var c = this.canvas.contextContainer.canvas;
        c.addEventListener('mousedown', this.mouseDown, false);
        c.addEventListener('mouseup', this.mouseUp, false);
        c.addEventListener('mousemove', this.mouseMove, false);
        c.addEventListener('mouseout', this.mouseOut, false);
        c.addEventListener('dblclick', this.mouseDoubleClick, false);
        c.grapher = this;
    };
}(window.grapher = window.grapher || {}));
