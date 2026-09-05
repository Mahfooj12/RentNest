module.exports = (fn) => {
  if (typeof fn !== 'function') {
    throw new Error('wrapAsync requires a function as an argument');
  }
  return function(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
