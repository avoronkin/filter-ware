# filter-ware

## Installation

Node:

```bash
$ npm install filter-ware
```

## Example

```js
var ware = require('filter-ware');

var router = ware()
  .filter(function(filter, req, res) {
    return filter.test(req.url);
  })
  .use(function(req, res, next) {
    console.log('for all pattrens')
    next();
  })
  .use(/pattern1/, function(req, res, next) {
      console.log('pattern1 1')
  })
  .use(/pattern2/, function(req, res, next) {
    console.log('pattern2 1')
    next('route');
  }, function(req, res, next) {
    console.log('pattern2 2')
  })
  .use(/pattern2/, function(req, res, next) {
    console.log('pattern2 3')
    next();
  })
  .use(function(err, req, res, next) {
    console.log('err', err)
  })

router.run({
      url: 'pattern2'
  }, {}, function (err, req, res) {})
```
